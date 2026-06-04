'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi, DiscussionQuestion, DiscussionComment, getStageByDates } from '../../../lib/supabase';
import Navigation from '../../../components/Navigation';
import SpoilerWarningModal from '../../../components/SpoilerWarningModal';
import { ArrowLeft, MessageSquare, Send, Calendar, Layers } from 'lucide-react';

interface DiscussionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DiscussionDetailPage({ params }: DiscussionDetailPageProps) {
  // Promise 형태의 params 언랩 처리
  const { id: questionId } = use(params);
  
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [question, setQuestion] = useState<DiscussionQuestion | null>(null);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stageParam, setStageParam] = useState<string | null>(null);
  const router = useRouter();

  // 인라인 수정/삭제 및 에러 처리용 상태 추가
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showSpoilerModal, setShowSpoilerModal] = useState(false);

  // URL에서 stage 파라미터 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setStageParam(searchParams.get('stage'));
    }
  }, []);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      const q = await mockApi.discussion.getQuestionById(questionId);
      if (q) {
        setQuestion(q);
        const c = await mockApi.discussion.getComments(questionId);
        setComments(c);

        // 질문에 연결된 그룹(모임)의 활성 monthly_book 단계를 실제 DB 기준 조회하여 게이팅 동기화
        if (q.club_id) {
          const mb = await mockApi.clubs.getMonthlyBook(q.club_id);
          if (mb) {
            const calculatedStage = getStageByDates(
              mb.timeline_reading,
              mb.timeline_question,
              mb.timeline_discussion
            );
            // 토론방에서는 archived_recap(결산 유예) 단계를 결산 화면(archiving)과 동일하게 봅니다.
            const uiStage = calculatedStage === 'archived_recap' ? 'archiving' : calculatedStage;
            setStageParam(uiStage);
          }
        }
      } else {
        alert('존재하지 않는 토론 질문입니다.');
        window.location.href = '/discussion';
      }
    } catch (err) {
      console.warn('[DB/API] loadData 에러:', err);
    }
  }, [questionId]);

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
        await loadData();
      } catch (err) {
        console.warn('[DB/Auth] init 에러:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [loadData]);

  // 댓글 등록 핸들러
  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newCommentContent.trim()) return;

    if (stageParam !== 'discussion') {
      if (stageParam === 'reading' || stageParam === 'question_collecting') {
        setActionError('질문이 아직 선정되기 전입니다. 댓글 토론은 3단계(토론 진행) 기간에 활성화됩니다.');
      } else {
        setActionError('독서 모임이 결산 완료되어 댓글 작성이 마감되었습니다.');
      }
      return;
    }

    if (newCommentContent.length > 1000) {
      setActionError('생각은 1000자 이내로 적어주세요.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      const addedComment = await mockApi.discussion.createComment(
        currentUser.id,
        questionId,
        newCommentContent.trim()
      );
      setNewCommentContent('');
      
      // 전체 reload 없이 즉시 append
      setComments(prev => [...prev, addedComment]);
      
      // 질문의 댓글 카운트 동적 증가
      setQuestion(prev => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : null);
    } catch (err) {
      console.warn('[DB/API] handleCreateComment 에러:', err);
      setActionError('생각을 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 수정 핸들러
  const handleUpdateComment = async (commentId: string) => {
    if (!editingContent.trim()) return;

    if (stageParam !== 'discussion') {
      setActionError('토론 진행 단계에서만 댓글 수정/삭제가 가능합니다.');
      return;
    }

    if (editingContent.length > 1000) {
      setActionError('생각은 1000자 이내로 적어주세요.');
      return;
    }

    setIsActionLoading(true);
    setActionError(null);
    try {
      await mockApi.discussion.updateComment(commentId, editingContent.trim());
      
      // 전체 reload 없이 로컬 상태 즉시 변경
      setComments(prev => 
        prev.map(c => c.id === commentId ? { ...c, content: editingContent.trim() } : c)
      );
      setEditingCommentId(null);
      setEditingContent('');
    } catch (err) {
      console.warn('[DB/API] handleUpdateComment 에러:', err);
      setActionError('생각을 수정하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 댓글 삭제 핸들러
  const handleDeleteComment = async (commentId: string) => {
    if (stageParam !== 'discussion') {
      setActionError('토론 진행 단계에서만 댓글 수정/삭제가 가능합니다.');
      return;
    }

    const hasConfirmed = window.confirm('생각 기록을 삭제할까요?');
    if (!hasConfirmed) return;

    setIsActionLoading(true);
    setActionError(null);
    try {
      await mockApi.discussion.deleteComment(commentId);
      
      // 전체 reload 없이 로컬 상태 즉시 제거
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      // 질문의 댓글 카운트 동적 감소
      setQuestion(prev => prev ? { ...prev, comments_count: Math.max(0, (prev.comments_count || 0) - 1) } : null);
    } catch (err) {
      console.warn('[DB/API] handleDeleteComment 에러:', err);
      setActionError('생각을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 책 ID가 확인된 후 스포일러 모달 노출 체크
  const bookId = question?.book_id;
  useEffect(() => {
    if (bookId) {
      const dismissed = sessionStorage.getItem(`spoil_warn_dismissed_${bookId}`);
      if (dismissed !== 'true') {
        setShowSpoilerModal(true);
      } else {
        setShowSpoilerModal(false);
      }
    }
  }, [bookId]);

  const handleConfirmSpoiler = (dontShowAgain: boolean) => {
    if (bookId && dontShowAgain) {
      sessionStorage.setItem(`spoil_warn_dismissed_${bookId}`, 'true');
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

  // 시간 포맷 헬퍼 함수
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sage-medium border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-sage-dark">생각들을 모으는 중...</span>
        </div>
      </div>
    );
  }

  if (!question) return null;

  if (stageParam === 'question_collecting') {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-background">
        <main className="flex-1 flex flex-col justify-center items-center gap-6 my-auto">
          <div className="w-16 h-16 bg-sage-light rounded-full flex justify-center items-center text-sage-dark shadow-inner">
            <Layers size={26} className="animate-pulse" />
          </div>
          
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-base font-extrabold text-foreground">토론이 아직 시작되지 않았습니다</h2>
            <p className="text-xs text-foreground/50 leading-relaxed max-w-[280px]">
              제안된 질문 [&ldquo;{question.content}&rdquo;]은 현재 토론 준비실에 보관되어 있습니다.<br />
              정식 토론 기간이 시작되면 대화방이 열립니다.
            </p>
          </div>

          <button
            onClick={() => window.location.href = '/discussion'}
            className="w-full py-3 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm max-w-[280px]"
          >
            이야기방 목록으로 가기
          </button>
        </main>
        <Navigation currentUser={currentUser} onLogout={() => {}} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      <main className="flex-1 flex flex-col gap-5">
        {/* 헤더 바 */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/discussion')}
            className="p-1 hover:bg-sage-light/30 rounded-full text-foreground/75"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-black text-foreground">토론 상세 보기</h1>
            <p className="text-[9px] text-foreground/50 font-medium">따뜻한 이야기의 현장</p>
          </div>
        </div>

        {/* 질문 카드 상세 */}
        <div className="bg-sage-light/25 border border-sage-light/80 rounded-2xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-sage-medium" />
          
          <div className="flex items-center gap-2 text-[10px] text-foreground/50 font-medium">
            <span className="font-bold text-sage-dark">{question.profile?.username}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5"><Calendar size={10} /> {formatTime(question.created_at)}</span>
          </div>

          <h2 className="text-sm font-extrabold text-foreground leading-relaxed pr-2">
            {question.content}
          </h2>

          <div className="flex gap-2">
            <span className="text-[10px] bg-sage-light/80 text-sage-dark font-bold px-2 py-0.5 rounded-md">
              나도 궁금해요 {question.reaction_curious_count}
            </span>
            <span className="text-[10px] bg-warm-beige/20 text-warm-beige font-bold px-2 py-0.5 rounded-md">
              이야기하고 싶어요 {question.reaction_talk_count}
            </span>
          </div>
        </div>

        {/* 댓글 목록 헤더 */}
        <div className="flex items-center gap-2 mt-2">
          <MessageSquare className="text-sage-dark" size={16} />
          <h3 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">나누어진 생각들 ({comments.length})</h3>
        </div>

        <div className="h-px bg-card-border" />

        {/* 에러 피드백 배너 */}
        {actionError && (
          <div className="bg-red-50 text-red-500 border border-red-100 rounded-xl px-4 py-2.5 text-[10px] font-bold flex justify-between items-center transition-all animate-fadeIn">
            <span>{actionError}</span>
            <button 
              onClick={() => setActionError(null)}
              className="text-[9px] underline hover:text-red-600 pl-2 font-medium"
            >
              닫기
            </button>
          </div>
        )}

        {/* 댓글 리스트 */}
        <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <div className="py-12 text-center text-xs text-foreground/30 font-medium">
              아직 나누어진 생각이 없습니다. 첫 번째 발자국을 남겨보세요.
            </div>
          ) : (
            comments.map((comment) => {
              const avatarUrl = comment.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.user_id}`;
              const isMe = currentUser && comment.user_id === currentUser.id;
              const isEditing = editingCommentId === comment.id;

              return (
                <div key={comment.id} className="flex flex-col gap-1.5 bg-card-bg border border-card-border rounded-2xl p-4 shadow-inner relative">
                  <div className="flex justify-between items-center text-[10px] text-foreground/50">
                    <div className="flex items-center gap-1.5 font-bold">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarUrl}
                        alt={comment.profile?.username}
                        className="w-5 h-5 rounded-full border border-card-border object-cover"
                      />
                      <span className={isMe ? 'text-sage-dark' : 'text-foreground/80'}>
                        {comment.profile?.username} {isMe && '(나)'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span>{formatTime(comment.created_at)}</span>
                      {isMe && !isEditing && (
                        <div className="flex items-center gap-1.5 ml-2 border-l border-card-border pl-2">
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingContent(comment.content);
                              setActionError(null);
                            }}
                            disabled={isActionLoading || isSubmitting}
                            className="hover:text-sage-medium active:scale-95 transition-all font-bold"
                          >
                            수정
                          </button>
                          <span>·</span>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={isActionLoading || isSubmitting}
                            className="hover:text-red-400 active:scale-95 transition-all font-bold"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <div className="flex flex-col gap-2 mt-1 pl-6">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        maxLength={1000}
                        rows={2}
                        className="w-full px-4 py-2 bg-background border border-card-border rounded-xl text-xs focus:outline-none focus:border-sage-medium font-semibold resize-none"
                        disabled={isActionLoading}
                      />
                      <div className="flex justify-end gap-1.5 text-[10px] font-bold">
                        <button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingContent('');
                          }}
                          className="px-2.5 py-1 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 rounded-md transition-colors"
                          disabled={isActionLoading}
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleUpdateComment(comment.id)}
                          className="px-2.5 py-1 bg-sage-medium hover:bg-sage-dark text-white rounded-md transition-colors flex items-center gap-1"
                          disabled={isActionLoading || !editingContent.trim()}
                        >
                          {isActionLoading ? (
                            <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : '수정 완료'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-foreground/80 leading-relaxed pl-6 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 내 생각 남기기 댓글 입력창 (Gating 적용) */}
        {stageParam === 'discussion' ? (
          <form onSubmit={handleCreateComment} className="bg-card-bg border border-card-border rounded-2xl p-4 shadow-sm flex flex-col gap-2 mt-auto">
            <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">내 생각 남기기</span>
            <div className="flex gap-2">
              <textarea
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                placeholder="따뜻한 사색의 대열에 나의 한 마디를 얹어주세요..."
                rows={2}
                maxLength={1000}
                className="flex-1 px-4 py-2 bg-background border border-card-border rounded-xl text-xs focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30 resize-none"
                required
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting || !newCommentContent.trim()}
                className="px-4 bg-sage-medium hover:bg-sage-dark disabled:bg-sage-light text-white rounded-xl flex justify-center items-center transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-sage-light/10 border border-sage-light/40 rounded-2xl p-4 text-center mt-auto flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] font-bold text-sage-dark uppercase tracking-wider">알림</span>
            <p className="text-[11px] font-semibold text-foreground/50 leading-relaxed">
              {stageParam === 'reading' || stageParam === 'question_collecting' ? (
                '질문이 아직 선정되기 전입니다. 댓글 토론은 3단계(토론 진행) 기간에 활성화됩니다. 🌱'
              ) : (
                '독서 모임이 결산 완료되어 댓글 작성이 마감되었습니다. 남겨진 흔적들을 천천히 음미해보세요. 🌙'
              )}
            </p>
          </div>
        )}
      </main>

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
