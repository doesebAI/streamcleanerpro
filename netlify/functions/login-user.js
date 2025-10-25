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

    const { data: user, error } = await supabase
      .from('users')
      .select('email, password')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !user) {
      return res.status(400).json({ error: 'User not found' })
    }

    if (user.password !== password) {
      return res.status(400).json({ error: 'Incorrect password' })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
