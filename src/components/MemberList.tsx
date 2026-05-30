'use client';

import React from 'react';
import { BookOpen, CheckCircle, PauseCircle, Users } from 'lucide-react';
import { UserBookProgress } from '../types';

interface MemberListProps {
  memberProgresses: UserBookProgress[];
  totalPages?: number | null;
}

export default function MemberList({ memberProgresses, totalPages }: MemberListProps) {
  const getStatusBadge = (status: 'reading' | 'completed' | 'paused') => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-sage-dark bg-sage-light px-2.5 py-1 rounded-full">
            <CheckCircle size={12} />
            완독
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-warm-beige bg-warm-beige/10 px-2.5 py-1 rounded-full">
            <PauseCircle size={12} />
            쉼
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-sage-medium bg-sage-light/30 px-2.5 py-1 rounded-full">
            <BookOpen size={12} />
            읽는 중
          </span>
        );
    }
  };

  // 시간 포맷 헬퍼 함수
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return '방금 전';
      if (diffMins < 60) return `${diffMins}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      if (diffDays < 7) return `${diffDays}일 전`;
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-card-bg rounded-2xl border border-card-border p-6 shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users className="text-sage-dark" size={18} />
          <h3 className="text-sm font-bold text-foreground">독서 여정 기록</h3>
        </div>
        <span className="text-xs text-foreground/50 font-medium">
          {memberProgresses.length === 1 ? '나홀로 몰입 중' : `참여자 ${memberProgresses.length}명`}
        </span>
      </div>

      <div className="h-px bg-card-border" />

      {memberProgresses.length === 0 ? (
        <div className="py-8 text-center text-xs text-foreground/40 font-medium">
          아직 기록된 여정이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5">
            {memberProgresses.map((mp) => {
              const hasTotalPages = totalPages !== undefined && totalPages !== null && totalPages > 1;
              const percent = Math.min(100, hasTotalPages
                ? Math.round((mp.current_page / (totalPages as number)) * 100)
                : mp.current_page
              );
              const avatarUrl = mp.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${mp.user_id}`;
              const username = mp.profile?.username || '알 수 없는 독서가';

              return (
                <div key={mp.id} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    {/* 프로필 및 이름 */}
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarUrl}
                        alt={username}
                        className="w-8 h-8 rounded-full object-cover border border-card-border shadow-sm"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{username}</span>
                        <span className="text-[10px] text-foreground/40">{formatTime(mp.updated_at)} 기록</span>
                      </div>
                    </div>

                    {/* 배지 및 페이지 수 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground/60 font-semibold font-mono">
                        {hasTotalPages ? `${mp.current_page}p (${percent}%)` : `${percent}%`}
                      </span>
                      {getStatusBadge(mp.status)}
                    </div>
                  </div>

                  {/* 프로그레스 바 */}
                  <div className="w-full h-1.5 bg-sage-light/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        mp.status === 'completed' 
                          ? 'bg-sage-medium' 
                          : mp.status === 'paused' 
                          ? 'bg-warm-beige/80' 
                          : 'bg-sage-medium/60'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 1인 상태 사색 안내 배너 */}
          {memberProgresses.length === 1 && (
            <div className="bg-sage-light/20 border border-sage-light/50 rounded-xl p-3 text-[10px] text-sage-dark/85 leading-relaxed font-semibold">
              🌱 <b>고요한 사색의 서재</b>: 지금은 혼자 생각을 조용히 정리하는 시간입니다. 나중에 언제든지 초대 코드를 공유해 동반자와 함께 쓰는 공간으로 확장할 수 있습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
