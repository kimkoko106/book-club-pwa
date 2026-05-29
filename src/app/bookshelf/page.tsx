'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import { 
  Plus, 
  X, 
  Search, 
  BookOpen, 
  Award, 
  Heart, 
  MessageSquare, 
  Send,
  Library,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface ShelfBook {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  status: 'reading' | 'completed' | 'wish'; // reading: 읽는 중, completed: 다 읽음, wish: 읽고 싶은 책
  progress?: number; // 진행률 (읽는 중 상태일 때만)
  completed_date?: string; // 완독일 (다 읽음 상태일 때만)
  is_recommended: boolean; // 모임 추천 여부 배지
}

interface Memo {
  id: string;
  bookId: string;
  page?: string;
  content: string;
  created_at: string;
}

const INITIAL_SHELF: ShelfBook[] = [
  {
    id: 'shelf-1',
    title: '월든 (Walden)',
    author: '헨리 데이비드 소로',
    cover_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
    status: 'reading',
    progress: 45,
    is_recommended: true
  },
  {
    id: 'shelf-2',
    title: '모순',
    author: '양귀자',
    cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&auto=format&fit=crop&q=80',
    status: 'completed',
    completed_date: '2026.04.28',
    is_recommended: false
  },
  {
    id: 'shelf-3',
    title: '데미안 (Demian)',
    author: '헤르만 헤세',
    cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&auto=format&fit=crop&q=80',
    status: 'reading',
    progress: 70,
    is_recommended: false
  },
  {
    id: 'shelf-4',
    title: '아몬드',
    author: '손원평',
    cover_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300&auto=format&fit=crop&q=80',
    status: 'wish',
    is_recommended: false
  }
];

const INITIAL_MEMOS: Memo[] = [
  {
    id: 'memo-1',
    bookId: 'shelf-1',
    page: '23',
    content: '내가 숲으로 들어간 이유는 삶을 깊게 살고 싶었기 때문이며, 삶이 아닌 것은 모두 물리치고 싶었기 때문이다.',
    created_at: '2026.05.12'
  },
  {
    id: 'memo-2',
    bookId: 'shelf-1',
    page: '84',
    content: '자발적 가난만큼 고귀한 것은 없다. 물질의 과잉 속에서 영혼이 굶주리는 일이야말로 가장 비참하다.',
    created_at: '2026.05.15'
  },
  {
    id: 'memo-3',
    bookId: 'shelf-2',
    page: '142',
    content: '인생은 언제나 선택이다. 하나를 얻으면 반드시 하나를 잃게 되어 있다. 슬프지만 그것이 삶의 모순이다.',
    created_at: '2026.04.20'
  }
];

// 책 추가용 검색 리스트
const DUMMY_SEARCH_BOOKS = [
  {
    title: '아웃라이어 (Outliers)',
    author: '말콤 글래드웰',
    cover_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300&auto=format&fit=crop&q=80',
    total_pages: 360
  },
  {
    title: '인간 실격',
    author: '다자이 오사무',
    cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&auto=format&fit=crop&q=80',
    total_pages: 180
  },
  {
    title: '코스모스 (Cosmos)',
    author: '칼 세이건',
    cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&auto=format&fit=crop&q=80',
    total_pages: 600
  }
];

