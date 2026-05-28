'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import { KeyRound, ArrowRight } from 'lucide-react';

export default function JoinClubPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    mockApi.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        alert('로그인이 필요한 페이지입니다.');
        window.location.href = '/login';
      } else {
        setCurrentUser(data.user);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!inviteCode.trim()) {
      alert('초대 코드를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('초대 코드로 모임 가입 시도 (정적 Mock) 코드:', inviteCode);
      
      // Mock API를 통해 모임 가입
      const club = await mockApi.clubs.joinClubByCode(currentUser.id, inviteCode.trim().toUpperCase());
      
      if (club) {
        alert(`[${club.title}] 모임에 가입되었습니다!`);
        router.push('/');
      } else {
        alert('올바르지 않거나 존재하지 않는 초대 코드입니다.\n(기본 생성 코드: SAGE123)');
      }
    } catch (err) {
      console.error(err);
      alert('모임 가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      <div className="flex-1 flex flex-col justify-center gap-6 my-auto">
        {/* 헤더 및 아이콘 */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 bg-sage-light rounded-2xl flex justify-center items-center shadow-inner">
            <KeyRound className="text-sage-dark" size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-extrabold text-foreground">초대 코드로 참여하기</h1>
            <p className="text-xs text-foreground/50 leading-relaxed font-medium">
              친구에게 받은 6자리 영문/숫자 초대 코드를 입력하여<br />
              조용하고 아늑한 독서 모임방에 입장합니다.
            </p>
          </div>
        </div>

        {/* 입력 카드 */}
        <form onSubmit={handleSubmit} className="bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-foreground/60">초대 코드 입력</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="예: SAGE123"
              className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-lg font-black tracking-widest text-center uppercase focus:outline-none focus:border-sage-medium placeholder:text-sm placeholder:tracking-normal placeholder:font-semibold placeholder:text-foreground/30"
              maxLength={10}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-sage-medium hover:bg-sage-dark disabled:bg-sage-light text-white rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all duration-200 shadow-sm"
          >
            {isLoading ? '모임방 찾는 중...' : '모임방 참여하기'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* 팁 안내 */}
        <div className="bg-sage-light/20 border border-sage-light rounded-xl p-4 text-[11px] text-sage-dark leading-relaxed font-medium">
          <span className="font-bold block mb-1">💡 테스트를 위한 가이드</span>
          기본 생성되어 있는 더미 모임의 초대 코드는 <span className="font-black underline">SAGE123</span> 입니다. 이 코드를 입력하여 곧바로 더미 모임에 참여해 볼 수 있습니다!
        </div>
      </div>

      {/* 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
    </div>
  );
}
