import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

/**
 * 브라우저 환경(Client Component)에서 동작하는 Supabase 클라이언트를 생성합니다.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
