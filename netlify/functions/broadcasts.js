// netlify/functions/broadcasts.js
const fetch = require("node-fetch");

exports.handler = async function(event, context) {
  try {
    // Example: Premier League events
    const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4328`; // upcoming events
    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("Broadcast API Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch broadcasts" })
    };
  }
};

