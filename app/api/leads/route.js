import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { name, phone, state, email } = await req.json();

    if (!name || !phone || !state || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // We use the service role key to insert leads without RLS blocking us
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables for leads insertion.');
      // Fail gracefully so we don't block the user if keys are missing
      return NextResponse.json({ success: true, warning: 'Keys missing, data not saved' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('leads')
      .insert([{ name, phone, state, email }]);

    if (error) {
      console.error('Error inserting lead:', error.message);
      // We still return 200 so the frontend can dismiss the modal.
      // This ensures a missing table doesn't lock the user out permanently.
      return NextResponse.json({ success: true, warning: 'Database error, data not saved' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
