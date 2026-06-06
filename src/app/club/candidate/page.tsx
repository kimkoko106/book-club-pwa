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

interface CandidateBook {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  total_pages: number;
  recommended_by: string;
  recommended_by_id: string;
  type: 'read' | 'wish'; // read: 읽어봤어요, wish: 같이 읽고 싶어요
  reason: string;
  reactions: {
    curious: number;
    with_you: number;
  };
  created_at: string;
  isbn?: string;
  isbn13?: string;
  source?: string;
  source_id?: string;
  publisher?: string;
  description?: string;
  published_at?: string;
}

export default function NextBookCandidatePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [candidates, setCandidates] = useState<CandidateBook[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('admin');
  const [filterType, setFilterType] = useState<'all' | 'read' | 'wish'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [activeClubId, setActiveClubId] = useState('club-1');

  // 상세 보기 모달 상태
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateBook | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

  // 후보책 로드 헬퍼
  const loadCandidates = async (clubId: string) => {
    try {
      const data = await mockApi.recommendations.getCandidates(clubId);
      setCandidates(data);
    } catch (err) {
      console.warn('후보 데이터 로드 에러:', err);
    }
  };

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

        // 후보책 조회 호출
        await loadCandidates(clubId);
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
  const handleAddRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) {
      alert('책을 검색해 선택해 주세요.');
      return;
    }
    if (!reasonInput.trim()) {
      alert('추천 이유를 작성해 주세요.');
      return;
    }

    try {
      await mockApi.recommendations.addRecommendation(
        activeClubId,
        currentUser?.id || '',
        {
          title: selectedBook.title,
          author: selectedBook.author,
          cover_url: selectedBook.cover_url || selectedBook.coverUrl || '',
          total_pages: selectedBook.total_pages || selectedBook.totalPages || null,
          isbn: selectedBook.isbn,
          isbn13: selectedBook.isbn13,
          source: selectedBook.source || 'aladin',
          source_id: selectedBook.source_id || selectedBook.sourceId,
          publisher: selectedBook.publisher,
          description: selectedBook.description,
          published_at: selectedBook.published_at || selectedBook.publishedAt
        },
        recommendType,
        reasonInput.trim()
      );

      // 입력값 리셋 및 닫기
      setSelectedBook(null);
      setSearchQuery('');
      setReasonInput('');
      setIsRecommendModalOpen(false);
      alert(`[${selectedBook.title}] 도서가 다음 책 후보로 추천 등록되었습니다.`);

      // 데이터 재로드
      await loadCandidates(activeClubId);
    } catch (err) {
      console.warn('추천 등록 실패:', err);
      alert('추천 등록에 실패했습니다.');
    }
  };

  // 4. 공감(반응) 기능
  const handleReaction = async (candidateId: string, reactKey: 'curious' | 'with_you') => {
    try {
      const dbType = reactKey === 'curious' ? 'curious' : 'wish';
      await mockApi.recommendations.addReaction(candidateId, dbType);

      // 만약 상세 보기 모달이 켜져있다면 모달 내부의 수치도 동기화 갱신해줌
      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate(prev => prev ? {
          ...prev,
          reactions: {
            ...prev.reactions,
            [reactKey]: prev.reactions[reactKey] + 1
          }
        } : null);
      }

      await loadCandidates(activeClubId);
    } catch (err) {
      console.warn('공감 처리 실패:', err);
    }
  };

  // 5. 방장 흐름: 다음 공유책으로 선택 (Supabase / 로컬 Mock API 누적 생성으로 실연동)
  const handleSelectAsNextBook = async (cand: CandidateBook, targetType: 'current' | 'next' = 'current') => {
    setSelectErrorMsg(null);

    if (targetType === 'current') {
      try {
        setIsSelecting(true);
        const currentBookEntry = await mockApi.clubs.getMonthlyBook(activeClubId);

        if (currentBookEntry && currentBookEntry.stage !== 'recap' && currentBookEntry.stage !== 'archived') {
          setIsSelecting(false);
          const confirmChoice = confirm(
            `현재 진행 중인 공유책이 아직 결산되지 않았습니다.\n새 책으로 교체하면 현재 책은 지난 이야기에 보관되지 않습니다.\n\n그래도 교체하시겠어요?`
          );
          if (!confirmChoice) return;
          setIsSelecting(true);
        } else {
          setIsSelecting(false);
          const confirmChoice = confirm(`[${cand.title}] 도서를 현재 진행중인 공유도서로 선정하시겠습니까?\n진행도가 0페이지로 초기화됩니다.`);
          if (!confirmChoice) return;
          setIsSelecting(true);
        }
      } catch (err) {
        console.warn('현재 도서 상태 조회 실패:', err);
      }
    } else {
      const confirmChoice = confirm(`[${cand.title}] 도서를 다음 예정 공유도서로 선정하시겠습니까?`);
      if (!confirmChoice) return;
      setIsSelecting(true);
    }

    try {
      await mockApi.clubs.selectNextBook(activeClubId, {
        title: cand.title,
        author: cand.author,
        cover_url: cand.cover_url,
        total_pages: cand.total_pages,
        isbn: cand.isbn,
        isbn13: cand.isbn13,
        source: cand.source,
        source_id: cand.source_id,
        publisher: cand.publisher,
        description: cand.description,
        published_at: cand.published_at
      }, targetType);

      if (targetType === 'next') {
        alert(`[${cand.title}] 도서가 다음 예정 공유도서로 선정되었어요. 🌱`);
      } else {
        alert(`[${cand.title}] 도서가 현재 진행중인 공유도서로 선정되었어요. ✨`);
      }

      if (isDetailModalOpen) {
        setIsDetailModalOpen(false);
        setSelectedCandidate(null);
      }

      router.push('/club');
    } catch (err: any) {
      console.warn('[Candidate] 도서 선정 에러:', err);
      let errMsg = '도서 선정 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      if (err.message?.includes('이미 현재 진행중인 공유도서예요') || err.message?.includes('이미 이번 달 공유책이에요')) {
        errMsg = '이미 현재 진행중인 공유도서예요.';
      } else if (err.message?.includes('이미 다음 예정 공유도서예요') || err.message?.includes('이미 다음 달 예정 책이에요')) {
        errMsg = '이미 다음 예정 공유도서예요.';
      }
      setSelectErrorMsg(errMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSelecting(false);
    }
  };

  // 필터링 및 정렬 연산
  const filteredCandidates = candidates
    .filter(c => {
      if (filterType === 'all') return true;
      return c.type === filterType;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        const aCount = (a.reactions?.curious || 0) + (a.reactions?.with_you || 0);
        const bCount = (b.reactions?.curious || 0) + (b.reactions?.with_you || 0);
        return bCount - aCount;
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // 상세 보기 모달 열기 헬퍼
  const handleOpenDetail = (cand: CandidateBook) => {
    setSelectedCandidate(cand);
    setIsDetailModalOpen(true);
  };

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
          다음 예정 공유도서로 함께 읽고 싶은 이야기들을 조용히 모아두는 공간입니다. 서로의 책장을 건너다보며 끌리는 흐름을 꺼내어 보세요.
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
            className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all cursor-pointer ${userRole === 'admin'
                ? 'bg-sage-medium text-white shadow-xs'
                : 'text-foreground/50 hover:bg-sage-light/35'
              }`}
          >
            방장
          </button>
          <button
            onClick={() => setUserRole('member')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all cursor-pointer ${userRole === 'member'
                ? 'bg-sage-medium text-white shadow-xs'
                : 'text-foreground/50 hover:bg-sage-light/35'
              }`}
          >
            모임원
          </button>
        </div>
      </div>

      {/* 4. 필터 및 등록 버튼 */}
      <div className="px-4.5 py-2 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
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
                className={`px-2.5 py-1 text-[9.5px] font-black rounded-md transition-all cursor-pointer ${filterType === f.value
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

        {/* 개수 표시 및 정렬 제어 */}
        <div className="flex justify-between items-center px-0.5">
          <span className="text-[10px] text-foreground/45 font-bold">
            등록된 후보 {filteredCandidates.length}개
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy('latest')}
              className={`text-[9.5px] font-bold ${sortBy === 'latest' ? 'text-sage-dark underline' : 'text-foreground/45 hover:text-foreground/70'
                } cursor-pointer`}
            >
              최신순
            </button>
            <span className="text-[9px] text-foreground/20">|</span>
            <button
              onClick={() => setSortBy('popular')}
              className={`text-[9.5px] font-bold ${sortBy === 'popular' ? 'text-sage-dark underline' : 'text-foreground/45 hover:text-foreground/70'
                } cursor-pointer`}
            >
              공감순
            </button>
          </div>
        </div>
      </div>

      {/* 5. 후보 리스트 영역 */}
      <main className="flex-1 px-4.5 pb-20 flex flex-col gap-4.5 mt-2">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-2 border border-card-border border-dashed rounded-2xl">
            <BookOpen size={24} className="text-foreground/20" />
            <span className="text-[10px] text-foreground/40 font-semibold">아직 등록된 다음 책 후보가 없어요.</span>
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

              {/* 책 상단 기본 정보 (클릭 시 상세 모달 오픈) */}
              <div
                onClick={() => handleOpenDetail(cand)}
                className="flex gap-3.5 items-start cursor-pointer hover:opacity-95 transition-opacity"
              >
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
              <div
                onClick={() => handleOpenDetail(cand)}
                className="bg-background/55 border border-card-border/40 rounded-xl p-2.5 cursor-pointer hover:bg-background/80 transition-colors"
              >
                <p className="text-[10px] text-foreground/70 leading-relaxed font-semibold text-justify line-clamp-3">
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
                      {isSelecting ? '선정 중...' : '현재 공유도서 선정'}
                    </button>
                    <button
                      onClick={() => handleSelectAsNextBook(cand, 'next')}
                      disabled={isSelecting}
                      className="px-2.5 py-1.5 border border-sage-dark/60 text-sage-dark/85 hover:bg-sage-dark/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[9px] font-black transition-all cursor-pointer shadow-xs"
                    >
                      {isSelecting ? '선정 중...' : '다음 예정도서 선정'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </main>

      {/* ==========================================
          MODAL: 책 추천 상세 보기 (후보 상세 진입)
      ========================================== */}
      {isDetailModalOpen && selectedCandidate && (
        <div className="fixed inset-0 bg-foreground/45 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card-bg border border-card-border w-full max-w-[420px] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* 상단 닫기 및 타이틀 */}
            <div className="flex justify-between items-center">
              <span className="text-[8.5px] font-black text-sage-dark uppercase tracking-widest">후보 도서 상세 정보</span>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedCandidate(null);
                }}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* 도서 카드 정보 */}
            <div className="flex gap-4 items-start">
              {selectedCandidate.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCandidate.cover_url}
                  alt="표지"
                  className="w-16 h-23 rounded object-cover border border-card-border shadow-md"
                />
              ) : (
                <div className="w-16 h-23 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border flex justify-center items-center text-sage-dark font-black text-xs select-none relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-sage-dark/10" />
                  {selectedCandidate.title.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex gap-1.5 items-center flex-wrap">
                  {selectedCandidate.type === 'read' ? (
                    <span className="bg-sage-medium/15 text-sage-dark border border-sage-medium/20 text-[7.5px] font-extrabold px-1.5 py-0.2 rounded">
                      ✓ 읽어봤어요
                    </span>
                  ) : (
                    <span className="bg-warm-beige/15 text-warm-beige border border-warm-beige/20 text-[7.5px] font-extrabold px-1.5 py-0.2 rounded">
                      📖 같이 읽고 싶어요
                    </span>
                  )}
                  {selectedCandidate.total_pages > 0 && (
                    <span className="text-[8px] text-foreground/45 border border-card-border px-1 py-0.2 rounded font-extrabold">
                      {selectedCandidate.total_pages}쪽
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-foreground mt-1.5 leading-snug">{selectedCandidate.title}</h3>
                <p className="text-[10px] text-foreground/45 font-semibold mt-0.5">{selectedCandidate.author}</p>

                {selectedCandidate.publisher && (
                  <p className="text-[8px] text-foreground/35 font-medium mt-1">출판사: {selectedCandidate.publisher}</p>
                )}
                {selectedCandidate.published_at && (
                  <p className="text-[8px] text-foreground/35 font-medium">출간일: {selectedCandidate.published_at}</p>
                )}
              </div>
            </div>

            {/* 추천 이유 전문 */}
            <div className="flex flex-col gap-1.5 bg-background/55 border border-card-border/40 rounded-xl p-3.5 mt-1">
              <span className="text-[7.5px] font-bold text-foreground/35 uppercase tracking-widest leading-none">추천 사유</span>
              <p className="text-[10.5px] text-foreground/75 leading-relaxed font-semibold text-justify whitespace-pre-wrap">
                {selectedCandidate.reason}
              </p>
            </div>

            {/* 추천자 프로필 */}
            <div className="flex items-center gap-2 px-1">
              <div className="w-5.5 h-5.5 rounded-full bg-sage-light/25 border border-card-border flex justify-center items-center text-sage-dark font-black text-[9px] select-none uppercase">
                {selectedCandidate.recommended_by.charAt(0)}
              </div>
              <span className="text-[9.5px] font-bold text-foreground/60">
                {selectedCandidate.recommended_by} 님이 추천해주셨습니다
              </span>
            </div>

            {/* 공감 표시 및 방장최종선정 */}
            <div className="flex flex-col gap-2 pt-2 border-t border-card-border/30 mt-1">
              <div className="flex gap-2">
                <button
                  onClick={() => handleReaction(selectedCandidate.id, 'curious')}
                  className="flex-1 py-2 bg-background hover:bg-sage-light/10 border border-card-border/60 rounded-xl flex justify-center items-center gap-1.5 transition-all text-[9.5px] font-extrabold text-foreground/60 active:scale-95 cursor-pointer"
                >
                  <HelpCircle size={11} className="text-sage-medium" />
                  <span>궁금해요 {selectedCandidate.reactions.curious}</span>
                </button>
                <button
                  onClick={() => handleReaction(selectedCandidate.id, 'with_you')}
                  className="flex-1 py-2 bg-background hover:bg-sage-light/10 border border-card-border/60 rounded-xl flex justify-center items-center gap-1.5 transition-all text-[9.5px] font-extrabold text-foreground/60 active:scale-95 cursor-pointer"
                >
                  <Heart size={11} className="text-warm-beige" />
                  <span>같이 읽고 싶어요 {selectedCandidate.reactions.with_you}</span>
                </button>
              </div>

              {/* 방장일 때 모달에서도 즉시 선정 가능 */}
              {userRole === 'admin' && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => handleSelectAsNextBook(selectedCandidate, 'current')}
                    disabled={isSelecting}
                    className="flex-1 py-2 bg-sage-light/25 text-sage-dark border border-sage-medium/35 hover:bg-sage-medium hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[9px] font-black transition-all cursor-pointer text-center"
                  >
                    현재 공유도서 선정
                  </button>
                  <button
                    onClick={() => handleSelectAsNextBook(selectedCandidate, 'next')}
                    disabled={isSelecting}
                    className="flex-1 py-2 bg-sage-medium text-white hover:bg-sage-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[9px] font-black transition-all cursor-pointer text-center"
                  >
                    다음 예정도서 선정
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                <h3 className="text-xs font-black text-foreground mt-0.5">다음 예정 공유도서 추천</h3>
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
                        className="bg-background border border-card-border/70 hover:border-sage-medium rounded-xl p-2.5 flex gap-3 items-center cursor-pointer transition-all duration-200"
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
                  className={`py-2 px-2.5 rounded-xl text-[10px] font-black text-center transition-all cursor-pointer ${recommendType === 'read'
                      ? 'bg-sage-medium text-white shadow-xs'
                      : 'bg-background border border-card-border text-foreground/55 hover:bg-sage-light/25'
                    }`}
                >
                  ✓ 읽어봤고 추천해요
                </button>
                <button
                  type="button"
                  onClick={() => setRecommendType('wish')}
                  className={`py-2 px-2.5 rounded-xl text-[10px] font-black text-center transition-all cursor-pointer ${recommendType === 'wish'
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
