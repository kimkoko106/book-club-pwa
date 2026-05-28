import { createClient } from '@supabase/supabase-js';
import { Profile, BookClub, ClubMember, Book, UserBookProgress } from '../types';

// 토론 질문 인터페이스
export interface DiscussionQuestion {
  id: string;
  club_id: string;
  book_id: string;
  user_id: string;
  content: string;
  created_at: string;
  status: 'suggested' | 'selected';
  reaction_curious_count: number;
  reaction_talk_count: number;
  comments_count: number;
  profile?: Profile;
}

// 토론 댓글 인터페이스
export interface DiscussionComment {
  id: string;
  question_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isMockMode = !supabaseUrl || !supabaseAnonKey || process.env.NEXT_PUBLIC_USE_MOCK === 'true';
export const supabase = !isMockMode ? createClient(supabaseUrl, supabaseAnonKey) : null;

const KEY_CURRENT_USER = 'bookclub_mock_user';
const KEY_PROFILES = 'bookclub_mock_profiles';
const KEY_CLUBS = 'bookclub_mock_clubs';
const KEY_MEMBERS = 'bookclub_mock_members';
const KEY_BOOKS = 'bookclub_mock_books';
const KEY_PROGRESS = 'bookclub_mock_progress';
const KEY_DISCUSSIONS = 'bookclub_mock_discussions';
const KEY_COMMENTS = 'bookclub_mock_comments';

function initializeMockStorage() {
  if (typeof window === 'undefined') return;

  // 로컬스토리지 데이터를 검증하고 깨져있으면 안전한 더미 데이터로 리셋하는 헬퍼
  const checkAndResetKey = (key: string, dummyData: any) => {
    try {
      const data = localStorage.getItem(key);
      if (!data || data === 'undefined' || data === 'null') {
        localStorage.setItem(key, JSON.stringify(dummyData));
        return;
      }
      JSON.parse(data); // 정상 JSON 규격인지 강제 파싱 검증
    } catch (err) {
      console.warn(`오염되거나 깨진 로컬스토리지 키 자가 복구 완료 [key: ${key}]:`, err);
      localStorage.setItem(key, JSON.stringify(dummyData));
    }
  };

  // 1. 프로필 더미 초기화
  checkAndResetKey(KEY_PROFILES, [
    { id: 'user-1', username: '차분한 책벌레', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', updated_at: new Date().toISOString() },
    { id: 'user-2', username: '민트초코 독서가', avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80', updated_at: new Date().toISOString() },
    { id: 'user-3', username: '오후의 사색', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', updated_at: new Date().toISOString() },
  ]);

  // 2. 모임 더미 초기화
  checkAndResetKey(KEY_CLUBS, [
    {
      id: 'club-1',
      title: '숲속의 북클럽 🌲',
      description: '자연, 사색, 그리고 삶에 관한 에세이를 차분히 완독하는 소모임입니다.',
      invite_code: 'SAGE123',
      created_at: new Date().toISOString(),
      created_by: 'user-1'
    }
  ]);

  // 3. 멤버 구성원 더미 초기화
  checkAndResetKey(KEY_MEMBERS, [
    { id: 'member-1', club_id: 'club-1', user_id: 'user-1', joined_at: new Date().toISOString(), role: 'admin' },
    { id: 'member-2', club_id: 'club-1', user_id: 'user-2', joined_at: new Date().toISOString(), role: 'member' },
    { id: 'member-3', club_id: 'club-1', user_id: 'user-3', joined_at: new Date().toISOString(), role: 'member' },
  ]);

  // 4. 책 더미 초기화
  checkAndResetKey(KEY_BOOKS, [
    {
      id: 'book-1',
      club_id: 'club-1',
      title: '월든 (Walden)',
      author: '헨리 데이비드 소로',
      total_pages: 450,
      cover_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    }
  ]);

  // 5. 진행도 더미 초기화
  checkAndResetKey(KEY_PROGRESS, [
    { id: 'prog-1', user_id: 'user-1', book_id: 'book-1', current_page: 180, status: 'reading', updated_at: new Date().toISOString() },
    { id: 'prog-2', user_id: 'user-2', book_id: 'book-1', current_page: 450, status: 'completed', updated_at: new Date().toISOString() },
    { id: 'prog-3', user_id: 'user-3', book_id: 'book-1', current_page: 80, status: 'paused', updated_at: new Date().toISOString() },
  ]);

  // 6. 토론 질문 더미 초기화
  checkAndResetKey(KEY_DISCUSSIONS, [
    {
      id: 'q-1',
      club_id: 'club-1',
      book_id: 'book-1',
      user_id: 'user-2',
      content: 'Q. 주인공이 숲속으로 들어간 진짜 이유는 현대 문명으로부터의 도망일까요, 아니면 자아 성장을 위한 의도적인 격리였을까요?',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: 'selected',
      reaction_curious_count: 5,
      reaction_talk_count: 3,
      comments_count: 3
    },
    {
      id: 'q-2',
      club_id: 'club-1',
      book_id: 'book-1',
      user_id: 'user-3',
      content: 'Q. 2장 대목에서 언급된 "단순함, 단순함, 단순함!" 이라는 구절이 2026년 오늘날 우리의 미니멀리즘과 어떻게 맞닿아 있을까요?',
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      status: 'selected',
      reaction_curious_count: 4,
      reaction_talk_count: 2,
      comments_count: 2
    },
    {
      id: 'q-3',
      club_id: 'club-1',
      book_id: 'book-1',
      user_id: 'user-1',
      content: 'Q. 책 속의 고독에 대한 예찬을 보며, 나만의 온전한 고독의 시간이 일상에 얼마나 확보되어 있는지 이야기해보고 싶습니다.',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      status: 'suggested',
      reaction_curious_count: 8,
      reaction_talk_count: 5,
      comments_count: 0
    },
    {
      id: 'q-4',
      club_id: 'club-1',
      book_id: 'book-1',
      user_id: 'user-2',
      content: 'Q. 작가가 숲에서 자급자족하며 세운 경제학 수치들은 오늘날 우리 관점에서 비현실적일까요, 아니면 본받을 만한 도전일까요?',
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      status: 'suggested',
      reaction_curious_count: 3,
      reaction_talk_count: 1,
      comments_count: 0
    },
    {
      id: 'q-5',
      club_id: 'club-1',
      book_id: 'book-1',
      user_id: 'user-3',
      content: 'Q. 자연과 인간의 관계를 유기적으로 바라보는 소로의 관점 중 가장 마음에 울림을 주었던 챕터는 어디인가요?',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      status: 'suggested',
      reaction_curious_count: 2,
      reaction_talk_count: 2,
      comments_count: 0
    },
    {
      id: 'q-6',
      club_id: 'club-1',
      book_id: 'book-1',
      user_id: 'user-1',
      content: 'Q. 문명화된 사회를 "정교하게 장식된 감옥"에 비유한 부분에 대해 어떻게 생각하시나요?',
      created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
      status: 'suggested',
      reaction_curious_count: 6,
      reaction_talk_count: 4,
      comments_count: 0
    },
    {
      id: 'q-7',
      club_id: 'club-1',
      book_id: 'book-1',
      user_id: 'user-2',
      content: 'Q. 저자가 호숫가의 얼음이 녹는 과정을 묘사하며 부활과 봄의 정신을 강조한 대목의 문학적 감상평을 나누고 싶습니다.',
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      status: 'suggested',
      reaction_curious_count: 1,
      reaction_talk_count: 0,
      comments_count: 0
    },
    {
      id: 'q-8',
      club_id: 'club-1',
      book_id: 'book-1',
      user_id: 'user-3',
      content: 'Q. 이 책을 읽기 전과 읽은 후, 일상을 대하는 우리의 소비나 삶의 형태에 작은 변화가 생기셨나요?',
      created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
      status: 'suggested',
      reaction_curious_count: 5,
      reaction_talk_count: 3,
      comments_count: 0
    }
  ]);

  // 7. 댓글 더미 초기화
  checkAndResetKey(KEY_COMMENTS, [
    {
      id: 'c-1',
      question_id: 'q-1',
      user_id: 'user-1',
      content: '단순히 사회가 싫어서 도망친 은둔형 외톨이라기보다, 삶의 정수를 대면하고 싶어 의도적으로 문명과 거리두기를 선택한 성숙한 실험이었다고 생각해요.',
      created_at: new Date(Date.now() - 3600000 * 1.5).toISOString()
    },
    {
      id: 'c-2',
      question_id: 'q-1',
      user_id: 'user-3',
      content: '저도 동의해요. 책 전반에 현대인들의 맹목적인 바쁨에 대한 날카로운 위트가 가득한 걸 보면, 고독을 성장의 재료로 유쾌하게 활용하고 있거든요.',
      created_at: new Date(Date.now() - 3600000 * 1).toISOString()
    },
    {
      id: 'c-3',
      question_id: 'q-1',
      user_id: 'user-2',
      content: '저는 한편으로는 그 시대니까 가능했던, 다소 특권적인 은둔 실험이 아니었을까 하는 삐딱한 감상도 약간 듭니다. ㅎㅎ 오늘날 청년들이 숲에 가서 2년간 살기란 세금이나 주거 부담상 쉽지 않잖아요.',
      created_at: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: 'c-4',
      question_id: 'q-2',
      user_id: 'user-1',
      content: '스마트폰 알림 지옥에서 벗어나 하루 단 한 시간이라도 온전히 나만의 생각을 적는 것이 오늘날의 월든 호숫가가 아닐까 싶습니다.',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'c-5',
      question_id: 'q-2',
      user_id: 'user-2',
      content: '동감입니다. 디지털 디톡스가 곧 단순함의 현대적 실천이겠죠.',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ]);
}


if (typeof window !== 'undefined') {
  initializeMockStorage();
}

const getStorageItem = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') return [];
    return JSON.parse(item);
  } catch (err) {
    console.error(`로컬스토리지 파싱 오류 [key: ${key}]:`, err);
    return [];
  }
};

const setStorageItem = <T>(key: string, data: T[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`로컬스토리지 저장 오류 [key: ${key}]:`, err);
  }
};

export const mockApi = {
  auth: {
    getUser: async () => {
      if (typeof window === 'undefined') return { data: { user: null } };
      try {
        const userJson = localStorage.getItem(KEY_CURRENT_USER);
        if (!userJson || userJson === 'undefined' || userJson === 'null') {
          return { data: { user: null } };
        }
        const user = JSON.parse(userJson);
        return { data: { user } };
      } catch (err) {
        console.error('현재 유저 정보 파싱 오류:', err);
        return { data: { user: null } };
      }
    },
    signIn: async (username: string) => {
      const profiles = getStorageItem<Profile>(KEY_PROFILES);
      let profile = profiles.find(p => p.username === username);
      
      if (!profile) {
        profile = {
          id: 'user-' + Date.now(),
          username,
          avatar_url: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?w=100&auto=format&fit=crop&q=80`,
          updated_at: new Date().toISOString()
        };
        profiles.push(profile);
        setStorageItem(KEY_PROFILES, profiles);
      }
      
      try {
        localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(profile));
      } catch (err) {
        console.error('로그인 세션 저장 실패:', err);
      }
      return { data: { user: profile }, error: null };
    },
    signOut: async () => {
      try {
        localStorage.removeItem(KEY_CURRENT_USER);
      } catch (err) {
        console.error('로그아웃 실패:', err);
      }
      return { error: null };
    }
  },

  clubs: {
    getMyClubs: async (userId: string): Promise<BookClub[]> => {
      const members = getStorageItem<ClubMember>(KEY_MEMBERS);
      const clubs = getStorageItem<BookClub>(KEY_CLUBS);
      
      const myClubIds = members.filter(m => m.user_id === userId).map(m => m.club_id);
      return clubs.filter(c => myClubIds.includes(c.id));
    },
    createClub: async (userId: string, title: string, description: string, bookTitle: string, bookAuthor: string, totalPages: number): Promise<BookClub> => {
      const clubs = getStorageItem<BookClub>(KEY_CLUBS);
      const members = getStorageItem<ClubMember>(KEY_MEMBERS);
      const books = getStorageItem<Book>(KEY_BOOKS);
      
      const newClub: BookClub = {
        id: 'club-' + Date.now(),
        title,
        description,
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        created_at: new Date().toISOString(),
        created_by: userId
      };
      
      clubs.push(newClub);
      setStorageItem(KEY_CLUBS, clubs);
      
      const newMember: ClubMember = {
        id: 'member-' + Date.now(),
        club_id: newClub.id,
        user_id: userId,
        joined_at: new Date().toISOString(),
        role: 'admin'
      };
      members.push(newMember);
      setStorageItem(KEY_MEMBERS, members);
      
      const newBook: Book = {
        id: 'book-' + Date.now(),
        club_id: newClub.id,
        title: bookTitle,
        author: bookAuthor,
        total_pages: totalPages,
        cover_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
        created_at: new Date().toISOString()
      };
      books.push(newBook);
      setStorageItem(KEY_BOOKS, books);
      
      return newClub;
    },
    joinClubByCode: async (userId: string, inviteCode: string): Promise<BookClub | null> => {
      const clubs = getStorageItem<BookClub>(KEY_CLUBS);
      const members = getStorageItem<ClubMember>(KEY_MEMBERS);
      
      const targetClub = clubs.find(c => c.invite_code.trim().toUpperCase() === inviteCode.trim().toUpperCase());
      if (!targetClub) return null;
      
      const alreadyMember = members.some(m => m.club_id === targetClub.id && m.user_id === userId);
      if (!alreadyMember) {
        const newMember: ClubMember = {
          id: 'member-' + Date.now(),
          club_id: targetClub.id,
          user_id: userId,
          joined_at: new Date().toISOString(),
          role: 'member'
        };
        members.push(newMember);
        setStorageItem(KEY_MEMBERS, members);
      }
      
      return targetClub;
    }
  },

  books: {
    getByClub: async (clubId: string): Promise<Book | null> => {
      const books = getStorageItem<Book>(KEY_BOOKS);
      return books.find(b => b.club_id === clubId) || null;
    }
  },

  progress: {
    getMemberProgressList: async (clubId: string, bookId: string): Promise<UserBookProgress[]> => {
      const members = getStorageItem<ClubMember>(KEY_MEMBERS);
      const progresses = getStorageItem<UserBookProgress>(KEY_PROGRESS);
      const profiles = getStorageItem<Profile>(KEY_PROFILES);
      
      const clubUserIds = members.filter(m => m.club_id === clubId).map(m => m.user_id);
      
      return clubUserIds.map(uid => {
        const prog = progresses.find(p => p.user_id === uid && p.book_id === bookId);
        const profile = profiles.find(p => p.id === uid);
        
        return {
          id: prog?.id || 'dummy-prog-' + uid,
          user_id: uid,
          book_id: bookId,
          current_page: prog?.current_page || 0,
          status: prog?.status || 'reading',
          updated_at: prog?.updated_at || new Date().toISOString(),
          profile
        } as UserBookProgress;
      });
    },
    updateMyProgress: async (userId: string, bookId: string, currentPage: number, status: 'reading' | 'completed' | 'paused'): Promise<UserBookProgress> => {
      const progresses = getStorageItem<UserBookProgress>(KEY_PROGRESS);
      const index = progresses.findIndex(p => p.user_id === userId && p.book_id === bookId);
      
      const now = new Date().toISOString();
      let updatedProgress: UserBookProgress;

      if (index > -1) {
        progresses[index] = {
          ...progresses[index],
          current_page: currentPage,
          status,
          updated_at: now
        };
        updatedProgress = progresses[index];
      } else {
        updatedProgress = {
          id: 'prog-' + Date.now(),
          user_id: userId,
          book_id: bookId,
          current_page: currentPage,
          status,
          updated_at: now
        };
        progresses.push(updatedProgress);
      }
      
      setStorageItem(KEY_PROGRESS, progresses);
      return updatedProgress;
    }
  },

  // ==========================================
  // 토론 Mock API 기능
  // ==========================================
  discussion: {
    // 특정 모임 및 도서의 전체 질문 조회
    getQuestions: async (clubId: string, bookId: string): Promise<DiscussionQuestion[]> => {
      const questions = getStorageItem<DiscussionQuestion>(KEY_DISCUSSIONS);
      const profiles = getStorageItem<Profile>(KEY_PROFILES);

      // 모임 및 책 조건 매칭 후 프로필 조인
      return questions
        .filter(q => q.club_id === clubId && q.book_id === bookId)
        .map(q => {
          const profile = profiles.find(p => p.id === q.user_id);
          return { ...q, profile };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    // 질문 상세 조회
    getQuestionById: async (questionId: string): Promise<DiscussionQuestion | null> => {
      const questions = getStorageItem<DiscussionQuestion>(KEY_DISCUSSIONS);
      const profiles = getStorageItem<Profile>(KEY_PROFILES);
      const q = questions.find(item => item.id === questionId);
      if (!q) return null;
      
      const profile = profiles.find(p => p.id === q.user_id);
      return { ...q, profile };
    },

    // 새 질문 제안 등록
    createQuestion: async (userId: string, clubId: string, bookId: string, content: string): Promise<DiscussionQuestion> => {
      const questions = getStorageItem<DiscussionQuestion>(KEY_DISCUSSIONS);
      const newQ: DiscussionQuestion = {
        id: 'q-' + Date.now(),
        club_id: clubId,
        book_id: bookId,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
        status: 'suggested',
        reaction_curious_count: 0,
        reaction_talk_count: 0,
        comments_count: 0
      };
      
      questions.push(newQ);
      setStorageItem(KEY_DISCUSSIONS, questions);
      return newQ;
    },

    // 질문에 대한 반응(나도 궁금해요, 이야기하고 싶어요) 증가
    addReaction: async (questionId: string, type: 'curious' | 'talk'): Promise<DiscussionQuestion | null> => {
      const questions = getStorageItem<DiscussionQuestion>(KEY_DISCUSSIONS);
      const index = questions.findIndex(q => q.id === questionId);
      if (index === -1) return null;

      if (type === 'curious') {
        questions[index].reaction_curious_count += 1;
      } else {
        questions[index].reaction_talk_count += 1;
      }

      setStorageItem(KEY_DISCUSSIONS, questions);
      return questions[index];
    },

    // 특정 질문의 댓글 목록 조회
    getComments: async (questionId: string): Promise<DiscussionComment[]> => {
      const comments = getStorageItem<DiscussionComment>(KEY_COMMENTS);
      const profiles = getStorageItem<Profile>(KEY_PROFILES);

      return comments
        .filter(c => c.question_id === questionId)
        .map(c => {
          const profile = profiles.find(p => p.id === c.user_id);
          return { ...c, profile };
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },

    // 새 댓글 남기기
    createComment: async (userId: string, questionId: string, content: string): Promise<DiscussionComment> => {
      const comments = getStorageItem<DiscussionComment>(KEY_COMMENTS);
      const questions = getStorageItem<DiscussionQuestion>(KEY_DISCUSSIONS);
      
      const newComment: DiscussionComment = {
        id: 'c-' + Date.now(),
        question_id: questionId,
        user_id: userId,
        content,
        created_at: new Date().toISOString()
      };
      comments.push(newComment);
      setStorageItem(KEY_COMMENTS, comments);

      // 질문 카드 내 댓글 카운트 증가
      const qIndex = questions.findIndex(q => q.id === questionId);
      if (qIndex > -1) {
        questions[qIndex].comments_count += 1;
        setStorageItem(KEY_DISCUSSIONS, questions);
      }

      const profiles = getStorageItem<Profile>(KEY_PROFILES);
      newComment.profile = profiles.find(p => p.id === userId);
      return newComment;
    }
  }
};

export const checkIsCompleted = (userId: string | undefined): boolean => {
  if (!userId) return false;
  try {
    const KEY_PROGRESS = 'bookclub_mock_progress';
    const item = typeof window !== 'undefined' ? localStorage.getItem(KEY_PROGRESS) : null;
    const progresses = item ? JSON.parse(item) : [];
    const myProg = progresses.find((p: any) => p.user_id === userId && p.book_id === 'book-1');
    return myProg && myProg.status === 'completed';
  } catch (err) {
    console.error('완독 상태 확인 에러:', err);
    return false;
  }
};


