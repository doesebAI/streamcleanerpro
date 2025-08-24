import fetch from "node-fetch";

const API_SPORTS_KEY = "15baf5cd3f86610045f686247288fbe2";
const SPORTSDB_KEY = "3"; // demo key

export async function handler(event) {
  try {
    const { sport = "football" } = event.queryStringParameters;

    // 1) Fetch fixtures from API-Sports
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?next=10`, {
      headers: { "x-apisports-key": API_SPORTS_KEY }
    });
    const { response } = await res.json();

    // 2) Merge with SportsDB broadcaster info
    const matches = [];
    for (let fx of response) {
      const matchId = fx.fixture.id;
      const title = `${fx.teams.home.name} vs ${fx.teams.away.name}`;
      const start = fx.fixture.date;
      const thumbnail = fx.teams.home.logo;

      // call SportsDB
      const dbRes = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/lookuptv.php?id=${matchId}`
      );
      const dbData = await dbRes.json();
      const broadcasters = dbData?.tvchannels?.map(ch => ch.strChannel) || [];

      // build slugs for IPTV
      const slugs = broadcasters.map(ch =>
        ch.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      );

      matches.push({
        id: matchId,
        title,
        sport,
        start,
        thumbnail,
        broadcasters,
        slugs
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify(matches)
    };

  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
}
