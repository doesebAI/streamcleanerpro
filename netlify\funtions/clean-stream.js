import fetch from "node-fetch";

export async function handler(event) {
  try {
    const { iframeUrl, adScript, sport, matchName, totalsportekMode, broadcastMode, freeintertvMode } = JSON.parse(event.body);

    // ✅ Defaults
    let finalIframe = iframeUrl;
    let broadcasterBlock = "";
    let totalsportekBlock = "";

    // --- Step 1: Include approved links block (if toggle checked)
    if (totalsportekMode) {
      totalsportekBlock = `
        <div class="approved-sources">
          <h3>Approved Sources</h3>
          <p>
            <a href="https://www.streameast100.com/" target="_blank">StreamEast</a> |
            <a href="https://totalsportek.football/" target="_blank">TOTALSPORTEK</a> |
            <a href="https://www.footybite.to/" target="_blank">FOOTYBITE</a> |
            <a href="https://www.nflbite.to/" target="_blank">NFLBITE</a> |
            <a href="https://reddit.nbabite.to/" target="_blank">NBABITE</a> |
            <a href="https://sportsurge100.com/" target="_blank">SPORTSURGE</a> |
            <a href="https://hesgoalfree.com/" target="_blank">HESGOAL</a> |
            <a href="https://soccer-1000.com/" target="_blank">SOCCER STREAMS</a> |
            <a href="https://www.f1streamsfree.com/" target="_blank">F1 STREAMS</a> |
            <a href="https://hufoot.com/" target="_blank">Hoofoot</a>
          </p>
        </div>
      `;
    }

    // --- Step 2: Fetch broadcaster info (TheSportsDB)
    if (broadcastMode && matchName) {
      try {
        const dbRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(matchName)}`);
        const dbData = await dbRes.json();
        if (dbData && dbData.event && dbData.event.length > 0) {
          const ev = dbData.event[0];
          broadcasterBlock = `
            <div class="broadcasters">
              <h3>Live on:</h3>
              <p>${ev.strTVStation || "Unknown broadcaster"}</p>
            </div>
          `;

          // --- Step 3: Swap iframe to FreeInterTV (if toggle is on)
          if (freeintertvMode && ev.strTVStation) {
            const channelSlug = ev.strTVStation.toLowerCase().replace(/\s+/g, "-");
            finalIframe = `https://t4tv.click/sports/${channelSlug}.php`;
          }
        }
      } catch (err) {
        console.error("Broadcast lookup failed", err);
      }
    }

    // --- HTML Output
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${matchName || "Clean Stream"}</title>
        <style>
          body { margin:0; background:#000; display:flex; flex-direction:column; align-items:center; color:#fff; }
          iframe { width:100%; height:90vh; border:0; }
          .ads { margin:10px 0; }
          .approved-sources, .broadcasters { margin:10px; font-size:14px; color:#ddd; }
        </style>
      </head>
      <body>
        <div class="ads">${adScript || ""}</div>
        ${broadcasterBlock}
        <iframe src="${finalIframe}" allowfullscreen></iframe>
        ${totalsportekBlock}
      </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html,
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error generating stream page" };
  }
}
