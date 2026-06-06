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

async function testSingleColumn() {
  const fakeUuid = '00000000-0000-0000-0000-000000000000';
  
  // 1. reading_start_date가 존재하는지 테스트
  const { error: error1 } = await supabase
    .from('monthly_books')
    .insert({
      group_id: fakeUuid,
      book_id: fakeUuid,
      month: '2026-06',
      stage: 'reading',
      reading_start_date: '2026-06-01'
    });

  console.log('--- reading_start_date 존재 여부 ---');
  if (error1) {
    console.log('Error Code:', error1.code);
    console.log('Error Message:', error1.message);
  } else {
    console.log('성공 (존재함)');
  }

  // 2. timeline_reading이 존재하는지 테스트
  const { error: error2 } = await supabase
    .from('monthly_books')
    .insert({
      group_id: fakeUuid,
      book_id: fakeUuid,
      month: '2026-06',
      stage: 'reading',
      timeline_reading: '2026-06-01~2026-06-30'
    });

  console.log('\n--- timeline_reading 존재 여부 ---');
  if (error2) {
    console.log('Error Code:', error2.code);
    console.log('Error Message:', error2.message);
  } else {
    console.log('성공 (존재함)');
  }
}

testSingleColumn();
