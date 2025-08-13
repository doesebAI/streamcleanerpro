// netlify/functions/get-matches-scorebat.js
const fetch = require('node-fetch');

exports.handler = async function () {
  try {
    // Scorebat v3 API endpoint (no key for basic access)
    // Note: Scorebat sometimes rate-limits. We treat this as a best-effort source.
    const res = await fetch('https://www.scorebat.com/video-api/v3/');
    if (!res.ok) return { statusCode: 502, body: 'Scorebat fetch failed' };

    const json = await res.json();
    // v3 response includes .response array with items containing title, competition, date, videos[]
    const items = json.response || json;

    // Normalize: keep title & thumbnail
    const matches = (items || []).map(it => ({
      title: it.title || it.match || 'Unknown Match',
      thumbnail: it.thumbnail || (it.videos && it.videos[0] && it.videos[0].thumbnail) || null,
      date: it.date || null,
      raw: it
    }));

    return { statusCode: 200, body: JSON.stringify(matches) };
  } catch (err) {
    console.error('Scorebat fetch error', err);
    return { statusCode: 500, body: String(err) };
  }
};
