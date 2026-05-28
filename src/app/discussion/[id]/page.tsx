'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi, DiscussionQuestion, DiscussionComment } from '../../../lib/supabase';
import Navigation from '../../../components/Navigation';
import { ArrowLeft, MessageSquare, Send, Calendar, Layers, Compass } from 'lucide-react';

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
      } else {
        alert('존재하지 않는 토론 질문입니다.');
        window.location.href = '/discussion';
      }
    } catch (err) {
      console.error(err);
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
        console.error(err);
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

    setIsSubmitting(true);
    try {
      console.log('새 토론 댓글 등록:', newCommentContent);
      await mockApi.discussion.createComment(
        currentUser.id,
        questionId,
        newCommentContent.trim()
      );
      setNewCommentContent('');
      await loadData(); // 댓글 목록 및 댓글 수 갱신
    } catch (err) {
      console.error(err);
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
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
              정식 토론은 5월 24일부터 열립니다.
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
                    <span>{formatTime(comment.created_at)}</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground/80 leading-relaxed pl-6">
                    {comment.content}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* 내 생각 남기기 댓글 입력창 */}
        <form onSubmit={handleCreateComment} className="bg-card-bg border border-card-border rounded-2xl p-4 shadow-sm flex flex-col gap-2 mt-auto">
          <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">내 생각 남기기</span>
          <div className="flex gap-2">
            <textarea
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              placeholder="따뜻한 사색의 대열에 나의 한 마디를 얹어주세요..."
              rows={2}
              className="flex-1 px-4 py-2 bg-background border border-card-border rounded-xl text-xs focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30 resize-none"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 bg-sage-medium hover:bg-sage-dark disabled:bg-sage-light text-white rounded-xl flex justify-center items-center transition-colors shadow-sm"
            >
              <Send size={15} />
            </button>
          </div>
        </form>
      </main>

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => {}} />
    </div>
  );
}
