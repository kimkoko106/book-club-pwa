const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// .env.local 파일 읽기
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.replace(/^"|"/g, '');
    }
    env[key] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log('--- monthly_books 데이터 조회 ---');
    const { data: mbs, error: mbsError } = await supabase
      .from('monthly_books')
      .select('*, books(*)');
    
    if (mbsError) throw mbsError;

    console.log('총 회차 개수:', mbs.length);
    mbs.forEach(mb => {
      console.log(`id: ${mb.id}, group_id: ${mb.group_id}, stage: ${mb.stage}, timeline_reading: ${mb.timeline_reading}, book_id: ${mb.book_id}`);
      if (mb.books) {
        console.log(`  -> Book: id: ${mb.books.id}, title: ${mb.books.title}`);
      } else {
        console.log(`  -> Book: 없음`);
      }
    });

  } catch (err) {
    console.error('에러 발생:', err);
  }
}

run();
