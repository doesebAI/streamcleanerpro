import fetch from "node-fetch";

export async function handler(event, context) {
  try {
    const url = "https://v3.football.api-sports.io/fixtures?league=39&season=2024&next=10"; // EPL, next 10 matches
    const response = await fetch(url, {
      headers: {
        "x-apisports-key": "15baf5cd3f86610045f686247288fbe2"
      }
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
}
