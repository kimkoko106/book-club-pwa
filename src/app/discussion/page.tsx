'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi, DiscussionQuestion, isMockMode, supabase } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
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
  Info
} from 'lucide-react';

const KEY_FEEDBACKS = 'bookclub_mock_feedbacks';

export default function DiscussionPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [questions, setQuestions] = useState<DiscussionQuestion[]>([]);
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [activeClubId, setActiveClubId] = useState<string>('club-1');
  const [activeBookId, setActiveBookId] = useState<string>('book-1');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 1. 토론방 단계 상태 정의 (시뮬레이터용)
  const [discussionStage, setDiscussionStage] = useState<'question_collecting' | 'discussion'>('question_collecting');

  // 2. Bottom Sheet 관련 상태 정의
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [selectedQ, setSelectedQ] = useState<DiscussionQuestion | null>(null);
  const [feedbackList, setFeedbackList] = useState<string[]>([]);
  const [newFeedbackContent, setNewFeedbackContent] = useState('');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 로컬 스토리지 피드백 로드 & 세이브 헬퍼
  const loadFeedbacks = useCallback((qId: string): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(KEY_FEEDBACKS);
      const allFeedbacks = stored ? JSON.parse(stored) : {};
      
      // 해당 질문에 피드백이 없으면 기본 더미 반환 및 저장
      if (!allFeedbacks[qId]) {
        const defaultDummies = qId === 'q-3' ? [
          '마지막 장면 기준인지 궁금해요. 숲에서 나올 때의 감상인가요?',
          '선택의 이유와 함께 일상 속 구체적인 대안도 나누면 좋겠어요.'
        ] : qId === 'q-4' ? [
          '저자가 세운 수치들이 현대의 자본주의 관점에서도 유효할지 궁금해요.',
          '책에 나온 비용 단위를 오늘날 가치로 대략 설명해주시면 토론에 큰 도움이 될 듯합니다!'
        ] : [
          '이 질문을 구체화해서 현실의 나에게 어떻게 대입할지 보완하면 좋을 것 같아요.'
        ];
        allFeedbacks[qId] = defaultDummies;
        localStorage.setItem(KEY_FEEDBACKS, JSON.stringify(allFeedbacks));
        return defaultDummies;
      }
      return allFeedbacks[qId];
    } catch {
      return [];
    }
  }, []);

  const saveFeedback = (qId: string, content: string) => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(KEY_FEEDBACKS);
      const allFeedbacks = stored ? JSON.parse(stored) : {};
      if (!allFeedbacks[qId]) {
        allFeedbacks[qId] = [];
      }
      allFeedbacks[qId].push(content);
      localStorage.setItem(KEY_FEEDBACKS, JSON.stringify(allFeedbacks));
      setFeedbackList(allFeedbacks[qId]);
    } catch (err) {
      console.error('피드백 저장 실패:', err);
    }
  };

  // 질문 목록 로드
  const loadQuestions = useCallback(async () => {
    try {
      const data = await mockApi.discussion.getQuestions(activeClubId, activeBookId);
      setQuestions(data);
    } catch (err) {
      console.error(err);
    }
  }, [activeClubId, activeBookId]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const { data } = await mockApi.auth.getUser();
        if (!data?.user) {
          window.location.href = '/login';
          return;
        }
        setCurrentUser(data.user);

        const myClubs = await mockApi.clubs.getMyClubs(data.user.id);
        if (myClubs.length > 0) {
          setActiveClubId(myClubs[0].id);
          const book = await mockApi.books.getByClub(myClubs[0].id);
          if (book) {
            setActiveBookId(book.id);
          }
        }
        await loadQuestions();
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [loadQuestions]);

  // 질문 피드백 열기 핸들러
  const handleOpenFeedback = (q: DiscussionQuestion, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedQ(q);
    const list = loadFeedbacks(q.id);
    setFeedbackList(list);
    setIsFeedbackOpen(true);
  };

  // 피드백 등록 핸들러
  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQ || !newFeedbackContent.trim()) return;
    saveFeedback(selectedQ.id, newFeedbackContent.trim());
    setNewFeedbackContent('');
  };

  // 질문 제안 등록 핸들러
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newQuestionContent.trim()) return;

    setIsSubmitting(true);
    try {
      await mockApi.discussion.createQuestion(
        currentUser.id,
        activeClubId,
        activeBookId,
        newQuestionContent.trim()
      );
      setNewQuestionContent('');
      await loadQuestions();
    } catch (err) {
      console.error(err);
      alert('질문 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 반응(리액션) 클릭 핸들러
  const handleReaction = async (questionId: string, type: 'curious' | 'talk', e: React.MouseEvent) => {
    e.stopPropagation();
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
      <main className="flex-1 flex flex-col gap-5 pb-24">
        
        {/* 헤더 바 */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/')}
              className="p-1 hover:bg-sage-light/30 rounded-full text-foreground/75"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black text-foreground">토론 이야기방</h1>
              <p className="text-[10px] text-foreground/50 font-medium">사색과 대화의 모닥불</p>
            </div>
          </div>
        </div>

        {/* 🎬 숲속의 북클럽 진행 단계 시뮬레이터 */}
        <div className="bg-sage-light/20 border border-sage-light/60 rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-sage-dark uppercase tracking-widest flex items-center gap-1">
              <Layers size={10} />
              모임 진행 단계 시뮬레이터 (정적 테스트용)
            </span>
            <span className="text-[9px] font-extrabold text-foreground/40">클릭하여 전환</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDiscussionStage('question_collecting')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                discussionStage === 'question_collecting'
                  ? 'bg-sage-medium text-white shadow-sm'
                  : 'bg-card-bg border border-card-border text-foreground/55 hover:bg-sage-light/25'
              }`}
            >
              ⏳ 질문 모으는 중
            </button>
            <button
              onClick={() => setDiscussionStage('discussion')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                discussionStage === 'discussion'
                  ? 'bg-sage-medium text-white shadow-sm'
                  : 'bg-card-bg border border-card-border text-foreground/55 hover:bg-sage-light/25'
              }`}
            >
              🔥 토론 진행 중
            </button>
          </div>
          
          <div className="flex items-start gap-1 text-[9px] text-foreground/45 leading-snug">
            <Info size={11} className="text-sage-dark flex-shrink-0 mt-0.5" />
            <span>
              {discussionStage === 'question_collecting' 
                ? '현재는 [질문 수집] 단계입니다. 선정 질문은 준비 중 상태이며, 제안 질문에 대해 상세 토론 대신 "질문 다듬기 의견" 피드백만 교환합니다.'
                : '현재는 [토론 진행] 단계입니다. 선정된 질문이 활성화되어 실제 상세 토론방에 입장하고 댓글을 달 수 있습니다.'
              }
            </span>
          </div>
        </div>

        {/* ✏️ 질문 제안하기 입력창 (질문 수집 단계에서만 활성화) */}
        {discussionStage === 'question_collecting' ? (
          <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <h3 className="text-xs font-extrabold text-sage-dark uppercase tracking-wider">궁금한 질문 제안하기</h3>
            <form onSubmit={handleCreateQuestion} className="flex gap-2">
              <input
                type="text"
                value={newQuestionContent}
                onChange={(e) => setNewQuestionContent(e.target.value)}
                placeholder="책을 읽으며 든 질문을 가볍게 제안해 보세요..."
                className="flex-1 px-4 py-2.5 bg-background border border-card-border rounded-xl text-xs focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30"
                maxLength={150}
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 bg-sage-medium hover:bg-sage-dark text-white rounded-xl flex justify-center items-center transition-colors shadow-sm"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-sage-light/10 border border-card-border/60 rounded-2xl p-4.5 text-center text-xs font-bold text-foreground/40">
            🔒 토론 오픈 단계에는 신규 질문 제안이 마감됩니다.
          </div>
        )}

        {/* 1️⃣ 선정된 토론 질문 섹션 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-sage-medium rounded-full" />
            <h2 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">이번 달 선정된 토론 주제</h2>
          </div>
          
          {discussionStage === 'question_collecting' ? (
            /* [질문 모으는 중] -> preview 중심의 간략 뷰 */
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
          ) : (
            /* [토론 진행 중] -> 실제 활성 토론방 카드 리스트 */
            selectedQuestions.length === 0 ? (
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
                    
                    {/* 리액션 버튼 */}
                    <div className="flex gap-2.5 pt-2.5 border-t border-sage-light/50 pl-1">
                      <button
                        onClick={(e) => handleReaction(q.id, 'curious', e)}
                        className="px-3 py-1.5 bg-card-bg hover:bg-sage-light/30 border border-card-border/60 rounded-xl flex items-center gap-1.5 transition-all text-[10px] font-bold text-foreground/60 active:scale-95"
                      >
                        <HelpCircle size={12} className="text-sage-medium" />
                        <span>나도 궁금해요 {q.reaction_curious_count}</span>
                      </button>
                      <button
                        onClick={(e) => handleReaction(q.id, 'talk', e)}
                        className="px-3 py-1.5 bg-card-bg hover:bg-sage-light/30 border border-card-border/60 rounded-xl flex items-center gap-1.5 transition-all text-[10px] font-bold text-foreground/60 active:scale-95"
                      >
                        <Heart size={12} className="text-warm-beige" />
                        <span>이야기하고 싶어요 {q.reaction_talk_count}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* 2️⃣ 질문 제안함 섹션 (질문 수집 단계에서만 노출하여 본 토론 몰입감 강화) */}
        {discussionStage === 'question_collecting' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-warm-beige rounded-full" />
              <h2 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                질문 제안함 (피드백 중)
              </h2>
            </div>

            {suggestedQuestions.length === 0 ? (
              <div className="bg-card-bg border border-card-border border-dashed rounded-2xl py-6 text-center text-xs text-foreground/40 font-medium">
                제안된 질문이 없습니다. 첫 질문을 올려보세요!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {suggestedQuestions.map(q => {
                  const count = loadFeedbacks(q.id).length;
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
                      
                      {/* 리액션 버튼 */}
                      <div className="flex gap-2.5 pt-2 border-t border-card-border/40">
                        <button
                          onClick={(e) => handleReaction(q.id, 'curious', e)}
                          className="px-3 py-1.5 bg-background hover:bg-sage-light/20 border border-card-border/60 rounded-xl flex items-center gap-1.5 transition-all text-[10px] font-bold text-foreground/60 active:scale-95"
                        >
                          <HelpCircle size={12} className="text-sage-medium/70" />
                          <span>나도 궁금해요 {q.reaction_curious_count}</span>
                        </button>
                        <button
                          onClick={(e) => handleReaction(q.id, 'talk', e)}
                          className="px-3 py-1.5 bg-background hover:bg-sage-light/20 border border-card-border/60 rounded-xl flex items-center gap-1.5 transition-all text-[10px] font-bold text-foreground/60 active:scale-95"
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
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">함께 질문 다듬기</span>
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
              {feedbackList.length === 0 ? (
                <p className="text-[11px] text-center text-foreground/30 py-6">첫 의견을 남겨 질문을 한층 더 다듬어주세요.</p>
              ) : (
                feedbackList.map((feedback, idx) => (
                  <div key={idx} className="bg-background border border-card-border rounded-xl p-3 text-[11px] font-semibold text-foreground/75 leading-relaxed text-justify">
                    {feedback}
                  </div>
                ))
              )}
            </div>

            {/* 피드백 제출 폼 */}
            <form onSubmit={handleAddFeedback} className="flex gap-2 pt-2 border-t border-card-border/50">
              <input
                type="text"
                value={newFeedbackContent}
                onChange={(e) => setNewFeedbackContent(e.target.value)}
                placeholder="질문을 어떻게 보완하면 대화가 더 풍성해질까요?"
                className="flex-1 px-3.5 py-2.5 bg-background border border-card-border rounded-xl text-[11px] font-semibold focus:outline-none focus:border-sage-medium placeholder:text-foreground/30"
                maxLength={80}
                required
              />
              <button
                type="submit"
                className="px-4.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl flex justify-center items-center shadow-sm"
              >
                <Send size={13} />
              </button>
            </form>
            
            <p className="text-[8px] text-foreground/45 text-center leading-normal">
              * 이곳의 피드백은 대화 주제 개선 전용이며, 토론 오픈 시 댓글로 보존되지 않습니다.
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
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">이번 달의 토론 준비실</span>
                <h3 className="text-sm font-black text-foreground">선정된 도란도란 질문 목록</h3>
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
                      토론 준비중
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
                토론은 5월 24일부터 정식 오픈됩니다.
              </p>
              <p className="text-[9px] text-foreground/45 mt-1 leading-snug">
                지금은 질문을 준비하고 생각을 다듬는 정갈한 시간입니다.<br />
                오픈 시각이 되면 모닥불방의 댓글 기능이 활성화됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => {}} />
    </div>
  );
}
