// netlify/functions/clean-stream-lite.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { iframeUrl, adScript = '', sport = 'sports', compliance = false } = JSON.parse(event.body || '{}');
    if (!iframeUrl) {
      return { statusCode: 400, body: 'Missing iframeUrl' };
    }

    const approvedLinks = `
    <div style="margin-top:18px; font-family: Inter, system-ui, Arial, sans-serif;">
      <div style="opacity:.75; margin-bottom:8px">Approved Links</div>
      <div style="display:flex; flex-wrap:wrap; gap:8px; font-size:14px">
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
      </div>
    </div>`;

    // Minimal, stylable, sandboxed output HTML
    const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Clean ${sport} stream</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet"/>
<style>
  :root{
    --bg:#0b1226; --panel:#0f172a; --text:#e2e8f0; --muted:#94a3b8; --brand:#60a5fa;
  }
  body{margin:0; background:var(--bg); color:var(--text); font-family:Inter,system-ui,Arial,sans-serif}
  .wrap{max-width:960px; margin:0 auto; padding:18px}
  .player{
    background:linear-gradient(180deg, rgba(15,23,42,.7), rgba(11,18,38,.9));
    border:1px solid rgba(148,163,184,.15);
    border-radius:16px; overflow:hidden;
    box-shadow: 0 10px 28px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04);
  }
  .bar{display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid rgba(148,163,184,.15)}
  .pill{padding:6px 10px; border-radius:999px; border:1px dashed rgba(148,163,184,.3); color:var(--muted); font-size:12px}
  iframe{width:100%; height:62vh; border:0; background:#000}
  .ads{padding:12px 14px; border-top:1px solid rgba(148,163,184,.15)}
</style>
</head>
<body>
  <div class="wrap">
    <div class="player">
      <div class="bar">
        <div><strong>Clean ${sport} stream</strong></div>
        <div class="pill">Sandboxed • Popups removed</div>
      </div>
      <iframe
        src="${iframeUrl}"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        referrerpolicy="no-referrer"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen">
      </iframe>
      <div class="ads" id="adZone"></div>
    </div>
    ${compliance ? approvedLinks : ''}
  </div>

  <script>
    // Insert user's ad code into a safe container
    (function(){
      var ad = ${JSON.stringify(adScript || '')};
      if(ad){
        var zone = document.getElementById('adZone');
        var s = document.createElement('script');
        s.type = 'text/javascript';
        try{
          // Try raw injection
          s.textContent = ad;
          zone.appendChild(s);
        }catch(e){
          zone.innerHTML = '<div style="color:#94a3b8">Ad code could not be executed.</div>';
        }
      } else {
        document.getElementById('adZone').innerHTML =
          '<div style="color:#94a3b8">No ad code provided. Add later in this container.</div>';
      }
    })();
  </script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="clean_stream.html"'
      },
      body: out
    };
  } catch (err) {
    console.error('clean-stream-lite error:', err);
    return { statusCode: 500, body: 'Server error' };
  }
};
