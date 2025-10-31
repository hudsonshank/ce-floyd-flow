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
    const clientId = Deno.env.get('PROCORE_CLIENT_ID');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/procore-callback`;
    
    if (!clientId) {
      throw new Error('PROCORE_CLIENT_ID not configured');
    }

    // Identify user from Authorization header to build OAuth state
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !user) {
      console.error('Failed to resolve user from token:', userErr);
      throw new Error('Unable to resolve user');
    }

    // Determine app origin to redirect back after OAuth
    const origin =
      req.headers.get('Origin') ||
      req.headers.get('Referer')?.replace(/\/[^/]*$/, '') ||
      '';

    const redirectAfter = origin ? `${origin}/settings` : '/settings';

    // Create state parameter
    const statePayload = {
      userId: user.id,
      redirect: redirectAfter,
      ts: Date.now(),
    };
    const state = btoa(JSON.stringify(statePayload));

    // Construct Procore OAuth URL
    const authUrl = new URL('https://login.procore.com/oauth/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state);

    console.log('Redirecting to Procore OAuth:', authUrl.toString());

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in procore-auth:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
