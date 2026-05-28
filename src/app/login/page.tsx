'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import { BookOpen } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const router = useRouter();

  // 이미 로그인되어 있는지 체크
  useEffect(() => {
    mockApi.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
        window.location.href = '/';
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('사용할 닉네임을 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    // UI 우선 검증을 위해, 실제 Supabase Auth 호출 대신 Mock Auth를 사용합니다.
    try {
      console.log('로그인 시도 (정적 Mock) 닉네임:', username);
      const { data } = await mockApi.auth.signIn(username.trim());
      if (data?.user) {
        alert(`${data.user.username}님, 환영합니다!`);
        window.location.href = '/';
      }
    } catch (err) {
      console.error(err);
      alert('입장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      {/* 상단 엠블럼 및 인트로 */}
      <div className="flex-1 flex flex-col justify-center items-center gap-6 my-auto">
        <div className="w-20 h-20 bg-sage-light rounded-3xl flex justify-center items-center shadow-inner relative">
          <BookOpen className="text-sage-dark" size={36} />
          {/* 포인트 디자인 작은 점 */}
          <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-warm-beige rounded-full animate-pulse" />
        </div>
        
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-2xl font-black text-foreground">도란도란</h1>
          <p className="text-xs text-foreground/60 leading-relaxed font-medium">
            책장을 넘기는 조용한 소리와 사색을 나누는<br />
            소규모 초대 기반 온라인 독서 공간
          </p>
        </div>

        {/* 로그인 폼 카드 */}
        <div className="w-full bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <h2 className="text-sm font-bold text-foreground/80">닉네임으로 시작하기</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="책방에서 사용할 닉네임"
                className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30"
                maxLength={15}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm"
            >
              {isLoading ? '입장하는 중...' : '독서모임 시작하기'}
            </button>
          </form>

          <p className="text-[10px] text-center text-foreground/40 leading-relaxed">
            * MVP 1단계에서는 비밀번호 없이 닉네임 입력만으로 간단하게 로그인/회원가입이 진행됩니다.
          </p>
        </div>
      </div>

      {/* 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
    </div>
  );
}
