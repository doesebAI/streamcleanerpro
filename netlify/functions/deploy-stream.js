/**
 * Deploy Stream – uploads generated HTML to the user's assigned Netlify domain.
 * Requires environment variables:
 *   NETLIFY_TOKEN   -> your personal access token
 *   SUPABASE_URL    -> e.g. https://xyz.supabase.co
 *   SUPABASE_KEY    -> service role key (never public)
 */

import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const netlifyToken = process.env.NETLIFY_TOKEN;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    const { userId, domain, html, streamKey } = JSON.parse(req.body || "{}");
    if (!userId || !domain || !html) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // --- Step 1. Check if domain is already assigned ---
    const { data: existing, error: domainError } = await supabase
      .from("domains")
      .select("*")
      .eq("domain", domain)
      .single();

    if (domainError && domainError.code !== "PGRST116") throw domainError;

    if (existing && existing.assigned_to && existing.assigned_to !== userId) {
      return res.status(403).json({ error: "Domain already assigned to another user." });
    }

    // --- Step 2. Assign domain to this user if not already ---
    if (!existing) {
      await supabase.from("domains").insert([{ domain, assigned_to: userId, created_at: new Date().toISOString() }]);
    } else if (!existing.assigned_to) {
      await supabase
        .from("domains")
        .update({ assigned_to: userId })
        .eq("domain", domain);
    }

    // --- Step 3. Upload file to Netlify using the API ---
    const siteName = domain.replace(/^https?:\/\//, "").replace(/\.netlify\.app\/?$/, "");
    const fileName = `${streamKey || "stream"}-${Date.now()}.html`;

    const uploadResp = await fetch(`https://api.netlify.com/api/v1/sites/${siteName}/files/${fileName}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        "Content-Type": "text/html",
      },
      body: html,
    });

    if (!uploadResp.ok) {
      const msg = await uploadResp.text();
      throw new Error(`Netlify upload failed: ${msg}`);
    }

    const fullUrl = `${domain.replace(/\/$/, "")}/${fileName}`;

    // --- Step 4. Record deployment in Supabase ---
    await supabase.from("deployments").insert([
      {
        user_id: userId,
        domain,
        stream_key: streamKey,
        url: fullUrl,
        created_at: new Date().toISOString(),
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Stream deployed successfully",
      url: fullUrl,
    });
  } catch (err) {
    console.error("Deploy error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
