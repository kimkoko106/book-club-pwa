import { createClient as createBrowserClient } from './client';
import { createClient as createServerClient } from './server';

/**
 * [서버 컴포넌트용] 세션 정보 조회 헬퍼
 */
export async function getServerSession() {
  try {
    const supabase = await createServerClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

/**
 * [서버 컴포넌트용] 현재 인증된 사용자(User) 정보 조회 헬퍼
 * 보안성이 높은 getUser()를 사용합니다.
 */
export async function getServerUser() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
  }
}

/**
 * [클라이언트 컴포넌트용] 세션 정보 조회 헬퍼
 */
export async function getClientSession() {
  try {
    const supabase = createBrowserClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting client session:', error);
    return null;
  }
}

/**
 * [클라이언트 컴포넌트용] 현재 인증된 사용자(User) 정보 조회 헬퍼
 */
export async function getClientUser() {
  try {
    const supabase = createBrowserClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting client user:', error);
    return null;
  }
}
