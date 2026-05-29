'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import { MessageSquare, Sparkles, BookOpen, ChevronRight } from 'lucide-react';

export default function SpoilerWarningPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [readingStatus, setReadingStatus] = useState<string>('reading'); // 기본 더미 상태
  const [stage, setStage] = useState<string>('discussion');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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

        // 로컬 스토리지에서 내 실제 독서 상태 가져오기
        const KEY_PROGRESS = 'bookclub_mock_progress';
        const item = typeof window !== 'undefined' ? localStorage.getItem(KEY_PROGRESS) : null;
        const progresses = item ? JSON.parse(item) : [];
        const myProg = progresses.find((p: any) => p.user_id === data.user.id && p.book_id === 'book-1');
        
        if (myProg) {
          setReadingStatus(myProg.status);
          
          // 만약 완독 상태인데 이 경고방에 접속했다면 바로 토론방으로 토스합니다.
          if (myProg.status === 'completed') {
            window.location.href = '/discussion';
          }
        }

        // URL 파라미터 stage 획득
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const stageParam = params.get('stage');
          if (stageParam === 'archiving' || stageParam === 'discussion') {
            setStage(stageParam);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '완독함';
      case 'paused':
        return '잠시 쉬는 중';
      default:
        return '읽는 중';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paused':
        return 'text-warm-beige bg-warm-beige/10 border-warm-beige/35';
      default:
        return 'text-sage-dark bg-sage-light border-sage-light';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sage-medium border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-sage-dark">준비 중...</span>
        </div>
      </div>
    );
  }

  // 1. 토론(discussion) 단계용 감성 콘텐츠
  const isDiscussion = stage === 'discussion';

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      <div className="flex-grow flex flex-col justify-center gap-6 my-auto max-w-[360px] mx-auto w-full">
        {/* 헤더 아이콘 & 텍스트 (경고 대신 따뜻한 감성 부여) */}
        <div className="flex flex-col items-center text-center gap-3.5">
          <div className="w-16 h-16 bg-sage-light/40 rounded-3xl flex justify-center items-center shadow-inner text-sage-dark">
            {isDiscussion ? <MessageSquare size={26} /> : <Sparkles size={26} />}
          </div>
          
          <div className="flex flex-col gap-1 px-1">
            <h1 className="text-base font-black text-foreground">
              {isDiscussion ? '토론의 광장이 열렸어요 💬' : '지난 여정의 흔적들이 모였어요 ✨'}
            </h1>
            <p className="text-[11px] text-foreground/50 leading-relaxed font-semibold">
              {isDiscussion 
                ? '이제 다양한 생각들이 오가는 시간이에요. 아직 책을 읽는 중이라면 작은 스포일러가 있을 수 있어요.' 
                : '한 달 동안 나눈 소중한 이야기들이 보관되어 있어요. 완독 여부와 관계없이 조용히 둘러보실 수 있습니다.'
              }
            </p>
          </div>
        </div>

        {/* 안내 카드 */}
        <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <p className="text-[11.5px] font-semibold text-foreground/75 leading-relaxed text-center">
            {isDiscussion 
              ? '책을 끝까지 읽으면서 나만의 사색을 정리하고 들어오시면 더욱 깊이 있는 대화가 가능해요.' 
              : '토론방은 이미 고요해졌지만, 멤버들이 남긴 깊은 여운들이 보관되어 있습니다. 스포일러가 걱정된다면 나중에 오셔도 괜찮아요.'
            }
          </p>

          <div className="h-px bg-card-border/60" />

          {/* 내 현재 독서 상태 노출 영역 */}
          <div className="flex justify-between items-center bg-background border border-card-border rounded-xl p-3">
            <span className="text-[10px] font-bold text-foreground/60 flex items-center gap-1.5">
              <BookOpen size={12} className="text-sage-dark" />
              내 현재 상태
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getStatusColor(readingStatus)}`}>
              {getStatusLabel(readingStatus)}
            </span>
          </div>

          {/* 분기 버튼 레이아웃 */}
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-card-bg hover:bg-sage-light/25 border border-card-border text-foreground/80 rounded-xl text-xs font-bold transition-all text-center"
            >
              {isDiscussion ? '조금 더 읽고 올게요' : '나중에 돌아볼게요'}
            </button>
            <button
              onClick={() => router.push('/discussion')}
              className="w-full py-3 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-xs font-extrabold flex justify-center items-center gap-1.5 transition-all shadow-sm"
            >
              {isDiscussion ? '생각 나누기 참여하기' : '기록 보관함 열기'}
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => {}} />
    </div>
  );
}
