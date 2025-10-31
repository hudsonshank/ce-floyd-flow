import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Extract JWT from Authorization header and resolve user
    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user profile with Procore token using service role to bypass RLS
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tokenData, error: tokenError } = await adminClient
      .from('oauth_tokens')
      .select('procore_access_token')
      .eq('user_id', user.id)
      .single();

    console.log('Token lookup for user:', user.id, 'Has token:', !!tokenData?.procore_access_token);

    if (tokenError) {
      console.error('Token error:', tokenError);
      throw new Error(`Failed to fetch OAuth tokens: ${tokenError.message}`);
    }

    if (!tokenData?.procore_access_token) {
      throw new Error('Procore not connected. Please connect to Procore first.');
    }

    const companyId = Deno.env.get('PROCORE_COMPANY_ID');
    const accessToken = tokenData.procore_access_token;

    console.log('Starting Procore sync for company:', companyId);

    // Fetch projects from Procore
    const projectsResponse = await fetch(
      `https://api.procore.com/rest/v1.0/projects?company_id=${companyId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!projectsResponse.ok) {
      const error = await projectsResponse.text();
      console.error('Failed to fetch projects:', error);
      throw new Error('Failed to fetch projects from Procore');
    }

    const projects = await projectsResponse.json();
    console.log(`Fetched ${projects.length} projects from Procore`);
    
    // Log sample project data to see what's available
    if (projects.length > 0) {
      console.log('Sample project data:', JSON.stringify(projects[0], null, 2));
    }

    // Sync projects to database using admin client
    for (const project of projects) {
      const { error: upsertError } = await adminClient
        .from('projects')
        .upsert({
          procore_project_id: project.id.toString(),
          name: project.name,
          number: project.project_number,
          status: project.active ? 'Active' : 'Inactive',
          pm_name: project.project_manager?.email,
          start_date: project.start_date,
          address: project.address,
          city: project.city,
          state_code: project.state_code,
          zip: project.zip,
          county: project.county,
          completion_date: project.completion_date,
          projected_finish_date: project.projected_finish_date,
          estimated_value: project.estimated_value,
          total_value: project.total_value,
          project_stage: project.project_stage?.name || project.stage,
          latitude: project.latitude,
          longitude: project.longitude,
          last_sync_at: new Date().toISOString(),
        }, {
          onConflict: 'procore_project_id',
        });

      if (upsertError) {
        console.error('Failed to upsert project:', project.name, upsertError);
      }
    }

    // Fetch commitments (subcontracts) for each project
    let totalCommitments = 0;
    for (const project of projects) {
      try {
        const commitmentsResponse = await fetch(
          `https://api.procore.com/rest/v1.0/commitments?project_id=${project.id}&company_id=${companyId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!commitmentsResponse.ok) {
          console.error(`Failed to fetch commitments for project ${project.id}`);
          continue;
        }

        const commitments = await commitmentsResponse.json();
        totalCommitments += commitments.length;
        
        // Log sample commitment data to see what's available
        if (commitments.length > 0 && totalCommitments === commitments.length) {
          console.log('Sample commitment data:', JSON.stringify(commitments[0], null, 2));
        }

        // Get the internal project ID
        const { data: dbProject } = await adminClient
          .from('projects')
          .select('id')
          .eq('procore_project_id', project.id.toString())
          .single();

        if (!dbProject) continue;

        // Sync commitments with vendor details
        for (const commitment of commitments) {
          // Fetch vendor details
          let vendorName = 'Unknown';
          let vendorEmail = null;
          
          if (commitment.vendor?.id) {
            try {
              const vendorResponse = await fetch(
                `https://api.procore.com/rest/v1.0/vendors/${commitment.vendor.id}?company_id=${companyId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              if (vendorResponse.ok) {
                const vendor = await vendorResponse.json();
                vendorName = vendor.name || 'Unknown';
                vendorEmail = vendor.email_address;
              }
            } catch (error) {
              console.error(`Failed to fetch vendor ${commitment.vendor.id}:`, error);
            }
          }

          const { error: upsertError } = await adminClient
            .from('subcontracts')
            .upsert({
              procore_commitment_id: commitment.id.toString(),
              project_id: dbProject.id,
              subcontractor_name: vendorName,
              subcontractor_email: vendorEmail,
              title: commitment.title,
              number: commitment.number,
              contract_value: commitment.grand_total,
              contract_date: commitment.executed_date,
              status: commitment.status === 'Approved' ? 'Approved' : 'Draft',
              executed: commitment.executed || false,
              last_updated_at: new Date().toISOString(),
            }, {
              onConflict: 'procore_commitment_id',
            });

          if (upsertError) {
            console.error('Failed to upsert commitment:', commitment.id, upsertError);
          }
        }
      } catch (error) {
        console.error(`Error syncing commitments for project ${project.id}:`, error);
      }
    }

    console.log(`Sync completed: ${projects.length} projects, ${totalCommitments} commitments`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        projectsCount: projects.length,
        commitmentsCount: totalCommitments,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in procore-sync:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
