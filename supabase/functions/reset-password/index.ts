import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, email, new_password } = body;

    if ((!user_id && !email) || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or email, and new_password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    let targetUserId: string = user_id;

    // If only email is provided, look up the user_id via admin API
    if (!targetUserId && email) {
      console.log(`Looking up user by email: ${email}`);
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      // List users and filter by email (works for small user bases)
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) {
        console.error('listUsers error:', listError.message);
        return new Response(
          JSON.stringify({ error: `Failed to look up user: ${listError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const normalizedEmail = email.trim().toLowerCase();
      const matchedUser = listData.users.find(
        (u: { email?: string }) => (u.email ?? '').toLowerCase() === normalizedEmail
      );
      if (!matchedUser) {
        console.error('No Supabase user found for email:', normalizedEmail);
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      targetUserId = matchedUser.id;
      console.log(`Found user id: ${targetUserId} for email: ${normalizedEmail}`);
    }

    // Use Auth Admin REST API to update the password
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ password: new_password }),
    });

    const resultText = await response.text();
    console.log(`Auth admin PUT status: ${response.status}, body: ${resultText}`);

    if (!response.ok) {
      let parsed: any = {};
      try { parsed = JSON.parse(resultText); } catch (_) {}
      const errMsg = parsed?.msg ?? parsed?.message ?? parsed?.error_description ?? parsed?.error ?? `Auth API error (${response.status}): ${resultText}`;
      console.error('Auth admin PUT error:', errMsg);
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
