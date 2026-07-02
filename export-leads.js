require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function exportLeads() {
  console.log('Fetching leads from Supabase...');
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching leads:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No leads found. (Or table doesn't exist yet!)");
    return;
  }

  console.log(`Found ${data.length} leads.`);
  
  // Save as JSON
  fs.writeFileSync('leads_export.json', JSON.stringify(data, null, 2));
  console.log('✅ Exported to leads_export.json');

  // Save as CSV
  const headers = ['id', 'name', 'email', 'phone', 'state', 'created_at'];
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(fieldName => {
        let value = row[fieldName] || '';
        // Wrap in quotes if it contains a comma
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];
  
  fs.writeFileSync('leads_export.csv', csvRows.join('\n'));
  console.log('✅ Exported to leads_export.csv');
}

exportLeads();
