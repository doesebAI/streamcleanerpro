// netlify/functions/get-streams.js
import fetch from "node-fetch";

export async function handler(event) {
  const { sport = "all", limit = 15 } = event.queryStringParameters;

  const apiSportsKey = "15baf5cd3f86610045f686247288fbe2"; // Your API-Sports key
  const sportsDBBase = "https://www.thesportsdb.com/api/v1/json/3";

  try {
    // 1. Fetch upcoming matches from API-Sports
    const fixturesRes = await fetch(`https://v3.football.api-sports.io/fixtures?live=all`, {
      headers: { "x-apisports-key": apiSportsKey }
    });
    const fixturesData = await fixturesRes.json();

    let streams = [];

    for (let fx of fixturesData.response.slice(0, limit)) {
      const matchId = fx.fixture.id;
      const home = fx.teams.home.name;
      const away = fx.teams.away.name;
      const title = `${home} vs ${away}`;
      const thumb = fx.teams.home.logo;

      // 2. Fetch broadcaster info from TheSportsDB
      const tvRes = await fetch(`${sportsDBBase}/lookuptv.php?id=${matchId}`);
      const tvData = await tvRes.json();
      const broadcaster = tvData?.tvchannels?.[0]?.strChannel || "Unknown";

      // 3. Map broadcaster → IPTV URL
      let iframeUrl = null;
      if (broadcaster && broadcaster !== "Unknown") {
        const slug = broadcaster.toLowerCase().replace(/\s+/g, "-");
        iframeUrl = `https://t4tv.click/sports/${slug}.php`;
      }

      streams.push({
        title,
        sport,
        time: fx.fixture.date,
        thumbnail: thumb,
        source: broadcaster,
        iframe: iframeUrl
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify(streams)
    };

  } catch (err) {
    console.error("get-streams error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to load streams" })
    };
  }
}
