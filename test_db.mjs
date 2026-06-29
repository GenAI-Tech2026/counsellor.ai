import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('jee_advanced_programs')
    .select('*')
    .ilike('institute_name', '%bombay%')
    .limit(5);
  
  if (error) console.error(error);
  else console.log(data);
}
check();
