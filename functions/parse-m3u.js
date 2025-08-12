// netlify/functions/parse-m3u.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Simple M3U parser
function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const items = [];
  let lastInfo = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      lastInfo = line;
    } else if (!line.startsWith('#')) {
      // url line
      const url = line;
      let title = 'Live Stream';
      if (lastInfo) {
        // take text after last comma
        const commaIndex = lastInfo.indexOf(',');
        if (commaIndex >= 0) title = lastInfo.slice(commaIndex + 1).trim();
      }
      items.push({ title, url });
      lastInfo = null;
    }
  }
  return items;
}

exports.handler = async function (event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { url, sourceId } = body;
    if (!url || !sourceId) return { statusCode: 400, body: 'Missing url or sourceId' };

    const res = await fetch(url, { timeout: 20000 });
    if (!res.ok) return { statusCode: 502, body: `Failed to fetch playlist: ${res.status}` };

    const text = await res.text();
    const items = parseM3U(text);
    if (!items.length) return { statusCode: 200, body: JSON.stringify({ parsed: 0 }) };

    const upserts = items.map(it => ({
      source: `m3u:${sourceId}`,
      match_name: it.title,
      direct_url: it.url,
      iframe_url: it.url.includes('.m3u8') ? it.url : null,
      thumbnail: null,
      active: true,
      last_seen: new Date().toISOString()
    }));

    // Upsert on (source, direct_url)
    const { error } = await supabase.from('streams').upsert(upserts, { onConflict: ['source','direct_url'] });
    if (error) {
      console.error('Supabase upsert error', error);
      return { statusCode: 500, body: 'DB error' };
    }

    return { statusCode: 200, body: JSON.stringify({ parsed: upserts.length }) };
  } catch (err) {
    console.error('parse-m3u error', err);
    return { statusCode: 500, body: String(err) };
  }
};
