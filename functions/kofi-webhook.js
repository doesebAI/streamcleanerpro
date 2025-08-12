export async function handler(event) {
  try {
    const data = JSON.parse(event.body);
    
    if (data.type === "Donation" || data.type === "SubscriptionPayment") {
      const email = data.from_name_email || data.email;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month from payment date
      
      // Store in Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
      
      await supabase.from("active_users").upsert([
        { email, expires_at: expiresAt.toISOString() }
      ]);
    }
    
    return { statusCode: 200, body: "OK" };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
}
import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
  try {
    // Parse Ko-fi webhook payload
    const data = JSON.parse(event.body);

    // We only care about payments (Donation or SubscriptionPayment)
    if (data.type === "Donation" || data.type === "SubscriptionPayment") {
      const email = data.email || data.from_name_email;

      if (!email) {
        return {
          statusCode: 400,
          body: "No email provided in webhook."
        };
      }

      // Calculate subscription expiration date (1 month from payment)
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Connect to Supabase
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY // Needs service role key for insert/upsert
      );

      // Insert or update active user
      const { error } = await supabase
        .from('active_users')
        .upsert([
          {
            email: email.toLowerCase(),
            expires_at: expiresAt.toISOString()
          }
        ]);

      if (error) {
        console.error("Supabase error:", error);
        return { statusCode: 500, body: "Database update failed" };
      }

      console.log(`User ${email} added/updated in active_users table.`);
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("Webhook error:", err);
    return { statusCode: 500, body: "Webhook processing failed" };
  }
}
