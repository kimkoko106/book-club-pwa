'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../../lib/supabase';
import Navigation from '../../../components/Navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

interface ArchiveItem {
  id: string;
  year: string;
  month: string;
  title: string;
  author: string;
  coverUrl: string;
  atmosphere: string;
  tags: string[];
}

export default function ArchivePage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('전체');
  const [archiveList, setArchiveList] = useState<ArchiveItem[]>([]);
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

        // 사용자가 가입된 모임(그룹) 목록 가져오기
        const myClubs = await mockApi.clubs.getMyClubs(data.user.id);
        const activeClubId = myClubs.length > 0 ? myClubs[0].id : 'club-1';

        // 해당 모임의 실 DB/Mock 아카이브 리스트 로드
        const list = await mockApi.discussion.getArchiveList(activeClubId);
        setArchiveList(list);
      } catch (err) {
        console.warn('[Archive] 로딩 오류:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // 필터링 적용된 목록
  const filteredData = selectedYear === '전체' 
    ? archiveList 
    : archiveList.filter(item => item.year === selectedYear);

  // 동적으로 년도 필터 뽑기 (기본값 '전체'에다가 목록에 존재하는 년도들 유니크하게 추가)
  const uniqueYears = Array.from(new Set(archiveList.map(item => item.year))).sort((a, b) => b.localeCompare(a));
  const filterYears = ['전체', ...uniqueYears];

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sage-medium border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-sage-dark">기억 보관함을 여는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      <main className="flex-1 flex flex-col gap-5 pb-20">
        
        {/* 상단 헤더 */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/club')}
            className="p-1 hover:bg-sage-light/30 rounded-full text-foreground/75"
            title="모임 홈으로 돌아가기"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-foreground">지난 이야기</h1>
            <p className="text-[10px] text-foreground/50 font-medium">조용히 넘겨보는 우리 모임의 독서 앨범</p>
          </div>
        </div>

        {/* 🏷️ 년도별 필터 버튼 목록 */}
        <div className="flex items-center gap-1.5 py-0.5 border-b border-card-border/40 overflow-x-auto scrollbar-none">
          {filterYears.map((yearOption) => (
            <button
              key={yearOption}
              onClick={() => setSelectedYear(yearOption)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-wide transition-all ${
                selectedYear === yearOption
                  ? 'bg-sage-medium text-white shadow-inner scale-105'
                  : 'bg-card-bg border border-card-border/80 text-foreground/50 hover:bg-sage-light/20'
              }`}
            >
              {yearOption === '전체' ? '전체' : `${yearOption}년`}
            </button>
          ))}
        </div>

        {/* 정돈된 리스트 */}
        <div className="flex flex-col gap-3.5 mt-1">
          {filteredData.length === 0 ? (
            <div className="bg-card-bg border border-card-border border-dashed rounded-2xl py-12 text-center text-xs text-foreground/30 font-medium">
              아직 남겨진 기록이 없어요.
            </div>
          ) : (
            filteredData.map((item) => (
              <div 
                key={item.id}
                onClick={() => {
                  router.push(`/group/archive/${item.id}`);
                }}
                className="bg-card-bg border border-card-border rounded-2xl p-4 flex gap-4 shadow-sm items-center hover:border-sage-medium/50 cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
              >
                {/* 1. 책 표지 이미지 (표지가 없는 경우 감성 Placeholder) */}
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={item.coverUrl} 
                    alt={item.title} 
                    className="w-16 h-22 rounded-xl object-cover shadow border border-card-border/70 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-22 rounded-xl bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border/70 flex flex-col justify-between py-3 px-1.5 shadow flex-shrink-0 text-center select-none relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-sage-dark/10" />
                    <span className="text-[10px] font-black text-sage-dark leading-tight line-clamp-2 w-full mt-1 px-1">
                      {item.title}
                    </span>
                    <span className="text-[8px] font-extrabold text-sage-medium/95 truncate w-full px-1">
                      {item.author || '지은이 미상'}
                    </span>
                  </div>
                )}

                {/* 2. 도서 정보 및 한줄 분위기 문장 */}
                <div className="flex-1 flex flex-col justify-between h-20 min-w-0">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-sage-dark bg-sage-light/70 px-2 py-0.5 rounded-md leading-none">
                        {item.month}
                      </span>
                      {/* 태그 모음 */}
                      <div className="flex gap-1">
                        {item.tags.map((tag, idx) => (
                          <span key={idx} className="text-[8px] text-foreground/45">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-extrabold text-foreground leading-tight mt-1.5 truncate group-hover:text-sage-dark transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-foreground/40 font-bold leading-none mt-0.5">
                      {item.author} 저
                    </p>
                  </div>

                  {/* 분위기 묘사 한줄평 */}
                  <p className="text-[10px] italic font-semibold text-foreground/55 truncate pr-1">
                    {item.atmosphere}
                  </p>

                  {/* 조용한 텍스트 위주의 돌아보기 버튼 */}
                  <div className="flex items-center gap-0.5 text-[9px] font-black text-sage-dark/80 self-end transition-all group-hover:text-sage-dark">
                    <span>이야기 돌아보기</span>
                    <ArrowUpRight size={10} className="transform transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>

                </div>

              </div>
            ))
          )}
        </div>

      </main>

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => {}} />
    </div>
  );
}
