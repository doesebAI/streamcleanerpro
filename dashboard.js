document.addEventListener("DOMContentLoaded", loadStreams);

let selectedStream = null;

// Load streams from Scorebat API via Netlify function
async function loadStreams() {
  try {
    const res = await fetch("/.netlify/functions/get-streams");
    const streams = await res.json();

    if (!Array.isArray(streams) || streams.length === 0) {
      console.warn("No streams found from Scorebat API");
      document.getElementById("matchList").innerHTML = "<p>No live matches available right now.</p>";
      return;
    }

    const matchList = document.getElementById("matchList");
    const streamSelect = document.getElementById("streamSelect");
    matchList.innerHTML = "";
    streamSelect.innerHTML = "";

    streams.forEach((stream, idx) => {
      // Populate dropdown
      const option = document.createElement("option");
      option.value = idx;
      option.textContent = stream.match;
      streamSelect.appendChild(option);

      // Populate thumbnails
      const thumb = document.createElement("div");
      thumb.className = "stream-thumb";
      thumb.innerHTML = `
        <img src="${stream.thumbnail}" alt="${stream.match}" style="width:100%; height:100%; border-radius:0.5rem;">
      `;
      thumb.onclick = () => {
        selectedStream = stream;
        streamSelect.value = idx;
        highlightSelectedThumb(thumb);
      };
      matchList.appendChild(thumb);
    });

    // Auto-select first stream
    selectedStream = streams[0];
    streamSelect.value = 0;

    streamSelect.onchange = () => {
      selectedStream = streams[streamSelect.value];
    };

  } catch (err) {
    console.error("Error loading streams:", err);
    document.getElementById("matchList").innerHTML = "<p>Error loading streams. Please try again later.</p>";
  }
}

// Highlight selected stream thumbnail
function highlightSelectedThumb(selectedThumb) {
  document.querySelectorAll(".stream-thumb").forEach(thumb => {
    thumb.style.border = "2px solid transparent";
  });
  selectedThumb.style.border = "2px solid #3b82f6";
}

// Simulate cleaning process
function simulateCleaning() {
  const status = document.getElementById("cleanStatus");
  status.textContent = "⏳ Cleaning in progress...";
  setTimeout(() => {
    status.textContent = "✅ Cleaning complete. Ads removed.";
  }, 2000);
}

// Handle export (clean + download)
document.getElementById("cleanDownloadBtn").addEventListener("click", async () => {
  if (!selectedStream) {
    alert("Please select a match first!");
    return;
  }

  const adCode = document.getElementById("adCode").value;
  document.getElementById("fileStatus").textContent = "Processing...";

  try {
    const res = await fetch("/.netlify/functions/clean-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        iframeUrl: selectedStream.iframe,
        adScript: adCode,
        matchName: selectedStream.match
      })
    });

    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedStream.match.replace(/\s+/g, '_') + ".html";
    document.body.appendChild(a);
    a.click();
    a.remove();

    document.getElementById("fileStatus").textContent = "✅ File downloaded.";
  } catch (err) {
    console.error("Export error:", err);
    document.getElementById("fileStatus").textContent = "❌ Error generating file.";
  }
});
async function checkUserAccess() {
  const user = netlifyIdentity.currentUser();
  if (!user) return window.location.href = '/login.html';

  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/active_users?email=eq.${user.email}`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY
    }
  });
  const data = await res.json();

  if (!data.length || data[0].status !== 'active') {
    alert('Your subscription is inactive. Please renew to continue.');
    window.location.href = '/pricing.html';
  }
}

document.addEventListener("DOMContentLoaded", checkUserAccess);







