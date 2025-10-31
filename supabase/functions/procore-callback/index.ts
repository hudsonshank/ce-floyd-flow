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
    
    if (!code) {
      throw new Error('No authorization code provided');
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('User not found');
    }

    // Store token in profiles table
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        procore_access_token: tokenData.access_token,
        procore_refresh_token: tokenData.refresh_token,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to store token:', updateError);
      throw new Error('Failed to store access token');
    }

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
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': '/settings?procore=error',
      },
    });
  }
});
