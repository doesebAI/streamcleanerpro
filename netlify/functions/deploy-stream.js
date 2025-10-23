import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const NETLIFY_API = "https://api.netlify.com/api/v1";
const NETLIFY_AUTH_TOKEN = "nfp_HLb6H97TqreyaEhH68fi9hoGYm1ttm246998";

// 🔹 Map of domains to Netlify site IDs
const SITE_MAP = {
  "kattarra.netlify.app": "YOUR_SITE_ID_1",
  "iroohh.netlify.app": "YOUR_SITE_ID_2",
  "zuuko.netlify.app": "YOUR_SITE_ID_3",
  "ozulastream.netlify.app": "YOUR_SITE_ID_4",
  "ozaistream.netlify.app": "YOUR_SITE_ID_5"
};

// 🔹 Supabase credentials
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY"; // secure in Netlify env var

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const { domain, filename, htmlContent, userId, fixtureKey } = JSON.parse(event.body || "{}");
    if (!domain || !filename || !htmlContent) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required parameters" }) };
    }

    const siteId = SITE_MAP[domain];
    if (!siteId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Unknown domain" }) };
    }

    // 🔹 Upload file to Netlify site
    const uploadRes = await fetch(`${NETLIFY_API}/sites/${siteId}/files/${filename}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${NETLIFY_AUTH_TOKEN}`,
        "Content-Type": "text/html"
      },
      body: htmlContent
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error("Netlify upload error:", errorText);
      return { statusCode: uploadRes.status, body: JSON.stringify({ error: "Failed to upload file" }) };
    }

    const liveUrl = `https://${domain.replace(/\/$/, "")}/${filename}`;

    // 🔹 Log deployment into Supabase
    await supabase.from("deployments").insert([
      {
        user_id: userId || "guest",
        domain,
        fixture_key: fixtureKey || null,
        filename,
        live_url: liveUrl,
        deployed_at: new Date().toISOString()
      }
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        url: liveUrl
      })
    };

  } catch (err) {
    console.error("Error in deploy-stream:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: err.message })
    };
  }
};
