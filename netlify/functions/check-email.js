const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  const { email } = JSON.parse(event.body);
  
  const { data, error } = await supabase
    .from('leads')
    .select('email, usage_count')
    .eq('email', email)
    .single();

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      exists: !!data, 
      usageCount: data?.usage_count || 0 
    })
  };
};
