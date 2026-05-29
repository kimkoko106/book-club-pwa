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
  const [discussionStage, setDiscussionStage] = useState<'reading' | 'question_collecting' | 'discussion' | 'archiving'>('question_collecting');

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
          const club = myClubs[0];
          setActiveClubId(club.id);
          const book = await mockApi.books.getByClub(club.id);
          if (book) {
            setActiveBookId(book.id);
          }

          // 로컬스토리지 설정 단계를 읽어와 이야기방 초기 상태 동기화
          const localStage = localStorage.getItem(`bookclub_mock_club_stage_${club.id}`);
          if (localStage === 'reading') {
            setDiscussionStage('reading');
          } else if (localStage === 'question_collecting') {
            setDiscussionStage('question_collecting');
          } else if (localStage === 'discussion') {
            setDiscussionStage('discussion');
          } else if (localStage === 'archiving' || localStage === 'completed') {
            setDiscussionStage('archiving');
          } else {
            setDiscussionStage('question_collecting');
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
      <main className="flex-1 flex flex-col gap-6">
        {/* 🎬 숲속의 북클럽 진행 단계 시뮬레이터 */}
        <div className="bg-sage-light/20 border border-sage-light/60 rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-sage-dark uppercase tracking-widest flex items-center gap-1">
              <Layers size={10} />
              독서 흐름 단계 시뮬레이터 (정적 테스트용)
            </span>
            <span className="text-[9px] font-extrabold text-foreground/45">클릭하여 전환</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'reading', label: '📖 읽는 중' },
              { key: 'question_collecting', label: '⏳ 질문 모으는 중' },
              { key: 'discussion', label: '🔥 토론 진행 중' },
              { key: 'archiving', label: '🌙 결산' }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setDiscussionStage(item.key as any)}
                className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  discussionStage === item.key
                    ? 'bg-sage-medium text-white shadow-sm'
                    : 'bg-card-bg border border-card-border text-foreground/55 hover:bg-sage-light/25'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-start gap-1 text-[9px] text-foreground/45 leading-snug">
            <Info size={11} className="text-sage-dark flex-shrink-0 mt-0.5" />
            <span>
              {discussionStage === 'reading' && '현재는 [조용한 몰입] 독서 단계입니다. 질문이나 대화 보드보다는 멤버들의 독서 진행도 확인과 가이드 독서에 집중합니다.'}
              {discussionStage === 'question_collecting' && '현재는 [사색 확장] 질문 모집 단계입니다. 이번 달의 우수 질문들을 정제하고 다른 이의 제안에 의견 메모를 덧붙입니다.'}
              {discussionStage === 'discussion' && '현재는 [활발한 대화] 토론 진행 단계입니다. 최종 선정된 사색 질문이 열려 각자 자유롭게 댓글로 생각을 소통합니다.'}
              {discussionStage === 'archiving' && '현재는 [감정 정리와 회고] 토론 결산 단계입니다. 이번 달의 대화를 통계와 종료 카드로 차분히 매듭짓고 돌아봅니다.'}
            </span>
          </div>
        </div>

        {/* 🗺️ 상단 진행바 UI */}
        <div className="bg-card-bg border border-card-border rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
          <div className="flex justify-between items-center text-[9.5px] font-black text-foreground/40 pb-1.5 border-b border-card-border/40 uppercase tracking-wider">
            <span>독서 모임 여정</span>
            <span className="text-sage-dark font-black">
              {discussionStage === 'reading' && '읽기 단계: 조용한 몰입'}
              {discussionStage === 'question_collecting' && '질문 정제: 사색 확장'}
              {discussionStage === 'discussion' && '토론 단계: 활발한 대화'}
              {discussionStage === 'archiving' && '결산 단계: 감정 정리와 회고'}
            </span>
          </div>

          <div className="flex items-center justify-between relative mt-2 px-1">
            {/* 연결 선 */}
            <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-card-border/70 z-0" />
            <div 
              className="absolute top-3.5 left-6 h-0.5 bg-sage-medium transition-all duration-300 z-0"
              style={{
                width: 
                  discussionStage === 'reading' ? '0%' :
                  discussionStage === 'question_collecting' ? '33%' :
                  discussionStage === 'discussion' ? '66%' : '100%'
              }}
            />

            {[
              { key: 'reading', label: '📖 읽기', index: 0 },
              { key: 'question_collecting', label: '⏳ 질문', index: 1 },
              { key: 'discussion', label: '🔥 토론', index: 2 },
              { key: 'archiving', label: '🌙 결산', index: 3 }
            ].map((step, idx) => {
              const currentIdx = ['reading', 'question_collecting', 'discussion', 'archiving'].indexOf(discussionStage);
              const isActive = step.key === discussionStage;
              const isCompleted = idx < currentIdx;

              let statusBg = 'bg-card-bg border-card-border text-foreground/30';
              if (isActive) statusBg = 'bg-sage-medium border-sage-medium text-white shadow-xs ring-4 ring-sage-light/40 scale-105';
              if (isCompleted) statusBg = 'bg-sage-light/75 border-sage-medium text-sage-dark opacity-60';

              return (
                <div key={step.key} className="flex flex-col items-center gap-1.5 z-10 select-none">
                  <div className={`w-7 h-7 rounded-full border flex justify-center items-center text-[9px] font-black transition-all ${statusBg}`}>
                    {idx + 1}
                  </div>
                  <span className={`text-[8.5px] font-black transition-colors ${
                    isActive ? 'text-sage-dark font-extrabold' :
                    isCompleted ? 'text-sage-medium/70' : 'text-foreground/35'
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
            {/* 함께 읽는 사람들 진행 현황 카드 */}
            <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-card-border/40">
                <h3 className="text-xs font-black text-foreground">함께 읽는 사람들</h3>
                <span className="text-[9px] font-black text-sage-dark bg-sage-light px-2 py-0.5 rounded">나홀로 몰입 중</span>
              </div>
              <div className="flex flex-col gap-3.5">
                {[
                  { name: '도란도란', progress: 85, isCompleted: false },
                  { name: '책방지기', progress: 100, isCompleted: true },
                  { name: '숲속의새', progress: 45, isCompleted: false },
                  { name: '소나무', progress: 100, isCompleted: true }
                ].map((member, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[10px] font-extrabold text-foreground/75">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-sage-light/35 border border-card-border/70 flex justify-center items-center text-[8.5px] font-black text-sage-dark">
                          {member.name.substring(0, 2)}
                        </div>
                        <span>{member.name}</span>
                      </div>
                      <span>{member.isCompleted ? '완독 🎉' : `${member.progress}%`}</span>
                    </div>
                    <div className="w-full h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${member.isCompleted ? 'bg-warm-beige' : 'bg-sage-medium'}`}
                        style={{ width: `${member.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

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

        {/* 2단계: 질문 정제 단계 화면 (question_collecting) */}
        {discussionStage === 'question_collecting' && (
          <div className="flex flex-col gap-5">
            <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
              <h3 className="text-xs font-extrabold text-sage-dark uppercase tracking-wider">궁금한 질문 제안하기</h3>
              <form onSubmit={handleCreateQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={newQuestionContent}
                  onChange={(e) => setNewQuestionContent(e.target.value)}
                  placeholder="책을 읽으며 든 질문을 가볍게 제안해 보세요..."
                  className="flex-1 px-4 py-2.5 bg-background border border-card-border rounded-xl text-xs focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30 text-foreground"
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

            {/* 이번 달 선정 사색 질문 */}
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

            {/* 질문 제안함 */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-3.5 bg-warm-beige rounded-full" />
                <h2 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">질문 제안함 (피드백 중)</h2>
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
          </div>
        )}

        {/* 3단계: 토론 진행 단계 화면 (discussion) */}
        {discussionStage === 'discussion' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-sage-medium rounded-full" />
              <h2 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">이번 달 선정 사색 질문</h2>
            </div>
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
            )}
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
                생각 나누기는 5월 24일부터 활성화됩니다.
              </p>
              <p className="text-[9px] text-foreground/45 mt-1 leading-snug">
                지금은 질문을 정제하고 생각을 채워가는 고요한 시간입니다.<br />
                활성화 시각이 되면 사색 기록을 남길 수 있는 댓글 기능이 열립니다.
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
