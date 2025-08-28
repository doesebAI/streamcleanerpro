// netlify/functions/fetchFixtures.js
import fetch from "node-fetch";

export async function handler(event, context) {
  const API_KEY = "3defc483f1msh829f1ba6d765e5bp1644a4js"; 
  const API_HOST = "api-football-v1.p.rapidapi.com";

  const today = new Date().toISOString().slice(0, 10);
  const url = `https://${API_HOST}/v3/fixtures?date=${today}&league=39&season=2025`;

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": API_HOST,
      },
    });

    const data = await r.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // ✅ allow frontend
      },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
