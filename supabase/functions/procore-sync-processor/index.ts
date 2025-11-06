import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * This function processes the procore_sync_queue table and calls procore-sync
 * for each user that has a pending sync request.
 *
 * This is designed to be called by pg_cron every 10 minutes, or manually triggered.
 * It can also be called via webhook/HTTP for real-time syncing.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function should only be called by service role or via cron
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting procore-sync-processor...');

    // Get all pending sync requests
    const { data: pendingRequests, error: fetchError } = await adminClient
      .from('procore_sync_queue')
      .select('user_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50); // Process max 50 users per run to avoid timeout

    if (fetchError) {
      console.error('Error fetching pending sync requests:', fetchError);
      throw fetchError;
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      console.log('No pending sync requests found');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending syncs', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingRequests.length} pending sync requests`);

    let successCount = 0;
    let failureCount = 0;

    // Process each sync request
    for (const request of pendingRequests) {
      try {
        // Mark as processing
        await adminClient
          .from('procore_sync_queue')
          .update({ status: 'processing' })
          .eq('user_id', request.user_id);

        // Get user's auth token to call procore-sync function
        const { data: { users }, error: userError } = await adminClient.auth.admin.listUsers();

        if (userError) {
          throw new Error(`Failed to list users: ${userError.message}`);
        }

        const user = users.find(u => u.id === request.user_id);

        if (!user) {
          throw new Error(`User ${request.user_id} not found`);
        }

        // Generate a JWT for this user to call the procore-sync function
        const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email: user.email!,
        });

        if (sessionError) {
          throw new Error(`Failed to generate session: ${sessionError.message}`);
        }

        // Call the procore-sync function
        const syncUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/procore-sync`;

        // For service-to-service calls, we'll use the service role key
        // and pass the user_id in the request body
        const syncResponse = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: request.user_id }),
        });

        if (!syncResponse.ok) {
          const errorText = await syncResponse.text();
          throw new Error(`Procore sync failed: ${errorText}`);
        }

        const syncResult = await syncResponse.json();
        console.log(`Sync completed for user ${request.user_id}:`, syncResult);

        // Mark as completed
        await adminClient
          .from('procore_sync_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('user_id', request.user_id);

        successCount++;

      } catch (error) {
        console.error(`Error syncing for user ${request.user_id}:`, error);

        // Mark as failed
        await adminClient
          .from('procore_sync_queue')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('user_id', request.user_id);

        failureCount++;
      }
    }

    console.log(`Sync processing completed: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingRequests.length,
        succeeded: successCount,
        failed: failureCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in procore-sync-processor:', error);
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
