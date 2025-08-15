exports.handler = async (event) => {
  try {
    const payload = new URLSearchParams(event.body);
    const saleData = Object.fromEntries(payload);

    // Example fields from Gumroad
    const buyerEmail = saleData.email;
    const productName = saleData.product_name;
    const purchaseId = saleData.sale_id;
    const isRecurring = saleData.is_recurring_billing;

    console.log("Payment Received:", saleData);

    // TODO: Save to Supabase or database
    // Example Supabase call:
    /*
    await supabase.from('active_users').insert([
      { email: buyerEmail, plan: productName, recurring: isRecurring, sale_id: purchaseId }
    ]);
    */

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Payment recorded successfully" }),
    };
  } catch (err) {
    console.error("Webhook error:", err);
    return { statusCode: 500, body: "Webhook processing failed" };
  }
};
