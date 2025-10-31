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

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user profile with Procore token
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('procore_access_token')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.procore_access_token) {
      throw new Error('Procore not connected. Please connect to Procore first.');
    }

    const companyId = Deno.env.get('PROCORE_COMPANY_ID');
    const accessToken = profile.procore_access_token;

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

    // Sync projects to database
    for (const project of projects) {
      const { error: upsertError } = await supabaseClient
        .from('projects')
        .upsert({
          procore_project_id: project.id.toString(),
          name: project.name,
          number: project.project_number,
          status: project.active ? 'Active' : 'Inactive',
          pm_name: project.project_manager?.email,
          start_date: project.start_date,
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

        // Get the internal project ID
        const { data: dbProject } = await supabaseClient
          .from('projects')
          .select('id')
          .eq('procore_project_id', project.id.toString())
          .single();

        if (!dbProject) continue;

        // Sync commitments
        for (const commitment of commitments) {
          const { error: upsertError } = await supabaseClient
            .from('subcontracts')
            .upsert({
              procore_commitment_id: commitment.id.toString(),
              project_id: dbProject.id,
              subcontractor_name: commitment.vendor?.name || 'Unknown',
              subcontractor_email: commitment.vendor?.email,
              contract_value: commitment.grand_total,
              contract_date: commitment.executed_date,
              status: commitment.status === 'approved' ? 'Approved' : 'Draft',
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
