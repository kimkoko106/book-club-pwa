import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 개발 및 테스트 빌드 시 환경변수가 없을 경우에 대한 경고 로그 출력
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '⚠️ [Supabase Warning]: Supabase 환경 변수가 설정되지 않았습니다.\n' +
      '.env.local 파일을 생성하고 NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_ANON_KEY를 작성해 주세요.\n' +
      '현재 로컬 Mock 모드가 우선 동작합니다.'
    );
  }
}

// Supabase 클라이언트 초기화 (타입 정의 매핑)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default supabase;
