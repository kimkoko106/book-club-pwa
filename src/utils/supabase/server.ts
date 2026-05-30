import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

/**
 * 서버 환경(Server Component, Server Action, Route Handler)에서 동작하는 Supabase 클라이언트를 생성합니다.
 * Next.js 16/15의 비동기 cookies() API를 올바르게 처리합니다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 setAll이 호출되는 경우 안전하게 무시합니다.
            // (일반적으로 middleware가 세션을 갱신하도록 처리하기 때문)
          }
        },
      },
    }
  );
}
