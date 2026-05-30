'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../../lib/supabase';
import { 
  ArrowLeft, 
  Sparkles, 
  Heart, 
  HelpCircle, 
  Plus, 
  X, 
  Search, 
  Check, 
  Layers, 
  Info,
  BookOpen
} from 'lucide-react';
import { Book } from '../../../types';

// 추천용 더미 도서 리스트
const DUMMY_SEARCH_BOOKS = [
  {
    title: '데미안 (Demian)',
    author: '헤르만 헤세',
    cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&auto=format&fit=crop&q=80',
    total_pages: 240
  },
  {
    title: '아웃라이어 (Outliers)',
    author: '말콤 글래드웰',
    cover_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300&auto=format&fit=crop&q=80',
    total_pages: 360
  },
  {
    title: '그리스인 조르바 (Zorba the Greek)',
    author: '니코스 카잔차키스',
    cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&auto=format&fit=crop&q=80',
    total_pages: 480
  },
  {
    title: '싯다르타 (Siddhartha)',
    author: '헤르만 헤세',
    cover_url: 'https://images.unsplash.com/photo-1531988042231-d39a9cc12a9a?w=300&auto=format&fit=crop&q=80',
    total_pages: 220
  }
];

interface CandidateBook {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  total_pages: number;
  recommended_by: string;
  type: 'read' | 'wish'; // read: 읽어봤어요, wish: 같이 읽고 싶어요
  reason: string;
  reactions: {
    curious: number;
    with_you: number;
  };
  created_at: string;
}

const INITIAL_CANDIDATES: CandidateBook[] = [
  {
    id: 'cand-1',
    title: '데미안 (Demian)',
    author: '헤르만 헤세',
    cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&auto=format&fit=crop&q=80',
    total_pages: 240,
    recommended_by: '민우',
    type: 'read',
    reason: '혼자 읽기보다 함께 읽으면 더 좋을 것 같았어요. 특히 싱클레어와 데미안이 나누는 내면의 대화들은 우리 모임원들과 마주하며 진솔하게 이야기해보고 싶습니다.',
    reactions: { curious: 3, with_you: 5 },
    created_at: '2026-05-28T10:00:00Z'
  },
  {
    id: 'cand-2',
    title: '그리스인 조르바 (Zorba the Greek)',
    author: '니코스 카잔차키스',
    cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&auto=format&fit=crop&q=80',
    total_pages: 480,
    recommended_by: '윤서',
    type: 'wish',
    reason: '아직 안 읽어봤지만 우리 모임 분위기와 잘 어울릴 것 같아요. 자유분방한 조르바의 삶을 통해 우리가 얽매여 있는 것들에 대해 가볍게 대화를 나누고 싶습니다.',
    reactions: { curious: 7, with_you: 2 },
    created_at: '2026-05-28T14:30:00Z'
  },
  {
    id: 'cand-3',
    title: '싯다르타 (Siddhartha)',
    author: '헤르만 헤세',
    cover_url: 'https://images.unsplash.com/photo-1531988042231-d39a9cc12a9a?w=300&auto=format&fit=crop&q=80',
    total_pages: 220,
    recommended_by: '수연',
    type: 'read',
    reason: '이 책의 질문들을 같이 오래 이야기해보고 싶어요. 세속과 영성 사이에서 방황하는 싯다르타의 여정이 우리 각자의 삶의 고민에 잔잔한 답을 내려줄 거라 생각합니다.',
    reactions: { curious: 6, with_you: 6 },
    created_at: '2026-05-29T02:00:00Z'
  }
];

