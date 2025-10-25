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

    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    // Check active_users
    const { data: active, error: activeError } = await supabase
      .from('active_users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (activeError || !active) {
      return res.status(400).json({ error: 'Email not activated. Complete payment first.' })
    }

    // Insert into users
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({ email: email.toLowerCase(), password, created_at: new Date().toISOString() })

    if (userError) throw userError

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
