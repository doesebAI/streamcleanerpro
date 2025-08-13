// netlify/functions/refresh-sources.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Configure M3U sources you trust (community-maintained)
const M3U_SOURCES = [
  { id: 'iptv-org-sports', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
  { id: 'iptv-org-regions-eur', url: 'https://iptv-org.github.io/iptv/regions/eur.m3u' },
  { id: 'free-tv-playlist', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8' }
];

async function callFunction(path, body) {
  const url = `${process.env.SITE_URL}/.netlify/functions/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res;
}

// Very simple keyword scoring function
function scoreMatchToChannel(matchTitle, channelTitle) {
  const m = matchTitle.toLowerCase();
  const c = channelTitle.toLowerCase();
  let score = 0;

  // if a team name appears in the channel label, +10
  const words = m.split(/\W+/).filter(Boolean);
  for (const w of words) {
    if (w.length < 3) continue;
    if (c.includes(w)) score += 10;
  }

  // if competition keywords in channel name (espn, sky, bt, fox) boost slightly
  const bcastKeywords = ['espn', 'sky', 'bt', 'fox', 'bein', 'ten', 'rtp', 'canal', 'nova', 'tv', 'skysports'];
  for (const k of bcastKeywords) if (c.includes(k)) score += 2;

  // shorter channel title exact-matches add more weight
  if (c === m) score += 20;

  return score;
}

exports.handler = async function () {
  try {
    // 1) Parse all M3U sources (call parse-m3u function for centralised parsing)
    for (const src of M3U_SOURCES) {
      try {
        await callFunction('parse-m3u', { url: src.url, sourceId: src.id });
      } catch (err) {
        console.warn('parse-m3u call failed for', src.url, err.message || err);
      }
    }

    // 2) Get parsed channels from DB
    const { data: channels, error: chanErr } = await supabase
      .from('streams')
      .select('id,source,match_name,direct_url,iframe_url')
      .eq('source', 'm3u:iptv-org-sports')
      .limit(2000);

    if (chanErr) {
      console.error('Error fetching channels from DB', chanErr);
      // still proceed to scorebat fetch
    }

    // 3) Fetch Scorebat matches
    const scoreRes = await fetch(`${process.env.SITE_URL}/.netlify/functions/get-matches-scorebat`);
    let scoreData = [];
    if (scoreRes.ok) {
      scoreData = await scoreRes.json();
    } else {
      console.warn('Scorebat function returned', await scoreRes.text());
    }

    // 4) Match heuristics: for each Scorebat match, find best channel(s)
    const matchesToUpsert = [];

    for (const match of scoreData) {
      let best = null;
      let bestScore = 0;
      const matchTitle = (match.title || '').trim();

      if (!matchTitle) continue;

      if (channels && channels.length) {
        for (const ch of channels) {
          const chTitle = ch.match_name || '';
          const s = scoreMatchToChannel(matchTitle, chTitle);
          if (s > bestScore && s > 5) { // threshold, avoid weak matches
            bestScore = s;
            best = ch;
          }
        }
      }

      if (best) {
        matchesToUpsert.push({
          source: `match:scorebat`,
          match_name: matchTitle,
          iframe_url: best.iframe_url || null,
          direct_url: best.direct_url || null,
          thumbnail: match.thumbnail || null,
          active: true,
          last_seen: new Date().toISOString()
        });
      }
    }

    // 5) Upsert matched streams into streams table
    if (matchesToUpsert.length) {
      const { error: upErr } = await supabase.from('streams').upsert(matchesToUpsert, { onConflict: ['source','match_name','direct_url'] });
      if (upErr) console.error('Upsert matches error', upErr);
    }

    // 6) Deactivate old streams via RPC (older than 6 hours)
    try {
      await supabase.rpc('deactivate_old_streams', { hours: 6 });
    } catch (err) {
      console.warn('deactivate_old_streams rpc error', err.message || err);
    }

    return { statusCode: 200, body: 'refresh completed' };
  } catch (err) {
    console.error('refresh-sources error', err);
    return { statusCode: 500, body: String(err) };
  }
};
