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
      .select('procore_access_token, procore_refresh_token')
      .eq('user_id', user.id)
      .single();

    console.log('Token lookup for user:', user.id, 'Has token:', !!tokenData?.procore_access_token);

    if (tokenError || !tokenData?.procore_access_token || !tokenData?.procore_refresh_token) {
      throw new Error('Procore not connected. Please connect to Procore first.');
    }

    const companyId = Deno.env.get('PROCORE_COMPANY_ID');
    let accessToken = tokenData.procore_access_token;

    // Helper function to refresh the access token
    const refreshAccessToken = async (): Promise<string> => {
      console.log('Refreshing Procore access token...');
      const tokenResponse = await fetch('https://login.procore.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: Deno.env.get('PROCORE_CLIENT_ID'),
          client_secret: Deno.env.get('PROCORE_CLIENT_SECRET'),
          refresh_token: tokenData.procore_refresh_token,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token refresh failed:', error);
        throw new Error('Failed to refresh Procore token. Please reconnect to Procore.');
      }

      const tokens = await tokenResponse.json();
      
      // Update tokens in database
      await adminClient
        .from('oauth_tokens')
        .update({
          procore_access_token: tokens.access_token,
          procore_refresh_token: tokens.refresh_token,
        })
        .eq('user_id', user.id);

      console.log('Token refreshed successfully');
      return tokens.access_token;
    };

    // Helper function to make authenticated Procore API calls with automatic token refresh
    const procoreFetch = async (url: string, retryCount = 0): Promise<Response> => {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // If unauthorized and we haven't retried yet, refresh token and retry
      if (response.status === 401 && retryCount === 0) {
        console.log('Access token expired, refreshing...');
        accessToken = await refreshAccessToken();
        return procoreFetch(url, retryCount + 1);
      }

      return response;
    };

    console.log('Starting vendor backfill for Unknown subcontractors...');

    // Get all subcontracts with Unknown vendor
    const { data: unknownSubcontracts, error: fetchError } = await adminClient
      .from('subcontracts')
      .select('id, procore_commitment_id, project_id, projects!inner(procore_project_id)')
      .eq('subcontractor_name', 'Unknown');

    if (fetchError) {
      console.error('Failed to fetch unknown subcontracts:', fetchError);
      throw new Error('Failed to fetch unknown subcontracts');
    }

    console.log(`Found ${unknownSubcontracts?.length || 0} subcontracts with Unknown vendor`);

    let updatedCount = 0;
    let failedCount = 0;

    for (const subcontract of (unknownSubcontracts || [])) {
      try {
        const project = Array.isArray(subcontract.projects) ? subcontract.projects[0] : subcontract.projects;
        let projectId = project?.procore_project_id as string | null;
        const commitmentId = subcontract.procore_commitment_id;
        
        if (!projectId) {
          // Fallback: fetch project by foreign key
          const { data: projRow } = await adminClient
            .from('projects')
            .select('procore_project_id')
            .eq('id', subcontract.project_id)
            .maybeSingle();
          projectId = projRow?.procore_project_id ?? null;
        }
        
        if (!projectId) {
          console.error(`No project ID found for subcontract ${subcontract.id}`);
          failedCount++;
          continue;
        }
        
        console.log(`Processing commitment ${commitmentId}...`);

        let vendorName = 'Unknown';
        let vendorEmail = null;
        let vendorId = null;

        // Fetch commitment details
        const detailResponse = await procoreFetch(
          `https://api.procore.com/rest/v1.0/commitments/${commitmentId}?project_id=${projectId}&company_id=${companyId}`
        );

        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          console.log(`Commitment ${commitmentId} vendor:`, JSON.stringify(detail.vendor));

          if (detail.vendor) {
            vendorId = detail.vendor.id;
            vendorName = detail.vendor.name || detail.vendor.company || vendorName;
            vendorEmail = detail.vendor.email_address || detail.vendor.email || vendorEmail;
          }
        }

        // If still no name but we have vendor ID, fetch vendor directly
        if (vendorName === 'Unknown' && vendorId) {
          const vendorResponse = await procoreFetch(
            `https://api.procore.com/rest/v1.0/vendors/${vendorId}?company_id=${companyId}`
          );

          if (vendorResponse.ok) {
            const vendor = await vendorResponse.json();
            vendorName = vendor.name || vendor.company || vendorName;
            vendorEmail = vendor.email_address || vendor.email || vendorEmail;
          }
        }

        // Update the subcontract if we found a name
        if (vendorName !== 'Unknown') {
          const { error: updateError } = await adminClient
            .from('subcontracts')
            .update({
              subcontractor_name: vendorName,
              subcontractor_email: vendorEmail,
              last_updated_at: new Date().toISOString(),
            })
            .eq('id', subcontract.id);

          if (updateError) {
            console.error(`Failed to update subcontract ${subcontract.id}:`, updateError);
            failedCount++;
          } else {
            console.log(`Updated subcontract ${subcontract.id} with vendor: ${vendorName}`);
            updatedCount++;
          }
        } else {
          console.log(`Could not resolve vendor for commitment ${commitmentId}`);
          failedCount++;
        }
      } catch (error) {
        console.error(`Error processing subcontract ${subcontract.id}:`, error);
        failedCount++;
      }
    }

    console.log(`Backfill completed: ${updatedCount} updated, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total: unknownSubcontracts.length,
        updated: updatedCount,
        failed: failedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in procore-vendor-backfill:', error);
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
