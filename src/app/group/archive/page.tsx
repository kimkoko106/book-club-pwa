'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../../lib/supabase';
import Navigation from '../../../components/Navigation';
import { ArrowLeft, Sparkles, BookOpen, ChevronRight, ArrowUpRight } from 'lucide-react';

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
  
  // 1. 년도 필터링을 위한 선택 상태 정의 (기본값: '전체')
  const [selectedYear, setSelectedYear] = useState<string>('전체');
  
  const router = useRouter();

  // 확장된 독서 기록 더미 아카이브 데이터 (년도 필터 검증용)
  const archiveData: ArchiveItem[] = [
    {
      id: 'report-4',
      year: '2026',
      month: '2026년 4월',
      title: '모순',
      author: '양귀자',
      coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=150&auto=format&fit=crop&q=80',
      atmosphere: '“관계와 현실의 선택에 대해 오래 대화 나누었던 달”',
      tags: ['선택과책임', '삶의이면']
    },
    {
      id: 'report-3',
      year: '2026',
      month: '2026년 3월',
      title: '아몬드',
      author: '손원평',
      coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=150&auto=format&fit=crop&q=80',
      atmosphere: '“감정과 진정한 공감의 온기를 함께 나누었던 시간”',
      tags: ['공감의온기', '타인의아픔']
    },
    {
      id: 'report-2',
      year: '2025',
      month: '2025년 12월',
      title: '어린 왕자',
      author: '앙투안 드 생텍쥐페리',
      coverUrl: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=150&auto=format&fit=crop&q=80',
      atmosphere: '“길들인다는 의미와 잊혀진 마음의 동심을 복기한 계절”',
      tags: ['어른과아이', '길들여짐']
    },
    {
      id: 'report-1',
      year: '2024',
      month: '2024년 10월',
      title: '호밀밭의 파수꾼',
      author: 'J.D. 샐린저',
      coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=150&auto=format&fit=crop&q=80',
      atmosphere: '“위선적인 기성 사회 속 외로운 방황을 다정히 위로했던 밤”',
      tags: ['청춘의방황', '순수함보호']
    }
  ];

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
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // 필터링 적용된 목록
  const filteredData = selectedYear === '전체' 
    ? archiveData 
    : archiveData.filter(item => item.year === selectedYear);

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

  // 필터 알약(Pill)들 정의
  const filterYears = ['전체', '2026', '2025', '2024'];

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

        {/* 정돈된 리스트 (카드 높이 축소, 정보 밀도 최적화, 가로형 독서 기록 앨범 느낌) */}
        <div className="flex flex-col gap-3.5 mt-1">
          {filteredData.length === 0 ? (
            <div className="bg-card-bg border border-card-border border-dashed rounded-2xl py-12 text-center text-xs text-foreground/30 font-medium">
              해당 년도의 독서 기록이 존재하지 않습니다.
            </div>
          ) : (
            filteredData.map((item) => (
              <div 
                key={item.id}
                onClick={() => {
                  // report-4, report-3 의 상세 결산 리포트 연결
                  if (item.id === 'report-4' || item.id === 'report-3') {
                    router.push(`/group/archive/${item.id}`);
                  } else {
                    alert(`[${item.title}] 결산 상세 화면은 현재 데모 준비 중입니다. 2026년 결산 화면부터 탐색해 보세요! 📖`);
                  }
                }}
                className="bg-card-bg border border-card-border rounded-2xl p-4 flex gap-4 shadow-sm items-center hover:border-sage-medium/50 cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
              >
                {/* 1. 컴팩트한 책 표지 이미지 (고정 높이) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={item.coverUrl} 
                  alt={item.title} 
                  className="w-16 h-22 rounded-xl object-cover shadow border border-card-border/70 flex-shrink-0"
                />

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
