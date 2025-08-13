import fetch from 'node-fetch';

export async function handler(event) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  try {
    const { user_id, action, details, xp_points } = JSON.parse(event.body);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id,
        action,
        details,
        xp_points
      })
    });

    const data = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
