// dashboard.js

// --- State ---
let DB_SELECTED = null;

// --- Load streams into dashboard ---
async function loadDashboardStreams(sport = "all") {
  const grid = document.getElementById("db-streams");
  grid.innerHTML = "Loading...";
  try {
    const res = await fetch(`/.netlify/functions/get-streams?sport=${sport}&limit=25`);
    const items = await res.json();
    grid.innerHTML = "";
    if (!items.length) {
      grid.innerHTML = "<p>No streams found for this sport right now.</p>";
      return;
    }
    items.forEach((it, idx) => {
      const card = document.createElement("div");
      card.className = "stream-card";
      card.innerHTML = `
        <img src="${it.thumbnail}" alt="${it.title}" />
        <div class="meta">
          <div class="title">${it.title}</div>
          <div class="tags">${it.sport.toUpperCase()} • ${it.source}</div>
          <button class="select-btn" data-i="${idx}">Select</button>
        </div>`;
      grid.appendChild(card);
    });
    grid.querySelectorAll(".select-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        DB_SELECTED = items[parseInt(btn.dataset.i)];
        document.getElementById("db-status").textContent =
          `Selected: ${DB_SELECTED.title}`;
      });
    });
  } catch {
    grid.innerHTML = "<p>Error loading streams.</p>";
  }
}

// --- Download cleaned embed ---
document.getElementById("db-download").addEventListener("click", async () => {
  const ad = document.getElementById("db-ad").value || "";
  const status = document.getElementById("db-status");

  if (!DB_SELECTED) {
    status.textContent = "Select a stream first.";
    return;
  }

  status.textContent = "Processing...";

  const res = await fetch("/.netlify/functions/clean-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      iframeUrl: DB_SELECTED.iframe,
      adScript: ad,
      matchName: DB_SELECTED.title
    })
  });

  if (!res.ok) {
    status.textContent = "Failed to generate HTML.";
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = DB_SELECTED.title.replace(/\s+/g, "_") + ".html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  status.textContent = "✅ Downloaded!";
});

// --- Sport filter ---
document.getElementById("db-sport").addEventListener("change", (e) => {
  loadDashboardStreams(e.target.value);
});

// --- Init ---
loadDashboardStreams("all");






