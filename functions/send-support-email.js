import fetch from 'node-fetch';

export async function handler(event) {
  const { subject, message, email } = JSON.parse(event.body);

  // Replace with your SendGrid API key
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [
        { to: [{ email: "doesebprince96@gmail.com" }] } // Your email here
      ],
      from: { email: "support@streamcleanerpro.com" },
      subject: `Support Request: ${subject}`,
      content: [{ type: "text/plain", value: `From: ${email}\n\n${message}` }]
    })
  });

  if (res.status === 202) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } else {
    return { statusCode: 500, body: JSON.stringify({ success: false }) };
  }
}
document.getElementById("supportForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const subject = document.getElementById("supportSubject").value;
  const message = document.getElementById("supportMessage").value;
  const user = netlifyIdentity.currentUser();
  
  const res = await fetch("/.netlify/functions/send-support-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject,
      message,
      email: user ? user.email : "Anonymous"
    })
  });

  const data = await res.json();
  document.getElementById("supportStatus").textContent =
    data.success ? "Message sent successfully!" : "Failed to send message.";
});
