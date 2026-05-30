'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi, isMockMode, supabase, checkIsCompleted, clearSessionCache } from '../lib/supabase';
import { BookClub, Book, UserBookProgress } from '../types';
import BookProgressCard from '../components/BookProgressCard';
import MemberList from '../components/MemberList';
import Navigation from '../components/Navigation';
import { BookOpen, Compass, Plus, Sparkles, LogOut, ArrowRight, MessageSquare } from 'lucide-react';


export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [activeClub, setActiveClub] = useState<BookClub | null>(null);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [myProgress, setMyProgress] = useState<UserBookProgress | null>(null);
  const [membersProgress, setMembersProgress] = useState<UserBookProgress[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(8);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [showTimeoutFallback, setShowTimeoutFallback] = useState(false);
  const [discussionStage, setDiscussionStage] = useState<'reading' | 'question_collecting' | 'discussion' | 'archiving'>('reading');
  const router = useRouter();

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
      
      if (monthlyBook) {
        const book = monthlyBook.books;
        setActiveBook(book);

        // DB stage -> UI stage mapping
        let uiStage: 'reading' | 'question_collecting' | 'discussion' | 'archiving' = 'reading';
        if (monthlyBook.stage === 'question') uiStage = 'question_collecting';
        else if (monthlyBook.stage === 'discussion') uiStage = 'discussion';
        else if (monthlyBook.stage === 'recap') uiStage = 'archiving';
        
        setDiscussionStage(uiStage);

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
      } else {
        setActiveBook(null);
        setDiscussionStage('reading');
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
    { label: '읽기 중', active: false },
    { label: '질문 모으는 중', active: true },
    { label: '토론', active: false },
    { label: '결산', active: false }
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
            {/* 1. 현재 읽고 있는 책 카드 (최상단) */}
            {activeBook && (
              <BookProgressCard
                book={activeBook}
                progress={myProgress}
                onUpdate={handleProgressUpdate}
              />
            )}

            {/* 2. 우리 모임 상태 카드 (초대 코드 및 모임 제목 통합) */}
            <div className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-sage-medium uppercase tracking-wider">독서 공간</span>
                  <h3 className="text-sm font-black text-foreground">{activeClub.title}</h3>
                  {activeClub.description && (
                    <p className="text-[11px] text-foreground/55 mt-0.5 leading-snug">{activeClub.description}</p>
                  )}
                </div>
                {/* 초대 코드 배지 내장 */}
                <div className="bg-sage-light/60 px-2.5 py-1 rounded-lg border border-sage-light flex flex-col items-center">
                  <span className="text-[8px] text-sage-dark font-black tracking-wider uppercase">초대코드</span>
                  <span className="text-[11px] font-extrabold text-sage-dark tracking-wider">{activeClub.invite_code}</span>
                </div>
              </div>

              {/* 홈 화면용 압축형 감성 진행바 UI */}
              <div className="flex flex-col gap-2.5 mt-2 bg-sage-light/10 border border-card-border/40 rounded-xl p-3">
                <div className="flex justify-between items-center text-[9.5px]">
                  <span className="font-extrabold text-foreground/45">함께 책 읽는 여정 🗺️</span>
                  <span className="text-sage-dark font-black tracking-normal">
                    {discussionStage === 'reading' && '천천히 책 속으로 들어가는 시간 📖'}
                    {discussionStage === 'question_collecting' && '질문이 자라나는 시간 🌱'}
                    {discussionStage === 'discussion' && '생각을 나누는 시간 💬'}
                    {discussionStage === 'archiving' && '이번 독서를 마음에 남기는 시간 🌙'}
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
                    { key: 'question_collecting', label: '질문 수집', emoji: '🌱' },
                    { key: 'discussion', label: '생각 나누기', emoji: '💬' },
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
              </div>
            </div>

            {/* 3. 질문 후보 진입 배너 카드 */}
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

            {/* 4. 함께 읽는 이들의 여정 카드 */}
            {activeBook && (
              <MemberList
                memberProgresses={membersProgress}
                totalPages={activeBook.total_pages}
              />
            )}
          </div>
        )}
      </main>

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={handleLogout} />
    </div>
  );
}




