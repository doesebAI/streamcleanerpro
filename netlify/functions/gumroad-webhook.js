import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { email, purchase_id, product_name, price, currency } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email required' })
    }

    // Insert or update active user record
    const { data, error } = await supabase
      .from('active_users')
      .upsert(
        {
          email: email.toLowerCase(),
          purchase_id,
          product_name,
          price,
          currency,
          activated_at: new Date().toISOString(),
          status: 'active'
        },
        { onConflict: 'email' }
      )

    if (error) throw error

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
