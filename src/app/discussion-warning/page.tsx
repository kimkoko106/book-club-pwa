'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import { ShieldAlert, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';

export default function SpoilerWarningPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [readingStatus, setReadingStatus] = useState<string>('reading'); // 기본 더미 상태
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

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      <div className="flex-1 flex flex-col justify-center gap-6 my-auto">
        {/* 헤더 아이콘 */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 bg-warm-beige/15 rounded-full flex justify-center items-center shadow-inner text-warm-beige">
            <ShieldAlert size={28} />
          </div>
          
          <div className="flex flex-col gap-1.5 pr-2 pl-2">
            <h1 className="text-lg font-black text-foreground">토론방을 열기 전에</h1>
            <p className="text-xs text-foreground/50 leading-relaxed font-semibold">
              이곳에는 책의 주요 내용과 결말에 대한<br />
              이야기가 포함될 수 있어요.
            </p>
          </div>
        </div>

        {/* 안내 카드 */}
        <div className="bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <p className="text-xs font-semibold text-foreground/75 leading-relaxed text-center">
            아직 완독 전이라면 스포일러가 될 수 있습니다.<br />
            정말 토론방을 열어 대화에 참여하시겠습니까?
          </p>

          <div className="h-px bg-card-border/60" />

          {/* 내 현재 독서 상태 노출 영역 */}
          <div className="flex justify-between items-center bg-background border border-card-border rounded-xl p-3">
            <span className="text-[11px] font-bold text-foreground/60 flex items-center gap-1.5">
              <BookOpen size={13} className="text-sage-dark" />
              내 현재 상태
            </span>
            <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${getStatusColor(readingStatus)}`}>
              {getStatusLabel(readingStatus)}
            </span>
          </div>

          {/* 분기 버튼 레이아웃 */}
          <div className="flex flex-col gap-2.5 mt-2">
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-card-bg hover:bg-sage-light/25 border border-card-border text-foreground/80 rounded-xl text-xs font-bold transition-all text-center"
            >
              조금 더 읽고 올게요
            </button>
            <button
              onClick={() => router.push('/discussion')}
              className="w-full py-3 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-xs font-extrabold flex justify-center items-center gap-1.5 transition-all shadow-sm"
            >
              괜찮아요, 토론방 열기
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
