export async function handler(event) {
  try {
    const { matchName, slug, adScript = "", includeSources = false } = JSON.parse(event.body);

    const iframeUrl = `https://t4tv.click/sports/${slug}.php`;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${matchName} - Clean Stream</title>
        <style>
          body { margin:0; background:#000; }
          iframe { width:100%; height:100vh; border:0; }
        </style>
      </head>
      <body>
        <iframe src="${iframeUrl}" allowfullscreen></iframe>
        ${adScript ? `<script>${adScript}</script>` : ""}
        ${includeSources ? `
          <footer style="background:#111;color:#ccc;padding:8px;font-size:14px;text-align:center">
            Approved Sources:
            <a href="https://totalsportek.football/" target="_blank">TotalSportek</a> |
            <a href="https://www.streameast100.com/" target="_blank">StreamEast</a>
          </footer>` : ""}
      </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html
    };

  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
}
