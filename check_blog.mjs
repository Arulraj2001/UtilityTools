import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = 'https://usgenkubqxskurtmvxaz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZ2Vua3VicXhza3VydG12eGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUzNDA4NSwiZXhwIjoyMDk0MTEwMDg1fQ.r0RQNnP8j98PGh5ShRbDL_u2CwCCDSGAnoVwaGhpDhk';

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws
  }
});

async function run() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, featured_image, status, created_at')
    .eq('id', 'e4bd2ba4-b84b-4c05-9b31-0f206dcc3402');

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