export default function NextBookCandidatePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [candidates, setCandidates] = useState<CandidateBook[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('admin');
  const [filterType, setFilterType] = useState<'all' | 'read' | 'wish'>('all');
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [activeClubId, setActiveClubId] = useState('club-1');

  // 모달 입력 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [recommendType, setRecommendType] = useState<'read' | 'wish'>('read');
  const [reasonInput, setReasonInput] = useState('');
  
  // 도서 선정 시의 상태
  const [selectErrorMsg, setSelectErrorMsg] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // 1. 초기화 및 로드
  useEffect(() => {
    async function init() {
      try {
        const { data } = await mockApi.auth.getUser();
        if (!data?.user) {
          window.location.href = '/login';
          return;
        }
        setCurrentUser(data.user);

        // 가입된 모임 기준 activeClubId 동적 조회
        const myClubs = await mockApi.clubs.getMyClubs(data.user.id);
        const clubId = myClubs.length > 0 ? myClubs[0].id : 'club-1';
        setActiveClubId(clubId);

        // 후보책 로컬스토리지 로드
        const stored = localStorage.getItem('bookclub_next_book_candidates');
        if (stored) {
          setCandidates(JSON.parse(stored));
        } else {
          localStorage.setItem('bookclub_next_book_candidates', JSON.stringify(INITIAL_CANDIDATES));
          setCandidates(INITIAL_CANDIDATES);
        }
      } catch (err) {
        console.warn('초기 데이터 로드 중 에러:', err);
      }
    }
    init();
  }, []);

  // 2. 도서 실시간 검색 (Debounced)
  const handleSearchBook = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchLoading(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/books/search?query=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error('API 호출 실패');
        const data = await res.json();
        setSearchResults(data.items || []);
      } catch (err) {
        console.warn('책 검색 실패:', err);
        setSearchError('책 검색을 불러오지 못했어요...');
      } finally {
        setIsSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. 도서 추천 등록
  const handleAddRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) {
      alert('책을 검색해 선택해 주세요.');
      return;
    }
    if (!reasonInput.trim()) {
      alert('추천 이유를 작성해 주세요.');
      return;
    }

    const newCandidate: CandidateBook = {
      id: `cand-${Date.now()}`,
      title: selectedBook.title,
      author: selectedBook.author,
      cover_url: selectedBook.cover_url || selectedBook.coverUrl || '',
      total_pages: selectedBook.total_pages || selectedBook.totalPages || null,
      recommended_by: currentUser?.username || '익명',
      type: recommendType,
      reason: reasonInput.trim(),
      reactions: { curious: 0, with_you: 0 },
      created_at: new Date().toISOString(),
      // 네이버 책 검색 메타데이터 보존
      isbn: selectedBook.isbn,
      isbn13: selectedBook.isbn13,
      source: selectedBook.source || 'aladin',
      source_id: selectedBook.source_id || selectedBook.sourceId,
      publisher: selectedBook.publisher,
      description: selectedBook.description,
      published_at: selectedBook.published_at || selectedBook.publishedAt
    } as any;

    const updated = [newCandidate, ...candidates];
    setCandidates(updated);
    localStorage.setItem('bookclub_next_book_candidates', JSON.stringify(updated));

    // 입력값 리셋 및 닫기
    setSelectedBook(null);
    setSearchQuery('');
    setReasonInput('');
    setIsRecommendModalOpen(false);
    alert(`[${newCandidate.title}] 도서가 다음 책 후보로 추천 등록되었습니다.`);
  };

  // 4. 공감(반응) 기능
  const handleReaction = (candidateId: string, reactKey: 'curious' | 'with_you') => {
    const updated = candidates.map(c => {
      if (c.id === candidateId) {
        return {
          ...c,
          reactions: {
            ...c.reactions,
            [reactKey]: c.reactions[reactKey] + 1
          }
        };
      }
      return c;
    });
    setCandidates(updated);
    localStorage.setItem('bookclub_next_book_candidates', JSON.stringify(updated));
  };

  // 5. 방장 흐름: 다음 공유책으로 선택 (Supabase / 로컬 Mock API 누적 생성으로 실연동)
  const handleSelectAsNextBook = async (cand: CandidateBook, targetType: 'current' | 'next' = 'current') => {
    setSelectErrorMsg(null);

    if (targetType === 'current') {
      // 정책 2: 결산 전 공유책 교체 경고 확인 절차
      try {
        setIsSelecting(true);
        const currentBookEntry = await mockApi.clubs.getMonthlyBook(activeClubId);
        
        // 현재 공유책이 존재하고, 아직 결산(recap/archived)되지 않은 경우 경고창 노출
        if (currentBookEntry && currentBookEntry.stage !== 'recap' && currentBookEntry.stage !== 'archived') {
          setIsSelecting(false); // confirm 창 노출 동안 loading을 끔
          const confirmChoice = confirm(
            `현재 진행 중인 공유책이 아직 결산되지 않았습니다.\n새 책으로 교체하면 현재 책은 지난 이야기에 보관되지 않습니다.\n\n그래도 교체하시겠어요?`
          );
          if (!confirmChoice) return;
          setIsSelecting(true);
        } else {
          // 결산이 이미 완료되었거나 없는 경우 일반 확인창 노출
          setIsSelecting(false);
          const confirmChoice = confirm(`[${cand.title}] 도서를 이번 달 독서모임 공유도서로 선정하시겠습니까?\n진행도가 0페이지로 초기화됩니다.`);
          if (!confirmChoice) return;
          setIsSelecting(true);
        }
      } catch (err) {
        console.warn('현재 도서 상태 조회 실패:', err);
      }
    } else {
      // 다음 달 예정 도서 선정 확인창
      const confirmChoice = confirm(`[${cand.title}] 도서를 다음 달 예정 도서로 선정하시겠습니까?`);
      if (!confirmChoice) return;
      setIsSelecting(true);
    }

    try {
      await mockApi.clubs.selectNextBook(activeClubId, {
        title: cand.title,
        author: cand.author,
        cover_url: cand.cover_url,
        total_pages: cand.total_pages,
        isbn: (cand as any).isbn,
        isbn13: (cand as any).isbn13,
        source: (cand as any).source,
        source_id: (cand as any).source_id,
        publisher: (cand as any).publisher,
        description: (cand as any).description,
        published_at: (cand as any).published_at
      }, targetType);

      if (targetType === 'next') {
        alert(`[${cand.title}] 도서가 다음 달 예정 책으로 선정되었어요. 🌱`);
      } else {
        alert(`[${cand.title}] 도서가 이번 달 공유책으로 선정되었어요. ✨`);
      }
      router.push('/club');
    } catch (err: any) {
      console.warn('[Candidate] 도서 선정 에러:', err);
      let errMsg = '도서 선정 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      if (err.message?.includes('이미 이번 달 공유책이에요')) {
        errMsg = '이미 이번 달 공유책이에요.';
      } else if (err.message?.includes('이미 다음 달 예정 책이에요')) {
        errMsg = '이미 다음 달 예정 책이에요.';
      }
      setSelectErrorMsg(errMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSelecting(false);
    }
  };

  // 필터링 적용
  const filteredCandidates = candidates.filter(c => {
    if (filterType === 'all') return true;
    return c.type === filterType;
  });

  return (
    <div className="flex-grow flex flex-col bg-background text-foreground min-h-screen">
      {/* 1. 헤더 */}
      <header className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-card-border px-4 py-3 flex items-center gap-3 z-30">
        <button 
          onClick={() => router.push('/club')}
          className="w-8 h-8 rounded-full border border-card-border flex justify-center items-center text-foreground/75 hover:bg-sage-light/30 transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="flex flex-col min-w-0">
          <span className="text-[7.5px] font-black text-sage-dark uppercase tracking-widest leading-none">우리 모임의 책꽂이</span>
          <h1 className="text-sm font-black text-foreground mt-0.5 truncate">다음 책 후보방</h1>
        </div>
        <div className="ml-auto w-7 h-7 bg-warm-beige/25 border border-warm-beige/35 rounded-lg flex justify-center items-center text-warm-beige">
          <Sparkles size={13} className="animate-pulse" />
        </div>
      </header>

      {selectErrorMsg && (
        <div className="mx-4.5 mt-3 bg-red-500/10 border border-red-500/30 text-red-500 text-[10.5px] font-bold py-2.5 px-3 rounded-xl flex items-center justify-between animate-fade-in z-20">
          <span>⚠️ {selectErrorMsg}</span>
          <button onClick={() => setSelectErrorMsg(null)} className="text-[9px] underline cursor-pointer">닫기</button>
        </div>
      )}

      {/* 2. 상단 분위기 영역 */}
      <div className="px-4.5 pt-5 pb-4 flex flex-col gap-1.5 text-center">
        <h2 className="text-sm font-black text-foreground/85 leading-snug">
          누군가의 책장에서 다음 이야기가 건너옵니다.
        </h2>
        <p className="text-[10px] text-foreground/45 font-medium leading-relaxed max-w-[340px] mx-auto">
          다음 달 함께 읽고 싶은 이야기들을 조용히 모아두는 공간입니다. 서로의 책장을 건너다보며 끌리는 흐름을 꺼내어 보세요.
        </p>
      </div>

      {/* 3. 방장 시뮬레이터 배너 */}
      <div className="mx-4.5 mb-3 bg-sage-light/20 border border-sage-light/50 rounded-2xl p-3 flex items-center justify-between shadow-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-bold text-sage-dark/80 uppercase tracking-widest">권한 시뮬레이터</span>
          <span className="text-[10.5px] font-black text-foreground">
            {userRole === 'admin' ? '방장(Admin) 보기' : '모임원(Member) 보기'}
          </span>
        </div>
        <div className="flex bg-background/80 border border-card-border p-1 rounded-xl gap-1">
          <button
            onClick={() => setUserRole('admin')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all cursor-pointer ${
              userRole === 'admin' 
                ? 'bg-sage-medium text-white shadow-xs' 
                : 'text-foreground/50 hover:bg-sage-light/35'
            }`}
          >
            방장
          </button>
          <button
            onClick={() => setUserRole('member')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all cursor-pointer ${
              userRole === 'member' 
                ? 'bg-sage-medium text-white shadow-xs' 
                : 'text-foreground/50 hover:bg-sage-light/35'
            }`}
          >
            모임원
          </button>
        </div>
      </div>

      {/* 4. 필터 및 등록 버튼 */}
      <div className="px-4.5 py-2 flex items-center justify-between gap-3">
        {/* Segmented Control Filter */}
        <div className="flex bg-foreground/5 p-0.5 rounded-lg border border-card-border/40">
          {[
            { value: 'all', label: '전체' },
            { value: 'read', label: '✓ 읽어봤어요' },
            { value: 'wish', label: '📖 같이 읽고 싶어요' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value as any)}
              className={`px-2.5 py-1 text-[9.5px] font-black rounded-md transition-all cursor-pointer ${
                filterType === f.value
                  ? 'bg-card-bg text-sage-dark shadow-xs'
                  : 'text-foreground/45 hover:text-foreground/75'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 책 추천하기 플로팅 스타일 버튼 */}
        <button
          onClick={() => setIsRecommendModalOpen(true)}
          className="px-2.5 py-1.5 bg-sage-medium hover:bg-sage-dark text-white rounded-lg text-[9.5px] font-black transition-all flex items-center gap-1 shadow-xs cursor-pointer"
        >
          <Plus size={11} />
          책 추천하기
        </button>
      </div>

      {/* 5. 후보 리스트 영역 */}
      <main className="flex-1 px-4.5 pb-20 flex flex-col gap-4.5 mt-2">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-2 border border-card-border border-dashed rounded-2xl">
            <BookOpen size={24} className="text-foreground/20" />
            <span className="text-[10px] text-foreground/40 font-semibold">아직 추천방에 등록된 후보 책이 없습니다.</span>
          </div>
        ) : (
          filteredCandidates.map(cand => (
            <div 
              key={cand.id}
              className="bg-card-bg border border-card-border rounded-2xl p-4 flex flex-col gap-3.5 shadow-xs relative overflow-hidden"
            >
              {/* 내 책장에서 추천 배지 Placeholder */}
              <div className="absolute top-0 right-0 bg-sage-light/25 border-l border-b border-sage-light text-sage-dark text-[7.5px] font-black px-2 py-0.5 rounded-bl-lg">
                🌲 우리 모임에 추천한 책
              </div>

              {/* 책 상단 기본 정보 */}
              <div className="flex gap-3.5 items-start">
                {cand.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={cand.cover_url} 
                    alt="표지" 
                    className="w-12 h-17 rounded object-cover border border-card-border shadow-xs flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-17 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border/70 flex flex-col justify-between py-2 px-1 shadow-xs flex-shrink-0 text-center select-none relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-sage-dark/10" />
                    <span className="text-[9.5px] font-black text-sage-dark leading-tight line-clamp-2 w-full mt-0.5 px-0.5">
                      {cand.title}
                    </span>
                    <span className="text-[7.5px] font-extrabold text-sage-medium/90 truncate w-full px-0.5">
                      {cand.author || '지은이 없음'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1 items-center">
                    {cand.type === 'read' ? (
                      <span className="bg-sage-medium/15 text-sage-dark border border-sage-medium/20 text-[7.5px] font-extrabold px-1.5 py-0.2 rounded">
                        ✓ 읽어봤어요
                      </span>
                    ) : (
                      <span className="bg-warm-beige/15 text-warm-beige border border-warm-beige/20 text-[7.5px] font-extrabold px-1.5 py-0.2 rounded">
                        📖 같이 읽고 싶어요
                      </span>
                    )}
                    <span className="text-[8.5px] text-foreground/35 font-medium truncate">
                      {cand.recommended_by} 님의 서재에서 건너옴
                    </span>
                  </div>
                  
                  <h3 className="text-xs font-black text-foreground truncate mt-1">{cand.title}</h3>
                  <span className="text-[9.5px] text-foreground/45 font-medium truncate leading-none mt-0.5">{cand.author}</span>
                </div>
              </div>

              {/* 짧은 추천 이유 */}
              <div className="bg-background/55 border border-card-border/40 rounded-xl p-2.5">
                <p className="text-[10px] text-foreground/70 leading-relaxed font-semibold text-justify">
                  &ldquo;{cand.reason}&rdquo;
                </p>
              </div>

              {/* 하단 반응 버튼 및 관리용 액션 */}
              <div className="flex justify-between items-center gap-3 pt-1 border-t border-card-border/30">
                {/* 비경쟁 공감 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReaction(cand.id, 'curious')}
                    className="px-2.5 py-1 bg-background hover:bg-sage-light/10 border border-card-border/60 rounded-lg flex items-center gap-1 transition-all text-[9px] font-extrabold text-foreground/60 active:scale-95 cursor-pointer"
                  >
                    <HelpCircle size={10} className="text-sage-medium" />
                    <span>궁금해요 {cand.reactions.curious}</span>
                  </button>
                  <button
                    onClick={() => handleReaction(cand.id, 'with_you')}
                    className="px-2.5 py-1 bg-background hover:bg-sage-light/10 border border-card-border/60 rounded-lg flex items-center gap-1 transition-all text-[9px] font-extrabold text-foreground/60 active:scale-95 cursor-pointer"
                  >
                    <Heart size={10} className="text-warm-beige" />
                    <span>같이 읽고 싶어요 {cand.reactions.with_you}</span>
                  </button>
                </div>

                {/* 방장 권한 시 최종 선정 버튼 노출 */}
                {userRole === 'admin' && (
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleSelectAsNextBook(cand, 'current')}
                      disabled={isSelecting}
                      className="px-2.5 py-1.5 border border-sage-medium text-sage-dark hover:bg-sage-medium hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[9px] font-black transition-all cursor-pointer shadow-xs"
                    >
                      {isSelecting ? '선정 중...' : '이번 달 공유책 선정'}
                    </button>
                    <button
                      onClick={() => handleSelectAsNextBook(cand, 'next')}
                      disabled={isSelecting}
                      className="px-2.5 py-1.5 border border-sage-dark/60 text-sage-dark/85 hover:bg-sage-dark/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[9px] font-black transition-all cursor-pointer shadow-xs"
                    >
                      {isSelecting ? '선정 중...' : '다음 달 예정책 선정'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </main>

      {/* ==========================================
          MODAL: 책 추천하기 Bottom Sheet
      ========================================== */}
      {isRecommendModalOpen && (
        <div className="fixed inset-0 bg-foreground/45 backdrop-blur-xs flex items-end justify-center z-50 animate-fade-in">
          <form 
            onSubmit={handleAddRecommendation}
            className="bg-card-bg border-t border-card-border w-full max-w-[480px] rounded-t-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-slide-up"
          >
            {/* 헤더 */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">책장에서 건네는 이야기</span>
                <h3 className="text-xs font-black text-foreground mt-0.5">다음 달 함께 읽을 책 추천</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsRecommendModalOpen(false);
                  setSelectedBook(null);
                  setSearchQuery('');
                  setReasonInput('');
                }}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* Step 1: 책 검색 및 선택 */}
            {!selectedBook ? (
              <div className="flex flex-col gap-3">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">추천할 책 찾기</span>
                <div className="relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={handleSearchBook}
                    placeholder="도서 제목 혹은 작가명을 입력하세요..."
                    className="w-full bg-background border border-card-border rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-sage-medium placeholder:text-foreground/30"
                  />
                  <Search size={13} className="absolute left-3.5 top-3 text-foreground/35" />
                </div>

                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {isSearchLoading ? (
                    <div className="py-4 flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-sage-medium border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-sage-dark font-semibold">책 검색 중...</span>
                    </div>
                  ) : searchError ? (
                    <div className="py-2.5 px-3 text-[10px] text-red-500 font-semibold text-center">
                      ⚠️ {searchError}
                    </div>
                  ) : searchResults.length === 0 && searchQuery.trim() ? (
                    <div className="py-2.5 px-3 text-[10px] text-foreground/45 font-semibold text-center">
                      검색 결과가 없어요.
                    </div>
                  ) : (
                    searchResults.map((bookItem, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedBook(bookItem)}
                        className="bg-background border border-card-border/70 hover:border-sage-medium rounded-xl p-2 flex gap-3 items-center cursor-pointer transition-all duration-200"
                      >
                        {bookItem.cover_url || bookItem.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={bookItem.cover_url || bookItem.coverUrl} 
                            alt="표지" 
                            className="w-7 h-10 rounded object-cover border border-card-border flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-10 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border flex justify-center items-center text-sage-dark font-black text-[9px] select-none flex-shrink-0 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-0.5 h-full bg-sage-dark/10" />
                            {bookItem.title.charAt(0)}
                          </div>
                        )}
                        <div className="flex-grow min-w-0">
                          <h4 className="text-[10px] font-black text-foreground truncate">{bookItem.title}</h4>
                          <span className="text-[9px] text-foreground/45 font-medium truncate leading-none mt-0.5">{bookItem.author}</span>
                        </div>
                        <span className="text-[8.5px] font-bold text-sage-medium px-2 py-0.5 bg-sage-light/20 rounded-md">선택</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* 선택된 책 노출 */
              <div className="bg-background border border-card-border rounded-xl p-3 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedBook.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={selectedBook.cover_url} 
                      alt="표지" 
                      className="w-8 h-11 rounded object-cover border border-card-border"
                    />
                  ) : (
                    <div className="w-8 h-11 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border flex justify-center items-center text-sage-dark font-black text-[10px] select-none flex-shrink-0 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-0.5 h-full bg-sage-dark/10" />
                      {selectedBook.title.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-[10.5px] font-black text-foreground truncate">{selectedBook.title}</h4>
                    <p className="text-[9px] text-foreground/45 font-medium truncate">{selectedBook.author}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedBook(null)}
                  className="text-[8.5px] text-red-500 font-black border border-red-200/50 hover:bg-red-50 px-2 py-0.5 rounded transition-all cursor-pointer"
                >
                  다시 선택
                </button>
              </div>
            )}

            {/* Step 2: 추천 유형 선택 */}
            <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">책을 고른 사색 유형</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRecommendType('read')}
                  className={`py-2 px-2.5 rounded-xl text-[10px] font-black text-center transition-all cursor-pointer ${
                    recommendType === 'read'
                      ? 'bg-sage-medium text-white shadow-xs'
                      : 'bg-background border border-card-border text-foreground/55 hover:bg-sage-light/25'
                  }`}
                >
                  ✓ 읽어봤고 추천해요
                </button>
                <button
                  type="button"
                  onClick={() => setRecommendType('wish')}
                  className={`py-2 px-2.5 rounded-xl text-[10px] font-black text-center transition-all cursor-pointer ${
                    recommendType === 'wish'
                      ? 'bg-warm-beige text-white shadow-xs'
                      : 'bg-background border border-card-border text-foreground/55 hover:bg-warm-beige/10'
                  }`}
                >
                  📖 같이 읽고 싶어요
                </button>
              </div>
            </div>

            {/* Step 3: 짧은 추천 이유 적기 */}
            <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">함께 나누고픈 생각 (이유)</span>
              <textarea 
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="예: 이 책의 질문들을 같이 오래 이야기해보고 싶어요. 혹은 우리 모임 분위기와 잘 맞을 것 같아요."
                className="w-full bg-background border border-card-border rounded-xl px-3.5 py-2.5 text-xs font-semibold h-18 resize-none focus:outline-none focus:border-sage-medium leading-relaxed placeholder:text-foreground/30"
                maxLength={200}
                required
              />
            </div>

            {/* 제출 버튼 */}
            <div className="flex gap-2.5 mt-1">
              <button 
                type="button"
                onClick={() => {
                  setIsRecommendModalOpen(false);
                  setSelectedBook(null);
                  setSearchQuery('');
                  setReasonInput('');
                }}
                className="flex-1 py-2.5 border border-card-border text-foreground/60 rounded-xl text-[10px] font-black hover:bg-foreground/5 cursor-pointer"
              >
                취소
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                책장 추천 등록
              </button>
            </div>
            
            <div className="bg-sage-light/15 border border-sage-light/45 rounded-xl p-3 text-[8.5px] text-sage-dark/85 leading-relaxed font-semibold">
              💡 <b>개인책장 연결 안내</b>: 현재는 프로토타입 단계로, 책장 찾기를 클릭하여 책을 수동 선택하지만 이후 내 개인서재의 &lsquo;독서 기록장&rsquo; 및 &lsquo;희망서 목록&rsquo;과 실시간 매핑되어 한 번의 클릭만으로 손쉽게 건네받아 등록되도록 연결될 예정입니다.
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
