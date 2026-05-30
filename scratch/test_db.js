const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    envVars[match[1]] = (match[2] || '').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  try {
    // 1. 임의의 UUID로 user_books에 insert를 시도해서 progress_percent 컬럼이 존재하는지 검증
    // user_id, book_id가 DB 상에 없으므로 외래키 에러가 나는 것이 정상. 
    // 만약 progress_percent가 없는 컬럼이라면 PGRST204 (Column not found) 에러가 날 것임.
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase
      .from('user_books')
      .insert({
        user_id: fakeUuid,
        book_id: fakeUuid,
        status: 'reading',
        current_page: 50,
        progress_percent: 50 // 이 컬럼이 있는지 확인해보기 위함
      });

    console.log('Insert test result:');
    if (error) {
      console.log('Error Code:', error.code);
      console.log('Error Message:', error.message);
      console.log('Error Details:', error.details);
    } else {
      console.log('Insert Success:', data);
    }
  } catch (err) {
    console.error('Caught error:', err);
  }
}

testInsert();
