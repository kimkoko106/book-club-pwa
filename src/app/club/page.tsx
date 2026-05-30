'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../lib/supabase';
import { BookClub, Book, UserBookProgress } from '../../types';
import Navigation from '../../components/Navigation';
import { 
  Users, 
  BookOpen, 
  Compass, 
  Plus, 
  History, 
  Settings, 
  KeyRound, 
  Sparkles, 
  Copy,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ClubHubPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [activeClub, setActiveClub] = useState<BookClub | null>(null);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [members, setMembers] = useState<UserBookProgress[]>([]);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('admin');
  const [stage, setStage] = useState<string>('reading');
  const [timeline, setTimeline] = useState({ reading: '05.01~05.14', question: '05.15~05.25', discussion: '05.26~05.31' });
  const router = useRouter();

  // 결산 회고용 상태 추가
  const [recapQuestions, setRecapQuestions] = useState<any[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // 독서 흐름이 결산(archiving) 단계일 때, 당시에 작성된 질문들과 댓글들을 일괄 로드
  const loadRecapData = useCallback(async (clubId: string, bookId: string) => {
    try {
      const qList = await mockApi.discussion.getQuestions(clubId, bookId);
      // 선정된 질문들만 필터링
      const selectedQs = qList.filter(q => q.status === 'selected');
      
      const qsWithComments = await Promise.all(selectedQs.map(async (q) => {
        const commentsList = await mockApi.discussion.getComments(q.id);
        return {
          ...q,
          comments: commentsList
        };
      }));
      setRecapQuestions(qsWithComments);
    } catch (err) {
      console.warn('[ClubHub] Recap 데이터 로드 실패:', err);
    }
  }, []);

  // 모임 데이터 로드 함수
  const loadClubData = useCallback(async (userId: string, clubId: string) => {
    try {
      const book = await mockApi.books.getByClub(clubId);
      setActiveBook(book);

      if (book) {
        // 멤버 목록 및 각 진행 현황 로드 (멤버 프로필 포함)
        const progresses = await mockApi.progress.getMemberProgressList(clubId, book.id);
        setMembers(progresses);

        // 현재 모임의 단계를 다시 조회하여 'archiving' 단계인지 확인 및 recap 데이터 로드
        const monthlyBook = await mockApi.clubs.getMonthlyBook(clubId);
        if (monthlyBook) {
          let uiStage = 'reading';
          if (monthlyBook.stage === 'question') uiStage = 'question_collecting';
          else if (monthlyBook.stage === 'discussion') uiStage = 'discussion';
          else if (monthlyBook.stage === 'recap') uiStage = 'archiving';
          
          if (uiStage === 'archiving') {
            await loadRecapData(clubId, book.id);
          }
        }
      }
    } catch (err) {
      console.error('모임 허브 데이터 로드 실패:', err);
    }
  }, [loadRecapData]);

  // 초기 로그인 상태 및 모임 체크
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const { data } = await mockApi.auth.getUser();
        if (!data?.user) {
          router.replace('/login');
          return;
        }
        setCurrentUser(data.user);

        const myClubs = await mockApi.clubs.getMyClubs(data.user.id);
        if (myClubs.length > 0) {
          const club = myClubs[0];
          setActiveClub(club);

          // 독서 흐름 및 타임라인 Supabase 연동 조회
          const monthlyBook = await mockApi.clubs.getMonthlyBook(club.id);
          let currentUiStage = 'reading';
          if (monthlyBook) {
            // DB stage -> UI stage mapping
            if (monthlyBook.stage === 'question') currentUiStage = 'question_collecting';
            else if (monthlyBook.stage === 'discussion') currentUiStage = 'discussion';
            else if (monthlyBook.stage === 'recap') currentUiStage = 'archiving';
            setStage(currentUiStage);

            // DB 타임라인 정보를 로컬스토리지 백업 (기존 파싱 구조 호환용)
            if (monthlyBook.timeline_reading) {
              const parts = monthlyBook.timeline_reading.split('~');
              if (parts.length === 2) {
                localStorage.setItem(`bookclub_start_date_${club.id}`, parts[0]);
                localStorage.setItem(`bookclub_end_date_${club.id}`, parts[1]);
              }
            }
            if (monthlyBook.timeline_question) {
              const parts = monthlyBook.timeline_question.split('~');
              if (parts.length === 2) {
                localStorage.setItem(`bookclub_q_start_date_${club.id}`, parts[0]);
                localStorage.setItem(`bookclub_q_end_date_${club.id}`, parts[1]);
              }
            }
            if (monthlyBook.timeline_discussion) {
              const parts = monthlyBook.timeline_discussion.split('~');
              if (parts.length === 2) {
                localStorage.setItem(`bookclub_t_start_date_${club.id}`, parts[0]);
                localStorage.setItem(`bookclub_t_end_date_${club.id}`, parts[1]);
              }
            }
            localStorage.setItem(`bookclub_mock_club_stage_${club.id}`, currentUiStage);
          }

          const localStart = localStorage.getItem(`bookclub_start_date_${club.id}`) || '2026-05-01';
          const localEnd = localStorage.getItem(`bookclub_end_date_${club.id}`) || '2026-05-31';
          const localQDays = Number(localStorage.getItem(`bookclub_q_days_${club.id}`) || '10');
          const localTDays = Number(localStorage.getItem(`bookclub_t_days_${club.id}`) || '5');
          const localIsAdvanced = localStorage.getItem(`bookclub_is_advanced_${club.id}`) === 'true';

          try {
            const start = new Date(localStart);
            const end = new Date(localEnd);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const formatDateStr = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

              if (localIsAdvanced) {
                const localQStart = localStorage.getItem(`bookclub_q_start_date_${club.id}`);
                const localQEnd = localStorage.getItem(`bookclub_q_end_date_${club.id}`);
                const localTStart = localStorage.getItem(`bookclub_t_start_date_${club.id}`);
                const localTEnd = localStorage.getItem(`bookclub_t_end_date_${club.id}`);

                const qs = localQStart ? new Date(localQStart) : null;
                const qe = localQEnd ? new Date(localQEnd) : null;
                const ts = localTStart ? new Date(localTStart) : null;
                const te = localTEnd ? new Date(localTEnd) : null;

                let rEndStr = '';
                if (qs && !isNaN(qs.getTime())) {
                  const rEnd = new Date(qs);
                  rEnd.setDate(qs.getDate() - 1);
                  rEndStr = formatDateStr(rEnd);
                }

                setTimeline({
                  reading: `${formatDateStr(start)}~${rEndStr || '?'}`,
                  question: `${qs && !isNaN(qs.getTime()) ? formatDateStr(qs) : '?'}~${qe && !isNaN(qe.getTime()) ? formatDateStr(qe) : '?'}`,
                  discussion: `${ts && !isNaN(ts.getTime()) ? formatDateStr(ts) : '?'}~${te && !isNaN(te.getTime()) ? formatDateStr(te) : '?'}`
                });
              } else {
                const tStart = new Date(end);
                tStart.setDate(end.getDate() - localTDays + 1);
                const qStart = new Date(end);
                qStart.setDate(end.getDate() - localQDays + 1);
                const qEnd = new Date(tStart);
                qEnd.setDate(tStart.getDate() - 1);
                const rEnd = new Date(qStart);
                rEnd.setDate(qStart.getDate() - 1);

                setTimeline({
                  reading: `${formatDateStr(start)}~${formatDateStr(rEnd)}`,
                  question: `${formatDateStr(qStart)}~${formatDateStr(qEnd)}`,
                  discussion: `${formatDateStr(tStart)}~${formatDateStr(end)}`
                });
              }
            }
          } catch (err) {
            console.warn('타임라인 연동 파싱 실패:', err);
          }

          // 먼저 기본 로드 후, 결산 상태이면 요약 데이터를 결합적으로 로드
          const book = await mockApi.books.getByClub(club.id);
          setActiveBook(book);

          if (book) {
            const progresses = await mockApi.progress.getMemberProgressList(club.id, book.id);
            setMembers(progresses);

            if (currentUiStage === 'archiving') {
              await loadRecapData(club.id, book.id);
            }
          }
        } else {
          setActiveClub(null);
        }
      } catch (err) {
        console.warn('모임 허브 로딩 오류:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [loadClubData, loadRecapData, router]);

  // 초대 코드로 모임 가입 핸들러
  const handleJoinClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!inviteCodeInput.trim()) {
      alert('초대 코드를 입력해 주세요.');
      return;
    }

    setIsActionLoading(true);
    try {
      const club = await mockApi.clubs.joinClubByCode(currentUser.id, inviteCodeInput.trim().toUpperCase());
      if (club) {
        alert(`[${club.title}] 모임에 성공적으로 가입되었습니다!`);
        setActiveClub(club);
        await loadClubData(currentUser.id, club.id);
      } else {
        alert('존재하지 않거나 올바르지 않은 초대 코드입니다.\n(테스트용 기본 코드: SAGE123)');
      }
    } catch (err) {
      console.warn(err);
      alert('모임 참가에 실패했습니다.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 초대 코드 클립보드 복사
  const handleCopyCode = () => {
    if (!activeClub) return;
    navigator.clipboard.writeText(activeClub.invite_code);
    alert(`초대 코드 [ ${activeClub.invite_code} ] 가 클립보드에 복사되었습니다! 친구를 초대해 보세요.`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sage-medium border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-sage-dark">모임방을 정리하고 있습니다...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      <main className="flex-1 flex flex-col gap-5 pb-20">
        
        {/* 헤더 타이틀 */}
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-black text-foreground">나의 독서 공간</h1>
            <p className="text-[10px] text-foreground/50 font-medium">차분한 독서의 흐름</p>
          </div>
          <div className="w-8 h-8 bg-sage-light/60 rounded-xl flex justify-center items-center">
            <Users className="text-sage-dark" size={16} />
          </div>
        </div>

        {/* 역할 시뮬레이터 배너 */}
        <div className="bg-sage-light/20 border border-sage-light/50 rounded-2xl p-3 flex items-center justify-between shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-bold text-sage-dark/80 uppercase tracking-widest">시뮬레이션 모드</span>
            <span className="text-xs font-extrabold text-foreground">
              현재 역할: {userRole === 'admin' ? '방장 (Admin)' : '모임원 (Member)'}
            </span>
          </div>
          <div className="flex bg-background/80 border border-card-border p-1 rounded-xl gap-1">
            <button
              onClick={() => setUserRole('admin')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                userRole === 'admin' 
                  ? 'bg-sage-medium text-white shadow-sm' 
                  : 'text-foreground/50 hover:bg-sage-light/30'
              }`}
            >
              방장
            </button>
            <button
              onClick={() => setUserRole('member')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                userRole === 'member' 
                  ? 'bg-sage-medium text-white shadow-sm' 
                  : 'text-foreground/50 hover:bg-sage-light/30'
              }`}
            >
              모임원
            </button>
          </div>
        </div>

        {!activeClub ? (
          /* Empty State: 참여한 모임이 없는 경우 */
          <div className="flex-grow flex flex-col justify-center items-center gap-6 my-auto">
            <div className="w-16 h-16 bg-sage-light/40 rounded-3xl flex justify-center items-center shadow-inner relative">
              <Compass size={28} className="text-sage-medium" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-warm-beige rounded-full animate-pulse" />
            </div>

            <div className="text-center flex flex-col gap-2">
              <h3 className="text-base font-extrabold text-foreground">참여 중인 모임이 없습니다</h3>
              <p className="text-xs text-foreground/50 leading-relaxed max-w-[280px]">
                함께 책을 나누어 읽고 사색을 남기는 독서모임입니다.<br />
                직접 모임을 개설하거나 초대 코드로 참가해보세요!
              </p>
            </div>

            <div className="w-full flex flex-col gap-5 mt-2">
              <form onSubmit={handleJoinClub} className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider text-center">초대코드로 모임 가입</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    placeholder="예: SAGE123"
                    className="flex-1 px-4 py-2.5 bg-background border border-card-border rounded-xl text-center text-xs font-bold tracking-widest uppercase focus:outline-none focus:border-sage-medium placeholder:tracking-normal placeholder:text-foreground/30"
                    maxLength={10}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="px-4 bg-sage-medium hover:bg-sage-dark disabled:bg-sage-light text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    참여
                  </button>
                </div>
              </form>

              <div className="flex items-center gap-3">
                <div className="h-px bg-card-border flex-1" />
                <span className="text-[10px] text-foreground/30 font-bold">또는</span>
                <div className="h-px bg-card-border flex-1" />
              </div>

              <button
                onClick={() => router.push('/create-club')}
                className="w-full py-3.5 bg-sage-dark hover:bg-sage-medium text-white rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all shadow-sm"
              >
                <Plus size={16} />
                새로운 모임 개설하기
              </button>
            </div>

            <div className="bg-sage-light/20 border border-sage-light rounded-xl p-4 text-[10px] text-sage-dark leading-relaxed font-medium mt-4">
              💡 <b>기본 가이드</b>: 테스트용 초대코드 <span className="font-bold underline">SAGE123</span>을 사용하시면, 미리 생성된 숲속의 북클럽에 바로 동참하여 정적 UI의 다양한 면모를 곧바로 확인하실 수 있습니다.
            </div>
          </div>
        ) : (
          /* Active State: 참여한 모임이 있는 경우 */
          activeClub && stage === 'archiving' ? (
            /* 결산 회고 단계 전용 독서 노트 뷰 */
            <div className="flex flex-col gap-4">
              
              {/* [1] 이번 달 함께 읽은 책 카드 (기록 표지) */}
              {activeBook && (
                <div className="bg-card-bg border border-card-border rounded-3xl p-5 flex gap-4.5 shadow-sm items-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sage-light/20 rounded-full translate-x-10 -translate-y-10 -z-10" />
                  {activeBook.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={activeBook.cover_url} 
                      alt={activeBook.title} 
                      className="w-16 h-22 rounded-xl object-cover shadow border border-card-border/60 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-22 rounded-xl bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border/70 flex flex-col justify-between py-3 px-1.5 shadow flex-shrink-0 text-center select-none relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-sage-dark/10" />
                      <span className="text-[10px] font-black text-sage-dark leading-tight line-clamp-2 w-full mt-1 px-1">
                        {activeBook.title}
                      </span>
                      <span className="text-[8px] font-extrabold text-sage-medium/95 truncate w-full px-1">
                        {activeBook.author || '지은이 미상'}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span className="text-[8px] font-black text-sage-dark bg-sage-light/75 px-2 py-0.5 rounded-md leading-none w-fit">
                      이번 달 독서 여정 마침 🌙
                    </span>
                    <h2 className="text-sm font-black text-foreground leading-tight truncate">
                      {activeBook.title}
                    </h2>
                    <p className="text-[10.5px] text-foreground/45 font-bold leading-none mt-0.5">
                      {activeBook.author} 저
                    </p>
                    <p className="text-[9.5px] text-foreground/35 font-semibold leading-none mt-1">
                      함께 읽은 동반자 {members.length}명
                    </p>
                  </div>
                </div>
              )}

              {/* [2] AI 에세이 요약 카드 Placeholder (미래 공간 확보) */}
              <div className="bg-sage-light/10 border border-sage-light/40 rounded-3xl p-5 shadow-inner flex flex-col gap-2.5 relative overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-sage-medium rounded-full animate-pulse" />
                  <span className="text-[9.5px] font-black text-sage-dark uppercase tracking-wider">생각의 숙성실</span>
                </div>
                <h3 className="text-xs font-black text-foreground">사색 에세이 큐레이션 준비 중</h3>
                <p className="text-[10px] text-foreground/50 leading-relaxed font-semibold">
                  우리 모임원들이 한 달간 정성껏 포개어 둔 생각의 조각들이 깊이 숙성되어 가고 있습니다. 조만간 한 편의 다정한 요약 에세이로 피어날 예정입니다. 조금만 기다려주세요. 🌙
                </p>
              </div>

              {/* [3] 이번 달 남겨진 질문들 & 사색 조각 (아코디언 회고 카드) */}
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-sage-medium rounded-full" />
                  <h3 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">나누었던 질문과 사색들</h3>
                </div>

                <div className="flex flex-col gap-3">
                  {recapQuestions.length === 0 ? (
                    <div className="bg-card-bg border border-card-border border-dashed rounded-2xl py-12 text-center text-xs text-foreground/30 font-medium">
                      이번 달에는 선정된 사색 질문이 없습니다.
                    </div>
                  ) : (
                    recapQuestions.map((q, idx) => {
                      const isOpen = openIndex === idx;
                      return (
                        <div 
                          key={q.id}
                          className="bg-card-bg border border-card-border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm"
                        >
                          {/* 질문 아코디언 헤더 */}
                          <div 
                            onClick={() => setOpenIndex(isOpen ? null : idx)}
                            className="p-4.5 flex justify-between items-start gap-3 cursor-pointer hover:bg-sage-light/10 transition-colors"
                          >
                            <div className="flex flex-col gap-1 flex-1">
                              <p className="text-xs font-extrabold text-foreground/85 leading-relaxed text-justify pr-1 whitespace-pre-wrap">
                                {q.content}
                              </p>
                              <span className="text-[9px] text-foreground/40 font-bold mt-0.5">
                                나눈 생각 조각 {q.comments?.length || 0}개
                              </span>
                            </div>
                            <div className="text-foreground/40 p-1 flex-shrink-0 mt-0.5">
                              {isOpen ? (
                                <ChevronUp size={16} className="text-sage-medium" />
                              ) : (
                                <ChevronDown size={16} className="text-sage-medium" />
                              )}
                            </div>
                          </div>

                          {/* 질문 아코디언 바디 (인용구 댓글 보관함) */}
                          {isOpen && (
                            <div className="border-t border-card-border bg-background/55 p-4.5 flex flex-col gap-3.5">
                              {!q.comments || q.comments.length === 0 ? (
                                <div className="text-center py-6 text-[10px] text-foreground/30 font-semibold">
                                  질문에 남겨진 생각이 없습니다.
                                </div>
                              ) : (
                                q.comments.map((comment: any) => {
                                  const avatarUrl = comment.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.user_id}`;
                                  return (
                                    <div 
                                      key={comment.id}
                                      className="flex flex-col gap-1.5 bg-card-bg border border-card-border/60 rounded-xl p-4 shadow-inner"
                                    >
                                      <div className="flex justify-between items-center text-[10px] text-foreground/45 font-bold">
                                        <div className="flex items-center gap-1.5">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img 
                                            src={avatarUrl} 
                                            alt={comment.profile?.username}
                                            className="w-4 h-4 rounded-full object-cover border border-card-border"
                                          />
                                          <span className="text-foreground/70">{comment.profile?.username} 님의 사색</span>
                                        </div>
                                        <span>{new Date(comment.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                                      </div>
                                      <p className="text-[11px] font-semibold text-foreground/70 leading-relaxed text-justify pl-1 border-l-2 border-sage-medium/35 whitespace-pre-wrap">
                                        &ldquo;{comment.content}&rdquo;
                                      </p>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* [4] 다음 책으로 이어지는 흐름 (감성 칩 카드) */}
              <div 
                onClick={() => router.push('/club/candidate')}
                className="bg-background border border-card-border/80 hover:border-sage-medium rounded-2xl p-4 text-center shadow-xs cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 flex flex-col gap-1 group mt-2"
              >
                <span className="text-[8px] font-bold text-sage-dark uppercase tracking-widest group-hover:text-sage-medium transition-colors">새로운 이야기의 씨앗</span>
                <p className="text-[11px] font-extrabold text-foreground/60 leading-relaxed group-hover:text-sage-dark transition-colors">
                  다음 달 함께 읽을 책의 씨앗이 후보방에서 조용히 자라나고 있습니다. 🌱
                </p>
                <span className="text-[9px] font-black text-sage-medium/80 underline decoration-dotted mt-1 self-center">
                  다음 후보방 구경하러 가기
                </span>
              </div>

              {/* 방장 관리자용 메뉴 활성화 (결산 회고 단계에서도 관리기능 유지) */}
              {userRole === 'admin' && (
                <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-card-border/40">
                  <span className="text-[10px] font-bold text-sage-dark uppercase tracking-wider">모임 관리 메뉴</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => router.push('/club/settings')}
                      className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-4 flex flex-col justify-between h-20 shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
                    >
                      <Settings size={15} className="text-foreground/50 group-hover:text-sage-dark" />
                      <h3 className="text-xs font-black text-foreground group-hover:text-sage-dark">모임 설정 관리</h3>
                    </div>
                    <div 
                      onClick={() => router.push('/group/archive')}
                      className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-4 flex flex-col justify-between h-20 shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
                    >
                      <History size={15} className="text-foreground/50 group-hover:text-sage-dark" />
                      <h3 className="text-xs font-black text-foreground group-hover:text-sage-dark">지난 아카이브</h3>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* 일반 독서/질문/토론 단계 일 때의 모임 허브 UI */
            <div className="flex flex-col gap-4">
              
              {/* 1. 모임 대문 정보 카드 */}
              <div className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sage-light/20 rounded-full translate-x-12 -translate-y-12 -z-10" />
                
                <span className="text-[9px] font-black text-sage-medium uppercase tracking-widest">현재 독서 공간</span>
                <h2 className="text-base font-black text-foreground">{activeClub.title}</h2>
                {activeClub.description ? (
                  <p className="text-[11px] text-foreground/50 leading-relaxed font-medium">{activeClub.description}</p>
                ) : (
                  <p className="text-[11px] text-foreground/40 leading-relaxed font-medium">따뜻하고 사색적인 독서 공간</p>
                )}
              </div>

              {/* 2. 현재 읽는 책 & 독서 단계 카드 (간략형) */}
              {activeBook && (
                <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-sage-light rounded-lg flex justify-center items-center text-sage-dark">
                        <BookOpen size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-foreground/40 uppercase">읽고 있는 책</span>
                        <span className="text-xs font-extrabold text-foreground leading-none mt-0.5">{activeBook.title}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-foreground/40 font-semibold">{activeBook.author}</span>
                  </div>

                  <div className="h-px bg-card-border" />

                  {/* 독서 흐름 4단계 수평 인디케이터 */}
                  <div className="flex justify-between items-center relative mt-2 px-1">
                    <div className="absolute top-[17px] left-7 right-7 border-t border-dashed border-card-border/90 z-0" />
                    <div 
                      className="absolute top-[17px] left-7 border-t border-dashed border-sage-medium transition-all duration-300 z-0"
                      style={{
                        width: 
                          stage === 'reading' ? '0%' :
                          stage === 'question_collecting' ? '33%' :
                          stage === 'discussion' ? '66%' : '100%'
                      }}
                    />

                    {[
                      { key: 'reading', label: '책 읽기', emoji: '📖', date: timeline.reading },
                      { key: 'question_collecting', label: '이야기 씨앗 고르기', emoji: '🌱', date: timeline.question },
                      { key: 'discussion', label: '생각 나누기', emoji: '💬', date: timeline.discussion },
                      { key: 'archiving', label: '결산 회고', emoji: '🌙', date: '독서 마무리' }
                    ].map((step, idx) => {
                      const currentIdx = ['reading', 'question_collecting', 'discussion', 'archiving'].indexOf(stage);
                      const isActive = step.key === stage;
                      const isCompleted = idx < currentIdx;

                      let statusBg = 'bg-card-bg border-card-border/70 text-foreground/30 opacity-40';
                      let displayContent = step.emoji;

                      if (isActive) {
                        statusBg = 'bg-sage-light border-sage-medium text-sage-dark scale-110 shadow-xs ring-4 ring-sage-light/50 font-black';
                      } else if (isCompleted) {
                        statusBg = 'bg-sage-medium/10 border-sage-medium/30 text-sage-medium';
                        displayContent = '✨';
                      }

                      return (
                        <div key={step.key} className="flex flex-col items-center gap-1.5 z-10 select-none flex-1">
                          <div className={`w-8.5 h-8.5 rounded-2xl border flex justify-center items-center text-sm transition-all duration-300 ${statusBg}`}>
                            {displayContent}
                          </div>
                          <div className="flex flex-col items-center text-center">
                            <span className={`text-[9px] font-bold transition-colors leading-tight ${
                              isActive ? 'text-sage-dark font-black' :
                              isCompleted ? 'text-sage-medium/80' : 'text-foreground/35'
                            }`}>
                              {step.label}
                            </span>
                            <span className="text-[7.5px] font-medium text-foreground/35 mt-0.5 tracking-tighter">
                              {step.date}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. 읽고 있는 사람들 아바타 리스트 */}
              {members.length > 0 && (
                <div className="bg-card-bg border border-card-border rounded-2xl p-4.5 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-sage-dark uppercase tracking-wider">
                      {members.length === 1 ? '홀로 채워가는 책장' : `책장을 넘기는 사람들 (${members.length}명)`}
                    </span>
                    <span className="text-[9px] text-foreground/40 font-medium">
                      {members.length === 1 ? '기록 저장 중' : '실시간 진행 공유 중'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                    {members.map((member) => {
                      const avatarUrl = member.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user_id}`;
                      const isMe = currentUser && member.user_id === currentUser.id;
                      return (
                        <div key={member.id} className="flex items-center gap-1.5 bg-background border border-card-border rounded-xl px-2.5 py-1.5 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={avatarUrl} 
                            alt={member.profile?.username || '멤버'} 
                            className="w-5.5 h-5.5 rounded-full object-cover border border-card-border"
                          />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-foreground leading-none">
                              {member.profile?.username} {isMe && '(나)'}
                            </span>
                            <span className="text-[8px] text-foreground/40 font-medium mt-0.5">
                              {member.status === 'completed' ? '완독!' : `${member.current_page}p`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {members.length === 1 && (
                    <div className="mt-1 bg-sage-light/20 border border-sage-light/45 rounded-xl p-3 text-[9px] text-sage-dark/85 leading-relaxed font-semibold">
                      💡 <b>안내</b>: 현재 방에 홀로 머무는 중입니다. 친구와 함께 읽고 싶다면 하단의 <b>초대코드</b>를 복사해 전해 보세요.
                    </div>
                  )}
                </div>
              )}

              {/* 4. 허브 메뉴 카드 격자 레이아웃 */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                
                <div 
                  onClick={() => router.push('/group/archive')}
                  className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-4 flex flex-col justify-between h-28 shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
                >
                  <div className="w-8 h-8 bg-sage-light/70 rounded-xl flex justify-center items-center text-sage-dark">
                    <History size={16} />
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-xs font-black text-foreground group-hover:text-sage-dark transition-colors">지난 이야기</h3>
                      <p className="text-[9px] text-foreground/40 font-medium">우리의 독서 기록물</p>
                    </div>
                    <ChevronRight size={14} className="text-foreground/35 group-hover:text-sage-dark" />
                  </div>
                </div>

                <div 
                  onClick={() => router.push('/club/candidate')}
                  className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-4 flex flex-col justify-between h-28 shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
                >
                  <div className="w-8 h-8 bg-warm-beige/25 rounded-xl flex justify-center items-center text-warm-beige">
                    <Sparkles size={15} />
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-xs font-black text-foreground group-hover:text-warm-beige transition-colors">다음 책 후보</h3>
                      <p className="text-[9px] text-foreground/40 font-medium">서재에서 건너온 다음 이야기</p>
                    </div>
                    <ChevronRight size={14} className="text-foreground/35 group-hover:text-warm-beige" />
                  </div>
                </div>

                <div 
                  onClick={handleCopyCode}
                  className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-4 flex flex-col justify-between h-28 shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
                >
                  <div className="w-8 h-8 bg-sage-light/70 rounded-xl flex justify-center items-center text-sage-dark">
                    <KeyRound size={15} />
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-xs font-black text-foreground group-hover:text-sage-dark transition-colors">초대코드</h3>
                      <p className="text-[9px] text-foreground/40 font-medium">{activeClub.invite_code} (클릭 복사)</p>
                    </div>
                    <Copy size={12} className="text-foreground/35 group-hover:text-sage-dark" />
                  </div>
                </div>

                {userRole === 'admin' && (
                  <div 
                    onClick={() => router.push('/club/settings')}
                    className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-4 flex flex-col justify-between h-28 shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
                  >
                    <div className="w-8 h-8 bg-foreground/5 rounded-xl flex justify-center items-center text-foreground/50 group-hover:bg-sage-light/60 group-hover:text-sage-dark transition-all">
                      <Settings size={15} />
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-0.5">
                        <h3 className="text-xs font-black text-foreground group-hover:text-sage-dark transition-colors">모임 설정</h3>
                        <p className="text-[9px] text-foreground/40 font-medium">관리자 메뉴</p>
                      </div>
                      <ChevronRight size={14} className="text-foreground/35 group-hover:text-sage-dark transition-colors" />
                    </div>
                  </div>
                )}

              </div>

            </div>
          )
        )}

      </main>

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => {}} />
    </div>
  );
}
