require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function countLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('id'); // Just select id to save bandwidth
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Total leads (data length):", data.length);
  }
}

countLeads();
