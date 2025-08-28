// netlify/functions/fixtures.js
const fetch = require("node-fetch"); // ensure node-fetch is installed in package.json

const API_KEY = process.env.API_SPORTS_KEY || "15baf5cd3f86610045f686247288fbe2"; 
const API_HOST = "v3.football.api-sports.io";

exports.handler = async function (event, context) {
  try {
    // You can change league & season here, or use query params
    const today = new Date().toISOString().slice(0, 10);
    const league = event.queryStringParameters?.league || 39; // Premier League default
    const season = event.queryStringParameters?.season || 2025;

    const url = `https://${API_HOST}/fixtures?date=${today}&league=${league}&season=${season}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": API_KEY,
        "x-apisports-host": API_HOST
      }
    });

    const data = await res.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // allows requests from your dashboard
      },
      body: JSON.stringify(data.response || [])
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
