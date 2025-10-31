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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    if (!code) {
      throw new Error('No authorization code provided');
    }

    if (!state) {
      throw new Error('No state parameter provided');
    }

    // Decode state to get user ID
    let userId: string;
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
      
      // Verify timestamp is recent (within 10 minutes)
      const age = Date.now() - stateData.timestamp;
      if (age > 10 * 60 * 1000) {
        throw new Error('State parameter expired');
      }
    } catch (e) {
      console.error('Failed to decode state:', e);
      throw new Error('Invalid state parameter');
    }

    const clientId = Deno.env.get('PROCORE_CLIENT_ID');
    const clientSecret = Deno.env.get('PROCORE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/procore-callback`;

    console.log('Processing OAuth callback for user:', userId);

    // Exchange code for access token
    const tokenResponse = await fetch('https://login.procore.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    console.log('Successfully obtained access token');

    // Store the access token securely in user's profile using service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store token in profiles table
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        procore_access_token: tokenData.access_token,
        procore_refresh_token: tokenData.refresh_token,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to store token:', updateError);
      throw new Error('Failed to store access token');
    }

    console.log('Successfully stored Procore tokens for user:', userId);

    // Redirect back to settings page
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': '/settings?procore=connected',
      },
    });
  } catch (error) {
    console.error('Error in procore-callback:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', message);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `/settings?procore=error&message=${encodeURIComponent(message)}`,
      },
    });
  }
});
