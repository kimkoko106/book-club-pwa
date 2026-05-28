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
  total_pages: number;
  cover_url?: string | null;
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
