// netlify/functions/fixtures.js

import fetch from "node-fetch";

export async function handler(event, context) {
  try {
    const API_KEY = "15baf5cd3f86610045f686247288fbe2";
    const API_HOST = "v3.football.api-sports.io";

    // Get today's date
    const today = new Date().toISOString().slice(0, 10);

    // Build the endpoint URL
    const url = `https://${API_HOST}/fixtures?date=${today}&league=39&season=2025`;

    // Fetch data from API-Football
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": API_KEY,
      },
    });

    const data = await res.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // allow frontend to call
      },
      body: JSON.stringify(data.response || []),
    };
  } catch (err) {
    console.error("Error fetching fixtures:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch fixtures" }),
    };
  }
}
