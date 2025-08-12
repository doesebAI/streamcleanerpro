// netlify/functions/get-streams.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function () {
  try {
    const { data, error } = await supabase
      .from('streams')
      .select('id,source,match_name,iframe_url,direct_url,thumbnail,last_seen')
      .eq('active', true)
      .order('last_seen', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Supabase get-streams error', error);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    // Normalize so dashboard can easily use `embedUrl`
    const normalized = data.map(row => ({
      id: row.id,
      source: row.source,
      match: row.match_name,
      iframe_url: row.iframe_url,
      direct_url: row.direct_url,
      thumbnail: row.thumbnail || null,
      embedUrl: row.iframe_url || row.direct_url
    }));

    return { statusCode: 200, body: JSON.stringify(normalized) };
  } catch (err) {
    console.error('get-streams error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
