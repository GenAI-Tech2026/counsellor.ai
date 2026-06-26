require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('leads')
    .insert([{ name: 'Test', phone: '1234567890', state: 'TS' }])
    .select();
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Inserted:", data);
  }
}
test();
