import { createClient } from '@supabase/supabase-js';
import playwright from 'playwright-core';

export async function handler(event) {
  try {
    const { iframeUrl, adScript, matchName, email } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, body: "Missing user email" };
    }

    // Verify subscription before running
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('active_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .gt('expires_at', new Date().toISOString());

    if (error || !data || data.length === 0) {
      return { statusCode: 403, body: "Subscription inactive or expired" };
    }

    // Playwright logic here
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();
    await page.goto(iframeUrl, { waitUntil: 'networkidle' });

    // Remove popups & malicious scripts
    await page.evaluate(() => {
      document.querySelectorAll("iframe, script").forEach(el => el.remove());
    });

    // Inject ad script
    if (adScript) {
      await page.evaluate((ad) => {
        const script = document.createElement('script');
        script.innerHTML = ad;
        document.body.appendChild(script);
      }, adScript);
    }

    const cleanedHtml = await page.content();
    await browser.close();

    return {
      statusCode: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${matchName}.html"`,
        'Content-Type': 'text/html'
      },
      body: cleanedHtml
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Server error" };
  }
}
