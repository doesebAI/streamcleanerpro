// netlify/functions/get-streams.js
// Returns a unified list of live streams across sports.
// Sources: Scorebat (football iframes) + IPTV playlists (M3U) you control.
//
// ENV required:
// - SCOREBAT_TOKEN = your Scorebat API token
// - IPTV_M3U_URLS  = comma-separated URLs to legal IPTV M3U playlists you control (e.g. https://example.com/sports.m3u8,https://...)
// Optional:
// - SPORTS_FILTER = comma-separated sports to include (football,basketball,nfl,tennis,ufc,f1,cricket,...)

const SPORT_ICON = {
  football: "⚽",
  basketball: "🏀",
  nfl: "🏈",
  tennis: "🎾",
  ufc: "🥊",
  f1: "🏎️",
  cricket: "🏏",
  rugby: "🏉",
  hockey: "🏒",
  baseball: "⚾",
  motorsport: "🏁",
  other: "🎮",
};

const DEFAULT_THUMB = (sport='other') =>
  `https://dummyimage.com/480x270/111/fff.png&text=${encodeURIComponent((SPORT_ICON[sport]||'🎮')+' '+sport.toUpperCase())}`;

const SPORTS_KEYWORDS = [
  { sport: 'football',   re: /(football|soccer|laliga|serie\s?a|premier|bundesliga|ligue\s?1|uefa|espn\s?fc|sky\s?sports\s?football)/i },
  { sport: 'basketball', re: /(basketball|nba|euroleague|espn\s?2|tnt\s?sports\s?nba)/i },
  { sport: 'nfl',        re: /(nfl|red\s?zone|american\s?football)/i },
  { sport: 'tennis',     re: /(tennis|atp|wta|grand\s?slam)/i },
  { sport: 'ufc',        re: /(ufc|mma|bellator|pfl|fight|boxing)/i },
  { sport: 'f1',         re: /(f1|formula\s?1|motogp)/i },
  { sport: 'cricket',    re: /(cricket|ipl|bbl|the\s?hundred)/i },
  { sport: 'rugby',      re: /(rugby|six\s?nations|super\s?rugby)/i },
  { sport: 'hockey',     re: /(nhl|hockey|ice\s?hockey)/i },
  { sport: 'baseball',   re: /(mlb|baseball)/i },
  { sport: 'motorsport', re: /(motorsport|nascar|indycar)/i },
];

function detectSport(name='') {
  for (const k of SPORTS_KEYWORDS) {
    if (k.re.test(name)) return k.sport;
  }
  return 'other';
}

function parseM3U(text) {
  // Very small M3U parser: pairs #EXTINF with next URL
  const lines = text.split(/\r?\n/);
  const items = [];
  let meta = null;
  for (let i=0; i<lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
      meta = line;
    } else if (meta && line && !line.startsWith('#')) {
      const nameMatch = meta.match(/tvg-name="([^"]+)"/i) || meta.match(/,(.*)$/);
      const groupMatch = meta.match(/group-title="([^"]+)"/i);
      const name = nameMatch ? nameMatch[1].trim() : 'Live Channel';
      const group = groupMatch ? groupMatch[1].trim() : '';
      items.push({ name, group, url: line });
      meta = null;
    }
  }
  return items;
}

async function fetchScorebat() {
  const token = process.env.SCOREBAT_TOKEN;
  if (!token) return [];
  const url = `https://www.scorebat.com/video-api/v3/feed/?token=${token}`;
  const res = await fetch(url, { timeout: 15000 }).catch(() => null);
  if (!res || !res.ok) return [];
  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data.response)) return [];
  // Map to unified format
  return data.response.map(m => {
    // Extract embed src
    let iframeSrc = '';
    try {
      const m2 = m.videos?.[0]?.embed?.match(/src=['"]([^'"]+)['"]/);
      iframeSrc = m2 ? m2[1] : '';
    } catch {}
    return {
      sport: 'football',
      title: m.title || 'Football Match',
      competition: m.competition,
      thumbnail: m.thumbnail || DEFAULT_THUMB('football'),
      iframe: iframeSrc,
      source: 'scorebat',
    };
  }).filter(x => x.iframe);
}

async function fetchIPTV() {
  const urls = (process.env.IPTV_M3U_URLS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (!urls.length) return [];

  const out = [];
  for (const u of urls) {
    try {
      const r = await fetch(u, { timeout: 15000 });
      if (!r.ok) continue;
      const txt = await r.text();
      const items = parseM3U(txt);
      items.forEach(it => {
        const sport = detectSport(`${it.name} ${it.group}`);
        if (!/\.m3u8(\?|$)/i.test(it.url)) return; // keep HLS only
        out.push({
          sport,
          title: it.name,
          thumbnail: DEFAULT_THUMB(sport),
          iframe: it.url,     // (m3u8 — we’ll wrap with HLS player in clean-stream)
          source: 'iptv',
        });
      });
    } catch (e) {
      // ignore failed playlist
    }
  }
  return out;
}

exports.handler = async (event) => {
  try {
    const qs = new URLSearchParams(event.rawQuery || event.rawQueryString || '');
    const sportFilter = (qs.get('sport') || 'all').toLowerCase();
    const limit = Math.min(parseInt(qs.get('limit') || '50', 10), 200);

    // fetch sources in parallel
    const [football, iptv] = await Promise.all([
      fetchScorebat(),   // football with real iframe embeds
      fetchIPTV(),       // multi-sport m3u8
    ]);

    let all = [...football, ...iptv];

    // Optional allow-list
    const allow = (process.env.SPORTS_FILTER || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    if (allow.length) {
      all = all.filter(x => allow.includes(x.sport));
    }

    if (sportFilter !== 'all') {
      all = all.filter(x => x.sport === sportFilter);
    }

    // de-dupe by title+iframe
    const seen = new Set();
    const unique = [];
    for (const s of all) {
      const k = `${s.title}::${s.iframe}`;
      if (!seen.has(k)) { seen.add(k); unique.push(s); }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' },
      body: JSON.stringify(unique.slice(0, limit)),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

