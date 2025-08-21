// dashboard.js

let SELECTED_STREAM = null;

// --- Step 1: Fetch & render live streams ---
async function loadStreams(sport = "all") {
  const dropdown = document.getElementById("streamSelect");
  const list = document.getElementById("matchList");
  dropdown.innerHTML = "<option>Loading streams...</option>";
  list.innerHTML = "Loading...";

  try {
    const res = await fetch(`/.netlify/functions/get-streams?sport=${sport}&limit=20`);
    const items = await res.json();

    dropdown.innerHTML = "";
    list.innerHTML = "";

    if (!items.length) {
      dropdown.innerHTML = "<option>No streams available right now</option>";
      list.innerHTML = "<p>No streams available for this sport.</p>";
      return;
    }

    items.forEach((it, i) => {
      // Dropdown option
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${it.sport.toUpperCase()} — ${it.title}`;
      dropdown.appendChild(opt);

      // Thumbnail card
      const card = document.createElement("div");
      card.className = "stream-card";
      card.innerHTML = `
        <img src="${it.thumbnail}" alt="${it.title}">
        <div class="meta">
          <div class="title">${it.title}</div>
          <div class="tags">${it.sport.toUpperCase()} • ${it.source}</div>
          <button class="select-btn" data-i="${i}">Select</button>
        </div>
      `;
      list.appendChild(card);
    });

    // Select button actions
    document.querySelectorAll(".select-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        SELECTED_STREAM = items[btn.dataset.i];
        document.getElementById("fileStatus").textContent =
          `✅ Selected: ${SELECTED_STREAM.title}`;
      });
    });

    // Dropdown action
    dropdown.addEventListener("change", (e) => {
      const idx = e.target.value;
      if (items[idx]) {
        SELECTED_STREAM = items[idx];
        document.getElementById("fileStatus").textContent =
          `✅ Selected: ${SELECTED_STREAM.title}`;
      }
    });

  } catch (err) {
    console.error("Error loading streams", err);
    dropdown.innerHTML = "<option>Error loading streams</option>";
    list.innerHTML = "<p>Failed to fetch live streams.</p>";
  }
}

// --- Step 4: Generate downloadable HTML ---
document.getElementById("cleanDownloadBtn").addEventListener("click", () => {
  const status = document.getElementById("fileStatus");

  if (!SELECTED_STREAM) {
    status.textContent = "⚠️ Please select a stream first.";
    return;
  }

  const adCode = document.getElementById("adCode").value || "";
  const includeLinks = document.getElementById("totalsportekMode").checked;

  // Build HTML file
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${SELECTED_STREAM.title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; background:#000; color:#fff; font-family:Arial, sans-serif; }
    iframe { width:100%; height:90vh; border:none; display:block; }
    .ads { margin:10px; text-align:center; }
    .approved-links { padding:10px; background:#111; margin-top:10px; text-align:center; }
    .approved-links a { color:#0af; margin:0 8px; text-decoration:none; }
  </style>
</head>
<body>
  <iframe src="${SELECTED_STREAM.iframe}" allowfullscreen></iframe>
  <div class="ads">${adCode}</div>
  ${
    includeLinks
      ? `<div class="approved-links">
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
        </div>`
      : ""
  }
</body>
</html>`;

  // Trigger download
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = SELECTED_STREAM.title.replace(/\s+/g, "_") + ".html";
  a.click();
  URL.revokeObjectURL(url);

  status.textContent = "✅ File downloaded successfully.";
});

// --- Init ---
loadStreams("all");

// Optional: re-load per sport filter (if you add dropdown)





