export interface Profile {
  id: string;
  username: string;
  avatar_url?: string | null;
  updated_at: string;
}

export interface BookClub {
  id: string;
  title: string;
  description?: string | null;
  invite_code: string;
  created_at: string;
  created_by?: string | null;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  joined_at: string;
  role: 'admin' | 'member';
  profile?: Profile; // 조인된 사용자 프로필 정보
}

export interface Book {
  id: string;
  club_id: string;
  title: string;
  author: string;
  total_pages?: number | null;
  cover_url?: string | null;
  isbn?: string | null;
  isbn13?: string | null;
  source?: string | null;
  source_id?: string | null;
  publisher?: string | null;
  description?: string | null;
  published_at?: string | null;
  created_at: string;
}

export interface UserBookProgress {
  id: string;
  user_id: string;
  book_id: string;
  current_page: number;
  status: 'reading' | 'completed' | 'paused';
  updated_at: string;
  profile?: Profile; // 조인된 사용자 프로필 정보 (동료 진척도 표시용)
}

// Supabase DB 자동 맵핑용 테이블 헬퍼 타입 정의 (프론트엔드 연동 전용)
import { Database } from './database.types';

export type DBProfile = Database['public']['Tables']['profiles']['Row'];
export type DBGroup = Database['public']['Tables']['groups']['Row'];
export type DBGroupMember = Database['public']['Tables']['group_members']['Row'];
export type DBBook = Database['public']['Tables']['books']['Row'];
export type DBUserBook = Database['public']['Tables']['user_books']['Row'];
export type DBUserBookMemo = Database['public']['Tables']['user_book_memos']['Row'];
export type DBMonthlyBook = Database['public']['Tables']['monthly_books']['Row'];
export type DBQuestion = Database['public']['Tables']['questions']['Row'];
export type DBQuestionFeedback = Database['public']['Tables']['question_feedback']['Row'];
export type DBDiscussionComment = Database['public']['Tables']['discussion_comments']['Row'];
export type DBBookRecommendation = Database['public']['Tables']['book_recommendations']['Row'];
export type DBArchive = Database['public']['Tables']['archives']['Row'];
