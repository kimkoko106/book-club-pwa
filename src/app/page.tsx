'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi, isMockMode, supabase, checkIsCompleted, clearSessionCache, getStageByDates } from '../lib/supabase';
import { BookClub, Book, UserBookProgress } from '../types';
import BookProgressCard from '../components/BookProgressCard';
import Navigation from '../components/Navigation';
import { BookOpen, Compass, Plus, Sparkles, LogOut, ArrowRight, MessageSquare, Coffee } from 'lucide-react';


// 디데이 계산 헬퍼
const getDDay = (mb: any): string => {
  if (!mb) return '일정 조율 중';
  
  let startDateStr: string | null = null;
  if (mb.reading_start_date) {
    startDateStr = mb.reading_start_date;
  } else if (mb.timeline_reading) {
    const parts = mb.timeline_reading.split('~');
    if (parts.length === 2) {
      startDateStr = parts[0].trim();
    }
  }
  
  if (!startDateStr) return '일정 조율 중';
  
  const target = new Date(startDateStr);
  const today = new Date();
  
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'D-Day';
  if (diffDays > 0) return `D-${diffDays}`;
  return `시작됨`;
};

const formatYmdToMd = (ymd: string | null): string => {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length === 3) {
    return `${parts[1]}.${parts[2]}`;
  }
  return ymd;
};

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [activeClub, setActiveClub] = useState<BookClub | null>(null);
  const [showRecapGraceCard, setShowRecapGraceCard] = useState(false);
  const [prevMonthlyBookId, setPrevMonthlyBookId] = useState<string | null>(null);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [myProgress, setMyProgress] = useState<UserBookProgress | null>(null);
  const [membersProgress, setMembersProgress] = useState<UserBookProgress[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(8);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [showTimeoutFallback, setShowTimeoutFallback] = useState(false);
  const [discussionStage, setDiscussionStage] = useState<'reading' | 'question_collecting' | 'discussion' | 'archiving'>('reading');
  const [nextBook, setNextBook] = useState<any | null>(null);
  const [nextMonthlyBook, setNextMonthlyBook] = useState<any | null>(null);
  const router = useRouter();

  // 함께 읽는 모임원 전체의 평균 진행률 계산
  const getAverageProgress = () => {
    if (membersProgress.length === 0) return 0;
    
    let totalPercent = 0;
    membersProgress.forEach((p) => {
      const totalPages = activeBook?.total_pages;
      const hasPages = totalPages !== undefined && totalPages !== null && totalPages > 1;
      const pct = hasPages 
        ? Math.round((p.current_page / (totalPages as number)) * 100)
        : p.current_page;
      totalPercent += Math.min(100, Math.max(0, pct));
    });
    return Math.round(totalPercent / membersProgress.length);
  };

  const avgProgress = getAverageProgress();

  // 5초 로딩 타임아웃 가드 및 자동 리다이렉트
  useEffect(() => {
    let redirectTimer: NodeJS.Timeout;
    let fallbackTimer: NodeJS.Timeout;

    if (isLoading) {
      fallbackTimer = setTimeout(() => {
        setShowTimeoutFallback(true);
        // 5초 타임아웃 발생 시 오염되거나 잘못 꼬인 세션/쿠키를 강제 청소합니다.
        clearSessionCache();
        
        // 3초 추가 대기 후 로그인 화면으로 자동 이동 시도
        redirectTimer = setTimeout(() => {
          router.replace('/login');
        }, 3000);
      }, 5000);
    } else {
      setShowTimeoutFallback(false);
    }

    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(redirectTimer);
    };
  }, [isLoading]);

  // PWA Service Worker 강제 제거 및 캐시 무력화 훅
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log('[PWA SW] ServiceWorker successfully unregistered.');
                window.location.reload();
              }
            });
          }
        });
      }
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
    }
  }, []);

  // 데이터 로드 함수 정의
  const loadClubData = useCallback(async (userId: string, clubId: string) => {
    try {
      const monthlyBook = await mockApi.clubs.getMonthlyBook(clubId);
      const nextMb = await mockApi.clubs.getNextMonthlyBook(clubId);
      if (nextMb) {
        setNextMonthlyBook(nextMb);
        setNextBook(nextMb.books);
      } else {
        setNextMonthlyBook(null);
        setNextBook(null);
      }
      
      if (monthlyBook) {
        const calculatedStage = getStageByDates(monthlyBook);

        let uiStage: 'reading' | 'question_collecting' | 'discussion' | 'archiving' = 'reading';
        if (calculatedStage === 'archived_recap') {
          // 결산 유예 단계: 이전 책이 유예기간이므로 메인은 새책 준비상태가 됨 (새 공유책이 없는 상태)
          setActiveBook(null);
          uiStage = 'reading';
          setShowRecapGraceCard(true);
          setPrevMonthlyBookId(monthlyBook.id);
        } else {
          // 일반적인 단계: 이 책을 메인으로 노출
          const book = monthlyBook.books;
          setActiveBook(book);
          uiStage = calculatedStage === 'archiving' ? 'archiving' : calculatedStage as any;
          
          // 추가: 최근 아카이브된 책이 유예기간(7일) 내라면 결산 카드 노출
          try {
            const archives = await mockApi.discussion.getArchiveList(clubId);
            if (archives.length > 0) {
              const latestArchive = archives[0];
              const archiveDetail = await mockApi.discussion.getArchiveDetail(latestArchive.id);
              const readEnd = archiveDetail.reading_end_date || (archiveDetail.timeline_reading ? archiveDetail.timeline_reading.split('~')[1] : null);
              if (readEnd) {
                  const getTodayYmd = () => {
                    const d = new Date();
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                  };
                  const todayStr = getTodayYmd();
                  if (todayStr > readEnd) {
                    const graceDateObj = new Date(readEnd);
                    graceDateObj.setDate(graceDateObj.getDate() + 7);
                    const graceY = graceDateObj.getFullYear();
                    const graceM = String(graceDateObj.getMonth() + 1).padStart(2, '0');
                    const graceD = String(graceDateObj.getDate()).padStart(2, '0');
                    const graceEnd = `${graceY}-${graceM}-${graceD}`;
                    
                    if (todayStr <= graceEnd) {
                      setShowRecapGraceCard(true);
                      setPrevMonthlyBookId(latestArchive.id);
                    } else {
                      setShowRecapGraceCard(false);
                      setPrevMonthlyBookId(null);
                    }
                  } else {
                    setShowRecapGraceCard(false);
                    setPrevMonthlyBookId(null);
                  }
              }
            } else {
              setShowRecapGraceCard(false);
              setPrevMonthlyBookId(null);
            }
          } catch {
            setShowRecapGraceCard(false);
            setPrevMonthlyBookId(null);
          }

          if (book) {
            // 내 독서 진행도 조회
            const progresses = await mockApi.progress.getMemberProgressList(clubId, book.id);
            const mine = progresses.find((p) => p.user_id === userId) || null;
            setMyProgress(mine);
            
            // 동료 진행도 조회
            setMembersProgress(progresses);
            
            // 질문 후보 개수 조회
            const questions = await mockApi.discussion.getQuestions(clubId, book.id);
            setQuestionCount(questions.length);
          }
        }
        
        setDiscussionStage(uiStage);
      } else {
        setActiveBook(null);
        setDiscussionStage('reading');
        setShowRecapGraceCard(false);
        setPrevMonthlyBookId(null);
      }
    } catch (err) {
      console.error('모임 데이터 로드 실패:', err);
    }
  }, []);

  // 인증 상태 및 초기 모임 목록 로드
  useEffect(() => {
    let active = true;
    async function init() {
      setIsLoading(true);
      setInitError(null);
      try {
        const { data } = await mockApi.auth.getUser();
        if (!active) return;

        if (!data?.user) {
          router.replace('/login');
          return;
        }
        const user = data.user;
        setCurrentUser(user);

        // 사용자가 속한 모임 목록 가져오기
        const myClubs = await mockApi.clubs.getMyClubs(user.id);
        if (!active) return;

        if (myClubs.length > 0) {
          const club = myClubs[0];
          setActiveClub(club);
          await loadClubData(user.id, club.id);


        } else {
          setActiveClub(null);
        }

        // 성공적으로 모든 데이터를 불러왔을 때만 로딩 해제
        if (active) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('초기 로드 에러:', err);
        if (active) {
          setInitError('책방 연결에 실패했습니다. 로그인 화면으로 이동합니다...');
          setTimeout(() => {
            router.replace('/login');
          }, 2000);
        }
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [router, loadClubData]);

  // 내 읽기 상태 업데이트 액션
  const handleProgressUpdate = async (currentPage: number, status: 'reading' | 'completed' | 'paused') => {
    if (!currentUser || !activeBook || !activeClub) return;

    try {
      await mockApi.progress.updateMyProgress(currentUser.id, activeBook.id, currentPage, status);
      await loadClubData(currentUser.id, activeClub.id);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleUpdateTotalPages = async (totalPages: number) => {
    if (!currentUser || !activeBook || !activeClub) return;

    try {
      if (!isMockMode && supabase) {
        const { error } = await supabase
          .from('books')
          .update({ total_pages: totalPages })
          .eq('id', activeBook.id);

        if (error) {
          console.error('[DB] update total_pages error:', error);
          throw error;
        }
      } else {
        // 로컬 Mock 모드 대응
        const KEY_BOOKS = 'bookclub_mock_books';
        const storedBooks = localStorage.getItem(KEY_BOOKS);
        const booksList = storedBooks ? JSON.parse(storedBooks) : [];
        const updated = booksList.map((b: any) => {
          if (b.id === activeBook.id) {
            return { ...b, total_pages: totalPages };
          }
          return b;
        });
        localStorage.setItem(KEY_BOOKS, JSON.stringify(updated));
      }

      // UI 갱신을 위해 데이터 재로드
      await loadClubData(currentUser.id, activeClub.id);
    } catch (err) {
      console.error('[page] handleUpdateTotalPages error:', err);
      throw err;
    }
  };

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      if (isMockMode) {
        await mockApi.auth.signOut();
      } else if (supabase) {
        await supabase.auth.signOut();
      }
      setCurrentUser(null);
      setActiveClub(null);
      setActiveBook(null);
      setMyProgress(null);
      setMembersProgress([]);
      router.push('/login');
    }
  };

  // 토론방 진입 판단 핸들러 (독서 단계별 스포일러 방지 필터)
  const handleDiscussionClick = () => {
    if (!currentUser) return;

    // 1. 읽기 중(reading) 및 질문 수집(question_collecting) 단계에서는 스포일러 경고 없이 바로 진입
    if (discussionStage === 'reading' || discussionStage === 'question_collecting') {
      router.push('/discussion');
      return;
    }

    // 2. 완독 사용자는 언제나 바로 진입 가능
    if (checkIsCompleted(currentUser.id)) {
      router.push('/discussion');
      return;
    }

    // 3. 토론(discussion) 및 결산(archiving) 단계에서 완독 전인 경우 경고 페이지로 이동 (stage 파라미터 전달)
    router.push(`/discussion-warning?stage=${discussionStage}`);
  };

  if (initError) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-[280px]">
          <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex justify-center items-center font-bold text-lg">⚠️</div>
          <p className="text-xs font-semibold text-red-600 leading-relaxed">{initError}</p>
          <button 
            onClick={() => { router.push('/login'); }}
            className="mt-2 px-4 py-2 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            로그인 화면으로 직접 이동
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sage-medium border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-sage-dark">책방 문을 열고 있습니다...</span>
          
          {showTimeoutFallback && (
            <div className="mt-6 flex flex-col items-center gap-3 text-center max-w-[280px]">
              <p className="text-xs text-foreground/60 leading-relaxed font-medium">
                책방 연결이 오래 걸리고 있어요.<br />
                로그인 화면으로 이동해 다시 시작할 수 있어요.
              </p>
              <button 
                onClick={() => { 
                  clearSessionCache();
                  router.push('/login'); 
                }}
                className="px-4 py-2 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                로그인 화면으로 이동
              </button>
            </div>
          )}

          {/* 캐시 무력화용 임시 버전 표시 */}
          <span className="text-[9px] text-foreground/20 mt-12 select-none">
            debug build: 2026-05-29 23:45
          </span>
        </div>
      </div>
    );
  }

  // 모임 흐름 단계 정의
  const workflowSteps = [
    { label: '책 읽기', active: false },
    { label: '토론 주제 선정', active: true },
    { label: '토론 진행', active: false },
    { label: '결산 회고', active: false }
  ];

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      <main className="flex-1 flex flex-col gap-3.5">
        {/* 상단 웰컴 영역 (축소 적용) */}
        <div className="flex justify-between items-center py-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
            <Sparkles size={12} className="text-warm-beige animate-pulse" />
            <span>{currentUser?.username}님 반갑습니다</span>
            <button 
              onClick={handleLogout}
              className="text-foreground/35 hover:text-red-500 transition-colors p-1"
              title="로그아웃"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>

        {/* 조건부 렌더링: 가입된 모임 여부 */}
        {!activeClub ? (
          /* Empty State: 가입된 모임 없음 */
          <div className="flex-grow flex flex-col justify-center items-center gap-6 my-8">
            <div className="w-16 h-16 bg-sage-light/40 rounded-full flex justify-center items-center">
              <BookOpen size={28} className="text-sage-medium" />
            </div>

            <div className="text-center flex flex-col gap-1.5">
              <h3 className="text-base font-extrabold text-foreground">참여 중인 모임이 없습니다</h3>
              <p className="text-xs text-foreground/50 leading-relaxed max-w-[280px]">
                새로운 독서 모임을 직접 개설하거나,<br />
                친구가 공유해 준 초대 코드를 통해 가입해 보세요.
              </p>
            </div>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => router.push('/create-club')}
                className="w-full py-3 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all shadow-sm"
              >
                <Plus size={16} />
                새로운 모임 만들기
              </button>
              <button
                onClick={() => router.push('/join')}
                className="w-full py-3 bg-card-bg hover:bg-sage-light/20 border border-card-border text-foreground/80 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all"
              >
                <Compass size={16} className="text-sage-medium" />
                초대 코드로 참가하기
              </button>
            </div>
          </div>
        ) : (
          /* 모임 및 책 데이터 렌더링 (재정렬 순서 적용) */
          <div className="flex flex-col gap-3.5">
            {/* 1. 모임 정보 카드 (최상단) */}
            <div className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold text-sage-medium uppercase tracking-wider">독서 공간</span>
                  <h3 className="text-sm font-black text-foreground truncate">{activeClub.title}</h3>
                  {activeClub.description && (
                    <p className="text-[11px] text-foreground/55 mt-1 leading-snug">{activeClub.description}</p>
                  )}
                </div>
                {/* 초대 코드 배지 내장 */}
                <div className="bg-sage-light/60 px-2.5 py-1 rounded-lg border border-sage-light flex flex-col items-center flex-shrink-0">
                  <span className="text-[8px] text-sage-dark font-black tracking-wider uppercase">초대코드</span>
                  <span className="text-[11px] font-extrabold text-sage-dark tracking-wider">{activeClub.invite_code}</span>
                </div>
              </div>
            </div>

            {/* 2. 현재 읽고 있는 책 카드 혹은 새 공유책 권유 카드 */}
            {activeBook ? (
              discussionStage === 'archiving' ? (
                /* 결산일 당일 화면 분기: 현재 회차(완료) -> 결산 -> 다음 예정 공유도서 */
                <div className="flex flex-col gap-3.5 w-full">
                  {/* 1. 현재 회차 완료 카드 */}
                  <div className="bg-card-bg rounded-2xl border border-card-border p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="absolute top-0 right-6 w-5 h-8 bg-sage-medium/85 rounded-b-md shadow-inner flex justify-center items-center">
                      <div className="w-1.5 h-1.5 bg-card-bg rounded-full" />
                    </div>
                    <div className="flex gap-4 items-start">
                      {activeBook.cover_url ? (
                        <img 
                          src={activeBook.cover_url} 
                          alt="표지" 
                          className="w-14 h-20 rounded object-cover border border-card-border shadow-xs flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-20 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border/70 flex flex-col justify-between py-2.5 px-1.5 shadow-xs flex-shrink-0 text-center select-none relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-sage-dark/10" />
                          <span className="text-[9px] font-black text-sage-dark leading-tight line-clamp-2 w-full px-0.5 mt-0.5">
                            {activeBook.title}
                          </span>
                          <span className="text-[7.5px] font-extrabold text-sage-medium/90 truncate w-full px-0.5">
                            {activeBook.author || '지은이 없음'}
                          </span>
                        </div>
                      )}
                      <div className="flex-grow flex flex-col gap-1 pr-6 min-w-0">
                        <span className="text-[9.5px] font-bold text-sage-medium uppercase tracking-wider">진행 도서 완료</span>
                        <h3 className="text-base font-black text-foreground leading-snug truncate">{activeBook.title}</h3>
                        <p className="text-xs text-foreground/60 font-medium truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{activeBook.author} 저</span>
                          {activeBook.total_pages && activeBook.total_pages > 1 && (
                            <>
                              <span>·</span>
                              <span>전체 {activeBook.total_pages}p</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="h-px bg-card-border" />
                    <div className="flex justify-between items-center bg-sage-light/25 border border-sage-light/65 px-4 py-3 rounded-2xl">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-sage-dark/60 uppercase tracking-wider">상태</span>
                        <span className="text-xs font-black text-sage-dark">🏁 이번 회차 완료 및 결산 진행중</span>
                      </div>
                      <span className="text-[10px] font-black bg-sage-medium text-white px-2.5 py-1 rounded-xl">
                        독서 종료
                      </span>
                    </div>
                  </div>

                  {/* 2. 결산 화면 */}
                  <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-xs flex flex-col gap-4 relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sage-light/10 rounded-full translate-x-8 -translate-y-8" />
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">여정의 맺음</span>
                      <h3 className="text-xs font-black text-foreground mt-0.5">독서 결산 진행중 🌙</h3>
                    </div>
                    <p className="text-[10.5px] text-sage-dark font-extrabold max-w-[280px] mx-auto leading-relaxed bg-sage-light/25 border border-sage-light/50 px-3 py-2 rounded-xl">
                      📢 오늘은 이번 회차 마지막 날입니다.
                    </p>
                    <p className="text-[9.5px] text-foreground/50 font-medium leading-relaxed">
                      모두의 사색 질문과 댓글을 바탕으로 이야기가 결산되는 날입니다. 하단의 토론방 탭으로 이동하면 자세한 결산 통계를 보실 수 있습니다.
                    </p>
                  </div>

                  {/* 3. 다음 예정 공유도서 */}
                  {nextBook && nextMonthlyBook && (
                    <div className="bg-card-bg border border-card-border rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                      <div className="flex justify-between items-center text-[9.5px] font-bold text-foreground/45 pb-1 border-b border-card-border/40 uppercase tracking-wider">
                        <span>다음 예정 공유도서 🌱</span>
                        <span className="text-sage-dark font-black">
                          {nextMonthlyBook.reading_start_date && nextMonthlyBook.reading_end_date
                            ? `${formatYmdToMd(nextMonthlyBook.reading_start_date)} ~ ${formatYmdToMd(nextMonthlyBook.reading_end_date)}`
                            : (nextMonthlyBook.timeline_reading ? nextMonthlyBook.timeline_reading.split('~').map((d: string) => formatYmdToMd(d.trim())).join(' ~ ') : '일정 조율 중')}
                        </span>
                      </div>
                      <div className="flex gap-3 items-center">
                        {nextBook.cover_url ? (
                          <img src={nextBook.cover_url} alt="Cover" className="w-10 h-14 rounded object-cover border border-card-border shadow-xs" />
                        ) : (
                          <div className="w-10 h-14 rounded bg-sage-light/20 border border-card-border/70 flex justify-center items-center text-[10px] text-sage-dark font-bold">📖</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-foreground truncate">{nextBook.title}</h4>
                          <span className="text-[10px] text-foreground/45 font-medium truncate mt-0.5">{nextBook.author}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* 기존 평소 독서 진행 중 화면 */
                <>
                  <BookProgressCard
                    book={activeBook}
                    progress={myProgress}
                    onUpdate={handleProgressUpdate}
                    onUpdateTotalPages={handleUpdateTotalPages}
                  />

                  {nextBook && nextMonthlyBook && (
                    <div className="bg-card-bg border border-card-border rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                      <div className="flex justify-between items-center text-[9.5px] font-bold text-foreground/45 pb-1 border-b border-card-border/40 uppercase tracking-wider">
                        <span>다음 예정 공유도서 🌱</span>
                        <span className="text-sage-dark font-black">
                          {nextMonthlyBook.reading_start_date && nextMonthlyBook.reading_end_date
                            ? `${formatYmdToMd(nextMonthlyBook.reading_start_date)} ~ ${formatYmdToMd(nextMonthlyBook.reading_end_date)}`
                            : (nextMonthlyBook.timeline_reading ? nextMonthlyBook.timeline_reading.split('~').map((d: string) => formatYmdToMd(d.trim())).join(' ~ ') : '일정 조율 중')}
                        </span>
                      </div>
                      <div className="flex gap-3 items-center">
                        {nextBook.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={nextBook.cover_url} alt="Cover" className="w-10 h-14 rounded object-cover border border-card-border shadow-xs" />
                        ) : (
                          <div className="w-10 h-14 rounded bg-sage-light/20 border border-card-border/70 flex justify-center items-center text-[10px] text-sage-dark font-bold">📖</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-foreground truncate">{nextBook.title}</h4>
                          <span className="text-[10px] text-foreground/45 font-medium truncate mt-0.5">{nextBook.author}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. 함께 읽는 여정 카드 (기존 4번 '독서 흐름 단계 카드') */}
                  <div className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                    {/* 홈 화면용 압축형 감성 진행바 UI */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between items-center text-[9.5px]">
                        <span className="font-extrabold text-foreground/45">함께 책 읽는 여정 🗺️</span>
                        <span className="text-sage-dark font-black tracking-normal">
                          {discussionStage === 'reading' && '천천히 읽으며 질문을 남겨보세요 📖'}
                          {discussionStage === 'question_collecting' && '함께 오래 이야기할 질문을 골라요 🌱'}
                          {discussionStage === 'discussion' && '선정 질문으로 자유롭게 대화해요 💬'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between relative px-2 py-1 mt-1">
                        {/* 연결 선 (다이어리 감성 얇은 점선) */}
                        <div className="absolute top-[13px] left-6 right-6 border-t border-dashed border-card-border/80 z-0" />
                        <div 
                          className="absolute top-[13px] left-6 border-t border-dashed border-sage-medium/70 transition-all duration-300 z-0"
                          style={{
                            width: 
                              discussionStage === 'reading' ? '0%' :
                              discussionStage === 'question_collecting' ? '33%' :
                              discussionStage === 'discussion' ? '66%' : '100%'
                          }}
                        />

                        {[
                          { key: 'reading', label: '책 읽기', emoji: '📖' },
                          { key: 'question_collecting', label: '토론 주제 선정', emoji: '🗳️' },
                          { key: 'discussion', label: '토론 진행', emoji: '💬' },
                          { key: 'archiving', label: '결산 회고', emoji: '🌙' }
                        ].map((step, idx) => {
                          const currentIdx = ['reading', 'question_collecting', 'discussion', 'archiving'].indexOf(discussionStage);
                          const isActive = step.key === discussionStage;
                          const isCompleted = idx < currentIdx;

                          let statusBg = 'bg-card-bg border-card-border/60 text-foreground/30 opacity-40';
                          let displayContent = step.emoji;

                          if (isActive) {
                            statusBg = 'bg-sage-light border-sage-medium text-sage-dark scale-105 shadow-xs ring-2 ring-sage-light/50 font-black';
                          } else if (isCompleted) {
                            statusBg = 'bg-sage-medium/10 border-sage-medium/30 text-sage-medium';
                            displayContent = '✨';
                          }

                          return (
                            <div key={step.key} className="flex flex-col items-center gap-1 z-10 select-none">
                              {/* 더 콤팩트한 w-6.5 h-6.5 노드 */}
                              <div className={`w-6.5 h-6.5 rounded-xl border flex justify-center items-center text-xs transition-all duration-300 ${statusBg}`}>
                                {displayContent}
                              </div>
                              <span className={`text-[8px] font-bold ${
                                isActive ? 'text-sage-dark font-black' :
                                isCompleted ? 'text-sage-medium/70' : 'text-foreground/35'
                              }`}>{step.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Stepper 하단 한 줄 설명 칩 */}
                      <div className="mt-2 bg-sage-light/35 border border-sage-light rounded-xl p-2.5 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-sage-medium flex justify-center items-center text-xs text-white">
                          {discussionStage === 'reading' && '📖'}
                          {discussionStage === 'question_collecting' && '🗳️'}
                          {discussionStage === 'discussion' && '💬'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9.5px] font-black text-sage-dark leading-snug">
                            {discussionStage === 'reading' && '지금은 [책 읽기] 단계예요'}
                            {discussionStage === 'question_collecting' && '지금은 [토론 주제 선정] 단계예요'}
                            {discussionStage === 'discussion' && '지금은 [토론 진행] 단계예요'}
                          </span>
                          <span className="text-[8px] text-foreground/50 font-medium leading-relaxed">
                            {discussionStage === 'reading' && '천천히 읽으며 마음에 남는 질문을 남겨보세요.'}
                            {discussionStage === 'question_collecting' && '모인 질문 중에서 가장 나누고 싶은 토론 주제를 선정합니다.'}
                            {discussionStage === 'discussion' && '선정된 질문으로 자유롭게 대화하고 생각을 나누어봐요.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. 함께 읽는 진행률 카드 (기존 3번 '함께 읽는 진행률 카드') */}
                  <div className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col gap-4.5 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-sage-medium uppercase tracking-wider">모임 진행도</span>
                        <h3 className="text-sm font-black text-foreground">함께 채워가는 중 🌱</h3>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sage-medium/10 border border-sage-medium/25 text-sage-medium rounded-full text-xs font-bold">
                        <span>{membersProgress.length}명 함께 읽는 중</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-end text-xs font-bold">
                        <span className="text-foreground/50">전체 평균 진행률</span>
                        <span className="text-sm font-black text-sage-dark">{avgProgress}%</span>
                      </div>
                      
                      {/* 프로그레스 바 */}
                      <div className="w-full h-3 bg-sage-light/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-sage-medium rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${avgProgress}%` }} 
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => router.push('/club')}
                      className="w-full py-2 border border-card-border hover:bg-sage-light/10 text-foreground/75 hover:text-sage-dark rounded-xl text-xs font-black transition-all cursor-pointer flex justify-center items-center gap-1"
                    >
                      전체 진행률 보기
                    </button>
                  </div>

                  {/* 5. 질문 후보 카드 */}
                  <div 
                    onClick={handleDiscussionClick}
                    className="bg-gradient-to-r from-sage-medium/90 to-sage-dark hover:from-sage-dark hover:to-sage-dark text-white rounded-2xl p-4.5 flex justify-between items-center shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9.5 h-9.5 bg-white/10 rounded-xl flex justify-center items-center">
                        <MessageSquare size={18} className="text-white" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <h4 className="text-xs font-extrabold">질문 후보가 {questionCount}개 모였습니다</h4>
                        <p className="text-[10px] text-white/80 font-medium">오래 붙잡고 싶은 질문들을 살펴보세요.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-[10px] font-bold bg-white/10 px-2.5 py-1.5 rounded-xl hover:bg-white/20 transition-all">
                      <span>토론 보러가기</span>
                      <ArrowRight size={11} />
                    </div>
                  </div>
                </>
              )
            ) : (
              /* 새 공유책이 없는 경우 예외 상태 노출 (휴식 기간 여부 판단) */
              nextBook && nextMonthlyBook ? (
                <div className="bg-card-bg border border-card-border rounded-2xl p-6.5 text-center flex flex-col items-center gap-4.5 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
                  {/* 디데이 배지 */}
                  <div className="absolute top-4 right-4 bg-sage-medium text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-xs">
                    {getDDay(nextMonthlyBook)}
                  </div>
                  
                  <div className="w-12 h-12 bg-sage-light/40 rounded-2xl flex justify-center items-center text-sage-dark shadow-inner mt-2">
                    <Coffee size={22} className="text-sage-medium animate-pulse" />
                  </div>
                  
                  <div className="flex flex-col gap-1 px-1">
                    <h4 className="text-sm font-black text-foreground leading-snug">휴식 기간 ☕</h4>
                    <p className="text-[11px] text-foreground/50 leading-relaxed font-semibold">지금은 독서 휴식 기간입니다. 다음 독서를 준비 중입니다.</p>
                  </div>
                  
                  {/* 다음 공유도서 상세 카드 */}
                  <div className="w-full bg-sage-light/15 border border-sage-light/45 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="text-[9.5px] font-bold text-foreground/45 pb-1 border-b border-card-border/40 uppercase tracking-wider text-left">
                      다음 예정 공유도서 🌱
                    </div>
                    <div className="flex gap-4 items-center">
                      {nextBook.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={nextBook.cover_url} 
                          alt="Cover" 
                          className="w-11 h-15 rounded object-cover border border-card-border shadow-xs flex-shrink-0" 
                        />
                      ) : (
                        <div className="w-11 h-15 rounded bg-sage-light/20 border border-card-border/70 flex justify-center items-center text-xs text-sage-dark font-bold flex-shrink-0">📖</div>
                      )}
                      <div className="flex-grow min-w-0 text-left">
                        <h4 className="text-xs font-black text-foreground truncate">{nextBook.title}</h4>
                        <p className="text-[10px] text-foreground/55 font-medium truncate mt-0.5">{nextBook.author}</p>
                        <p className="text-[9px] text-sage-dark font-black mt-1.5 bg-sage-light/40 px-2 py-0.5 rounded-md inline-block">
                          시작일: {nextMonthlyBook.reading_start_date
                            ? nextMonthlyBook.reading_start_date.replace(/-/g, '.')
                            : (nextMonthlyBook.timeline_reading ? nextMonthlyBook.timeline_reading.split('~')[0].trim().replace(/-/g, '.') : '일정 조율 중')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card-bg border border-card-border border-dashed rounded-2xl p-6.5 text-center flex flex-col items-center gap-3.5 shadow-sm">
                  <div className="w-12 h-12 bg-sage-light/40 rounded-2xl flex justify-center items-center text-sage-dark shadow-inner">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex flex-col gap-1 px-1">
                    <h4 className="text-xs font-extrabold text-foreground leading-snug">다음 공유책을 제안해주세요 📖</h4>
                    <p className="text-[10px] text-foreground/45 leading-relaxed font-semibold">아직 이번 달 함께 읽을 새 공유책이 등록되지 않았습니다.</p>
                  </div>
                  <button
                    onClick={() => router.push('/club/candidate')}
                    className="px-4 py-2.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-[10px] font-black shadow-xs transition-all cursor-pointer"
                  >
                    책 후보방으로 이동
                  </button>
                </div>
              )
            )}

            {/* 결산 유예 기간 grace card (독서 종료 후 7일 이내 노출 - 최하단 보조 노출) */}
            {showRecapGraceCard && prevMonthlyBookId && (
              <div 
                onClick={() => router.push(`/group/archive/${prevMonthlyBookId}`)}
                className="bg-gradient-to-r from-sage-medium/90 to-sage-dark text-white rounded-2xl p-4.5 shadow-sm cursor-pointer hover:from-sage-dark hover:to-sage-dark transition-all flex justify-between items-center group animate-fade-in mt-1"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-black text-white/70 uppercase tracking-widest leading-none">지난 여정의 열매 🌙</span>
                  <h4 className="text-xs font-black flex items-center gap-1.5 text-white mt-1">
                    지난 달 독서 결산 보기
                  </h4>
                  <p className="text-[9.5px] text-white/70 font-semibold leading-none mt-1">이전 달에 나눴던 아름다운 사색 조각과 회고록이 도착했어요.</p>
                </div>
                <span className="text-[9px] font-black bg-white/20 px-2.5 py-1 rounded-lg group-hover:bg-white/35 transition-all flex items-center gap-0.5 text-white">
                  열기
                  <ArrowRight size={10} />
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={handleLogout} />
    </div>
  );
}




