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

    // Decode state to get user and redirect info
    let userId: string;
    let redirectAfter = '/settings';
    try {
      const s = JSON.parse(atob(state));
      userId = s.userId;
      redirectAfter = s.redirect || redirectAfter;
      const age = Date.now() - (s.ts ?? 0);
      if (age > 10 * 60 * 1000) {
        console.warn('State parameter appears old:', age);
      }
    } catch (e) {
      console.error('Failed to decode state:', e);
      throw new Error('Invalid state parameter');
    }

    const clientId = Deno.env.get('PROCORE_CLIENT_ID');
    const clientSecret = Deno.env.get('PROCORE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/procore-callback`;

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

    // Store the access token securely in user's profile
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Using userId from state parameter - no auth header required

    // Store/update tokens in oauth_tokens table
    const { error: updateError } = await supabaseClient
      .from('oauth_tokens')
      .upsert({
        user_id: userId,
        procore_access_token: tokenData.access_token,
        procore_refresh_token: tokenData.refresh_token,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('Failed to store token:', updateError);
      throw new Error('Failed to store access token');
    }

    // Redirect back to app
    const successUrl = redirectAfter.includes('?')
      ? `${redirectAfter}&procore=connected`
      : `${redirectAfter}?procore=connected`;
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': successUrl,
      },
    });
  } catch (error) {
    console.error('Error in procore-callback:', error);
    let errorRedirect = '/settings?procore=error';
    try {
      const url = new URL(req.url);
      const state = url.searchParams.get('state');
      if (state) {
        const s = JSON.parse(atob(state));
        const base = s.redirect || '/settings';
        errorRedirect = base.includes('?') ? `${base}&procore=error` : `${base}?procore=error`;
      }
    } catch (_) {
      // ignore
    }
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': errorRedirect,
      },
    });
  }
});
