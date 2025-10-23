import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const NETLIFY_API = "https://api.netlify.com/api/v1";
const NETLIFY_AUTH_TOKEN = "nfp_HLb6H97TqreyaEhH68fi9hoGYm1ttm246998";

// 🔹 Map of domains to Netlify site IDs
const SITE_MAP = {
  "kattarra.netlify.app": "661af476-b1e1-431f-a6a2-0fc174a05ae2",
  "iroohh.netlify.app": "1c5da329-b963-4bcc-bb6b-4c74b022b347",
  "zuuko.netlify.app": "38c95e99-071f-433b-b27f-4c7e42f7cce0",
  "ozulastream.netlify.app": "60a96737-a9d0-49ea-bb2a-d7ffedf0931a",
  "ozaistream.netlify.app": "39022f71-8675-46b4-a468-a3d1345910ea"
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
