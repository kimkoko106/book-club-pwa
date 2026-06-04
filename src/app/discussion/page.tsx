'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi, DiscussionQuestion, isMockMode, supabase, getStageByDates } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import SpoilerWarningModal from '../../components/SpoilerWarningModal';
import { 
  MessageSquare, 
  Heart, 
  HelpCircle, 
  ChevronRight, 
  ArrowLeft, 
  Send, 
  X, 
  Sparkles, 
  Calendar,
  Layers,
  Info,
  Compass
} from 'lucide-react';

const KEY_FEEDBACKS = 'bookclub_mock_feedbacks';

function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch (e) {
    return '';
  }
}

export default function DiscussionPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [questions, setQuestions] = useState<DiscussionQuestion[]>([]);
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [activeClubId, setActiveClubId] = useState<string>('club-1');
  const [activeBookId, setActiveBookId] = useState<string>('book-1');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [reactionError, setReactionError] = useState('');
  const [isReactionLoading, setIsReactionLoading] = useState<Record<string, boolean>>({});
  const router = useRouter();

  // 1. 토론방 단계 상태 정의
  const [discussionStage, setDiscussionStage] = useState<'reading' | 'question_collecting' | 'discussion' | 'archiving'>('reading');
  const [showRecapGraceCard, setShowRecapGraceCard] = useState(false);
  const [prevRecapBook, setPrevRecapBook] = useState<any | null>(null);

  // 2. Bottom Sheet 관련 상태 정의
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [selectedQ, setSelectedQ] = useState<DiscussionQuestion | null>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [newFeedbackContent, setNewFeedbackContent] = useState('');
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editingFeedbackContent, setEditingFeedbackContent] = useState('');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showSpoilerModal, setShowSpoilerModal] = useState(false);

  // 질문 목록 로드 함수 (상태 업데이트용)
  const loadQuestions = useCallback(async (clubId = activeClubId, bookId = activeBookId) => {
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    
    if (!isMockMode && (!isValidUUID(clubId) || !isValidUUID(bookId))) {
      setQuestions([]);
      return;
    }

    try {
      const data = await mockApi.discussion.getQuestions(clubId, bookId);
      setQuestions(data);
    } catch (err) {
      console.warn('[Discussion] loadQuestions warning:', err);
    }
  }, [activeClubId, activeBookId]);

  // 1. 초기 사용자 세션 및 모임 정보 로드 (마운트 시 1회)
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
          setActiveClubId(club.id);

          // monthly_books 정보 조회하여 이야기방 초기 상태 동기화
          const monthlyBook = await mockApi.clubs.getMonthlyBook(club.id);
          if (monthlyBook) {
            const calculatedStage = getStageByDates(
              monthlyBook.timeline_reading,
              monthlyBook.timeline_question,
              monthlyBook.timeline_discussion
            );

            if (calculatedStage === 'archived_recap') {
              // 결산 유예 단계: 메인에는 새 공유책이 없는 상태로 처리
              setActiveBookId('');
              setDiscussionStage('reading');
            } else {
              // 진행 중인 도서 존재
              setActiveBookId(monthlyBook.book_id);
              setDiscussionStage(calculatedStage);
            }
          } else {
            setActiveBookId('');
            setDiscussionStage('reading');
          }

          // 2. 지난달 독서 결산 잔상 카드 노출 여부 판별 (7일간)
          try {
            const archives = await mockApi.discussion.getArchiveList(club.id);
            if (archives.length > 0) {
              const latestArchive = archives[0];
              const archiveDetail = await mockApi.discussion.getArchiveDetail(latestArchive.id);
              if (archiveDetail && archiveDetail.timeline_reading) {
                const parts = archiveDetail.timeline_reading.split('~');
                if (parts.length === 2) {
                  const readEnd = parts[1];
                  const parseMMDD = (mmdd: string): Date | null => {
                    const pts = mmdd.trim().split('.');
                    if (pts.length !== 2) return null;
                    const month = parseInt(pts[0], 10);
                    const day = parseInt(pts[1], 10);
                    if (isNaN(month) || isNaN(day)) return null;
                    const date = new Date(new Date().getFullYear(), month - 1, day);
                    date.setHours(0, 0, 0, 0);
                    return date;
                  };

                  const readEndDate = parseMMDD(readEnd);
                  if (readEndDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const graceStart = new Date(readEndDate);
                    graceStart.setDate(graceStart.getDate() + 1);
                    const graceEnd = new Date(readEndDate);
                    graceEnd.setDate(graceEnd.getDate() + 7);

                    if (today >= graceStart && today <= graceEnd) {
                      setShowRecapGraceCard(true);
                      setPrevRecapBook(latestArchive);
                    } else {
                      setShowRecapGraceCard(false);
                      setPrevRecapBook(null);
                    }
                  }
                }
              }
            } else {
              if (monthlyBook) {
                const tempStage = getStageByDates(
                  monthlyBook.timeline_reading,
                  monthlyBook.timeline_question,
                  monthlyBook.timeline_discussion
                );
                if (tempStage === 'archived_recap') {
                  setShowRecapGraceCard(true);
                  setPrevRecapBook(monthlyBook);
                } else {
                  setShowRecapGraceCard(false);
                  setPrevRecapBook(null);
                }
              } else {
                setShowRecapGraceCard(false);
                setPrevRecapBook(null);
              }
            }
          } catch (archiveErr) {
            console.warn('[Discussion] load archive info error:', archiveErr);
            setShowRecapGraceCard(false);
            setPrevRecapBook(null);
          }
        }
      } catch (err) {
        console.warn('[Discussion] init error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [router]);

  // 2. 모임/책 ID가 변경되거나 사용자가 확인되면 질문 목록 자동 로드 (UUID 검증 포함)
  useEffect(() => {
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    
    if (!isMockMode && (!isValidUUID(activeClubId) || !isValidUUID(activeBookId))) {
      setQuestions([]);
      return;
    }
    
    if (currentUser) {
      loadQuestions(activeClubId, activeBookId);
    }
  }, [activeClubId, activeBookId, currentUser, loadQuestions]);

  // 3. 책 ID가 정해졌을 때 스포일러 모달 노출 여부 체크
  useEffect(() => {
    if (activeBookId) {
      const dismissed = sessionStorage.getItem(`spoil_warn_dismissed_${activeBookId}`);
      if (dismissed !== 'true') {
        setShowSpoilerModal(true);
      } else {
        setShowSpoilerModal(false);
      }
    }
  }, [activeBookId]);

  const handleConfirmSpoiler = (dontShowAgain: boolean) => {
    if (activeBookId && dontShowAgain) {
      sessionStorage.setItem(`spoil_warn_dismissed_${activeBookId}`, 'true');
    }
    setShowSpoilerModal(false);
  };

  const handleCancelSpoiler = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // 질문 피드백 열기 핸들러
  const handleOpenFeedback = async (q: DiscussionQuestion, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedQ(q);
    setIsFeedbackOpen(true);
    setIsFeedbackLoading(true);
    setFeedbackError('');
    setEditingFeedbackId(null);
    try {
      const list = await mockApi.discussion.getFeedbacks(q.id);
      setFeedbackList(list);
    } catch (err) {
      console.error(err);
      setFeedbackError('의견 목록을 불러오지 못했어요.');
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  // 피드백 등록 핸들러
  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedQ) return;

    const content = newFeedbackContent.trim();
    if (!content) {
      setFeedbackError('의견 내용을 입력해주세요.');
      return;
    }

    if (content.length > 100) {
      setFeedbackError('의견은 최대 100자까지 입력 가능합니다.');
      return;
    }

    setIsFeedbackSubmitting(true);
    setFeedbackError('');

    try {
      const newFb = await mockApi.discussion.createFeedback(
        currentUser.id,
        selectedQ.id,
        content
      );
      setNewFeedbackContent('');
      setFeedbackList(prev => [...prev, newFb]); // 리스트에 새 피드백 추가
      
      // 질문 카드 내 의견 갯수 동기화
      setQuestions(prev => prev.map(q => {
        if (q.id === selectedQ.id) {
          return {
            ...q,
            comments_count: (q.comments_count || 0) + 1
          };
        }
        return q;
      }));
    } catch (err) {
      console.error(err);
      setFeedbackError('의견을 저장하지 못했어요.');
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  // 피드백 수정 핸들러
  const startEditFeedback = (feedbackId: string, currentContent: string) => {
    setEditingFeedbackId(feedbackId);
    setEditingFeedbackContent(currentContent);
  };

  const cancelEditFeedback = () => {
    setEditingFeedbackId(null);
    setEditingFeedbackContent('');
  };

  const handleUpdateFeedback = async (feedbackId: string) => {
    const content = editingFeedbackContent.trim();
    if (!content) {
      setFeedbackError('의견 내용을 입력해주세요.');
      return;
    }

    setIsFeedbackSubmitting(true);
    setFeedbackError('');

    try {
      await mockApi.discussion.updateFeedback(feedbackId, content);
      setFeedbackList(prev =>
        prev.map(f => (f.id === feedbackId ? { ...f, content } : f))
      );
      setEditingFeedbackId(null);
      setEditingFeedbackContent('');
    } catch (err) {
      console.error(err);
      setFeedbackError('의견을 수정하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  // 피드백 삭제 핸들러
  const handleDeleteFeedback = async (feedbackId: string) => {
    const confirmDelete = confirm('의견을 삭제할까요?');
    if (!confirmDelete) return;

    setIsFeedbackSubmitting(true);
    setFeedbackError('');

    try {
      await mockApi.discussion.deleteFeedback(feedbackId);
      setFeedbackList(prev => prev.filter(f => f.id !== feedbackId));
      
      // 질문 카드 내 의견 갯수 감산 동기화
      if (selectedQ) {
        setQuestions(prev => prev.map(q => {
          if (q.id === selectedQ.id) {
            return {
              ...q,
              comments_count: Math.max(0, (q.comments_count || 1) - 1)
            };
          }
          return q;
        }));
      }
    } catch (err) {
      console.error(err);
      setFeedbackError('의견을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  // 질문 제안 등록 핸들러
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const content = newQuestionContent.trim();
    if (!content) {
      setQuestionError('질문 내용을 입력해주세요.');
      return;
    }

    if (content.length > 150) {
      setQuestionError('질문은 최대 150자까지 입력 가능합니다.');
      return;
    }

    setIsSubmitting(true);
    setQuestionError('');
    try {
      const newQ = await mockApi.discussion.createQuestion(
        currentUser.id,
        activeClubId,
        activeBookId,
        content
      );
      setNewQuestionContent('');
      // 질문 목록에 새로 추가된 질문을 앞에 추가하여 전체 리로드 없이 즉시 업데이트
      setQuestions(prev => [newQ, ...prev]);
    } catch (err) {
      console.error(err);
      setQuestionError('질문을 저장하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 반응(리액션) 클릭 핸들러
  const handleReaction = async (questionId: string, type: 'curious' | 'talk', e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReactionLoading[questionId]) return;

    setIsReactionLoading(prev => ({ ...prev, [questionId]: true }));
    setReactionError('');

    try {
      const updated = await mockApi.discussion.addReaction(questionId, type);
      if (updated) {
        setQuestions(prev => 
          prev.map(q => q.id === questionId 
            ? { 
                ...q, 
                reaction_curious_count: updated.reaction_curious_count, 
                reaction_talk_count: updated.reaction_talk_count 
              } 
            : q
          )
        );
      }
    } catch (err) {
      console.error(err);
      setReactionError('반응을 남기지 못했어요.');
    } finally {
      setIsReactionLoading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sage-medium border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-sage-dark">토론방의 불을 밝히고 있습니다...</span>
        </div>
      </div>
    );
  }

  // 질문 카테고리 분리
  const selectedQuestions = questions.filter(q => q.status === 'selected');
  const suggestedQuestions = questions.filter(q => q.status === 'suggested');

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background relative">
      <main className="flex-1 flex flex-col gap-6">
        {activeBookId ? (
          <>
            {/* 🗺️ 상단 진행바 UI */}
            <div className="bg-card-bg border border-card-border rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex justify-between items-center text-[9.5px] font-black text-foreground/40 pb-1.5 border-b border-card-border/40 uppercase tracking-wider">
                <span>함께 책 읽는 여정 🗺️</span>
                <span className="text-sage-dark font-black tracking-normal">
                  {discussionStage === 'reading' && '천천히 책 속으로 들어가는 시간 🌲'}
                  {discussionStage === 'question_collecting' && '함께 이야기할 질문을 조용히 골라봅니다. 🌱'}
                  {discussionStage === 'discussion' && '생각을 나누는 시간 💬'}
                  {discussionStage === 'archiving' && '이번 독서를 마음에 남기는 시간 ✨'}
                </span>
              </div>

              <div className="flex items-center justify-between relative mt-2 px-1">
                {/* 연결 선 (다이어리 감성 점선) */}
                <div className="absolute top-[17px] left-7 right-7 border-t border-dashed border-card-border/90 z-0" />
                <div 
                  className="absolute top-[17px] left-7 border-t border-dashed border-sage-medium transition-all duration-300 z-0"
                  style={{
                    width: 
                      discussionStage === 'reading' ? '0%' :
                      discussionStage === 'question_collecting' ? '33%' :
                      discussionStage === 'discussion' ? '66%' : '100%'
                  }}
                />

                {[
                  { key: 'reading', label: '책 읽기', emoji: '📖', index: 0 },
                  { key: 'question_collecting', label: '토론 주제 선정', emoji: '🗳️', index: 1 },
                  { key: 'discussion', label: '토론 진행', emoji: '💬', index: 2 },
                  { key: 'archiving', label: '결산 회고', emoji: '🌙', index: 3 }
                ].map((step, idx) => {
                  const currentIdx = ['reading', 'question_collecting', 'discussion', 'archiving'].indexOf(discussionStage);
                  const isActive = step.key === discussionStage;
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
                    <div key={step.key} className="flex flex-col items-center gap-2 z-10 select-none">
                      <div className={`w-8.5 h-8.5 rounded-2xl border flex justify-center items-center text-sm transition-all duration-300 ${statusBg}`}>
                        {displayContent}
                      </div>
                      <span className={`text-[9px] font-bold transition-colors ${
                        isActive ? 'text-sage-dark font-black' :
                        isCompleted ? 'text-sage-medium/80' : 'text-foreground/35'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 1단계: 읽기 단계 화면 */}
            {discussionStage === 'reading' && (
              <div className="flex flex-col gap-4">
                {/* 이번 달 읽는 분위기 / 읽기 가이드 카드 */}
                <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-xs flex flex-col gap-3">
                  <h3 className="text-xs font-black text-sage-dark uppercase tracking-wider">이번 달 읽는 분위기 🌲</h3>
                  <div className="bg-sage-light/10 border border-card-border/55 rounded-xl p-4 flex flex-col gap-2.5">
                    <p className="text-[11.5px] font-semibold text-foreground/75 leading-relaxed italic text-center">
                      “천천히 읽으며 마음에 남는 문장을 발견해보세요.”
                    </p>
                    <p className="text-[11.5px] font-semibold text-foreground/75 leading-relaxed italic text-center">
                      “질문은 아직 완성되지 않아도 괜찮아요.”
                    </p>
                  </div>
                  <p className="text-[9.5px] text-foreground/45 leading-relaxed text-justify mt-1">
                    📖 지금은 책의 첫 장을 넘기고 문장에 깊이 몰입하는 조용한 시간입니다. 다른 이들의 진척률을 확인하며 나만의 속도로 독서의 깊이를 채워가세요. 개인의 메모와 생각은 타인에게 공개되지 않으니 부담 없이 오롯이 나만의 독서에 집중하세요.
                  </p>
                </div>
              </div>
            )}

            {/* 2단계: 대표 질문 선정 단계 화면 (question_collecting) */}
            {discussionStage === 'question_collecting' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-3.5 bg-sage-medium rounded-full" />
                    <h2 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">이번 달 선정 사색 질문</h2>
                  </div>
                  <div 
                    onClick={() => setIsPreviewOpen(true)}
                    className="bg-gradient-to-r from-sage-medium to-sage-dark text-white rounded-2xl p-5 shadow-sm cursor-pointer hover:from-sage-dark hover:to-sage-dark transition-all flex justify-between items-center group"
                  >
                    <div className="flex flex-col gap-1">
                      <h4 className="text-xs font-extrabold flex items-center gap-1.5">
                        <Sparkles size={13} className="animate-pulse" />
                        이번 달 선정 질문 {selectedQuestions.length}개 확정
                      </h4>
                      <p className="text-[10px] text-white/70">토론 시작 전, 미리 선정된 질문들을 확인해 보세요.</p>
                    </div>
                    <span className="text-[10px] font-bold bg-white/20 px-3 py-1.5 rounded-xl group-hover:bg-white/35 transition-all flex items-center gap-1">
                      미리보기
                      <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3단계: 토론 진행 단계 화면 (discussion) */}
            {discussionStage === 'discussion' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-sage-medium rounded-full" />
                  <h2 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">이번 달 선정 사색 질문</h2>
                </div>
                {reactionError && (
                  <div className="text-[10px] text-red-500 font-semibold px-1">
                    {reactionError}
                  </div>
                )}
                {selectedQuestions.length === 0 ? (
                  <div className="bg-card-bg border border-card-border border-dashed rounded-2xl py-8 text-center text-xs text-foreground/40 font-medium">
                    선정된 질문이 아직 없습니다.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {selectedQuestions.map(q => (
                      <div
                        key={q.id}
                        onClick={() => router.push(`/discussion/${q.id}?stage=${discussionStage}`)}
                        className="bg-sage-light/25 border border-sage-light hover:border-sage-medium rounded-2xl p-5 shadow-sm cursor-pointer transition-all duration-200 flex flex-col gap-3.5 group relative"
                      >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-sage-medium" />
                        <p className="text-sm font-bold text-foreground leading-snug group-hover:text-sage-dark transition-colors pl-1">
                          {q.content}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-foreground/50 font-medium pl-1">
                          <span className="font-bold text-sage-dark">{q.profile?.username} 님의 질문</span>
                          <span className="flex items-center gap-0.5">대화 댓글 {q.comments_count}개 <ChevronRight size={12} /></span>
                        </div>
                        <div className="flex gap-2.5 pt-2.5 border-t border-sage-light/50 pl-1">
                          <button
                            onClick={(e) => handleReaction(q.id, 'curious', e)}
                            disabled={isReactionLoading[q.id]}
                            className="px-3 py-1.5 bg-card-bg hover:bg-sage-light/30 border border-card-border/60 rounded-xl flex items-center gap-1.5 transition-all text-[10px] font-bold text-foreground/60 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
                          >
                            <HelpCircle size={12} className="text-sage-medium" />
                            <span>나도 궁금해요 {q.reaction_curious_count}</span>
                          </button>
                          <button
                            onClick={(e) => handleReaction(q.id, 'talk', e)}
                            disabled={isReactionLoading[q.id]}
                            className="px-3 py-1.5 bg-card-bg hover:bg-sage-light/30 border border-card-border/60 rounded-xl flex items-center gap-1.5 transition-all text-[10px] font-bold text-foreground/60 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
                          >
                            <Heart size={12} className="text-warm-beige" />
                            <span>이야기하고 싶어요 {q.reaction_talk_count}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* [공용] 질문 제안하기 및 질문 제안함 (1~3단계 전체 노출, 결산 제외) */}
            {discussionStage !== 'archiving' && (
              <div className="flex flex-col gap-5 mt-2">
                <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                  <h3 className="text-xs font-extrabold text-sage-dark uppercase tracking-wider">궁금한 질문 제안하기</h3>
                  <form onSubmit={handleCreateQuestion} className="flex gap-2">
                    <input
                      type="text"
                      value={newQuestionContent}
                      onChange={(e) => setNewQuestionContent(e.target.value)}
                      placeholder="책을 읽으며 든 질문을 가볍게 제안해 보세요..."
                      className="flex-1 px-4 py-2.5 bg-background border border-card-border rounded-xl text-xs focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30 text-foreground disabled:opacity-60"
                      maxLength={150}
                      disabled={isSubmitting}
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 bg-sage-medium hover:bg-sage-dark text-white rounded-xl flex justify-center items-center transition-colors shadow-sm disabled:opacity-60"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                  {questionError && (
                    <div className="text-[10px] text-red-500 font-semibold mt-1">
                      {questionError}
                    </div>
                  )}
                </div>

                {/* 질문 제안함 */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-3.5 bg-warm-beige rounded-full" />
                    <h2 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">질문 제안함 (피드백 중)</h2>
                  </div>
                  {reactionError && (
                    <div className="text-[10px] text-red-500 font-semibold px-1">
                      {reactionError}
                    </div>
                  )}
                  {suggestedQuestions.length === 0 ? (
                    <div className="bg-card-bg border border-card-border border-dashed rounded-2xl py-6 text-center text-xs text-foreground/40 font-medium">
                      제안된 질문이 없습니다. 첫 질문을 올려보세요!
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {suggestedQuestions.map(q => {
                        const count = q.comments_count || 0;
                        const isLoadingReaction = isReactionLoading[q.id];
                        return (
                          <div
                            key={q.id}
                            onClick={(e) => handleOpenFeedback(q, e)}
                            className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-5 shadow-sm cursor-pointer transition-all duration-200 flex flex-col gap-3 group"
                          >
                            <p className="text-xs font-bold text-foreground/85 leading-snug group-hover:text-sage-dark transition-colors">
                              {q.content}
                            </p>
                            <div className="flex justify-between items-center text-[10px] text-foreground/45 font-medium">
                              <span>{q.profile?.username} 님의 제안</span>
                              <span className="flex items-center gap-0.5 bg-sage-light/40 px-2 py-0.5 rounded text-sage-dark font-extrabold transition-all group-hover:bg-sage-medium group-hover:text-white">
                                질문 다듬기 의견 {count}개 <ChevronRight size={11} />
                              </span>
                            </div>
                            <div className="flex gap-2.5 pt-2 border-t border-card-border/40">
                              <button
                                onClick={(e) => handleReaction(q.id, 'curious', e)}
                                disabled={isLoadingReaction}
                                className="px-3 py-1.5 bg-background hover:bg-sage-light/20 border border-card-border/60 rounded-xl flex items-center gap-1.5 transition-all text-[10px] font-bold text-foreground/60 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
                              >
                                <HelpCircle size={12} className="text-sage-medium/70" />
                                <span>나도 궁금해요 {q.reaction_curious_count}</span>
                              </button>
                              <button
                                onClick={(e) => handleReaction(q.id, 'talk', e)}
                                disabled={isLoadingReaction}
                                className="px-3 py-1.5 bg-background hover:bg-sage-light/20 border border-card-border/60 rounded-xl flex items-center gap-1.5 transition-all text-[10px] font-bold text-foreground/60 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
                              >
                                <Heart size={12} className="text-warm-beige/80" />
                                <span>이야기하고 싶어요 {q.reaction_talk_count}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4단계: 결산 단계 화면 (archiving) */}
            {discussionStage === 'archiving' && (
              <div className="flex flex-col gap-4">
                {/* 감성적인 종료 카드 */}
                <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-xs flex flex-col gap-4 relative overflow-hidden text-center">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sage-light/10 rounded-full translate-x-8 -translate-y-8" />
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">여정의 맺음</span>
                    <h3 className="text-xs font-black text-foreground mt-0.5">『월든』 독서가 마무리되었어요 🌙</h3>
                  </div>
                  <p className="text-[10px] text-foreground/50 font-medium max-w-[280px] mx-auto leading-relaxed">
                    모두가 숲으로 들어가 삶의 깊은 의미를 함께 성찰했던 소중한 여정이 차분히 매듭을 지었습니다. 나눴던 사색 문장들과 대화들을 고요하게 회고해 봅니다.
                  </p>
                </div>

                {/* 이번 달 토론 기록 통계 보드 */}
                <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-xs flex flex-col gap-3">
                  <h3 className="text-xs font-black text-sage-dark uppercase tracking-wider text-left">이번 달 토론의 흔적들</h3>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    {[
                      { label: '선정 사색 질문', value: `${selectedQuestions.length}개` },
                      { label: '작성된 댓글', value: `${selectedQuestions.reduce((acc, q) => acc + q.comments_count, 0) + 12}개` },
                      { label: '공감 및 반응', value: `${selectedQuestions.reduce((acc, q) => acc + (q.reaction_curious_count || 0) + (q.reaction_talk_count || 0), 0) + 38}회` },
                      { label: '함께한 멤버', value: '4명' }
                    ].map((stat, idx) => (
                      <div key={idx} className="bg-sage-light/5 border border-card-border/55 rounded-xl p-3 flex flex-col gap-1 text-center">
                        <span className="text-[8.5px] font-extrabold text-foreground/45">{stat.label}</span>
                        <span className="text-xs font-black text-sage-dark">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 다음 달 책 보러가기 CTA 카드 */}
                <div 
                  onClick={() => router.push('/club/candidate')}
                  className="bg-sage-medium hover:bg-sage-dark text-white rounded-2xl p-5 shadow-sm cursor-pointer transition-all flex justify-between items-center group text-left"
                >
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-xs font-black flex items-center gap-1.5 text-white">
                      다음 달 함께 읽을 책 보러가기
                    </h4>
                    <p className="text-[8.5px] text-white/70 font-semibold">새롭게 꾸려질 다음 달의 생각 후보방으로 여행해 보세요.</p>
                  </div>
                  <span className="text-[9px] font-black bg-white/20 px-2.5 py-1 rounded-lg group-hover:bg-white/35 transition-all flex items-center gap-0.5 text-white">
                    이동
                    <ChevronRight size={10} />
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* 새 공유책이 없는 경우 예외 상태 노출 */
          <div className="bg-card-bg border border-card-border border-dashed rounded-2xl p-6.5 text-center flex flex-col items-center gap-3.5 shadow-sm my-8">
            <div className="w-12 h-12 bg-sage-light/40 rounded-2xl flex justify-center items-center text-sage-dark shadow-inner">
              <Compass size={20} />
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
        )}

        {/* 결산 유예 기간 grace card (독서 종료 후 7일 이내 노출 - 최하단 보조 노출) */}
        {showRecapGraceCard && prevRecapBook && (
          <div 
            onClick={() => router.push(`/group/archive/${prevRecapBook.id}`)}
            className="bg-gradient-to-r from-sage-medium/90 to-sage-dark text-white rounded-2xl p-4.5 shadow-sm cursor-pointer hover:from-sage-dark hover:to-sage-dark transition-all flex justify-between items-center group animate-fade-in mt-1"
          >
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-[8px] font-black text-white/70 uppercase tracking-widest leading-none">지난 여정의 열매 🌙</span>
              <h4 className="text-xs font-black flex items-center gap-1.5 text-white mt-1">
                지난 달 독서 결산 보기
              </h4>
              <p className="text-[9.5px] text-white/70 font-semibold leading-none mt-1.5">이전 달에 나눴던 아름다운 사색 조각과 회고록이 도착했어요.</p>
            </div>
            <span className="text-[9px] font-black bg-white/20 px-2.5 py-1 rounded-lg group-hover:bg-white/35 transition-all flex items-center gap-0.5 text-white flex-shrink-0">
              열기
              <ChevronRight size={10} />
            </span>
          </div>
        )}
      </main>

      {/* 📥 1. 질문 피드백 다듬기 Bottom Sheet */}
      {isFeedbackOpen && selectedQ && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          {/* 바깥 클릭 영역 닫기 */}
          <div className="absolute inset-0" onClick={() => setIsFeedbackOpen(false)} />
          
          <div className="relative w-full max-w-[480px] bg-card-bg border-t border-card-border rounded-t-3xl p-6 shadow-2xl flex flex-col gap-4 animate-slide-up z-50">
            {/* 드래그 핸들 데코레이션 */}
            <div className="w-12 h-1 bg-card-border/80 rounded-full mx-auto -mt-1" />

            <div className="flex justify-between items-start mt-2">
              <div className="flex flex-col gap-0.5 pr-6">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">질문 다듬기 메모</span>
                <p className="text-xs font-black text-foreground leading-snug">
                  &ldquo;{selectedQ.content}&rdquo;
                </p>
              </div>
              <button 
                onClick={() => setIsFeedbackOpen(false)}
                className="p-1 text-foreground/40 hover:text-foreground/80"
              >
                <X size={18} />
              </button>
            </div>

            <div className="h-px bg-card-border/70" />

            {/* 피드백 리스트 */}
            <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              <span className="text-[9px] font-extrabold text-foreground/40">질문 보완 메모 ({feedbackList.length})</span>
              {isFeedbackLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-6 h-6 border-2 border-sage-medium border-t-transparent rounded-full animate-spin" />
                </div>
              ) : feedbackList.length === 0 ? (
                <p className="text-[11px] text-center text-foreground/30 py-6">첫 의견을 남겨 질문을 한층 더 다듬어주세요.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {feedbackList.map((feedback) => (
                    <div key={feedback.id} className="bg-background border border-card-border rounded-xl p-3 flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        {/* 프로필 정보 */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-sage-light/20 flex-shrink-0 flex items-center justify-center">
                            {feedback.profile?.avatar_url ? (
                              <img src={feedback.profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-[8px] font-black text-sage-dark">
                                {feedback.profile?.username?.substring(0, 1) || '독'}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-foreground/80">{feedback.profile?.username || '독서가'}</span>
                            <span className="text-[7.5px] text-foreground/45">{formatRelativeTime(feedback.created_at)}</span>
                          </div>
                        </div>

                        {/* 본인일 때 수정/삭제 액션 */}
                        {feedback.user_id === currentUser?.id && editingFeedbackId !== feedback.id && (
                          <div className="flex gap-2 text-[8.5px] text-foreground/35 font-bold">
                            <button
                              onClick={() => startEditFeedback(feedback.id, feedback.content)}
                              disabled={isFeedbackSubmitting}
                              className="hover:text-sage-dark transition-colors disabled:opacity-50"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteFeedback(feedback.id)}
                              disabled={isFeedbackSubmitting}
                              className="hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 수정 폼 또는 텍스트 본문 */}
                      {editingFeedbackId === feedback.id ? (
                        <div className="flex flex-col gap-2 w-full mt-1">
                          <textarea
                            value={editingFeedbackContent}
                            onChange={(e) => setEditingFeedbackContent(e.target.value)}
                            className="w-full p-2 bg-background border border-sage-medium rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-sage-medium text-foreground disabled:opacity-60"
                            maxLength={100}
                            rows={2}
                            disabled={isFeedbackSubmitting}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={cancelEditFeedback}
                              disabled={isFeedbackSubmitting}
                              className="px-2 py-1 text-[9px] bg-foreground/5 hover:bg-foreground/10 text-foreground/75 rounded-md font-bold transition-all disabled:opacity-50"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateFeedback(feedback.id)}
                              disabled={isFeedbackSubmitting}
                              className="px-2 py-1 text-[9px] bg-sage-medium hover:bg-sage-dark text-white rounded-md font-bold transition-all disabled:opacity-50"
                            >
                              수정완료
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] font-semibold text-foreground/75 leading-relaxed text-justify mt-0.5">
                          {feedback.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 에러 피드백 노출 */}
            {feedbackError && (
              <p className="text-[9.5px] text-red-500 font-semibold px-1">
                {feedbackError}
              </p>
            )}

            {/* 피드백 제출 폼 */}
            <form onSubmit={handleAddFeedback} className="flex gap-2 pt-2 border-t border-card-border/50">
              <input
                type="text"
                value={newFeedbackContent}
                onChange={(e) => setNewFeedbackContent(e.target.value)}
                placeholder="질문을 어떻게 보완하면 대화가 더 풍성해질까요?"
                className="flex-1 px-3.5 py-2.5 bg-background border border-card-border rounded-xl text-[11px] font-semibold focus:outline-none focus:border-sage-medium placeholder:text-foreground/30 text-foreground disabled:opacity-60"
                maxLength={100}
                disabled={isFeedbackSubmitting}
                required
              />
              <button
                type="submit"
                disabled={isFeedbackSubmitting}
                className="px-4.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl flex justify-center items-center shadow-sm transition-colors disabled:opacity-60"
              >
                <Send size={13} />
              </button>
            </form>
            
            <p className="text-[8px] text-foreground/45 text-center leading-normal">
              * 이곳의 메모는 사색 개선 전용이며, 생각 나누기가 활성화되면 댓글로 보존되지 않습니다.
            </p>
          </div>
        </div>
      )}

      {/* 📥 2. 이번 달 선정 질문 미리보기 Bottom Sheet */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="absolute inset-0" onClick={() => setIsPreviewOpen(false)} />
          
          <div className="relative w-full max-w-[480px] bg-card-bg border-t border-card-border rounded-t-3xl p-6 shadow-2xl flex flex-col gap-4 animate-slide-up z-50">
            <div className="w-12 h-1 bg-card-border/80 rounded-full mx-auto -mt-1" />

            <div className="flex justify-between items-center mt-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">이번 달의 생각 준비실</span>
                <h3 className="text-sm font-black text-foreground">선정된 사색 질문 목록</h3>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 text-foreground/40 hover:text-foreground/80"
              >
                <X size={18} />
              </button>
            </div>

            <div className="h-px bg-card-border/70" />

            {/* 선정 리스트 */}
            <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1">
              {selectedQuestions.map((q, idx) => (
                <div key={q.id} className="bg-sage-light/10 border border-sage-light/60 rounded-2xl p-4.5 flex flex-col gap-2 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-sage-dark bg-sage-light px-2 py-0.5 rounded">질문 {idx + 1}</span>
                    <span className="text-[9px] font-extrabold text-warm-beige bg-warm-beige/10 border border-warm-beige/25 px-2 py-0.5 rounded animate-pulse">
                      생각 정리중
                    </span>
                  </div>
                  <p className="text-[11px] font-extrabold text-foreground leading-relaxed">
                    {q.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-background border border-card-border rounded-2xl p-4 text-center mt-1.5">
              <p className="text-[11px] font-extrabold text-sage-dark flex justify-center items-center gap-1">
                <Calendar size={13} />
                생각 나누기는 토론 기간이 시작되면 활성화됩니다.
              </p>
              <p className="text-[9px] text-foreground/45 mt-1 leading-snug">
                지금은 질문을 정제하고 생각을 채워가는 고요한 시간입니다.<br />
                활성화 시각이 되면 사색 기록을 남길 수 있는 댓글 기능이 열립니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 스포일러 방지 Overlay 모달 */}
      <SpoilerWarningModal 
        isOpen={showSpoilerModal} 
        onConfirm={handleConfirmSpoiler} 
        onCancel={handleCancelSpoiler} 
      />

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => {}} />
    </div>
  );
}