export default function PersonalBookshelfPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [shelfBooks, setShelfBooks] = useState<ShelfBook[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);

  // 탭 제어
  const [activeTab, setActiveTab] = useState<'reading' | 'completed' | 'wish'>('reading');

  // 아코디언 제어 (펼쳐진 책 ID 리스트)
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

  // 모달 제어
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);

  // 책 추가 입력 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(DUMMY_SEARCH_BOOKS);
  const [selectedAddBook, setSelectedAddBook] = useState<typeof DUMMY_SEARCH_BOOKS[0] | null>(null);
  const [addBookStatus, setAddBookStatus] = useState<'reading' | 'completed' | 'wish'>('reading');
  const [addBookProgress, setAddBookProgress] = useState(0);

  // 모임 추천 입력 상태
  const [selectedRecommendBook, setSelectedRecommendBook] = useState<ShelfBook | null>(null);
  const [recommendType, setRecommendType] = useState<'read' | 'wish'>('read');
  const [recommendReason, setRecommendReason] = useState('');

  // 새 메모 입력 상태
  const [memoPage, setMemoPage] = useState('');
  const [memoContent, setMemoContent] = useState('');

  // 1. 초기 로드
  useEffect(() => {
    async function init() {
      try {
        const { data } = await mockApi.auth.getUser();
        if (!data?.user) {
          window.location.href = '/login';
          return;
        }
        setCurrentUser(data.user);

        // 로컬스토리지 책장 로드
        const storedBooks = localStorage.getItem('bookclub_personal_shelf');
        if (storedBooks) {
          setShelfBooks(JSON.parse(storedBooks));
        } else {
          localStorage.setItem('bookclub_personal_shelf', JSON.stringify(INITIAL_SHELF));
          setShelfBooks(INITIAL_SHELF);
        }

        // 로컬스토리지 메모 로드
        const storedMemos = localStorage.getItem('bookclub_personal_memos');
        if (storedMemos) {
          setMemos(JSON.parse(storedMemos));
        } else {
          localStorage.setItem('bookclub_personal_memos', JSON.stringify(INITIAL_MEMOS));
          setMemos(INITIAL_MEMOS);
        }
      } catch (err) {
        console.error('개인 책장 로딩 오류:', err);
      }
    }
    init();
  }, []);

  // 2. 도서 추가 실시간 검색
  const handleSearchBook = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults(DUMMY_SEARCH_BOOKS);
    } else {
      setSearchResults(DUMMY_SEARCH_BOOKS.filter(b => 
        b.title.toLowerCase().includes(val.toLowerCase()) || 
        b.author.toLowerCase().includes(val.toLowerCase())
      ));
    }
  };

  // 3. 내 책장에 새 도서 등록
  const handleAddBookToShelf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddBook) {
      alert('등록할 책을 선택해 주세요.');
      return;
    }

    const newBook: ShelfBook = {
      id: `shelf-${Date.now()}`,
      title: selectedAddBook.title,
      author: selectedAddBook.author,
      cover_url: selectedAddBook.cover_url,
      status: addBookStatus,
      progress: addBookStatus === 'reading' ? Number(addBookProgress) : undefined,
      completed_date: addBookStatus === 'completed' ? new Date().toISOString().split('T')[0].replace(/-/g, '.') : undefined,
      is_recommended: false
    };

    const updated = [newBook, ...shelfBooks];
    setShelfBooks(updated);
    localStorage.setItem('bookclub_personal_shelf', JSON.stringify(updated));

    // 리셋
    setSelectedAddBook(null);
    setSearchQuery('');
    setAddBookStatus('reading');
    setAddBookProgress(0);
    setIsAddBookModalOpen(false);
    alert(`[${newBook.title}] 도서가 서재에 안전하게 꽂혔습니다.`);
  };

  // 4. 모임에 추천 등록 (실제 다음 책 후보방 연동)
  const handleRecommendToClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecommendBook) return;
    if (!recommendReason.trim()) {
      alert('추천 이유를 적어주세요.');
      return;
    }

    // A. 내 책장 리스트의 추천 배지 업데이트
    const updatedShelf = shelfBooks.map(b => {
      if (b.id === selectedRecommendBook.id) {
        return { ...b, is_recommended: true };
      }
      return b;
    });
    setShelfBooks(updatedShelf);
    localStorage.setItem('bookclub_personal_shelf', JSON.stringify(updatedShelf));

    // B. 다음 책 후보방 스토리지(`bookclub_next_book_candidates`)에 push
    const storedCandidatesStr = localStorage.getItem('bookclub_next_book_candidates');
    const storedCandidates = storedCandidatesStr ? JSON.parse(storedCandidatesStr) : [];
    
    const newCandidate = {
      id: `cand-${Date.now()}`,
      title: selectedRecommendBook.title,
      author: selectedRecommendBook.author,
      cover_url: selectedRecommendBook.cover_url,
      total_pages: 300, // 더미 페이지 수
      recommended_by: currentUser?.username || '익명',
      type: recommendType,
      reason: recommendReason.trim(),
      reactions: { curious: 0, with_you: 0 },
      created_at: new Date().toISOString()
    };

    const nextCandidates = [newCandidate, ...storedCandidates];
    localStorage.setItem('bookclub_next_book_candidates', JSON.stringify(nextCandidates));

    // C. 마무리
    setSelectedRecommendBook(null);
    setRecommendReason('');
    setIsRecommendModalOpen(false);
    alert(`[${selectedRecommendBook.title}] 도서가 '다음 책 후보방'에 성공적으로 추천되었습니다!`);
  };

  // 5. 독서 메모 등록
  const handleAddMemo = (e: React.FormEvent, bookId: string) => {
    e.preventDefault();
    if (!memoContent.trim()) return;

    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      bookId,
      page: memoPage.trim() || undefined,
      content: memoContent.trim(),
      created_at: new Date().toISOString().split('T')[0].replace(/-/g, '.')
    };

    const updated = [newMemo, ...memos];
    setMemos(updated);
    localStorage.setItem('bookclub_personal_memos', JSON.stringify(updated));

    // 리셋
    setMemoPage('');
    setMemoContent('');
  };

  // 카운트 집계
  const countReading = shelfBooks.filter(b => b.status === 'reading').length;
  const countCompleted = shelfBooks.filter(b => b.status === 'completed').length;
  const countWish = shelfBooks.filter(b => b.status === 'wish').length;

  const filteredBooks = shelfBooks.filter(b => b.status === activeTab);

  return (
    <div className="flex-grow flex flex-col bg-background text-foreground min-h-screen">
      
      {/* 1. 헤더 */}
      <header className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-card-border px-4 py-3 flex items-center justify-between z-30">
        <div className="flex flex-col min-w-0">
          <span className="text-[7.5px] font-black text-sage-dark uppercase tracking-widest leading-none">사색의 서재</span>
          <h1 className="text-sm font-black text-foreground mt-0.5 truncate">개인책장</h1>
        </div>
        
        {/* 우측 상단 책 추가 버튼 */}
        <button
          onClick={() => setIsAddBookModalOpen(true)}
          className="w-8 h-8 rounded-xl bg-sage-light/40 border border-sage-light hover:bg-sage-light/60 transition-all flex justify-center items-center text-sage-dark cursor-pointer shadow-xs"
        >
          <Plus size={16} />
        </button>
      </header>

      {/* 2. 감성 소개 배너 */}
      <div className="px-4.5 pt-4 pb-3 flex flex-col gap-1 text-center bg-sage-light/5 border-b border-card-border/30">
        <p className="text-[10px] text-foreground/50 font-medium max-w-[320px] mx-auto leading-relaxed">
          내 독서 여정을 기록하고, 모임원들과 나누고 싶은 다음 이야기를 보관해 두는 아늑한 공간입니다.
        </p>
      </div>

      {/* 3. 프로필 요약 카드 */}
      <div className="p-4.5">
        <div className="bg-card-bg border border-card-border rounded-2xl p-4.5 flex items-center gap-4.5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-sage-light/10 rounded-full translate-x-10 -translate-y-10" />
          
          {/* 아바타 */}
          <div className="w-12 h-12 rounded-full border border-card-border bg-sage-light/30 flex justify-center items-center text-sage-dark font-black text-xs">
            {currentUser?.username.substring(0, 2) || '서재'}
          </div>

          <div className="flex-1 flex flex-col gap-1.5 z-10">
            <h3 className="text-xs font-black text-foreground">{currentUser?.username || '책방지기'} 님의 독서 기록</h3>
            
            {/* 수치 카운팅 격자 */}
            <div className="flex gap-4.5 text-[8.5px] font-extrabold text-foreground/45">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-sage-dark">{countReading}권</span>
                <span>읽는 중</span>
              </div>
              <div className="flex flex-col border-l border-card-border/80 pl-4.5">
                <span className="text-[10px] font-black text-sage-dark">{countCompleted}권</span>
                <span>다 읽음</span>
              </div>
              <div className="flex flex-col border-l border-card-border/80 pl-4.5">
                <span className="text-[10px] font-black text-sage-dark">{countWish}권</span>
                <span>읽고 싶음</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 탭 Segmented Control */}
      <div className="px-4.5 pb-2">
        <div className="flex bg-foreground/5 p-0.5 rounded-xl border border-card-border/40">
          {[
            { value: 'reading', label: '읽는 중' },
            { value: 'completed', label: '다 읽음' },
            { value: 'wish', label: '읽고 싶은 책' }
          ].map(t => (
            <button
              key={t.value}
              onClick={() => {
                setActiveTab(t.value as any);
                setExpandedBookId(null);
              }}
              className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                activeTab === t.value
                  ? 'bg-card-bg text-sage-dark shadow-xs'
                  : 'text-foreground/45 hover:text-foreground/75'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. 책 리스트 및 아코디언 메모 */}
      <main className="flex-grow px-4.5 pb-24 flex flex-col gap-4">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-2 border border-card-border border-dashed rounded-2xl bg-card-bg/25">
            <Library size={24} className="text-foreground/25 animate-pulse" />
            <span className="text-[10px] text-foreground/45 font-semibold">이 탭의 책꽂이가 비어 있습니다.</span>
            <button
              onClick={() => setIsAddBookModalOpen(true)}
              className="text-[9px] text-sage-dark font-black underline mt-1"
            >
              첫 책 꽂기
            </button>
          </div>
        ) : (
          filteredBooks.map(book => {
            const isExpanded = expandedBookId === book.id;
            const bookMemos = memos.filter(m => m.bookId === book.id);

            return (
              <div 
                key={book.id}
                className="bg-card-bg border border-card-border rounded-2xl shadow-xs overflow-hidden flex flex-col transition-all duration-300"
              >
                {/* 5-A. 책 카드 정보 본문 */}
                <div className="p-4 flex gap-3.5 items-start relative">
                  
                  {/* 모임 추천 배지 */}
                  {book.is_recommended && (
                    <div className="absolute top-0 right-0 bg-sage-medium/20 text-sage-dark text-[7px] font-black px-1.5 py-0.5 rounded-bl-lg border-l border-b border-card-border">
                      🌲 모임에 추천한 책
                    </div>
                  )}

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={book.cover_url} 
                    alt="책표지" 
                    className="w-11 h-15 rounded object-cover border border-card-border shadow-xs flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-between h-15 pr-6">
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-black text-foreground truncate">{book.title}</h4>
                      <p className="text-[9.5px] text-foreground/45 font-semibold truncate mt-0.5">{book.author}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center text-[8.5px] font-bold text-foreground/40 mt-1">
                      {book.status === 'reading' && (
                        <span className="text-sage-dark font-extrabold bg-sage-light/20 px-1 rounded-xs">
                          읽는 중 · {book.progress}%
                        </span>
                      )}
                      {book.status === 'completed' && (
                        <span className="text-warm-beige font-extrabold bg-warm-beige/10 px-1 rounded-xs">
                          완독 · {book.completed_date}
                        </span>
                      )}
                      {book.status === 'wish' && (
                        <span className="text-foreground/40 font-extrabold bg-foreground/5 px-1 rounded-xs">
                          읽고 싶음
                        </span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare size={10} />
                        사색 메모 {bookMemos.length}개
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5-B. 조용한 카드 조율 메뉴 (추천하기 / 아코디언 버튼) */}
                <div className="px-4 pb-3 flex justify-between gap-3 border-t border-card-border/30 pt-3.5 bg-background/25">
                  <div className="flex gap-2">
                    {/* 모임 추천 액션 */}
                    <button
                      onClick={() => {
                        setSelectedRecommendBook(book);
                        setRecommendType(book.status === 'wish' ? 'wish' : 'read');
                        setIsRecommendModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-background hover:bg-sage-light/10 border border-card-border/60 rounded-lg text-[9px] font-black text-sage-dark transition-all shadow-xs cursor-pointer"
                    >
                      {book.is_recommended ? '다시 추천하기' : '🌲 모임에 추천'}
                    </button>
                  </div>

                  {/* 아코디언 토글 버튼 */}
                  <button
                    onClick={() => setExpandedBookId(isExpanded ? null : book.id)}
                    className="px-2 py-1 bg-background hover:bg-foreground/5 border border-card-border/40 rounded-lg text-[9px] font-extrabold text-foreground/50 transition-all flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>메모기록</span>
                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                </div>

                {/* 5-C. 아코디언 내부: 내 사색 메모 목록 및 입력 창 */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isExpanded ? 'max-h-[500px] border-t border-card-border/45 bg-background/50' : 'max-h-0 pointer-events-none'
                }`}>
                  <div className="p-4 flex flex-col gap-3.5">
                    <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">내 사색 문장 일기</span>
                    
                    {/* 메모 리스트 */}
                    {bookMemos.length === 0 ? (
                      <p className="text-[10px] text-center text-foreground/35 py-3 font-semibold">아직 남겨둔 사색이 없습니다.</p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                        {bookMemos.map(memo => (
                          <div 
                            key={memo.id} 
                            className="bg-card-bg border border-card-border/65 rounded-xl p-3 flex flex-col gap-1 text-[10.5px]"
                          >
                            <div className="flex justify-between items-center text-[8px] font-extrabold text-foreground/35">
                              <span>{memo.created_at}</span>
                              {memo.page && <span>p.{memo.page}</span>}
                            </div>
                            <p className="text-foreground/75 leading-relaxed font-semibold text-justify">
                              {memo.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 메모 입력 폼 */}
                    <form 
                      onSubmit={(e) => handleAddMemo(e, book.id)}
                      className="flex flex-col gap-2 pt-2 border-t border-card-border/30"
                    >
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          placeholder="페이지 (선택)"
                          value={memoPage}
                          onChange={(e) => setMemoPage(e.target.value)}
                          className="w-20 px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-semibold focus:outline-none focus:border-sage-medium"
                          min={1}
                        />
                        <input 
                          type="text"
                          placeholder="가장 마음을 흔들었던 문장이나 짧은 사색..."
                          value={memoContent}
                          onChange={(e) => setMemoContent(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-semibold focus:outline-none focus:border-sage-medium placeholder:text-foreground/30"
                          maxLength={100}
                          required
                        />
                        <button
                          type="submit"
                          className="w-8 h-8 bg-sage-medium hover:bg-sage-dark text-white rounded-lg flex justify-center items-center shadow-xs cursor-pointer flex-shrink-0"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </main>

      {/* ==========================================
          MODAL 1: 내 책장에 책 추가 Bottom Sheet
      ========================================== */}
      {isAddBookModalOpen && (
        <div className="fixed inset-0 bg-foreground/45 backdrop-blur-xs flex items-end justify-center z-50 animate-fade-in">
          <form 
            onSubmit={handleAddBookToShelf}
            className="bg-card-bg border-t border-card-border w-full max-w-[480px] rounded-t-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-slide-up"
          >
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">새로운 책꽂이 채우기</span>
                <h3 className="text-xs font-black text-foreground mt-0.5">내 책장에 책 추가</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsAddBookModalOpen(false);
                  setSelectedAddBook(null);
                  setSearchQuery('');
                  setAddBookStatus('reading');
                }}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* Step 1: 책 검색 선택 */}
            {!selectedAddBook ? (
              <div className="flex flex-col gap-3">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest font-extrabold">도서 찾기</span>
                <div className="relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={handleSearchBook}
                    placeholder="추천하고 싶은 도서명 또는 작가 입력..."
                    className="w-full bg-background border border-card-border rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-sage-medium placeholder:text-foreground/30"
                  />
                  <Search size={13} className="absolute left-3.5 top-3 text-foreground/35" />
                </div>

                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                  {searchResults.map((bookItem, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedAddBook(bookItem)}
                      className="bg-background border border-card-border/70 hover:border-sage-medium rounded-xl p-2 flex gap-3 items-center cursor-pointer transition-all duration-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={bookItem.cover_url} 
                        alt="표지" 
                        className="w-7 h-10 rounded object-cover border border-card-border flex-shrink-0"
                      />
                      <div className="flex-grow min-w-0">
                        <h4 className="text-[10px] font-black text-foreground truncate">{bookItem.title}</h4>
                        <span className="text-[9px] text-foreground/45 font-medium truncate leading-none mt-0.5">{bookItem.author}</span>
                      </div>
                      <span className="text-[8.5px] font-bold text-sage-medium px-2 py-0.5 bg-sage-light/20 rounded-md">선택</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* 선택된 책 노출 */
              <div className="bg-background border border-card-border rounded-xl p-3 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={selectedAddBook.cover_url} 
                    alt="표지" 
                    className="w-8 h-11 rounded object-cover border border-card-border"
                  />
                  <div className="min-w-0">
                    <h4 className="text-[10.5px] font-black text-foreground truncate">{selectedAddBook.title}</h4>
                    <p className="text-[9px] text-foreground/45 font-medium truncate">{selectedAddBook.author}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedAddBook(null)}
                  className="text-[8.5px] text-red-500 font-black border border-red-200/50 hover:bg-red-50 px-2 py-0.5 rounded transition-all cursor-pointer"
                >
                  다시 선택
                </button>
              </div>
            )}

            {/* Step 2: 책 상태 선택 */}
            <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">책을 읽는 현 상태</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'reading', label: '읽는 중' },
                  { value: 'completed', label: '다 읽음' },
                  { value: 'wish', label: '읽고 싶음' }
                ].map(item => (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => setAddBookStatus(item.value as any)}
                    className={`py-2 rounded-xl text-[9.5px] font-black text-center transition-all cursor-pointer ${
                      addBookStatus === item.value
                        ? 'bg-sage-medium text-white shadow-xs'
                        : 'bg-background border border-card-border text-foreground/55 hover:bg-sage-light/25'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: 진행률 (읽는 중 선택 시 노출) */}
            {addBookStatus === 'reading' && (
              <div className="flex flex-col gap-2 animate-fade-in">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">현재 진행률 (%)</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="range"
                    min={0}
                    max={100}
                    value={addBookProgress}
                    onChange={(e) => setAddBookProgress(Number(e.target.value))}
                    className="flex-1 accent-sage-medium cursor-pointer"
                  />
                  <span className="text-xs font-black text-foreground w-8 text-right">{addBookProgress}%</span>
                </div>
              </div>
            )}

            {/* 제출 버튼 */}
            <div className="flex gap-2.5 mt-2">
              <button 
                type="button"
                onClick={() => {
                  setIsAddBookModalOpen(false);
                  setSelectedAddBook(null);
                  setSearchQuery('');
                  setAddBookStatus('reading');
                }}
                className="flex-1 py-2.5 border border-card-border text-foreground/60 rounded-xl text-[10px] font-black hover:bg-foreground/5 cursor-pointer"
              >
                취소
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                내 서재에 등록
              </button>
            </div>
            
            <div className="bg-sage-light/15 border border-sage-light/45 rounded-xl p-3 text-[8.5px] text-sage-dark/85 leading-relaxed font-semibold">
              💡 <b>검색 기능 안내</b>: 본 팝업은 더미 검색 데이터 연동으로 코스모스, 인간실격, 아웃라이어 등의 검색을 시뮬레이션할 수 있는 감성 아카이브 컴포넌트입니다.
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL 2: 모임에 책 추천 Bottom Sheet
      ========================================== */}
      {isRecommendModalOpen && selectedRecommendBook && (
        <div className="fixed inset-0 bg-foreground/45 backdrop-blur-xs flex items-end justify-center z-50 animate-fade-in">
          <form 
            onSubmit={handleRecommendToClub}
            className="bg-card-bg border-t border-card-border w-full max-w-[480px] rounded-t-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-slide-up"
          >
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">책장에서 건네는 이야기</span>
                <h3 className="text-xs font-black text-foreground mt-0.5">다음 책 후보방에 등록</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setSelectedRecommendBook(null);
                  setRecommendReason('');
                  setIsRecommendModalOpen(false);
                }}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* 책 정보 */}
            <div className="bg-background border border-card-border rounded-xl p-3 flex gap-3 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedRecommendBook.cover_url} 
                alt="책 표지" 
                className="w-8 h-11 rounded object-cover border border-card-border"
              />
              <div className="min-w-0">
                <h4 className="text-[10.5px] font-black text-foreground truncate">{selectedRecommendBook.title}</h4>
                <p className="text-[9px] text-foreground/45 font-medium truncate">{selectedRecommendBook.author}</p>
              </div>
            </div>

            {/* 추천 유형 */}
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

            {/* 추천 사유 기입 */}
            <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest font-extrabold">모임원들에게 건네고 싶은 한마디</span>
              <textarea 
                value={recommendReason}
                onChange={(e) => setRecommendReason(e.target.value)}
                placeholder="예: 이 책은 고요히 독서하며 자아를 정밀하게 마주할 수 있어 깊은 토론에 어울릴 것 같습니다."
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
                  setSelectedRecommendBook(null);
                  setRecommendReason('');
                  setIsRecommendModalOpen(false);
                }}
                className="flex-1 py-2.5 border border-card-border text-foreground/60 rounded-xl text-[10px] font-black hover:bg-foreground/5 cursor-pointer"
              >
                취소
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                모임에 추천 등록
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => {}} />
    </div>
  );
}
