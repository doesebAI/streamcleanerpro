// netlify/functions/fetch-streams.js
const chromium = require("playwright-extra").chromium;
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);

exports.handler = async () => {
  const sources = [
    "https://soccer.totalsportek.pro/",
    "https://score808.football/soccer-live-stream",
    "https://epl.footybite.to/",
    "https://www.streameast100.com/soccerstreams",
    "https://www.totalsportek.name/",
    
    // Add more sources here
  ];

  let allStreams = [];

  for (const url of sources) {
    try {
      console.log(`Scraping site: ${url}`);

      const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Increase timeout to 30s
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Example: grab iframe links & match titles
      const streams = await page.evaluate(() => {
        const data = [];
        document.querySelectorAll("iframe").forEach((frame) => {
          const src = frame.src;
          if (src && src.includes("http")) {
            data.push({
              match: document.title || "Unknown Match",
              iframe: src,
              thumbnail:
                "https://via.placeholder.com/180x100?text=" +
                encodeURIComponent(document.title || "Stream"),
            });
          }
        });
        return data;
      });

      allStreams = [...allStreams, ...streams];
      await browser.close();
    } catch (err) {
      console.error(`Error scraping ${url}:`, err.message);
      // Skip site if it fails
    }
  }

  // Fallback if no streams found
  if (allStreams.length === 0) {
    allStreams = [
      {
        match: "Fallback Match 1",
        iframe: "https://vibestreams.org/assets/s2.php",
        thumbnail: "https://via.placeholder.com/180x100?text=Fallback+1",
      },
    ];
  }

  return {
    statusCode: 200,
    body: JSON.stringify(allStreams),
  };
};
