const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async function () {
  try {
    // Example: fetch English Premier League broadcasts (id = 4328)
    const url = "https://www.thesportsdb.com/api/v1/json/3/eventstv.php?id=4328";
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.tvevents) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No broadcasts found" }),
      };
    }

    // Insert into Supabase
    const { error } = await supabase.from("broadcasts").upsert(
      data.tvevents.map((event) => ({
        event_id: event.idEvent,
        event_name: event.strEvent,
        tv_station: event.strTVStation,
        country: event.strCountry,
      })),
      { onConflict: ["event_id", "tv_station"] }
    );

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, count: data.tvevents.length }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
