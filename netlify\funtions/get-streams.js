// netlify/functions/get-streams.js
const fetch = require("node-fetch");

exports.handler = async () => {
  try {
    const SCOREBAT_API = process.env.SCOREBAT_API_URL; // e.g. "https://www.scorebat.com/video-api/v3/feed/?token=YOUR_TOKEN"

    if (!SCOREBAT_API) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing SCOREBAT_API_URL environment variable" })
      };
    }

    console.log("Fetching from Scorebat:", SCOREBAT_API);
    const response = await fetch(SCOREBAT_API);
    const data = await response.json();

    if (!data.response || !Array.isArray(data.response)) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid API response" })
      };
    }

    // Map the Scorebat matches to a simple structure
    const matches = data.response.map(match => ({
      match: match.title,
      thumbnail: match.thumbnail,
      iframe: match.videos?.[0]?.embed || "" // embed HTML from Scorebat
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(matches)
    };

  } catch (err) {
    console.error("Error fetching Scorebat streams:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch streams" })
    };
  }
};
