// netlify/functions/check-email.js
const fetch = global.fetch;

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env; // Set in Netlify env

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing email' }) };
    }

    // 1) Check if already used
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/one_time_uses?email=eq.${encodeURIComponent(email)}&select=email`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      }
    });

    if (!checkRes.ok) {
      const t = await checkRes.text();
      throw new Error(`Supabase check failed: ${t}`);
    }
    const rows = await checkRes.json();
    if (rows.length > 0) {
      // Already used
      return { statusCode: 200, body: JSON.stringify({ allowed: false }) };
    }

    // 2) Insert usage record
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/one_time_uses`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({ email })
    });

    if (!insertRes.ok) {
      const t = await insertRes.text();
      throw new Error(`Supabase insert failed: ${t}`);
    }

    return { statusCode: 200, body: JSON.stringify({ allowed: true }) };

  } catch (err) {
    console.error('check-email error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
