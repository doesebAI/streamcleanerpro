// netlify/functions/get-streams.js
// Safe aggregator: Scorebat (licensed highlights) + YOUR authorized sources per sport.
// Set env vars in Netlify:
// - SCOREBAT_KEY = <your scorebat token> (optional but recommended for football highlights)
// - IPTV_M3U_URLS_JSON = JSON mapping of sports -> array of M3U URLs YOU ARE AUTHORIZED TO USE
//   Example:
//   {
//     "football": ["https://your-cdn.example.com/football.m3u"],
//     "basketball": ["https://partner.example.com/nba-rights.m3u8.m3u"],
//     "mma": [],
//     "tennis": [],
//     "motorsport": []
//   }

const ALLOWED_SPORTS = new Set([
  'all', 'football', 'basketball', 'american_football', 'mma', 'tennis', 'motorsport'
]);

const DEFAULT_LIMIT = 20;
const SCOREBAT_KEY = process.env.SCOREBAT_KEY || '';
let IPTV_MAP = {};
try {
  IPTV_MAP = JSON.parse(process.env.IPTV_M3U_URLS_JSON || '{}');
} catch (_) {
  IPTV_MAP = {};
}

// Tiny cache to reduce API hits during a single function instance lifetime.
let CACHE = {
  ts: 0,
  data: { all: [] }
};
const CACHE_TTL_MS = 60 * 1000; // 60s

export async function handler(event) {
  try {
    const url = new URL(event.rawUrl);
    const sport = (url.searchParams.get('sport') || 'all').toLowerCase();
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || DEFAULT_LIMIT, 10)));

    if (!ALLOWED_SPORTS.has(sport)) {
      return json(400, { error: 'Invalid sport' });
    }

    // Serve cached if fresh and same sport
    const now = Date.now();
    if (now - CACHE.ts < CACHE_TTL_MS && CACHE.data[sport]) {
      return json(200, CACHE.data[sport].slice(0, limit));
    }

    // Build fresh payload
    const results = [];
    const addItem = (item) => {
      // minimal sanitation
      if (!item || !item.title || !item.iframe) return;
      if (!item.sport || !ALLOWED_SPORTS.has(item.sport)) item.sport = 'other';
      // avoid dupes by title+iframe
      const key = item.title + '|' + item.iframe;
      if (!results._seen) results._seen = new Set();
      if (results._seen.has(key)) return;
      results._seen.add(key);
      results.push(item);
    };

    // 1) FOOTBALL: Scorebat (if configured) – highlights with official embed
    if (SCOREBAT_KEY && (sport === 'all' || sport === 'football')) {
      try {
        const sb = await fetch(`https://www.scorebat.com/video-api/v3/feed/?token=${SCOREBAT_KEY}`, { timeout: 15000 });
        const data = await sb.json();
        if (data && Array.isArray(data.response)) {
          for (const m of data.response) {
            // Scorebat provides .videos[*].embed (HTML snippet) – we’ll wrap it via our player page later if needed.
            // Here we use the first video’s embed if present.
            const vid = (m.videos && m.videos[0]) ? m.videos[0] : null;
            if (!vid || !vid.embed) continue;

            // We return an iframe page URL we control: /player.html?embed=...
            // player.html will safely render the third-party embed in sandboxed iframe.
            const playerUrl = `/player.html?embed=${encodeURIComponent(vid.embed)}`;

            addItem({
              title: m.title || 'Football match',
              sport: 'football',
              source: 'Scorebat',
              thumbnail: m.thumbnail || (m.thumbnailUrl || m.competition?.thumbnail) || '',
              // Use absolute URL for frontend convenience
              iframe: absolute(url, playerUrl)
            });
          }
        }
      } catch (e) {
        // swallow but log
        console.error('Scorebat fetch error:', e.message);
      }
    }

    // 2) YOUR AUTHORIZED SOURCES (per sport) using M3U playlists
    // We only parse playlists YOU provided via env. These must be sources you have rights to use.
    const sportsToFetch = sport === 'all'
      ? ['football','basketball','american_football','mma','tennis','motorsport']
      : [sport];

    for (const s of sportsToFetch) {
      const list = Array.isArray(IPTV_MAP[s]) ? IPTV_MAP[s] : [];
      for (const m3uUrl of list) {
        try {
          const res = await fetch(m3uUrl, { timeout: 15000 });
          const text = await res.text();
          const entries = parseM3U(text);

          // Turn media URLs into player pages we control: /player.html?src=<m3u8 or stream url>
          // That gives you an iframe URL that your frontend can hand to users.
          for (const e of entries) {
            // We prefer HLS m3u8 streams; skip non-http(s)
            if (!/^https?:\/\//i.test(e.url)) continue;

            // Build a player URL
            const playerUrl = `/player.html?src=${encodeURIComponent(e.url)}&t=${encodeURIComponent(e.title || '')}`;

            addItem({
              title: e.title || e.name || 'Live Channel',
              sport: s,
              source: hostnameOf(m3uUrl),
              thumbnail: e.logo || '',
              iframe: absolute(url, playerUrl)
            });
          }
        } catch (err) {
          console.error(`M3U fetch error for ${m3uUrl}:`, err.message);
        }
      }
    }

    const payload = results.slice(0, limit);
    CACHE.ts = now;
    CACHE.data[sport] = payload;
    return json(200, payload);
  } catch (e) {
    console.error('get-streams error:', e);
    return json(500, { error: 'Internal error' });
  }
}

// --- helpers ---

function parseM3U(text) {
  // Very lightweight M3U parser for EXTINF blocks.
  const out = [];
  const lines = text.split(/\r?\n/);
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      current = { title: '', logo: '' };
      // Extract tvg-logo and title if present
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      if (logoMatch) current.logo = logoMatch[1];
      const titleMatch = line.split(','); // last comma part is usually title
      if (titleMatch.length > 1) current.title = titleMatch[titleMatch.length - 1].trim();
    } else if (!line.startsWith('#') && current) {
      current.url = line;
      out.push(current);
      current = null;
    }
  }
  return out;
}

function hostnameOf(u) {
  try { return new URL(u).hostname; } catch { return 'source'; }
}
function absolute(reqUrl, pathOrAbs) {
  try {
    const base = new URL(reqUrl);
    if (/^https?:\/\//i.test(pathOrAbs)) return pathOrAbs;
    return new URL(pathOrAbs, base.origin).toString();
  } catch {
    return pathOrAbs;
  }
}

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store

