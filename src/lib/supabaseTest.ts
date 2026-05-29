import supabaseClient from './supabaseClient';
import { DBProfile, DBBook, DBGroup, DBUserBook, DBMonthlyBook } from '../types';

/**
 * 1.5단계 검증용: Supabase 실제 데이터베이스 조회(Read) 테스트 함수
 * 이 함수들은 Supabase가 연동되었을 때 동작 확인(SELECT)을 하는 최소 단위 함수입니다.
 */

// 1. 프로필 목록 조회 테스트
export async function testFetchProfiles(): Promise<{ data: DBProfile[] | null; error: any }> {
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*');
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// 2. 마스터 도서 목록 조회 테스트
export async function testFetchBooks(): Promise<{ data: DBBook[] | null; error: any }> {
  try {
    const { data, error } = await supabaseClient
      .from('books')
      .select('*');
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// 3. 특정 독서 그룹 상세 조회 테스트 (RLS 적용)
export async function testFetchGroup(groupId: string): Promise<{ data: DBGroup | null; error: any }> {
  try {
    const { data, error } = await supabaseClient
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// 4. 내 책장(개인 서재) 도서 조회 테스트 (RLS 적용)
export async function testFetchMyLibrary(userId: string): Promise<{ data: DBUserBook[] | null; error: any }> {
  try {
    const { data, error } = await supabaseClient
      .from('user_books')
      .select('*, book:books(*)')
      .eq('user_id', userId);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// 5. 모임별 월간 선정 공유책 조회 테스트 (RLS 적용)
export async function testFetchMonthlyBook(groupId: string): Promise<{ data: DBMonthlyBook[] | null; error: any }> {
  try {
    const { data, error } = await supabaseClient
      .from('monthly_books')
      .select('*, book:books(*)');
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}
