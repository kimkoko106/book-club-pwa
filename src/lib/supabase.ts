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

// Supabase API 타임아웃 래퍼 (기본 5초)
export async function withTimeout<T>(promise: Promise<T>, ms = 5000, message?: string): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message || `API Timeout of ${ms}ms exceeded`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

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

      if (!isMockMode && supabase) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error || !user) return { data: { user: null } };

          // public.profiles 테이블에서 해당 유저의 닉네임/아바타를 결합해 반환
          const { data: profile, error: profError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profError) {
            console.warn('[Auth] Profiles 테이블 조회 오류:', profError);
          }

          // UI에 필요한 username과 avatar_url을 담아서 user를 가공해 전달
          const mergedUser = {
            id: user.id,
            email: user.email,
            username: profile?.username || user.email?.split('@')[0] || '이름없음',
            avatar_url: profile?.avatar_url || '',
            updated_at: profile?.updated_at || user.updated_at
          };

          return { data: { user: mergedUser } };
        } catch (err) {
          console.error('[Auth] getUser 에러:', err);
          return { data: { user: null } };
        }
      }

      // 로컬 Mock 모드
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
    signIn: async (usernameOrEmail: string, password?: string, isSignUp?: boolean, nickname?: string) => {
      if (!isMockMode && supabase) {
        try {
          if (isSignUp) {
            // 회원가입
            const { data, error } = await supabase.auth.signUp({
              email: usernameOrEmail,
              password: password!,
              options: {
                data: {
                  username: nickname || usernameOrEmail.split('@')[0],
                  nickname: nickname || usernameOrEmail.split('@')[0]
                }
              }
            });
            
            if (error) throw error;

            // 회원가입 성공 시 profiles 에 row가 없을 수 있으므로 직접 보정 (트리거가 작동하지 않을 경우 대비)
            if (data?.user) {
              const uid = data.user.id;
              const { data: prof } = await supabase.from('profiles').select('id').eq('id', uid).maybeSingle();
              if (!prof) {
                await supabase.from('profiles').insert({
                  id: uid,
                  username: nickname || usernameOrEmail.split('@')[0],
                  avatar_url: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?w=100&auto=format&fit=crop&q=80`,
                  updated_at: new Date().toISOString()
                });
              }
            }

            return { data: { user: data.user }, error: null };
          } else {
            // 로그인
            const { data, error } = await supabase.auth.signInWithPassword({
              email: usernameOrEmail,
              password: password!
            });

            if (error) throw error;

            return { data: { user: data.user }, error: null };
          }
        } catch (err: any) {
          console.error('[Auth] signIn/signUp 실패:', err);
          return { data: null, error: err };
        }
      }

      // 로컬 Mock 모드
      const username = usernameOrEmail; // Mock 모드에선 이메일 필드가 곧 닉네임으로 사용됨
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
      if (!isMockMode && supabase) {
        try {
          const { error } = await supabase.auth.signOut();
          return { error };
        } catch (err: any) {
          console.error('[Auth] signOut 실패:', err);
          return { error: err };
        }
      }

      // 로컬 Mock 모드
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
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('group_members')
            .select(`
              group_id,
              groups (
                id,
                title,
                description,
                invite_code,
                created_at,
                created_by
              )
            `)
            .eq('user_id', userId);

          if (error) throw error;
          return (data || [])
            .map((item: any) => item.groups)
            .filter((g: any) => g !== null) as BookClub[];
        } catch (err) {
          console.error('Error fetching my clubs from Supabase:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드
      const members = getStorageItem<ClubMember>(KEY_MEMBERS);
      const clubs = getStorageItem<BookClub>(KEY_CLUBS);
      
      const myClubIds = members.filter(m => m.user_id === userId).map(m => m.club_id);
      return clubs.filter(c => myClubIds.includes(c.id));
    },
    createClub: async (
      userId: string, 
      title: string, 
      description: string, 
      bookTitle: string, 
      bookAuthor: string, 
      totalPages?: number | null,
      bookMetadata?: any
    ): Promise<BookClub> => {
      // 오늘 날짜 및 30일 뒤 날짜 계산 헬퍼
      const today = new Date();
      const after30Days = new Date();
      after30Days.setDate(today.getDate() + 30);

      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      const formatMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const formatRange = (d1: Date, d2: Date) => {
        const f = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        return `${f(d1)}~${f(d2)}`;
      };

      // 세부 타임라인 분배 (독서 15일, 질문 10일, 토론 5일)
      const rStart = new Date(today);
      const rEnd = new Date(today);
      rEnd.setDate(today.getDate() + 14);

      const qStart = new Date(today);
      qStart.setDate(today.getDate() + 15);
      const qEnd = new Date(today);
      qEnd.setDate(today.getDate() + 24);

      const dStart = new Date(today);
      dStart.setDate(today.getDate() + 25);
      const dEnd = new Date(today);
      dEnd.setDate(today.getDate() + 29);

      const timelineReading = formatRange(rStart, rEnd);
      const timelineQuestion = formatRange(qStart, qEnd);
      const timelineDiscussion = formatRange(dStart, dEnd);

      if (!isMockMode && supabase) {
        console.log('[Debug] createClub 시작 - userId:', userId);
        
        // profiles 존재를 검증하고 누락 시 자동 생성(복구)해 주는 헬퍼 함수
        const ensureProfileExists = async (uid: string): Promise<void> => {
          console.log('[Debug] 0. profiles 존재 여부 검증 시작 - uid:', uid);
          const { data: prof, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', uid)
            .maybeSingle();

          if (checkError) {
            console.warn('[Debug Warning] profiles 조회 중 경고 발생:', checkError);
          }

          if (!prof) {
            console.log('[Debug] profiles 내 사용자 레코드가 누락되었습니다. 자동 복구를 시작합니다...');
            const { data: authData } = await supabase.auth.getUser();
            const user = authData?.user;
            const fallbackUsername = user?.user_metadata?.username || user?.user_metadata?.nickname || `user_${uid.substring(0, 8)}`;
            const fallbackAvatar = user?.user_metadata?.avatar_url || '';

            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: uid,
                username: fallbackUsername,
                avatar_url: fallbackAvatar,
                updated_at: new Date().toISOString()
              });

            if (insertError) {
              console.error('[Debug Error] profiles 자동 복구 실패:', insertError);
              throw new Error(`[Step 0: 프로필 복구 실패] Profiles 테이블 누락 자동 생성을 실패했습니다. Code: ${insertError.code}, Message: ${insertError.message}`);
            }
            console.log('[Debug] profiles 자동 복구 완료 (row 신규 생성)');
          } else {
            console.log('[Debug] profiles 내 레코드 존재 확인 완료.');
          }
        };

        try {
          // 0. profiles 존재성 강제 보장 실행
          await ensureProfileExists(userId);

          // 8, 9. 현재 auth session 및 user id와 profiles 관계 사전 검증
          const { data: authData, error: authCheckError } = await supabase.auth.getUser();
          console.log('[Debug] auth.getUser() 결과:', { user: authData?.user?.id, error: authCheckError });

          if (authData?.user?.id !== userId) {
            console.error('[Debug Error] 매개변수 userId와 세션 uid가 불일치합니다:', { param: userId, session: authData?.user?.id });
          }

          // 1. 초대 코드 생성
          const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          console.log('[Debug] 생성된 초대 코드:', inviteCode);

          // 2. groups에 삽입
          console.log('[Debug] 1. groups 테이블 insert 시도...');
          const { data: group, error: groupError } = await supabase
            .from('groups')
            .insert({
              title,
              description,
              invite_code: inviteCode,
              type: 'group',
              visibility: 'group',
              created_by: userId
            })
            .select('*')
            .single();

          if (groupError) {
            console.error('[Debug Error] groups insert 실패:', groupError);
            throw new Error(`[Step 1: groups 테이블 삽입 실패] Code: ${groupError.code}, Message: ${groupError.message}, Details: ${groupError.details || '없음'}, Hint: ${groupError.hint || '없음'}`);
          }
          console.log('[Debug] groups insert 성공 - group_id:', group.id);

          // 3. group_members에 방장 추가
          console.log('[Debug] 2. group_members 테이블 insert 시도...');
          const { error: memberError } = await supabase
            .from('group_members')
            .insert({
              group_id: group.id,
              user_id: userId,
              role: 'admin'
            });

          if (memberError) {
            console.error('[Debug Error] group_members insert 실패:', memberError);
            throw new Error(`[Step 2: group_members 테이블 삽입 실패] Code: ${memberError.code}, Message: ${memberError.message}, Details: ${memberError.details || '없음'}, Hint: ${memberError.hint || '없음'}`);
          }
          console.log('[Debug] group_members insert 성공 (admin 가입 완료)');

          // 4. books 테이블 중복 확인 및 삽입
          console.log('[Debug] 3. findOrCreateBook 호출 시도...');
          const { id: bookId } = await mockApi.books.findOrCreateBook({
            title: bookTitle,
            author: bookAuthor,
            total_pages: totalPages,
            cover_url: bookMetadata?.cover_url || bookMetadata?.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
            isbn: bookMetadata?.isbn,
            isbn13: bookMetadata?.isbn13,
            source: bookMetadata?.source || 'manual',
            source_id: bookMetadata?.source_id || bookMetadata?.sourceId,
            publisher: bookMetadata?.publisher,
            description: bookMetadata?.description,
            published_at: bookMetadata?.published_at || bookMetadata?.publishedAt
          });

          // 5. monthly_books 에 연계 등록
          console.log('[Debug] 4. monthly_books 테이블 insert 시도...');
          const currentMonth = formatMonth(today);
          const { error: monthlyBookError } = await supabase
            .from('monthly_books')
            .insert({
              group_id: group.id,
              book_id: bookId,
              month: currentMonth,
              stage: 'reading',
              timeline_reading: timelineReading,
              timeline_question: timelineQuestion,
              timeline_discussion: timelineDiscussion
            });

          if (monthlyBookError) {
            console.error('[Debug Error] monthly_books insert 실패:', monthlyBookError);
            throw new Error(`[Step 4: monthly_books 테이블 삽입 실패] Code: ${monthlyBookError.code}, Message: ${monthlyBookError.message}, Details: ${monthlyBookError.details || '없음'}`);
          }
          console.log('[Debug] monthly_books insert 성공');

          // 6. 로컬스토리지에도 신규 방의 독서 단계(reading) 및 타임라인 동기화 저장
          if (typeof window !== 'undefined') {
            localStorage.setItem(`bookclub_start_date_${group.id}`, formatDate(today));
            localStorage.setItem(`bookclub_end_date_${group.id}`, formatDate(after30Days));
            localStorage.setItem(`bookclub_q_days_${group.id}`, '10');
            localStorage.setItem(`bookclub_t_days_${group.id}`, '5');
            localStorage.setItem(`bookclub_mock_club_stage_${group.id}`, 'reading');
          }

          return {
            id: group.id,
            title: group.title,
            description: group.description,
            invite_code: group.invite_code || '',
            created_at: group.created_at,
            created_by: group.created_by
          } as BookClub;

        } catch (err) {
          console.error('[Debug Error] createClub 전체 흐름 중 예외 포착:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드 대응
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

      // 로컬 mock 모드에서도 동일하게 시작일/종료일/기본 단계를 보장 저장
      if (typeof window !== 'undefined') {
        localStorage.setItem(`bookclub_start_date_${newClub.id}`, formatDate(today));
        localStorage.setItem(`bookclub_end_date_${newClub.id}`, formatDate(after30Days));
        localStorage.setItem(`bookclub_q_days_${newClub.id}`, '10');
        localStorage.setItem(`bookclub_t_days_${newClub.id}`, '5');
        localStorage.setItem(`bookclub_mock_club_stage_${newClub.id}`, 'reading');
      }
      
      return newClub;
    },
    joinClubByCode: async (userId: string, inviteCode: string): Promise<BookClub | null> => {
      if (!isMockMode && supabase) {
        try {
          // .single() 대신 .maybeSingle()을 사용하여 0건 조회 시 406/PGRST116 에러 방지
          const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('invite_code', inviteCode.trim().toUpperCase())
            .maybeSingle();

          if (groupError) {
            console.error('[Debug Error] 초대코드로 그룹 조회 실패:', groupError);
            throw groupError;
          }

          if (!group) {
            console.log(`[Debug] 입력한 초대코드 [${inviteCode}]와 매칭되는 그룹을 찾지 못함 (null)`);
            return null;
          }

          const { data: member, error: memberError } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', group.id)
            .eq('user_id', userId);

          if (memberError) throw memberError;

          if (!member || member.length === 0) {
            const { error: joinError } = await supabase
              .from('group_members')
              .insert({
                group_id: group.id,
                user_id: userId,
                role: 'member'
              });

            if (joinError) throw joinError;
          }

          return {
            id: group.id,
            title: group.title,
            description: group.description,
            invite_code: group.invite_code || '',
            created_at: group.created_at,
            created_by: group.created_by
          } as BookClub;

        } catch (err) {
          console.error('Error joining club in Supabase:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드
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
    },

    getMonthlyBook: async (clubId: string): Promise<any | null> => {
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('monthly_books')
            .select(`
              *,
              books (
                id,
                title,
                author,
                total_pages,
                cover_url,
                created_at
              )
            `)
            .eq('group_id', clubId)
            .neq('stage', 'scheduled') // 다음 달 예정된 도서는 현재 도서에서 제외
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) throw error;
          if (!data || data.length === 0) return null;
          return data[0];
        } catch (err) {
          console.error('[DB] getMonthlyBook 에러:', err);
          return null;
        }
      }

      // 로컬 Mock 모드
      const stage = localStorage.getItem(`bookclub_mock_club_stage_${clubId}`) || 'reading';
      if (stage === 'scheduled') {
        // 예약 상태라면 현재 진행 중인 책이 없음
        return null;
      }

      const books = getStorageItem<Book>(KEY_BOOKS);
      const matchedBook = books.find(b => b.club_id === clubId) || null;
      if (!matchedBook) return null;

      let dbStage = 'reading';
      if (stage === 'question_collecting') dbStage = 'question';
      else if (stage === 'discussion') dbStage = 'discussion';
      else if (stage === 'archiving') dbStage = 'recap';

      const timelineReading = localStorage.getItem(`bookclub_start_date_${clubId}`) && localStorage.getItem(`bookclub_end_date_${clubId}`)
        ? `${localStorage.getItem(`bookclub_start_date_${clubId}`)}~${localStorage.getItem(`bookclub_end_date_${clubId}`)}`
        : '2026-05-01~2026-05-14';
      
      const timelineQuestion = localStorage.getItem(`bookclub_q_start_date_${clubId}`) && localStorage.getItem(`bookclub_q_end_date_${clubId}`)
        ? `${localStorage.getItem(`bookclub_q_start_date_${clubId}`)}~${localStorage.getItem(`bookclub_q_end_date_${clubId}`)}`
        : null;

      const timelineDiscussion = localStorage.getItem(`bookclub_t_start_date_${clubId}`) && localStorage.getItem(`bookclub_t_end_date_${clubId}`)
        ? `${localStorage.getItem(`bookclub_t_start_date_${clubId}`)}~${localStorage.getItem(`bookclub_t_end_date_${clubId}`)}`
        : null;

      return {
        id: 'monthly-mock-' + clubId,
        group_id: clubId,
        book_id: matchedBook.id,
        month: '2026-05',
        stage: dbStage,
        timeline_reading: timelineReading,
        timeline_question: timelineQuestion,
        timeline_discussion: timelineDiscussion,
        books: matchedBook
      };
    },

    updateMonthlyBook: async (
      clubId: string, 
      data: { 
        book_id?: string; 
        stage?: 'reading' | 'question' | 'discussion' | 'recap';
        timeline_reading?: string | null;
        timeline_question?: string | null;
        timeline_discussion?: string | null;
      }
    ): Promise<void> => {
      if (!isMockMode && supabase) {
        try {
          const { data: latest, error: findError } = await supabase
            .from('monthly_books')
            .select('id')
            .eq('group_id', clubId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (findError) throw findError;

          if (latest && latest.length > 0) {
            const { error: updateError } = await supabase
              .from('monthly_books')
              .update(data)
              .eq('id', latest[0].id);

            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('monthly_books')
              .insert({
                group_id: clubId,
                book_id: data.book_id || '',
                month: new Date().toISOString().substring(0, 7),
                stage: data.stage || 'reading',
                timeline_reading: data.timeline_reading || null,
                timeline_question: data.timeline_question || null,
                timeline_discussion: data.timeline_discussion || null
              });

            if (insertError) throw insertError;
          }
        } catch (err: any) {
          const errDetails = {
            function: 'updateMonthlyBook',
            message: err?.message || 'No message',
            code: err?.code || 'No code',
            details: err?.details || 'No details',
            hint: err?.hint || 'No hint',
            payload: {
              clubId,
              data
            }
          };
          console.error('[DB] updateMonthlyBook error:', errDetails);
          throw err;
        }
        return;
      }

      // 로컬 Mock 모드
      if (data.stage) {
        let uiStage = 'reading';
        if (data.stage === 'question') uiStage = 'question_collecting';
        else if (data.stage === 'discussion') uiStage = 'discussion';
        else if (data.stage === 'recap') uiStage = 'archiving';
        localStorage.setItem(`bookclub_mock_club_stage_${clubId}`, uiStage);
      }
      if (data.timeline_reading) {
        const parts = data.timeline_reading.split('~');
        if (parts.length === 2) {
          localStorage.setItem(`bookclub_start_date_${clubId}`, parts[0]);
          localStorage.setItem(`bookclub_end_date_${clubId}`, parts[1]);
        }
      }
      if (data.timeline_question) {
        const parts = data.timeline_question.split('~');
        if (parts.length === 2) {
          localStorage.setItem(`bookclub_q_start_date_${clubId}`, parts[0]);
          localStorage.setItem(`bookclub_q_end_date_${clubId}`, parts[1]);
        }
      }
      if (data.timeline_discussion) {
        const parts = data.timeline_discussion.split('~');
        if (parts.length === 2) {
          localStorage.setItem(`bookclub_t_start_date_${clubId}`, parts[0]);
          localStorage.setItem(`bookclub_t_end_date_${clubId}`, parts[1]);
        }
      }
    },

    // 다음 도서 최종 선정 (새로운 monthly_books row 누적 생성 및 아카이브 유지)
    selectNextBook: async (
      clubId: string, 
      bookData: { 
        title: string; 
        author: string; 
        cover_url?: string; 
        total_pages?: number | null; 
        isbn?: string;
        isbn13?: string;
        source?: string;
        source_id?: string;
        publisher?: string;
        description?: string;
        published_at?: string;
      },
      targetType: 'current' | 'next' = 'current'
    ): Promise<void> => {
      if (!isMockMode && supabase) {
        try {
          const { id: bookId } = await mockApi.books.findOrCreateBook({
            title: bookData.title,
            author: bookData.author,
            total_pages: bookData.total_pages,
            cover_url: bookData.cover_url,
            isbn: bookData.isbn,
            isbn13: bookData.isbn13,
            source: bookData.source || 'manual',
            source_id: bookData.source_id,
            publisher: bookData.publisher,
            description: bookData.description,
            published_at: bookData.published_at
          });

          const today = new Date();
          const formatDate = (d: Date) => d.toISOString().split('T')[0];

          if (targetType === 'next') {
            // 다음 달 도서 예약 선정
            const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            const targetMonth = nextMonthDate.toISOString().substring(0, 7);

            console.log('[DB] selectNextBook (next month) check for month:', targetMonth);
            const { data: existingMb, error: selectMbError } = await supabase
              .from('monthly_books')
              .select('id, book_id')
              .eq('group_id', clubId)
              .eq('month', targetMonth)
              .maybeSingle();

            if (selectMbError) {
              console.error('[DB] selectNextBook next month check error:', selectMbError);
              throw selectMbError;
            }

            if (existingMb) {
              if (existingMb.book_id === bookId) {
                throw new Error('이미 다음 달 예정 책으로 선정되어 있어요.');
              }

              console.log('[DB] Updating existing next month book to new selection... mbId:', existingMb.id);
              const { error: updateMbError } = await supabase
                .from('monthly_books')
                .update({
                  book_id: bookId,
                  stage: 'scheduled',
                  timeline_reading: null,
                  timeline_question: null,
                  timeline_discussion: null
                })
                .eq('id', existingMb.id);

              if (updateMbError) throw updateMbError;
            } else {
              console.log('[DB] Inserting new next month book selection...');
              const { error: insertMbError } = await supabase
                .from('monthly_books')
                .insert({
                  group_id: clubId,
                  book_id: bookId,
                  month: targetMonth,
                  stage: 'scheduled',
                  timeline_reading: null,
                  timeline_question: null,
                  timeline_discussion: null
                });

              if (insertMbError) throw insertMbError;
            }
          } else {
            // 이번 달 공유 도서 즉시 지정
            const targetMonth = today.toISOString().substring(0, 7);
            const after30Days = new Date();
            after30Days.setDate(today.getDate() + 30);

            console.log('[DB] selectNextBook (current month) check for month:', targetMonth);
            const { data: existingMb, error: selectMbError } = await supabase
              .from('monthly_books')
              .select('id, book_id')
              .eq('group_id', clubId)
              .eq('month', targetMonth)
              .maybeSingle();

            if (selectMbError) {
              console.error('[DB] selectNextBook current month check error:', selectMbError);
              throw selectMbError;
            }

            if (existingMb) {
              if (existingMb.book_id === bookId) {
                throw new Error('이미 이번 달 공유책이에요.');
              }

              console.log('[DB] Updating existing monthly book... mbId:', existingMb.id);
              const { error: updateMbError } = await supabase
                .from('monthly_books')
                .update({
                  book_id: bookId,
                  stage: 'reading',
                  timeline_reading: `${formatDate(today)}~${formatDate(after30Days)}`,
                  timeline_question: null,
                  timeline_discussion: null
                })
                .eq('id', existingMb.id);

              if (updateMbError) throw updateMbError;
            } else {
              console.log('[DB] Inserting new monthly book...');
              const { error: insertMbError } = await supabase
                .from('monthly_books')
                .insert({
                  group_id: clubId,
                  book_id: bookId,
                  month: targetMonth,
                  stage: 'reading',
                  timeline_reading: `${formatDate(today)}~${formatDate(after30Days)}`,
                  timeline_question: null,
                  timeline_discussion: null
                });

              if (insertMbError) throw insertMbError;
            }

            // 이번 달 새로운 공유책으로 교체/선정 시 모임원들의 개인 진척도를 0으로 리셋
            const { data: members, error: mError } = await supabase
              .from('group_members')
              .select('user_id')
              .eq('group_id', clubId);

            if (mError) throw mError;

            if (members && members.length > 0) {
              for (const m of members) {
                const { data: exists } = await supabase
                  .from('user_books')
                  .select('id')
                  .eq('user_id', m.user_id)
                  .eq('book_id', bookId)
                  .maybeSingle();

                if (!exists) {
                  await supabase
                    .from('user_books')
                    .insert({
                      user_id: m.user_id,
                      book_id: bookId,
                      status: 'reading',
                      current_page: 0,
                      is_recommended: false
                    });
                } else {
                  await supabase
                    .from('user_books')
                    .update({
                      status: 'reading',
                      current_page: 0
                    })
                    .eq('id', exists.id);
                }
              }
            }
          }
        } catch (err: any) {
          const errDetails = {
            function: 'selectNextBook',
            message: err?.message || 'No message',
            code: err?.code || 'No code',
            details: err?.details || 'No details',
            hint: err?.hint || 'No hint',
            payload: {
              clubId,
              bookTitle: bookData.title,
              targetType
            }
          };
          console.error('[DB] selectNextBook error:', errDetails);
          throw err;
        }
        return;
      }

      if (typeof window === 'undefined') return;
      try {
        const booksList = getStorageItem<Book>(KEY_BOOKS);
        let matchedBook = booksList.find(b => 
          b.title.trim().toLowerCase() === bookData.title.trim().toLowerCase() &&
          b.author.trim().toLowerCase() === bookData.author.trim().toLowerCase()
        );

        if (!matchedBook) {
          matchedBook = {
            id: 'book-' + Date.now(),
            club_id: clubId,
            title: bookData.title.trim(),
            author: bookData.author.trim(),
            total_pages: bookData.total_pages || null,
            cover_url: bookData.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
            isbn: bookData.isbn || undefined,
            isbn13: bookData.isbn13 || undefined,
            source: bookData.source || 'manual',
            source_id: bookData.source_id || undefined,
            publisher: bookData.publisher || undefined,
            description: bookData.description || undefined,
            published_at: bookData.published_at || undefined,
            created_at: new Date().toISOString()
          };
          booksList.push(matchedBook);
          setStorageItem(KEY_BOOKS, booksList);
        }

        const KEY_MONTHLY_BOOKS = 'bookclub_mock_monthly_books';
        const storedMb = localStorage.getItem(KEY_MONTHLY_BOOKS);
        const mbList = storedMb ? JSON.parse(storedMb) : [];
        
        const today = new Date();
        const after30Days = new Date();
        after30Days.setDate(today.getDate() + 30);
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        const newMb = {
          id: 'monthly-mock-' + Date.now(),
          group_id: clubId,
          book_id: matchedBook.id,
          month: today.toISOString().substring(0, 7),
          stage: 'reading',
          timeline_reading: `${formatDate(today)}~${formatDate(after30Days)}`,
          timeline_question: null,
          timeline_discussion: null,
          books: matchedBook
        };
        
        mbList.unshift(newMb);
        localStorage.setItem(KEY_MONTHLY_BOOKS, JSON.stringify(mbList));

        const KEY_PROGRESS = 'bookclub_mock_progress';
        const storedProg = localStorage.getItem(KEY_PROGRESS);
        const progList = storedProg ? JSON.parse(storedProg) : [];
        
        const resetProgress = progList.map((p: any) => {
          if (p.book_id === 'book-1' || p.book_id === matchedBook?.id) {
            return {
              ...p,
              current_page: 0,
              status: 'reading',
              updated_at: new Date().toISOString()
            };
          }
          return p;
        });
        localStorage.setItem(KEY_PROGRESS, JSON.stringify(resetProgress));

        localStorage.setItem(`bookclub_mock_club_stage_${clubId}`, 'reading');
        localStorage.setItem(`bookclub_start_date_${clubId}`, formatDate(today));
        localStorage.setItem(`bookclub_end_date_${clubId}`, formatDate(after30Days));
      } catch (err) {
        console.warn('Mock selectNextBook error:', err);
        throw err;
      }
    }
  },

  books: {
    findOrCreateBook: async (bookData: {
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
    }): Promise<{ id: string; total_pages: number | null }> => {
      const cleanTitle = bookData.title.trim();
      const cleanAuthor = bookData.author.trim();
      const totalPages = bookData.total_pages && bookData.total_pages > 0 ? bookData.total_pages : null;
      const coverUrl = bookData.cover_url || '';

      if (!isMockMode && supabase) {
        console.log('[DB] findOrCreateBook started. title:', cleanTitle, 'author:', cleanAuthor);
        try {
          // 1. isbn13 중복 체크
          if (bookData.isbn13) {
            console.log('[DB] findOrCreateBook check by isbn13 starting... value:', bookData.isbn13.trim());
            try {
              const { data, error } = await supabase
                .from('books')
                .select('id, total_pages')
                .eq('isbn13', bookData.isbn13.trim());
              if (error) {
                console.warn('[DB] findOrCreateBook isbn13 select error:', { message: error.message, code: error.code, details: error.details });
              }
              if (!error && data && data.length > 0) {
                console.log('[DB] Found existing book by isbn13:', data[0].id);
                return { id: data[0].id, total_pages: data[0].total_pages };
              }
            } catch (err) {
              console.warn('[DB] Failed to query by isbn13 (may be column missing):', err);
            }
          }

          // 2. isbn 중복 체크
          if (bookData.isbn) {
            console.log('[DB] findOrCreateBook check by isbn starting... value:', bookData.isbn.trim());
            try {
              const { data, error } = await supabase
                .from('books')
                .select('id, total_pages')
                .eq('isbn', bookData.isbn.trim());
              if (error) {
                console.warn('[DB] findOrCreateBook isbn select error:', { message: error.message, code: error.code, details: error.details });
              }
              if (!error && data && data.length > 0) {
                console.log('[DB] Found existing book by isbn:', data[0].id);
                return { id: data[0].id, total_pages: data[0].total_pages };
              }
            } catch (err) {
              console.warn('[DB] Failed to query by isbn (may be column missing):', err);
            }
          }

          // 3. title + author 중복 체크
          console.log('[DB] findOrCreateBook check by title + author starting...');
          const { data, error } = await supabase
            .from('books')
            .select('id, total_pages')
            .eq('title', cleanTitle)
            .eq('author', cleanAuthor);
          if (error) {
            console.warn('[DB] findOrCreateBook title+author select error:', { message: error.message, code: error.code, details: error.details });
          }
          if (!error && data && data.length > 0) {
            console.log('[DB] Found existing book by title + author:', data[0].id);
            return { id: data[0].id, total_pages: data[0].total_pages };
          }

          // 4. 새 도서 등록 시도
          console.log('[DB] findOrCreateBook inserting into books...');
          try {
            const insertObj: any = {
              title: cleanTitle,
              author: cleanAuthor,
              total_pages: totalPages,
              cover_url: coverUrl,
              isbn: bookData.isbn ? bookData.isbn.trim() : null,
              isbn13: bookData.isbn13 ? bookData.isbn13.trim() : null,
              source: bookData.source || 'manual',
              source_id: bookData.source_id || null,
              publisher: bookData.publisher || null,
              description: bookData.description || null,
              published_at: bookData.published_at || null
            };
            const { data: newBook, error: insertError } = await supabase
              .from('books')
              .insert(insertObj)
              .select('id, total_pages')
              .single();

            if (!insertError && newBook) {
              console.log('[DB] Inserted new book with metadata:', newBook.id);
              return { id: newBook.id, total_pages: newBook.total_pages };
            }

            if (insertError) {
              console.warn('[DB] Full book insert failed:', {
                message: insertError.message,
                code: insertError.code,
                details: insertError.details,
                hint: insertError.hint
              }, 'Retrying with core columns...');
              
              // 만약 0 rows returned (PGRST116) 에러라면, select 권한 등으로 결과가 안 왔을 뿐 DB에는 들어갔을 수 있으므로 title+author로 즉시 조회 시도
              if (insertError.code === 'PGRST116' || insertError.message?.includes('0 rows')) {
                const { data: recovered, error: recError } = await supabase
                  .from('books')
                  .select('id, total_pages')
                  .eq('title', cleanTitle)
                  .eq('author', cleanAuthor)
                  .order('created_at', { ascending: false })
                  .limit(1);
                if (!recError && recovered && recovered.length > 0) {
                  console.log('[DB] Recovered book ID after full insert single check fail:', recovered[0].id);
                  return { id: recovered[0].id, total_pages: recovered[0].total_pages };
                }
              }
            }
          } catch (err: any) {
            console.warn('[DB] Full book insert caught error, retrying with core columns:', err?.message || err);
          }

          // 5. Core columns fallback insert (total_pages = null)
          console.log('[DB] findOrCreateBook Core columns fallback inserting (null)...');
          try {
            const { data: fallbackBook, error: fallbackError } = await supabase
              .from('books')
              .insert({
                title: cleanTitle,
                author: cleanAuthor,
                total_pages: totalPages, // null일 수 있음
                cover_url: coverUrl
              })
              .select('id, total_pages')
              .single();

            if (!fallbackError && fallbackBook) {
              console.log('[DB] Fallback book inserted successfully:', fallbackBook.id);
              return { id: fallbackBook.id, total_pages: fallbackBook.total_pages };
            }

            if (fallbackError) {
              console.warn('[DB] Fallback insert failed:', {
                message: fallbackError.message,
                code: fallbackError.code,
                details: fallbackError.details
              });
              
              // 만약 0 rows returned (PGRST116) 에러 복구
              if (fallbackError.code === 'PGRST116') {
                const { data: recovered, error: recError } = await supabase
                  .from('books')
                  .select('id, total_pages')
                  .eq('title', cleanTitle)
                  .eq('author', cleanAuthor)
                  .order('created_at', { ascending: false })
                  .limit(1);
                if (!recError && recovered && recovered.length > 0) {
                  console.log('[DB] Recovered book ID after fallback insert single check fail:', recovered[0].id);
                  return { id: recovered[0].id, total_pages: recovered[0].total_pages };
                }
              }
              
              // 만약 NOT NULL 제약조건 위반(23502)이고 totalPages가 null인 경우라면, 최후의 수단으로 total_pages = 1로 재시도
              if (fallbackError.code === '23502' && totalPages === null) {
                console.log('[DB] Fallback to total_pages = 1 due to DB NOT NULL constraint...');
                const { data: fallbackBook2, error: fallbackError2 } = await supabase
                  .from('books')
                  .insert({
                    title: cleanTitle,
                    author: cleanAuthor,
                    total_pages: 1, // DB 제약조건을 만족하기 위해 1 채움 (원격 DB 미변경 대비)
                    cover_url: coverUrl
                  })
                  .select('id, total_pages')
                  .single();

                if (!fallbackError2 && fallbackBook2) {
                  console.log('[DB] Fallback with total_pages=1 inserted successfully:', fallbackBook2.id);
                  return { id: fallbackBook2.id, total_pages: fallbackBook2.total_pages };
                }
                
                if (fallbackError2) {
                  throw fallbackError2;
                }
              } else {
                throw fallbackError;
              }
            }
          } catch (err: any) {
            console.error('[DB] Fallback insert caught exception:', err?.message || err);
            throw err;
          }

        } catch (err: any) {
          const errorDetails = {
            message: err?.message || 'No message',
            code: err?.code || 'No code',
            details: err?.details || 'No details',
            hint: err?.hint || 'No hint',
            stack: err?.stack || 'No stack',
            raw: err
          };
          console.error('[DB] findOrCreateBook critical error:', errorDetails);
          const richError = new Error(`[findOrCreateBook] ${errorDetails.message} (Code: ${errorDetails.code}, Details: ${errorDetails.details})`);
          (richError as any).code = errorDetails.code;
          (richError as any).details = errorDetails.details;
          (richError as any).hint = errorDetails.hint;
          throw richError;
        }
      }

      // Mock Mode
      const books = getStorageItem<Book>(KEY_BOOKS) as any[];
      let matchedBook = null;

      if (bookData.isbn13) {
        matchedBook = books.find(b => b.isbn13 && b.isbn13 === bookData.isbn13);
      }
      if (!matchedBook && bookData.isbn) {
        matchedBook = books.find(b => b.isbn && b.isbn === bookData.isbn);
      }
      if (!matchedBook) {
        matchedBook = books.find(b => 
          b.title.trim().toLowerCase() === cleanTitle.toLowerCase() && 
          b.author.trim().toLowerCase() === cleanAuthor.toLowerCase()
        );
      }

      if (matchedBook) {
        return { id: matchedBook.id, total_pages: matchedBook.total_pages || null };
      }

      const newBook: any = {
        id: 'book-' + Date.now(),
        title: cleanTitle,
        author: cleanAuthor,
        total_pages: totalPages,
        cover_url: coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
        isbn: bookData.isbn || undefined,
        isbn13: bookData.isbn13 || undefined,
        source: bookData.source || 'manual',
        source_id: bookData.source_id || undefined,
        publisher: bookData.publisher || undefined,
        description: bookData.description || undefined,
        published_at: bookData.published_at || undefined,
        created_at: new Date().toISOString()
      };
      books.push(newBook);
      setStorageItem(KEY_BOOKS, books);
      return { id: newBook.id, total_pages: newBook.total_pages };
    },

    getByClub: async (clubId: string): Promise<Book | null> => {
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('monthly_books')
            .select(`
              book_id,
              books (
                id,
                title,
                author,
                total_pages,
                cover_url,
                created_at
              )
            `)
            .eq('group_id', clubId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) throw error;
          if (!data || data.length === 0) return null;

          const b = (data[0] as any).books;
          if (!b) return null;

          return {
            id: b.id,
            club_id: clubId,
            title: b.title,
            author: b.author,
            total_pages: b.total_pages,
            cover_url: b.cover_url || '',
            created_at: b.created_at
          } as Book;
        } catch (err) {
          console.error('Error fetching club book from Supabase:', err);
          return null;
        }
      }

      // 로컬 Mock 모드
      const books = getStorageItem<Book>(KEY_BOOKS);
      return books.find(b => b.club_id === clubId) || null;
    },
    getUserBooks: async (userId: string): Promise<any[]> => {
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await withTimeout<any>(
            Promise.resolve(
              supabase
                .from('user_books')
                .select(`
                  id,
                  status,
                  current_page,
                  is_recommended,
                  recommend_type,
                  recommend_comment,
                  books (
                    id,
                    title,
                    author,
                    total_pages,
                    cover_url
                  ),
                  user_book_memos (
                    id
                  )
                `)
                .eq('user_id', userId)
            ),
            5000,
            'Supabase user_books fetch timed out'
          );

          if (error) throw error;

          return (data || []).map((ub: any) => {
            let uiStatus: 'reading' | 'completed' | 'wish' = 'reading';
            if (ub.status === 'completed') uiStatus = 'completed';
            else if (ub.status === 'wished' || ub.status === 'wish' || ub.status === 'want_to_read') uiStatus = 'wish';

            const bookInfo = ub.books || { title: '제목 없음', author: '저자 미상', cover_url: '', total_pages: null };
            const hasTotalPages = bookInfo.total_pages !== undefined && bookInfo.total_pages !== null && bookInfo.total_pages > 0;
            const progressPercent = hasTotalPages
              ? Math.round((ub.current_page / bookInfo.total_pages) * 100)
              : ub.current_page;

            return {
              id: ub.id,
              title: bookInfo.title,
              author: bookInfo.author,
              cover_url: bookInfo.cover_url || '',
              total_pages: bookInfo.total_pages || null,
              status: uiStatus,
              progress: uiStatus === 'reading' ? Math.min(100, Math.max(0, progressPercent)) : undefined,
              is_recommended: ub.is_recommended,
              memo_count: ub.user_book_memos ? ub.user_book_memos.length : 0,
              completed_date: uiStatus === 'completed' ? '최근 완독' : undefined
            };
          });
        } catch (err) {
          console.error('Error fetching user books from Supabase:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드 대응
      if (typeof window === 'undefined') return [];
      try {
        const storedBooks = localStorage.getItem('bookclub_personal_shelf');
        if (storedBooks) {
          return JSON.parse(storedBooks);
        }
        return [];
      } catch (err) {
        console.error('Error loading mock user books from localStorage:', err);
        return [];
      }
    },

    addBookToShelf: async (
      userId: string, 
      bookData: { 
        title: string; 
        author: string; 
        cover_url?: string; 
        status: 'reading' | 'completed' | 'wish'; 
        progress: number;
        total_pages?: number | null;
        isbn?: string | null;
        isbn13?: string | null;
        source?: string | null;
        source_id?: string | null;
        publisher?: string | null;
        description?: string | null;
        published_at?: string | null;
      }
    ): Promise<any> => {
      if (!isMockMode && supabase) {
        try {
          const { id: bookId, total_pages: dbTotalPages } = await mockApi.books.findOrCreateBook({
            title: bookData.title,
            author: bookData.author,
            total_pages: bookData.total_pages,
            cover_url: bookData.cover_url,
            isbn: bookData.isbn,
            isbn13: bookData.isbn13,
            source: bookData.source || 'manual',
            source_id: bookData.source_id,
            publisher: bookData.publisher,
            description: bookData.description,
            published_at: bookData.published_at
          });

          console.log('[DB] addBookToShelf starting check user_book... userId:', userId, 'bookId:', bookId);
          const { data: userBookExists, error: checkUserBookError } = await supabase
            .from('user_books')
            .select('id')
            .eq('user_id', userId)
            .eq('book_id', bookId);

          if (checkUserBookError) {
            console.error('[DB] addBookToShelf duplicate check query failed:', {
              message: checkUserBookError.message,
              code: checkUserBookError.code,
              details: checkUserBookError.details,
              hint: checkUserBookError.hint
            });
            throw checkUserBookError;
          }

          if (userBookExists && userBookExists.length > 0) {
            console.log('[DB] Book already exists in user bookshelf:', bookId);
            throw new Error('이미 내 책장에 담긴 책이에요.');
          }

          let dbStatus: 'reading' | 'completed' | 'wished' = 'reading';
          if (bookData.status === 'completed') dbStatus = 'completed';
          else if (bookData.status === 'wish') dbStatus = 'wished';

          const hasTotalPages = dbTotalPages !== undefined && dbTotalPages !== null && dbTotalPages > 0;
          let currentPage = 0;
          if (dbStatus === 'completed') {
            currentPage = hasTotalPages ? dbTotalPages : 100;
          } else if (dbStatus === 'reading') {
            currentPage = hasTotalPages 
              ? Math.round((bookData.progress / 100) * dbTotalPages)
              : bookData.progress;
          }

          console.log('[DB] addBookToShelf inserting into user_books... status:', dbStatus, 'currentPage:', currentPage);
          const { data: newUserBook, error: insertUserBookError } = await supabase
            .from('user_books')
            .insert({
              user_id: userId,
              book_id: bookId,
              status: dbStatus,
              current_page: currentPage,
              is_recommended: false
            })
            .select('id')
            .single();

          if (insertUserBookError) {
            console.error('[DB] addBookToShelf insert into user_books failed:', {
              message: insertUserBookError.message,
              code: insertUserBookError.code,
              details: insertUserBookError.details,
              hint: insertUserBookError.hint
            });
            
            // PGRST116 (0 rows returned) 에러인 경우 select 권한 차단으로 안 들어온 것이므로 강제 복구 조회 시도
            if (insertUserBookError.code === 'PGRST116') {
              const { data: recovered, error: recError } = await supabase
                .from('user_books')
                .select('id')
                .eq('user_id', userId)
                .eq('book_id', bookId);
              if (!recError && recovered && recovered.length > 0) {
                console.log('[DB] Recovered user_book ID after insert single check fail:', recovered[0].id);
                return { id: recovered[0].id };
              }
            }
            throw insertUserBookError;
          }
          console.log('[DB] Book added to user library successfully. user_books entry id:', newUserBook?.id);
          return newUserBook;
        } catch (err: any) {
          const errorDetails = {
            message: err?.message || 'No message',
            code: err?.code || 'No code',
            details: err?.details || 'No details',
            hint: err?.hint || 'No hint',
            stack: err?.stack || 'No stack',
            raw: err
          };
          console.error('[DB] addBookToShelf insert failed:', errorDetails);
          const richError = new Error(`[addBookToShelf] ${errorDetails.message} (Code: ${errorDetails.code}, Details: ${errorDetails.details})`);
          (richError as any).code = errorDetails.code;
          (richError as any).details = errorDetails.details;
          (richError as any).hint = errorDetails.hint;
          throw richError;
        }
      }

      // 로컬 Mock 모드 대응
      if (typeof window === 'undefined') return null;
      try {
        const storedBooks = localStorage.getItem('bookclub_personal_shelf');
        const shelfBooks = storedBooks ? JSON.parse(storedBooks) : [];

        const isDuplicate = shelfBooks.some(
          (b: any) => b.title.trim().toLowerCase() === bookData.title.trim().toLowerCase() && 
                      b.author.trim().toLowerCase() === bookData.author.trim().toLowerCase()
        );
        if (isDuplicate) {
          throw new Error('이미 내 책장에 담긴 책이에요.');
        }

        const newBook = {
          id: 'shelf-' + Date.now(),
          title: bookData.title.trim(),
          author: bookData.author.trim(),
          cover_url: bookData.cover_url || '',
          status: bookData.status,
          progress: bookData.status === 'reading' ? bookData.progress : undefined,
          completed_date: bookData.status === 'completed' ? new Date().toISOString().split('T')[0].replace(/-/g, '.') : undefined,
          is_recommended: false,
          memo_count: 0
        };

        const updated = [newBook, ...shelfBooks];
        localStorage.setItem('bookclub_personal_shelf', JSON.stringify(updated));
        return newBook;
      } catch (err) {
        console.error('Error adding mock book to shelf:', err);
        throw err;
      }
    },

    updateUserBook: async (
      userId: string,
      shelfBookId: string,
      updateData: { title?: string; author?: string; cover_url?: string; status: 'reading' | 'completed' | 'wish'; progress: number }
    ): Promise<any> => {
      if (!isMockMode && supabase) {
        try {
          const { data: userBook, error: fetchError } = await supabase
            .from('user_books')
            .select(`
              id,
              book_id,
              books (
                total_pages
              )
            `)
            .eq('id', shelfBookId)
            .single();

          if (fetchError) throw fetchError;
          if (!userBook) throw new Error('책을 찾을 수 없습니다.');

          const bookId = userBook.book_id;
          const totalPages = (userBook.books as any)?.total_pages;
          const hasTotalPages = totalPages !== undefined && totalPages !== null && totalPages > 0;

          let dbStatus: 'reading' | 'completed' | 'wished' = 'reading';
          if (updateData.status === 'completed') dbStatus = 'completed';
          else if (updateData.status === 'wish') dbStatus = 'wished';

          let currentPage = 0;
          if (dbStatus === 'completed') {
            currentPage = hasTotalPages ? totalPages : 100;
          } else if (dbStatus === 'reading') {
            currentPage = hasTotalPages 
              ? Math.round((updateData.progress / 100) * totalPages)
              : updateData.progress;
          }

          const { error: updateUserBookError } = await supabase
            .from('user_books')
            .update({
              status: dbStatus,
              current_page: currentPage
            })
            .eq('id', shelfBookId)
            .eq('user_id', userId);

          if (updateUserBookError) throw updateUserBookError;

          if (updateData.title || updateData.author) {
            const updateFields: any = {};
            if (updateData.title) updateFields.title = updateData.title.trim();
            if (updateData.author) updateFields.author = updateData.author.trim();
            if (updateData.cover_url !== undefined) updateFields.cover_url = updateData.cover_url;

            const { error: updateBookError } = await supabase
              .from('books')
              .update(updateFields)
              .eq('id', bookId);

            if (updateBookError) {
              console.warn('마스터 도서 정보 업데이트 실패:', updateBookError);
            }
          }

          return { success: true };
        } catch (err) {
          console.error('Error updating book in Supabase:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드 대응
      if (typeof window === 'undefined') return null;
      try {
        const storedBooks = localStorage.getItem('bookclub_personal_shelf');
        const shelfBooks = storedBooks ? JSON.parse(storedBooks) : [];

        const updatedShelf = shelfBooks.map((b: any) => {
          if (b.id === shelfBookId) {
            return {
              ...b,
              title: updateData.title?.trim() || b.title,
              author: updateData.author?.trim() || b.author,
              cover_url: updateData.cover_url !== undefined ? updateData.cover_url : b.cover_url,
              status: updateData.status,
              progress: updateData.status === 'reading' ? updateData.progress : undefined,
              completed_date: updateData.status === 'completed' ? (b.completed_date || new Date().toISOString().split('T')[0].replace(/-/g, '.')) : undefined
            };
          }
          return b;
        });

        localStorage.setItem('bookclub_personal_shelf', JSON.stringify(updatedShelf));
        return { success: true };
      } catch (err) {
        console.error('Error updating mock book:', err);
        throw err;
      }
    },

    deleteUserBook: async (userId: string, shelfBookId: string): Promise<any> => {
      if (!isMockMode && supabase) {
        try {
          const { error } = await supabase
            .from('user_books')
            .delete()
            .eq('id', shelfBookId)
            .eq('user_id', userId);

          if (error) throw error;
          return { success: true };
        } catch (err) {
          console.error('Error deleting book in Supabase:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드 대응
      if (typeof window === 'undefined') return null;
      try {
        const storedBooks = localStorage.getItem('bookclub_personal_shelf');
        const shelfBooks = storedBooks ? JSON.parse(storedBooks) : [];
        const updatedShelf = shelfBooks.filter((b: any) => b.id !== shelfBookId);
        localStorage.setItem('bookclub_personal_shelf', JSON.stringify(updatedShelf));
        return { success: true };
      } catch (err) {
        console.error('Error deleting mock book:', err);
        throw err;
      }
    },

    getUserBookMemos: async (userBookId: string): Promise<any[]> => {
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('user_book_memos')
            .select('id, page, content, created_at')
            .eq('user_book_id', userBookId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          
          return (data || []).map((m: any) => ({
            id: m.id,
            bookId: userBookId,
            page: m.page ? String(m.page) : undefined,
            content: m.content,
            created_at: new Date(m.created_at).toISOString().split('T')[0].replace(/-/g, '.')
          }));
        } catch (err) {
          console.error('Error fetching user book memos from Supabase:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드 대응
      if (typeof window === 'undefined') return [];
      try {
        const storedMemos = localStorage.getItem('bookclub_personal_memos');
        const memos = storedMemos ? JSON.parse(storedMemos) : [];
        return memos
          .filter((m: any) => m.bookId === userBookId)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } catch (err) {
        console.error('Error loading mock user book memos:', err);
        return [];
      }
    },

    addUserBookMemo: async (
      userBookId: string, 
      memoData: { page?: number; content: string }
    ): Promise<any> => {
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('user_book_memos')
            .insert({
              user_book_id: userBookId,
              page: memoData.page || null,
              content: memoData.content
            })
            .select('id, page, content, created_at')
            .single();

          if (error) throw error;
          return {
            id: data.id,
            bookId: userBookId,
            page: data.page ? String(data.page) : undefined,
            content: data.content,
            created_at: new Date(data.created_at).toISOString().split('T')[0].replace(/-/g, '.')
          };
        } catch (err) {
          console.error('Error adding user book memo in Supabase:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드 대응
      if (typeof window === 'undefined') return null;
      try {
        const storedMemos = localStorage.getItem('bookclub_personal_memos');
        const memos = storedMemos ? JSON.parse(storedMemos) : [];

        const newMemo = {
          id: 'memo-' + Date.now(),
          bookId: userBookId,
          page: memoData.page ? String(memoData.page) : undefined,
          content: memoData.content,
          created_at: new Date().toISOString().split('T')[0].replace(/-/g, '.')
        };

        const updated = [newMemo, ...memos];
        localStorage.setItem('bookclub_personal_memos', JSON.stringify(updated));

        const storedShelf = localStorage.getItem('bookclub_personal_shelf');
        if (storedShelf) {
          const shelf = JSON.parse(storedShelf);
          const updatedShelf = shelf.map((b: any) => {
            if (b.id === userBookId) {
              return { ...b, memo_count: (b.memo_count || 0) + 1 };
            }
            return b;
          });
          localStorage.setItem('bookclub_personal_shelf', JSON.stringify(updatedShelf));
        }

        return newMemo;
      } catch (err) {
        console.error('Error adding mock memo:', err);
        throw err;
      }
    },

    updateUserBookMemo: async (
      memoId: string, 
      memoData: { page?: number; content: string }
    ): Promise<any> => {
      if (!isMockMode && supabase) {
        try {
          const { error } = await supabase
            .from('user_book_memos')
            .update({
              page: memoData.page || null,
              content: memoData.content
            })
            .eq('id', memoId);

          if (error) throw error;
          return { success: true };
        } catch (err) {
          console.error('Error updating user book memo in Supabase:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드 대응
      if (typeof window === 'undefined') return null;
      try {
        const storedMemos = localStorage.getItem('bookclub_personal_memos');
        const memos = storedMemos ? JSON.parse(storedMemos) : [];

        const updated = memos.map((m: any) => {
          if (m.id === memoId) {
            return {
              ...m,
              page: memoData.page ? String(memoData.page) : undefined,
              content: memoData.content
            };
          }
          return m;
        });

        localStorage.setItem('bookclub_personal_memos', JSON.stringify(updated));
        return { success: true };
      } catch (err) {
        console.error('Error updating mock memo:', err);
        throw err;
      }
    },

    deleteUserBookMemo: async (memoId: string, userBookId?: string): Promise<any> => {
      if (!isMockMode && supabase) {
        try {
          const { error } = await supabase
            .from('user_book_memos')
            .delete()
            .eq('id', memoId);

          if (error) throw error;
          return { success: true };
        } catch (err) {
          console.error('Error deleting user book memo in Supabase:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드 대응
      if (typeof window === 'undefined') return null;
      try {
        const storedMemos = localStorage.getItem('bookclub_personal_memos');
        const memos = storedMemos ? JSON.parse(storedMemos) : [];
        const updated = memos.filter((m: any) => m.id !== memoId);
        localStorage.setItem('bookclub_personal_memos', JSON.stringify(updated));

        if (userBookId) {
          const storedShelf = localStorage.getItem('bookclub_personal_shelf');
          if (storedShelf) {
            const shelf = JSON.parse(storedShelf);
            const updatedShelf = shelf.map((b: any) => {
              if (b.id === userBookId) {
                return { ...b, memo_count: Math.max(0, (b.memo_count || 1) - 1) };
              }
              return b;
            });
            localStorage.setItem('bookclub_personal_shelf', JSON.stringify(updatedShelf));
          }
        }

        return { success: true };
      } catch (err) {
        console.error('Error deleting mock memo:', err);
        throw err;
      }
    }
  },

  progress: {
    getMemberProgressList: async (clubId: string, bookId: string): Promise<UserBookProgress[]> => {
      if (!isMockMode && supabase) {
        try {
          const { data: membersData, error: membersError } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', clubId);

          if (membersError) throw membersError;
          const userIds = (membersData || []).map(m => m.user_id);
          if (userIds.length === 0) return [];

          const { data: userBooksData, error: ubError } = await supabase
            .from('user_books')
            .select('id, user_id, status, current_page, updated_at')
            .eq('book_id', bookId)
            .in('user_id', userIds);

          if (ubError) throw ubError;

          const ubMap = new Map<string, any>();
          (userBooksData || []).forEach((ub: any) => {
            ubMap.set(ub.user_id, ub);
          });

          const { data: profilesData, error: profError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, updated_at')
            .in('id', userIds);

          if (profError) throw profError;

          const profMap = new Map<string, any>();
          (profilesData || []).forEach((p: any) => {
            profMap.set(p.id, p);
          });

          return userIds.map(uid => {
            const ub = ubMap.get(uid);
            const prof = profMap.get(uid) || { id: uid, username: '알 수 없음', avatar_url: '' };

            let uiStatus: 'reading' | 'completed' | 'paused' = 'reading';
            if (ub) {
              if (ub.status === 'completed') uiStatus = 'completed';
              else if (ub.status === 'wished' || ub.status === 'wish') uiStatus = 'paused';
            }

            return {
              id: ub?.id || `dummy-prog-${uid}`,
              user_id: uid,
              book_id: bookId,
              current_page: ub?.current_page || 0,
              status: uiStatus,
              updated_at: ub?.updated_at || new Date().toISOString(),
              profile: {
                id: prof.id,
                username: prof.username,
                avatar_url: prof.avatar_url || '',
                updated_at: prof.updated_at || new Date().toISOString()
              }
            } as UserBookProgress;
          });
        } catch (err) {
          console.error('Error fetching member progress from Supabase:', err);
          return [];
        }
      }

      // 로컬 Mock 모드
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
      const now = new Date().toISOString();

      if (!isMockMode && supabase) {
        console.log('[DB] updateMyProgress start. userId:', userId, 'bookId:', bookId, 'currentPage:', currentPage, 'status:', status);
        try {
          // 1. user_books 에 이미 매핑된 기록이 존재하는지 조회
          const { data: existing, error: findError } = await supabase
            .from('user_books')
            .select('id')
            .eq('user_id', userId)
            .eq('book_id', bookId)
            .maybeSingle();

          if (findError) {
            console.error('[DB] updateMyProgress find existing error:', findError);
            throw findError;
          }

          let dbStatus: 'reading' | 'completed' | 'wished' = 'reading';
          if (status === 'completed') dbStatus = 'completed';
          else if (status === 'paused') dbStatus = 'wished';

          let userBookId = '';

          if (existing) {
            userBookId = existing.id;
            console.log('[DB] updateMyProgress updating existing record. id:', userBookId);
            const { error: updateError } = await supabase
              .from('user_books')
              .update({
                current_page: currentPage,
                status: dbStatus,
                updated_at: now
              })
              .eq('id', existing.id);

            if (updateError) {
              console.error('[DB] updateMyProgress update failed:', updateError);
              throw updateError;
            }
          } else {
            console.log('[DB] updateMyProgress inserting new record...');
            try {
              const { data: inserted, error: insertError } = await supabase
                .from('user_books')
                .insert({
                  user_id: userId,
                  book_id: bookId,
                  current_page: currentPage,
                  status: dbStatus,
                  is_recommended: false
                })
                .select('id')
                .single();

              if (insertError) {
                console.warn('[DB] updateMyProgress insert failed. Attempting select recovery...', insertError);
                
                // PGRST116 (0 rows returned) 또는 중복 키 에러 발생 시 재조회 복구 시도
                if (insertError.code === 'PGRST116' || insertError.code === '23505' || insertError.message?.includes('0 rows')) {
                  const { data: recovered, error: recError } = await supabase
                    .from('user_books')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('book_id', bookId);
                  
                  if (!recError && recovered && recovered.length > 0) {
                    console.log('[DB] updateMyProgress recovered user_book ID:', recovered[0].id);
                    userBookId = recovered[0].id;
                  } else {
                    throw insertError;
                  }
                } else {
                  throw insertError;
                }
              } else if (inserted) {
                userBookId = inserted.id;
              }
            } catch (innerErr: any) {
              // 2차 수동 select fallback (완전 수동 재조회)
              console.warn('[DB] updateMyProgress insert inner error. Retrying fallback query...', innerErr);
              const { data: recovered, error: recError } = await supabase
                .from('user_books')
                .select('id')
                .eq('user_id', userId)
                .eq('book_id', bookId);
              
              if (!recError && recovered && recovered.length > 0) {
                console.log('[DB] updateMyProgress secondary recovery succeeded. ID:', recovered[0].id);
                userBookId = recovered[0].id;
                
                // 조회된 ID가 있으면 업데이트 한 번 더 실행해 주기 (동작 안전성 보장)
                await supabase
                  .from('user_books')
                  .update({
                    current_page: currentPage,
                    status: dbStatus,
                    updated_at: now
                  })
                  .eq('id', userBookId);
              } else {
                throw innerErr;
              }
            }
          }

          console.log('[DB] updateMyProgress successfully finished. userBookId:', userBookId);
          return {
            id: userBookId,
            user_id: userId,
            book_id: bookId,
            current_page: currentPage,
            status,
            updated_at: now
          } as UserBookProgress;

        } catch (err: any) {
          const errDetails = {
            message: err?.message || 'No message',
            code: err?.code || 'No code',
            details: err?.details || 'No details',
            hint: err?.hint || 'No hint',
            stack: err?.stack || 'No stack'
          };
          console.error('[DB] updateMyProgress critical error:', errDetails);
          throw new Error(`[updateMyProgress] ${errDetails.message} (Code: ${errDetails.code})`);
        }
      }

      // 로컬 Mock 모드 대응
      const progresses = getStorageItem<UserBookProgress>(KEY_PROGRESS);
      const index = progresses.findIndex(p => p.user_id === userId && p.book_id === bookId);
      
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
      const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

      if (!isMockMode && supabase) {
        if (!isValidUUID(clubId) || !isValidUUID(bookId)) {
          console.warn('[DB] getQuestions: clubId or bookId is not a valid UUID. Skipping query to prevent syntax error.', { clubId, bookId });
          return [];
        }

        try {
          const { data, error } = await supabase
            .from('questions')
            .select(`
              *,
              profile:profiles (
                id,
                username,
                avatar_url,
                updated_at
              ),
              feedback_count:question_feedback(count)
            `)
            .eq('group_id', clubId)
            .eq('book_id', bookId)
            .order('created_at', { ascending: false });

          if (error) {
            console.warn('[DB] getQuestions Supabase Query Warning:', {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            });
            return [];
          }
          
          return (data || []).map(q => ({
            ...q,
            club_id: q.group_id,
            comments_count: (q.feedback_count as any)?.[0]?.count || 0
          })) as any[];
        } catch (err: any) {
          console.warn('[DB] getQuestions Catch Exception:', {
            message: err?.message || err,
            stack: err?.stack
          });
          return [];
        }
      }

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
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('questions')
            .select(`
              *,
              profile:profiles (
                id,
                username,
                avatar_url,
                updated_at
              ),
              feedback_count:question_feedback(count)
            `)
            .eq('id', questionId)
            .maybeSingle();

          if (error) throw error;
          if (!data) return null;
          return {
            ...data,
            club_id: data.group_id,
            comments_count: (data.feedback_count as any)?.[0]?.count || 0
          } as any;
        } catch (err) {
          console.error('[DB] getQuestionById 에러:', err);
          return null;
        }
      }

      const questions = getStorageItem<DiscussionQuestion>(KEY_DISCUSSIONS);
      const profiles = getStorageItem<Profile>(KEY_PROFILES);
      const q = questions.find(item => item.id === questionId);
      if (!q) return null;
      
      const profile = profiles.find(p => p.id === q.user_id);
      return { ...q, profile };
    },

    // 새 질문 제안 등록
    createQuestion: async (userId: string, clubId: string, bookId: string, content: string): Promise<DiscussionQuestion> => {
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('questions')
            .insert({
              group_id: clubId,
              book_id: bookId,
              user_id: userId,
              content,
              status: 'suggested',
              is_spoiler: false,
              reaction_curious_count: 0,
              reaction_talk_count: 0
            })
            .select(`
              *,
              profile:profiles (
                id,
                username,
                avatar_url,
                updated_at
              )
            `)
            .single();

          if (error) throw error;
          return {
            ...data,
            club_id: data.group_id,
            comments_count: 0
          } as any;
        } catch (err) {
          console.error('[DB] createQuestion 에러:', err);
          throw err;
        }
      }

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

    // 질문에 대한 반응(나도 궁금해요, 이야기하고 싶어요) 증가/감소 (토글식 및 중복 방지)
    addReaction: async (questionId: string, type: 'curious' | 'talk'): Promise<DiscussionQuestion | null> => {
      if (!isMockMode && supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const user = authData?.user;
          if (!user) throw new Error('로그인이 필요합니다.');

          const userId = user.id;
          const reactionType = type; // curious or talk

          // 1. 이미 반응을 남겼는지 체크
          const { data: existing, error: checkError } = await supabase
            .from('question_reactions')
            .select('id')
            .eq('question_id', questionId)
            .eq('user_id', userId)
            .eq('reaction_type', reactionType)
            .maybeSingle();

          if (checkError) throw checkError;

          let diff = 0;
          if (existing) {
            // 반응 제거 (토글 오프)
            const { error: deleteError } = await supabase
              .from('question_reactions')
              .delete()
              .eq('id', existing.id);

            if (deleteError) throw deleteError;
            diff = -1;
          } else {
            // 반응 등록 (토글 온)
            const { error: insertError } = await supabase
              .from('question_reactions')
              .insert({
                question_id: questionId,
                user_id: userId,
                reaction_type: reactionType
              });

            if (insertError) throw insertError;
            diff = 1;
          }

          // 2. questions 테이블의 공감 카운트 업데이트
          const { data: currentQ, error: getQError } = await supabase
            .from('questions')
            .select('reaction_curious_count, reaction_talk_count')
            .eq('id', questionId)
            .single();

          if (getQError) throw getQError;

          let newCurious = currentQ.reaction_curious_count;
          let newTalk = currentQ.reaction_talk_count;

          if (type === 'curious') {
            newCurious = Math.max(0, newCurious + diff);
          } else {
            newTalk = Math.max(0, newTalk + diff);
          }

          const { data: updatedQ, error: updateQError } = await supabase
            .from('questions')
            .update({
              reaction_curious_count: newCurious,
              reaction_talk_count: newTalk
            })
            .eq('id', questionId)
            .select(`
              *,
              profile:profiles (
                id,
                username,
                avatar_url,
                updated_at
              )
            `)
            .single();

          if (updateQError) throw updateQError;
          return {
            ...updatedQ,
            club_id: updatedQ.group_id,
            comments_count: 0
          } as any;
        } catch (err) {
          console.error('[DB] addReaction 에러:', err);
          throw err;
        }
      }

      const questions = getStorageItem<DiscussionQuestion>(KEY_DISCUSSIONS);
      const index = questions.findIndex(q => q.id === questionId);
      if (index === -1) return null;

      // Mock 모드에서도 간단히 토글 흉내
      const reactionKey = `bookclub_mock_react_${questionId}_${type}`;
      const alreadyReacted = localStorage.getItem(reactionKey) === 'true';

      if (type === 'curious') {
        if (alreadyReacted) {
          questions[index].reaction_curious_count = Math.max(0, questions[index].reaction_curious_count - 1);
          localStorage.removeItem(reactionKey);
        } else {
          questions[index].reaction_curious_count += 1;
          localStorage.setItem(reactionKey, 'true');
        }
      } else {
        if (alreadyReacted) {
          questions[index].reaction_talk_count = Math.max(0, questions[index].reaction_talk_count - 1);
          localStorage.removeItem(reactionKey);
        } else {
          questions[index].reaction_talk_count += 1;
          localStorage.setItem(reactionKey, 'true');
        }
      }

      setStorageItem(KEY_DISCUSSIONS, questions);
      return questions[index];
    },

    // 질문 선정 상태 변경 (status: 'suggested' | 'selected')
    updateQuestionStatus: async (questionId: string, status: 'suggested' | 'selected'): Promise<void> => {
      if (!isMockMode && supabase) {
        try {
          const { error } = await supabase
            .from('questions')
            .update({ status })
            .eq('id', questionId);
          if (error) throw error;
        } catch (err) {
          console.error('[DB] updateQuestionStatus 에러:', err);
          throw err;
        }
        return;
      }
      
      const questions = getStorageItem<DiscussionQuestion>(KEY_DISCUSSIONS);
      const index = questions.findIndex(q => q.id === questionId);
      if (index > -1) {
        questions[index].status = status;
        setStorageItem(KEY_DISCUSSIONS, questions);
      }
    },

    // 특정 질문의 피드백(의견 메모) 목록 조회
    getFeedbacks: async (questionId: string): Promise<any[]> => {
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('question_feedback')
            .select(`
              *,
              profile:profiles (
                id,
                username,
                avatar_url,
                updated_at
              )
            `)
            .eq('question_id', questionId)
            .order('created_at', { ascending: true });

          if (error) throw error;
          return data || [];
        } catch (err) {
          console.error('[DB] getFeedbacks 에러:', err);
          return [];
        }
      }

      // 로컬 Mock 모드 대응
      if (typeof window === 'undefined') return [];
      try {
        const KEY_FEEDBACKS = 'bookclub_mock_feedbacks';
        const stored = localStorage.getItem(KEY_FEEDBACKS);
        const allFeedbacks = stored ? JSON.parse(stored) : {};
        const feedbacks = allFeedbacks[questionId] || [];
        
        // Mock 프로필 목록과 조인
        const profiles = getStorageItem<Profile>(KEY_PROFILES);
        return feedbacks.map((f: any, idx: number) => {
          // 문자열 배열이었던 기존 더미 호환
          if (typeof f === 'string') {
            const isMe = idx % 2 === 0;
            const dummyUserId = isMe ? 'user-1' : 'user-2';
            const profile = profiles.find(p => p.id === dummyUserId) || { id: dummyUserId, username: '독서가', avatar_url: '' };
            return {
              id: `fb-mock-${questionId}-${idx}`,
              question_id: questionId,
              user_id: dummyUserId,
              content: f,
              created_at: new Date(Date.now() - (10 - idx) * 3600000).toISOString(),
              profile
            };
          }
          const profile = profiles.find(p => p.id === f.user_id) || { id: f.user_id, username: '독서가', avatar_url: '' };
          return { ...f, profile };
        });
      } catch (err) {
        console.error('Mock feedbacks load error:', err);
        return [];
      }
    },

    // 질문 피드백 등록
    createFeedback: async (userId: string, questionId: string, content: string): Promise<any> => {
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('question_feedback')
            .insert({
              question_id: questionId,
              user_id: userId,
              content
            })
            .select(`
              *,
              profile:profiles (
                id,
                username,
                avatar_url,
                updated_at
              )
            `)
            .single();

          if (error) throw error;
          return data;
        } catch (err) {
          console.warn('[DB] createFeedback 에러:', err);
          throw err;
        }
      }

      // 로컬 Mock 모드 대응
      const KEY_FEEDBACKS = 'bookclub_mock_feedbacks';
      const stored = typeof window !== 'undefined' ? localStorage.getItem(KEY_FEEDBACKS) : null;
      const allFeedbacks = stored ? JSON.parse(stored) : {};
      if (!allFeedbacks[questionId]) {
        allFeedbacks[questionId] = [];
      }
      
      const profiles = getStorageItem<Profile>(KEY_PROFILES);
      const profile = profiles.find(p => p.id === userId) || { id: userId, username: '독서가', avatar_url: '' };
      
      const newFeedback = {
        id: 'fb-mock-' + Date.now(),
        question_id: questionId,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
        profile
      };
      
      allFeedbacks[questionId].push(newFeedback);
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEY_FEEDBACKS, JSON.stringify(allFeedbacks));
      }
      return newFeedback;
    },

    // 질문 피드백 수정
    updateFeedback: async (feedbackId: string, content: string): Promise<void> => {
      if (!isMockMode && supabase) {
        try {
          const { error } = await supabase
            .from('question_feedback')
            .update({ content })
            .eq('id', feedbackId);
          if (error) throw error;
        } catch (err) {
          console.warn('[DB] updateFeedback 에러:', err);
          throw err;
        }
        return;
      }

      // 로컬 Mock 모드 대응
      const KEY_FEEDBACKS = 'bookclub_mock_feedbacks';
      const stored = typeof window !== 'undefined' ? localStorage.getItem(KEY_FEEDBACKS) : null;
      if (stored) {
        const allFeedbacks = JSON.parse(stored);
        for (const qId in allFeedbacks) {
          const arr = allFeedbacks[qId];
          const idx = arr.findIndex((f: any) => f && f.id === feedbackId);
          if (idx > -1) {
            arr[idx].content = content;
            if (typeof window !== 'undefined') {
              localStorage.setItem(KEY_FEEDBACKS, JSON.stringify(allFeedbacks));
            }
            break;
          }
        }
      }
    },

    // 질문 피드백 삭제
    deleteFeedback: async (feedbackId: string): Promise<void> => {
      if (!isMockMode && supabase) {
        try {
          const { error } = await supabase
            .from('question_feedback')
            .delete()
            .eq('id', feedbackId);
          if (error) throw error;
        } catch (err) {
          console.warn('[DB] deleteFeedback 에러:', err);
          throw err;
        }
        return;
      }

      // 로컬 Mock 모드 대응
      const KEY_FEEDBACKS = 'bookclub_mock_feedbacks';
      const stored = typeof window !== 'undefined' ? localStorage.getItem(KEY_FEEDBACKS) : null;
      if (stored) {
        const allFeedbacks = JSON.parse(stored);
        for (const qId in allFeedbacks) {
          const arr = allFeedbacks[qId];
          const idx = arr.findIndex((f: any) => f && f.id === feedbackId);
          if (idx > -1) {
            arr.splice(idx, 1);
            if (typeof window !== 'undefined') {
              localStorage.setItem(KEY_FEEDBACKS, JSON.stringify(allFeedbacks));
            }
            break;
          }
        }
      }
    },

    // 특정 질문의 댓글 목록 조회
    getComments: async (questionId: string): Promise<DiscussionComment[]> => {
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('discussion_comments')
            .select(`
              *,
              profile:profiles (
                id,
                username,
                avatar_url,
                updated_at
              )
            `)
            .eq('question_id', questionId)
            .order('created_at', { ascending: true });

          if (error) throw error;
          return data || [];
        } catch (err) {
          console.warn('[DB] getComments 에러:', err);
          return [];
        }
      }

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
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('discussion_comments')
            .insert({
              question_id: questionId,
              user_id: userId,
              content
            })
            .select(`
              *,
              profile:profiles (
                id,
                username,
                avatar_url,
                updated_at
              )
            `)
            .single();

          if (error) throw error;
          return data;
        } catch (err) {
          console.warn('[DB] createComment 에러:', err);
          throw err;
        }
      }

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
        questions[qIndex].comments_count = (questions[qIndex].comments_count || 0) + 1;
        setStorageItem(KEY_DISCUSSIONS, questions);
      }

      const profiles = getStorageItem<Profile>(KEY_PROFILES);
      newComment.profile = profiles.find(p => p.id === userId);
      return newComment;
    },

    // 댓글 수정
    updateComment: async (commentId: string, content: string): Promise<void> => {
      if (!isMockMode && supabase) {
        try {
          const { error } = await supabase
            .from('discussion_comments')
            .update({ content })
            .eq('id', commentId);
          if (error) throw error;
        } catch (err) {
          console.warn('[DB] updateComment 에러:', err);
          throw err;
        }
        return;
      }

      const comments = getStorageItem<DiscussionComment>(KEY_COMMENTS);
      const idx = comments.findIndex(c => c.id === commentId);
      if (idx > -1) {
        comments[idx].content = content;
        setStorageItem(KEY_COMMENTS, comments);
      }
    },

    // 댓글 삭제
    deleteComment: async (commentId: string): Promise<void> => {
      if (!isMockMode && supabase) {
        try {
          const { error } = await supabase
            .from('discussion_comments')
            .delete()
            .eq('id', commentId);
          if (error) throw error;
        } catch (err) {
          console.warn('[DB] deleteComment 에러:', err);
          throw err;
        }
        return;
      }

      const comments = getStorageItem<DiscussionComment>(KEY_COMMENTS);
      const idx = comments.findIndex(c => c.id === commentId);
      if (idx > -1) {
        comments.splice(idx, 1);
        setStorageItem(KEY_COMMENTS, comments);
      }
    },

    // 지난 독서 아카이브 리스트 조회
    getArchiveList: async (clubId: string): Promise<any[]> => {
      if (!isMockMode && supabase) {
        try {
          const { data, error } = await supabase
            .from('monthly_books')
            .select(`
              id,
              month,
              stage,
              timeline_reading,
              books (
                id,
                title,
                author,
                cover_url
              )
            `)
            .eq('group_id', clubId)
            .in('stage', ['recap', 'archived']) // 결산(recap)이 시작되었거나 아카이브가 완료된 도서만 아카이브에 표시
            .order('created_at', { ascending: false });

          if (error) throw error;
          
          return (data || []).map((mb: any) => {
            const b = mb.books || { title: '제목 없음', author: '저자 미상', cover_url: '' };
            const parts = mb.month.split('-');
            const yearStr = parts[0];
            const monthStr = parts[1] ? `${parseInt(parts[1])}월` : '';
            
            return {
              id: mb.id,
              year: yearStr,
              month: `${yearStr}년 ${monthStr}`,
              title: b.title,
              author: b.author,
              coverUrl: b.cover_url || '',
              atmosphere: `“이 소설에 담긴 뜻을 오래 사색하며 나누었던 달”`,
              tags: ['사색과기록', '지난이야기']
            };
          });
        } catch (err) {
          console.warn('[DB] getArchiveList 에러:', err);
          return [];
        }
      }

      // 로컬 Mock 모드 대응
      if (typeof window === 'undefined') return [];
      try {
        const KEY_MONTHLY_BOOKS = 'bookclub_mock_monthly_books';
        const stored = localStorage.getItem(KEY_MONTHLY_BOOKS);
        const list = stored ? JSON.parse(stored) : [];
        if (list.length === 0) {
          const defaultList = [
            {
              id: 'report-4',
              year: '2026',
              month: '2026년 4월',
              title: '모순',
              author: '양귀자',
              coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=150&auto=format&fit=crop&q=80',
              atmosphere: '“관계와 현실의 선택에 대해 오래 대화 나누었던 달”',
              tags: ['선택과책임', '삶의이면'],
              stage: 'archived'
            },
            {
              id: 'report-3',
              year: '2026',
              month: '2026년 3월',
              title: '아몬드',
              author: '손원평',
              coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=150&auto=format&fit=crop&q=80',
              atmosphere: '“감정과 진정한 공감의 온기를 함께 나누었던 시간”',
              tags: ['공감의온기', '타인의아픔'],
              stage: 'archived'
            }
          ];
          localStorage.setItem(KEY_MONTHLY_BOOKS, JSON.stringify(defaultList));
          return defaultList;
        }
        
        // Mock 모드에서도 진행 중인 책('reading', 'question', 'discussion', 'scheduled')은 제외
        return list.filter((item: any) => 
          !item.stage || ['recap', 'archived'].includes(item.stage)
        );
      } catch (err) {
        console.warn('Mock archive load error:', err);
        return [];
      }
    },

    // 지난 독서 결산 상세 조회
    getArchiveDetail: async (monthlyBookId: string): Promise<any | null> => {
      const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

      if (!isMockMode && supabase) {
        if (!isValidUUID(monthlyBookId)) {
          console.warn('[DB] getArchiveDetail: invalid UUID. Skipping query.', monthlyBookId);
          return null;
        }

        try {
          const { data: mb, error: mbError } = await supabase
            .from('monthly_books')
            .select(`
              *,
              books (
                id,
                title,
                author,
                cover_url
              )
            `)
            .eq('id', monthlyBookId)
            .maybeSingle();

          if (mbError) throw mbError;
          if (!mb) return null;

          const bookId = mb.book_id;
          const clubId = mb.group_id;

          const { data: questions, error: qError } = await supabase
            .from('questions')
            .select(`
              id,
              content,
              created_at
            `)
            .eq('group_id', clubId)
            .eq('book_id', bookId)
            .order('created_at', { ascending: true });

          if (qError) throw qError;

          const qList = questions || [];
          const qIds = qList.map(q => q.id);

          let comments: any[] = [];
          if (qIds.length > 0) {
            const { data: cData, error: cError } = await supabase
              .from('discussion_comments')
              .select(`
                *,
                profile:profiles (
                  id,
                  username,
                  avatar_url
                )
              `)
              .in('question_id', qIds)
              .order('created_at', { ascending: true });

            if (cError) throw cError;
            comments = cData || [];
          }

          const formattedQuestions = qList.map((q: any) => {
            const qComments = comments.filter((c: any) => c.question_id === q.id);
            return {
              questionText: q.content,
              commentCount: qComments.length,
              comments: qComments.map((c: any) => {
                const date = new Date(c.created_at);
                const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;
                return {
                  author: c.profile?.username || '독서가',
                  date: dateStr,
                  content: c.content,
                  avatarUrl: c.profile?.avatar_url || ''
                };
              })
            };
          });

          const parts = mb.month.split('-');
          const monthText = `${parts[0]}년 ${parts[1] ? parseInt(parts[1]) : ''}월`;
          const bookInfo = mb.books || { title: '제목 없음', author: '저자 미상', cover_url: '' };

          const { count: memberCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', clubId);

          const totalComments = formattedQuestions.reduce((acc, cur) => acc + cur.commentCount, 0);

          return {
            month: monthText,
            title: bookInfo.title,
            author: bookInfo.author,
            coverUrl: bookInfo.cover_url || '',
            tags: ['사색과기록', '지난이야기'],
            metaInfo: `질문 ${formattedQuestions.length}개 · 생각 메모 ${totalComments}개 · 함께 읽은 사람 ${memberCount || 1}명`,
            questions: formattedQuestions
          };
        } catch (err) {
          console.warn('[DB] getArchiveDetail 에러:', err);
          return null;
        }
      }

      const reportsData: Record<string, any> = {
        'report-4': {
          month: '2026년 4월',
          title: '모순',
          author: '양귀자',
          coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
          tags: ['선택과책임', '삶의이면'],
          metaInfo: '질문 3개 · 생각 메모 7개 · 함께 읽은 사람 3명',
          questions: [
            {
              questionText: 'Q. 안진진이 낭만적인 김장우 대신 지루하리만치 반듯한 나영규와의 현실적인 연대를 선택한 것에 대해 어떻게 생각하시나요?',
              commentCount: 3,
              comments: [
                { author: '지은', date: '4월 6일', content: '“김장우와의 쓸쓸한 연애가 주는 자유보다는 나영규와의 규칙적인 현실을 택한 건, 결국 불안한 자신의 삶을 보호하기 위한 서글픈 모순이라고 느껴져요. 안진진의 서글픈 현실감이 깊은 여운을 남겼습니다.”' },
                { author: '민수', date: '4월 6일', content: '“저는 조금 다르게 봤어요. 낭만을 좇기보다 현실을 타협한 평범한 인간의 나약함이자, 동시에 가장 솔직한 생존 본능이 아닐까 싶네요. 우리의 매일도 이상과 밥그릇 사이에서 끊임없이 흔들리니까요.”' },
                { author: '오후의 사색', date: '4월 7일', content: '“결국 나영규와의 숨 막히는 배려 속에서도 안진진은 새로운 결핍을 느끼게 될 거예요. 한쪽을 채우면 다른 쪽이 텅 비어버리는 것이 이 소설이 가리키는 궁극적인 모순이겠죠.”' }
              ]
            },
            {
              questionText: 'Q. 소설 속에서 풍요로웠으나 스스로 생을 놓은 이모와, 가난 속에서 억척스럽게 살아남은 엄마의 대비가 주는 메시지는 무엇일까요?',
              commentCount: 2,
              comments: [
                { author: '소희', date: '4월 9일', content: '“이모의 완벽한 일상이 결국 변화와 소음이 통제된 무덤이었고, 엄마의 상처투성이 하루는 고통스럽지만 살아 꿈틀대는 푸른 숲 같았습니다. 삶의 불행조차 생명력의 일부임을 실감했습니다.”' },
                { author: '준호', date: '4월 10일', content: '“풍요 속 빈곤이라는 역설적인 감각을 아주 극단적으로 구현해 낸 챕터라고 생각합니다. 타인의 삶을 밖에서만 비추어 보며 함부로 동경해서는 안 되겠다는 생각이 들었어요.”' }
              ]
            }
          ]
        },
        'report-3': {
          month: '2026년 3월',
          title: '아몬드',
          author: '손원평',
          coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&auto=format&fit=crop&q=80',
          tags: ['공감의온기', '타인의아픔'],
          metaInfo: '질문 2개 · 생각 메모 4개 · 함께 읽은 사람 3명',
          questions: [
            {
              questionText: 'Q. 감정을 전혀 느끼지 못하는 소년 윤재의 건조한 태도를 보며, 우리가 역설적으로 타인의 고통에서 느낀 진짜 감정의 무게는 어떠한가요?',
              commentCount: 2,
              comments: [
                { author: '지은', date: '3월 5일', content: '“윤재가 곤이에게 투박하게 건넨 손길은 계산된 윤리가 아니었습니다. 그 무구하고 있는 그대로의 응시야말로 가식적인 위선이 가득한 우리의 공감을 뛰어넘는 진짜 온기였어요.”' },
                { author: '민수', date: '3월 6일', content: '“현대 사회는 윤재의 감정 불능증보다, 감정을 멀쩡히 느끼면서도 타인의 외침을 뉴스 보듯 차갑게 외면하는 방관자들의 무서운 둔감함을 꼬집고 있습니다.”' }
              ]
            }
          ]
        }
      };
      return reportsData[monthlyBookId] || null;
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

export const clearSessionCache = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.clear();
      sessionStorage.clear();
      // Supabase 관련 쿠키 등 제거
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      console.log('[Auth] Session and cache cleared successfully.');
    } catch (err) {
      console.error('[Auth] Failed to clear session cache:', err);
    }
  }
};

/**
 * YYYY-MM-DD 또는 MM.DD 형태의 문자열을 Date 객체로 안전하게 변환하는 헬퍼 함수
 */
export function parseDateString(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  
  // YYYY-MM-DD 형식 검사
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const d = new Date(year, month - 1, day);
        d.setHours(0, 0, 0, 0);
        return d;
      }
    }
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }

  // MM.DD 형식 검사
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      if (!isNaN(month) && !isNaN(day)) {
        const currentYear = new Date().getFullYear();
        const d = new Date(currentYear, month - 1, day);
        d.setHours(0, 0, 0, 0);
        return d;
      }
    }
  }

  // Fallback
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}

/**
 * 날짜 기반으로 현재 모임 진행 단계를 동적 계산하는 헬퍼 함수
 */
export function getStageByDates(
  timelineReading: string | null,
  timelineQuestion: string | null,
  timelineDiscussion: string | null
): 'reading' | 'question_collecting' | 'discussion' | 'archiving' | 'archived_recap' {
  const getTodayDate = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const today = getTodayDate();

  if (!timelineReading) return 'reading';

  const parts = timelineReading.split('~');
  if (parts.length !== 2) return 'reading';
  
  const readStart = parseDateString(parts[0]);
  const readEnd = parseDateString(parts[1]);
  if (!readStart || !readEnd) return 'reading';

  // 1. 결산 완료 후 유예 기간 (readEnd 다음날부터 7일간)
  const graceStart = new Date(readEnd);
  graceStart.setDate(graceStart.getDate() + 1);
  const graceEnd = new Date(readEnd);
  graceEnd.setDate(graceEnd.getDate() + 7);

  if (today >= graceStart && today <= graceEnd) {
    return 'archived_recap';
  }

  // 2. 결산일 당일
  if (today.getTime() === readEnd.getTime()) {
    return 'archiving';
  }

  // 3. 토론 진행 단계 검사
  if (timelineDiscussion) {
    const tParts = timelineDiscussion.split('~');
    if (tParts.length === 2) {
      const tStart = parseDateString(tParts[0]);
      const tEnd = parseDateString(tParts[1]);
      if (tStart && tEnd && today >= tStart && today <= tEnd) {
        return 'discussion';
      }
    }
  }

  // 4. 토론 주제 선정 단계 검사
  if (timelineQuestion) {
    const qParts = timelineQuestion.split('~');
    if (qParts.length === 2) {
      const qStart = parseDateString(qParts[0]);
      const qEnd = parseDateString(qParts[1]);
      if (qStart && qEnd && today >= qStart && today <= qEnd) {
        return 'question_collecting';
      }
    }
  }

  return 'reading';
}

/**
 * 독서 일정의 세부 타임라인(읽기, 토론 주제 선정, 토론, 결산) 날짜 범위를 역전 없이 안전하게 계산하는 함수
 */
export function calculateTimelineDates(
  startDateStr: string,
  endDateStr: string,
  qDays: number,
  tDays: number,
  isAdvanced: boolean,
  advancedDates?: {
    qStartDate?: string;
    qEndDate?: string;
    tStartDate?: string;
    tEndDate?: string;
  }
) {
  const toYmd = (d: Date) => {
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const start = parseDateString(startDateStr) || new Date();
  const end = parseDateString(endDateStr) || new Date();

  // 역전 방지 기본 가드
  if (start >= end) {
    start.setTime(end.getTime() - 24 * 60 * 60 * 1000);
  }

  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (isAdvanced && advancedDates) {
    // 고급 설정 시 수동 날짜들 검증 및 바인딩
    const qs = parseDateString(advancedDates.qStartDate || '') || new Date(start);
    const qe = parseDateString(advancedDates.qEndDate || '') || new Date(qs);
    const ts = parseDateString(advancedDates.tStartDate || '') || new Date(qe);
    const te = parseDateString(advancedDates.tEndDate || '') || new Date(ts);

    // 날짜 간 역전 방지 논리 가드
    if (qs < start) qs.setTime(start.getTime());
    if (qe < qs) qe.setTime(qs.getTime());
    if (ts <= qe) ts.setTime(qe.getTime() + 24 * 60 * 60 * 1000);
    if (te < ts) te.setTime(ts.getTime());
    if (te >= end) {
      te.setTime(end.getTime() - 24 * 60 * 60 * 1000);
      if (ts > te) ts.setTime(te.getTime());
      if (qe >= ts) qe.setTime(ts.getTime() - 24 * 60 * 60 * 1000);
      if (qs > qe) qs.setTime(qe.getTime());
    }

    const rEnd = new Date(qs);
    rEnd.setDate(qs.getDate() - 1);
    if (rEnd < start) rEnd.setTime(start.getTime());

    return {
      startDate: toYmd(start),
      endDate: toYmd(end),
      qStartDate: toYmd(qs),
      qEndDate: toYmd(qe),
      tStartDate: toYmd(ts),
      tEndDate: toYmd(te),
      rEndDate: toYmd(rEnd)
    };
  } else {
    // 자동 계산 공식 (역전 방지 포함)
    let safeTDays = tDays;
    let safeQDays = qDays;

    if (safeTDays + safeQDays + 1 > totalDays) {
      safeTDays = Math.max(1, Math.floor((totalDays - 1) / 2));
      safeQDays = Math.max(1, totalDays - 1 - safeTDays);
    }

    // 토론 종료일: 결산일(end) 하루 전
    const tEnd = new Date(end);
    tEnd.setDate(end.getDate() - 1);

    // 토론 시작일: tEnd - safeTDays + 1
    const tStart = new Date(tEnd);
    tStart.setDate(tEnd.getDate() - safeTDays + 1);

    // 토론 주제 선정 종료일: tStart 하루 전
    const qEnd = new Date(tStart);
    qEnd.setDate(tStart.getDate() - 1);

    // 토론 주제 선정 시작일: qEnd - safeQDays + 1
    const qStart = new Date(qEnd);
    qStart.setDate(qEnd.getDate() - safeQDays + 1);

    // 책 읽기 종료일: qStart 하루 전
    const rEnd = new Date(qStart);
    rEnd.setDate(qStart.getDate() - 1);

    return {
      startDate: toYmd(start),
      endDate: toYmd(end),
      qStartDate: toYmd(qStart),
      qEndDate: toYmd(qEnd),
      tStartDate: toYmd(tStart),
      tEndDate: toYmd(tEnd),
      rEndDate: toYmd(rEnd)
    };
  }
}



