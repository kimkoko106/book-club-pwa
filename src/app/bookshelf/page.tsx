'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi, isMockMode } from '../../lib/supabase';
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
  Sparkles,
  MoreHorizontal
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
  memo_count?: number; // 사색 메모 누적 개수
}

interface Memo {
  id: string;
  bookId: string;
  page?: string;
  content: string;
  created_at: string;
}

const INITIAL_SHELF: ShelfBook[] = [];

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
  const [bookMemosMap, setBookMemosMap] = useState<{ [bookId: string]: Memo[] }>({});
  const [memoLoadings, setMemoLoadings] = useState<{ [bookId: string]: boolean }>({});
  const [memoErrors, setMemoErrors] = useState<{ [bookId: string]: string }>({});

  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editMemoPage, setEditMemoPage] = useState('');
  const [editMemoContent, setEditMemoContent] = useState('');

  const [isMemoSubmitting, setIsMemoSubmitting] = useState(false);
  const [memoSubmitError, setMemoSubmitError] = useState<{ [bookId: string]: string }>({});

  // DB 읽기 상태관리용 신규 상태
  const [isShelfLoading, setIsShelfLoading] = useState(false);
  const [shelfErrorMsg, setShelfErrorMsg] = useState('');

  // DB CUD 연동용 상태 추가
  const [isAddBookLoading, setIsAddBookLoading] = useState(false);
  const [addBookErrorMsg, setAddBookErrorMsg] = useState('');
  
  const [isEditBookLoading, setIsEditBookLoading] = useState(false);
  const [editBookErrorMsg, setEditBookErrorMsg] = useState('');

  const [isDeleteBookLoading, setIsDeleteBookLoading] = useState(false);
  const [deleteBookErrorMsg, setDeleteBookErrorMsg] = useState('');

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
  const [isDirectInput, setIsDirectInput] = useState(false);
  const [directTitle, setDirectTitle] = useState('');
  const [directAuthor, setDirectAuthor] = useState('');
  const [directCoverUrl, setDirectCoverUrl] = useState('');

  // 책장 정리 및 수정/삭제 팝업용 상태
  const [activeMenuBook, setActiveMenuBook] = useState<ShelfBook | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRecommendEditOpen, setIsRecommendEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentClubBook, setCurrentClubBook] = useState<{ title: string; author: string } | null>(null);

  // 책 수정 입력 상태
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editStatus, setEditStatus] = useState<'reading' | 'completed' | 'wish'>('reading');
  const [editProgress, setEditProgress] = useState(0);
  const [editIsRecommended, setEditIsRecommended] = useState(false);
  const [editRecommendType, setEditRecommendType] = useState<'read' | 'wish'>('read');
  const [editRecommendReason, setEditRecommendReason] = useState('');

  // 모임 추천 입력 상태
  const [selectedRecommendBook, setSelectedRecommendBook] = useState<ShelfBook | null>(null);
  const [recommendType, setRecommendType] = useState<'read' | 'wish'>('read');
  const [recommendReason, setRecommendReason] = useState('');

  // 새 메모 입력 상태
  const [memoPage, setMemoPage] = useState('');
  const [memoContent, setMemoContent] = useState('');

  // DB 및 로컬 책장 데이터 조회 함수
  const loadShelfData = async (userId: string) => {
    setIsShelfLoading(true);
    setShelfErrorMsg('');
    try {
      // API(Supabase 또는 Mock) 호출을 통해 단일화된 조회 수행
      const dbBooks = await mockApi.books.getUserBooks(userId);
      setShelfBooks(dbBooks);
      
      // 기존 추가/수정/삭제 로컬 동작 시뮬레이션용 데이터가 로컬 스토리지에 유지되도록 동기화
      localStorage.setItem('bookclub_personal_shelf', JSON.stringify(dbBooks));
    } catch (err) {
      console.error('책장 로딩 실패:', err);
      setShelfErrorMsg('책장을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsShelfLoading(false);
    }
  };

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

        // 실제 세션 유저 ID 기반으로 책장 로드 진행
        await loadShelfData(data.user.id);



        // 로컬스토리지 모임 공유책 로드
        const storedMockBooks = localStorage.getItem('bookclub_mock_books');
        if (storedMockBooks) {
          const books = JSON.parse(storedMockBooks);
          const clubBook = books.find((b: any) => b.club_id === 'club-1');
          if (clubBook) {
            setCurrentClubBook({ title: clubBook.title, author: clubBook.author });
          }
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
  
  // 파일 이미지 업로드 핸들러 (base64 변환)
  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("이미지 파일 크기가 너무 큽니다. 1MB 이하의 이미지를 업로드해 주세요.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDirectCoverUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 책 정보 수정 모달 오픈
  const handleOpenEdit = (book: ShelfBook) => {
    setActiveMenuBook(book);
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditCoverUrl(book.cover_url || '');
    setEditStatus(book.status);
    setEditProgress(book.progress || 0);
    
    setIsMenuOpen(false);
    setIsEditOpen(true);
  };

  // 모임 추천 수정 모달 오픈
  const handleOpenRecommendEdit = (book: ShelfBook) => {
    setActiveMenuBook(book);
    setEditIsRecommended(book.is_recommended);
    
    // 추천 세부 정보 로드
    const storedCandidatesStr = localStorage.getItem('bookclub_next_book_candidates');
    if (storedCandidatesStr) {
      const candidates = JSON.parse(storedCandidatesStr);
      const matched = candidates.find((c: any) => c.title === book.title && c.author === book.author);
      if (matched) {
        setEditRecommendType(matched.type);
        setEditRecommendReason(matched.reason);
      } else {
        setEditRecommendType('read');
        setEditRecommendReason('');
      }
    } else {
      setEditRecommendType('read');
      setEditRecommendReason('');
    }
    
    setIsMenuOpen(false);
    setIsRecommendEditOpen(true);
  };

  // 도서 정보 수정 처리 저장
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeMenuBook) return;
    if (!editTitle.trim()) {
      setEditBookErrorMsg('책 제목을 입력해 주세요.');
      return;
    }

    setIsEditBookLoading(true);
    setEditBookErrorMsg('');

    try {
      await mockApi.books.updateUserBook(currentUser.id, activeMenuBook.id, {
        title: editTitle.trim(),
        author: editAuthor.trim() || '지은이 없음',
        cover_url: editCoverUrl.trim(),
        status: editStatus,
        progress: Number(editProgress)
      });

      // UI 갱신을 위해 데이터 재로드
      await loadShelfData(currentUser.id);

      setIsEditOpen(false);
      setActiveMenuBook(null);
    } catch (err: any) {
      console.error('책 수정 실패:', err);
      setEditBookErrorMsg(err.message || '책을 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsEditBookLoading(false);
    }
  };

  // 모임 추천 수정 처리 저장
  const handleSaveRecommendEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMenuBook) return;

    // 1. 책장 추천 상태 업데이트
    const updatedShelf = shelfBooks.map(b => {
      if (b.id === activeMenuBook.id) {
        return {
          ...b,
          is_recommended: editIsRecommended
        };
      }
      return b;
    });
    setShelfBooks(updatedShelf);
    localStorage.setItem('bookclub_personal_shelf', JSON.stringify(updatedShelf));

    // 2. 추천방 연동 처리
    const storedCandidatesStr = localStorage.getItem('bookclub_next_book_candidates');
    let candidates = storedCandidatesStr ? JSON.parse(storedCandidatesStr) : [];
    
    if (editIsRecommended) {
      const matchedIndex = candidates.findIndex((c: any) => c.title === activeMenuBook.title && c.author === activeMenuBook.author);
      const newCandidate = {
        id: matchedIndex > -1 ? candidates[matchedIndex].id : `cand-${Date.now()}`,
        title: activeMenuBook.title,
        author: activeMenuBook.author,
        cover_url: activeMenuBook.cover_url || '',
        total_pages: 300,
        recommended_by: currentUser?.username || '익명',
        type: editRecommendType,
        reason: editRecommendReason.trim() || '함께 나누고 싶은 도서입니다.',
        reactions: matchedIndex > -1 ? candidates[matchedIndex].reactions : { curious: 0, with_you: 0 },
        created_at: matchedIndex > -1 ? candidates[matchedIndex].created_at : new Date().toISOString()
      };

      if (matchedIndex > -1) {
        candidates[matchedIndex] = newCandidate;
      } else {
        candidates = [newCandidate, ...candidates];
      }
    } else {
      candidates = candidates.filter((c: any) => !(c.title === activeMenuBook.title && c.author === activeMenuBook.author));
    }
    localStorage.setItem('bookclub_next_book_candidates', JSON.stringify(candidates));

    setIsRecommendEditOpen(false);
    setActiveMenuBook(null);
    alert(`[${activeMenuBook.title}] 모임 추천 설정이 저장되었습니다.`);
  };

  // 도서 삭제 처리
  const handleDeleteBook = async () => {
    if (!currentUser || !activeMenuBook) return;

    setIsDeleteBookLoading(true);
    setDeleteBookErrorMsg('');

    try {
      await mockApi.books.deleteUserBook(currentUser.id, activeMenuBook.id);

      // UI 목록에서 즉시 제거
      setShelfBooks(prev => prev.filter(b => b.id !== activeMenuBook.id));

      setIsDeleteOpen(false);
      setActiveMenuBook(null);
    } catch (err: any) {
      console.error('책 삭제 실패:', err);
      setDeleteBookErrorMsg(err.message || '책을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsDeleteBookLoading(false);
    }
  };

  // 3. 내 책장에 새 도서 등록
  const handleAddBookToShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    let title = '';
    let author = '';
    let cover_url = '';

    if (isDirectInput) {
      if (!directTitle.trim()) {
        setAddBookErrorMsg('책 제목을 입력해 주세요.');
        return;
      }
      title = directTitle.trim();
      author = directAuthor.trim() || '지은이 없음';
      cover_url = directCoverUrl.trim();
    } else {
      if (!selectedAddBook) {
        setAddBookErrorMsg('등록할 책을 선택해 주세요.');
        return;
      }
      title = selectedAddBook.title;
      author = selectedAddBook.author;
      cover_url = selectedAddBook.cover_url;
    }

    setIsAddBookLoading(true);
    setAddBookErrorMsg('');

    try {
      await mockApi.books.addBookToShelf(currentUser.id, {
        title,
        author,
        cover_url,
        status: addBookStatus,
        progress: Number(addBookProgress)
      });

      // UI 갱신을 위해 데이터 재로드
      await loadShelfData(currentUser.id);

      // 리셋
      setSelectedAddBook(null);
      setSearchQuery('');
      setAddBookStatus('reading');
      setAddBookProgress(0);
      setIsDirectInput(false);
      setDirectTitle('');
      setDirectAuthor('');
      setDirectCoverUrl('');
      setIsAddBookModalOpen(false);
    } catch (err: any) {
      console.error('책 추가 실패:', err);
      setAddBookErrorMsg(err.message || '책을 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsAddBookLoading(false);
    }
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

  // 특정 도서의 사색 메모 로드 함수
  const loadMemosForBook = async (bookId: string) => {
    setMemoLoadings(prev => ({ ...prev, [bookId]: true }));
    setMemoErrors(prev => ({ ...prev, [bookId]: '' }));
    try {
      const dbMemos = await mockApi.books.getUserBookMemos(bookId);
      setBookMemosMap(prev => ({ ...prev, [bookId]: dbMemos }));
    } catch (err: any) {
      console.error('메모 로드 실패:', err);
      setMemoErrors(prev => ({ ...prev, [bookId]: '메모를 불러오지 못했어요. 잠시 후 다시 시도해주세요.' }));
    } finally {
      setMemoLoadings(prev => ({ ...prev, [bookId]: false }));
    }
  };

  // 아코디언 토글 및 메모 로드 연동
  const handleToggleAccordion = async (bookId: string) => {
    const isExpanded = expandedBookId === bookId;
    if (isExpanded) {
      setExpandedBookId(null);
    } else {
      setExpandedBookId(bookId);
      await loadMemosForBook(bookId);
    }
  };

  // 5. 독서 메모 등록
  const handleAddMemo = async (e: React.FormEvent, bookId: string) => {
    e.preventDefault();
    if (!memoContent.trim()) return;

    setIsMemoSubmitting(true);
    setMemoSubmitError(prev => ({ ...prev, [bookId]: '' }));

    try {
      const pageVal = memoPage.trim() ? Number(memoPage.trim()) : undefined;
      await mockApi.books.addUserBookMemo(bookId, {
        page: pageVal,
        content: memoContent.trim()
      });

      // 등록 성공 후 메모 리스트 재로드
      await loadMemosForBook(bookId);
      
      // 내 책장 리스트의 누적 메모 개수 표시 실시간 동기화를 위해 도서 목록도 리로드
      if (currentUser) {
        await loadShelfData(currentUser.id);
      }

      // 인풋 초기화
      setMemoPage('');
      setMemoContent('');
    } catch (err: any) {
      console.error('메모 추가 실패:', err);
      setMemoSubmitError(prev => ({ ...prev, [bookId]: err.message || '메모를 저장하지 못했어요. 잠시 후 다시 시도해주세요.' }));
    } finally {
      setIsMemoSubmitting(false);
    }
  };

  // 독서 메모 수정
  const handleUpdateMemo = async (memoId: string, bookId: string) => {
    if (!editMemoContent.trim()) {
      alert('메모 내용을 입력해주세요.');
      return;
    }

    setIsMemoSubmitting(true);
    setMemoSubmitError(prev => ({ ...prev, [bookId]: '' }));

    try {
      const pageVal = editMemoPage.trim() ? Number(editMemoPage.trim()) : undefined;
      await mockApi.books.updateUserBookMemo(memoId, {
        page: pageVal,
        content: editMemoContent.trim()
      });

      // 메모 리스트 재로드
      await loadMemosForBook(bookId);

      setEditingMemoId(null);
      setEditMemoPage('');
      setEditMemoContent('');
    } catch (err: any) {
      console.error('메모 수정 실패:', err);
      setMemoSubmitError(prev => ({ ...prev, [bookId]: err.message || '메모를 수정하지 못했어요. 잠시 후 다시 시도해주세요.' }));
    } finally {
      setIsMemoSubmitting(false);
    }
  };

  // 독서 메모 삭제
  const handleDeleteMemo = async (memoId: string, bookId: string) => {
    const confirmDelete = window.confirm('이 사색 메모를 삭제할까요?');
    if (!confirmDelete) return;

    setIsMemoSubmitting(true);
    setMemoSubmitError(prev => ({ ...prev, [bookId]: '' }));

    try {
      await mockApi.books.deleteUserBookMemo(memoId, bookId);

      // 메모 리스트 재로드
      await loadMemosForBook(bookId);

      // 내 책장의 누적 메모 개수 실시간 동기화
      if (currentUser) {
        await loadShelfData(currentUser.id);
      }
    } catch (err: any) {
      console.error('메모 삭제 실패:', err);
      setMemoSubmitError(prev => ({ ...prev, [bookId]: err.message || '메모를 삭제하지 못했어요. 잠시 후 다시 시도해주세요.' }));
    } finally {
      setIsMemoSubmitting(false);
    }
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
        {isShelfLoading ? (
          <div className="flex-grow flex flex-col justify-center items-center py-16 bg-background">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-sage-medium border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-bold text-sage-dark">책장을 정리하고 있습니다...</span>
            </div>
          </div>
        ) : shelfErrorMsg ? (
          <div className="text-center py-16 flex flex-col items-center gap-2 border border-red-200 border-dashed rounded-2xl bg-red-50/15 px-4">
            <span className="text-[10px] text-red-500 font-semibold leading-relaxed">{shelfErrorMsg}</span>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-2 border border-card-border border-dashed rounded-2xl bg-card-bg/25 px-6">
            <Library size={24} className="text-foreground/25 animate-pulse" />
            <p className="text-[10px] text-foreground/45 font-semibold leading-relaxed">
              아직 책장에 담긴 책이 없어요.<br />
              마음이 가는 책을 하나 담아볼까요?
            </p>
            <button
              onClick={() => setIsAddBookModalOpen(true)}
              className="text-[9px] text-sage-dark font-black underline mt-2 bg-sage-light/20 px-3 py-1.5 rounded-lg border border-sage-medium/30 hover:bg-sage-light/35 transition-colors"
            >
              책 추가하기
            </button>
          </div>
        ) : (
          filteredBooks.map(book => {
            const isExpanded = expandedBookId === book.id;
            const bookMemos = bookMemosMap[book.id] || [];
            const displayMemoCount = book.memo_count !== undefined ? book.memo_count : bookMemos.length;

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

                  {book.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={book.cover_url} 
                      alt="책표지" 
                      className="w-11 h-15 rounded object-cover border border-card-border shadow-xs flex-shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-15 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border/70 flex flex-col justify-between py-2 px-1.5 shadow-xs flex-shrink-0 text-center select-none relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-sage-dark/10" />
                      <span className="text-[9px] font-black text-sage-dark leading-tight line-clamp-2 w-full mt-0.5 px-0.5">
                        {book.title}
                      </span>
                      <span className="text-[7.5px] font-extrabold text-sage-medium/90 truncate w-full px-0.5">
                        {book.author || '지은이 없음'}
                      </span>
                    </div>
                  )}

                  <div className="flex-grow min-w-0 flex flex-col justify-between h-15 pr-6">
                    <div className="min-w-0 relative">
                      <h4 className="text-[11px] font-black text-foreground truncate pr-4">{book.title}</h4>
                      <p className="text-[9.5px] text-foreground/45 font-semibold truncate mt-0.5">{book.author}</p>
                      
                      {/* 더보기 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuBook(book);
                          setIsMenuOpen(true);
                        }}
                        className="absolute -top-1.5 -right-5 w-6 h-6 rounded-full hover:bg-foreground/5 flex justify-center items-center text-foreground/40 hover:text-foreground/70 cursor-pointer transition-all"
                        title="책장 정리"
                      >
                        <MoreHorizontal size={13} />
                      </button>
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
                        사색 메모 {displayMemoCount}개
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
                    onClick={() => handleToggleAccordion(book.id)}
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
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">내 사색 문장 일기</span>
                      {isMemoSubmitting && (
                        <div className="w-2.5 h-2.5 border-2 border-sage-medium border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    
                    {/* 메모 불러오는 로딩 상태 표시 */}
                    {memoLoadings[book.id] ? (
                      <div className="py-6 flex flex-col justify-center items-center gap-2">
                        <div className="w-5 h-5 border-2 border-sage-medium border-t-transparent rounded-full animate-spin" />
                        <span className="text-[8.5px] font-semibold text-sage-dark">사색을 불러오는 중...</span>
                      </div>
                    ) : memoErrors[book.id] ? (
                      <div className="py-4 text-center animate-fade-in">
                        <span className="text-[9.5px] text-red-500 font-semibold">{memoErrors[book.id]}</span>
                      </div>
                    ) : bookMemos.length === 0 ? (
                      <div className="text-center py-5 flex flex-col items-center gap-1.5 border border-dashed border-card-border/40 rounded-xl bg-card-bg/10 animate-fade-in">
                        <p className="text-[10px] text-foreground/45 font-semibold leading-relaxed">
                          아직 남겨둔 사색이 없어요.<br />
                          마음에 걸린 문장이나 생각을 가볍게 남겨보세요.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                        {bookMemos.map(memo => (
                          <div 
                            key={memo.id} 
                            className="bg-card-bg border border-card-border/65 rounded-xl p-3 flex flex-col gap-1 text-[10.5px] relative"
                          >
                            {editingMemoId === memo.id ? (
                              <div className="flex flex-col gap-2.5">
                                <div className="flex gap-2">
                                  <input 
                                    type="number"
                                    value={editMemoPage}
                                    onChange={(e) => setEditMemoPage(e.target.value)}
                                    className="w-16 px-2 py-1 bg-background border border-card-border rounded-lg text-[9.5px] font-semibold text-foreground focus:outline-none focus:border-sage-medium"
                                    placeholder="페이지"
                                    min={1}
                                    disabled={isMemoSubmitting}
                                  />
                                  <input 
                                    type="text"
                                    value={editMemoContent}
                                    onChange={(e) => setEditMemoContent(e.target.value)}
                                    className="flex-1 px-2.5 py-1 bg-background border border-card-border rounded-lg text-[9.5px] font-semibold text-foreground focus:outline-none focus:border-sage-medium"
                                    placeholder="가장 마음에 걸린 문장이나 생각..."
                                    maxLength={100}
                                    required
                                    disabled={isMemoSubmitting}
                                  />
                                </div>
                                <div className="flex justify-end gap-2.5 text-[9px] font-bold">
                                  <button 
                                    type="button" 
                                    disabled={isMemoSubmitting}
                                    onClick={() => {
                                      setEditingMemoId(null);
                                      setEditMemoPage('');
                                      setEditMemoContent('');
                                    }}
                                    className="text-foreground/40 hover:text-foreground/75 cursor-pointer disabled:opacity-50"
                                  >
                                    취소
                                  </button>
                                  <button 
                                    type="button" 
                                    disabled={isMemoSubmitting}
                                    onClick={() => handleUpdateMemo(memo.id, book.id)}
                                    className="text-sage-dark hover:text-sage-medium cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {isMemoSubmitting && editingMemoId === memo.id && (
                                      <div className="w-2 h-2 border border-sage-dark border-t-transparent rounded-full animate-spin" />
                                    )}
                                    저장
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-center text-[8px] font-extrabold text-foreground/35 select-none">
                                  <span>{memo.created_at}</span>
                                  <div className="flex items-center gap-2">
                                    {memo.page && <span>p.{memo.page}</span>}
                                    <span>•</span>
                                    <button 
                                      type="button"
                                      disabled={isMemoSubmitting}
                                      onClick={() => {
                                        setEditingMemoId(memo.id);
                                        setEditMemoPage(memo.page || '');
                                        setEditMemoContent(memo.content);
                                      }}
                                      className="text-foreground/45 hover:text-sage-dark cursor-pointer font-extrabold transition-colors disabled:opacity-50"
                                    >
                                      수정
                                    </button>
                                    <button 
                                      type="button"
                                      disabled={isMemoSubmitting}
                                      onClick={() => handleDeleteMemo(memo.id, book.id)}
                                      className="text-red-500/60 hover:text-red-500 cursor-pointer font-extrabold transition-colors disabled:opacity-50"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </div>
                                <p className="text-foreground/75 leading-relaxed font-semibold text-justify">
                                  {memo.content}
                                </p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 메모 입력 폼 */}
                    <form 
                      onSubmit={(e) => handleAddMemo(e, book.id)}
                      className="flex flex-col gap-2 pt-2 border-t border-card-border/30"
                    >
                      {memoSubmitError[book.id] && (
                        <div className="text-[8.5px] text-red-500 font-semibold mb-1">
                          ⚠️ {memoSubmitError[book.id]}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          placeholder="페이지 (선택)"
                          value={memoPage}
                          onChange={(e) => setMemoPage(e.target.value)}
                          className="w-20 px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-semibold focus:outline-none focus:border-sage-medium disabled:opacity-50"
                          min={1}
                          disabled={isMemoSubmitting}
                        />
                        <input 
                          type="text"
                          placeholder="가장 마음을 흔들었던 문장이나 짧은 사색..."
                          value={memoContent}
                          onChange={(e) => setMemoContent(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-semibold focus:outline-none focus:border-sage-medium placeholder:text-foreground/30 disabled:opacity-50"
                          maxLength={100}
                          required
                          disabled={isMemoSubmitting}
                        />
                        <button
                          type="submit"
                          disabled={isMemoSubmitting}
                          className="w-8 h-8 bg-sage-medium hover:bg-sage-dark text-white rounded-lg flex justify-center items-center shadow-xs cursor-pointer flex-shrink-0 disabled:opacity-50"
                        >
                          {isMemoSubmitting ? (
                            <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send size={12} />
                          )}
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
        <div className="fixed inset-0 z-[100]">
          <div 
            className="absolute inset-0 bg-foreground/45 backdrop-blur-xs animate-fade-in"
            onClick={() => {
              setIsAddBookModalOpen(false);
              setSelectedAddBook(null);
              setSearchQuery('');
              setAddBookStatus('reading');
              setIsDirectInput(false);
              setDirectTitle('');
              setDirectAuthor('');
              setDirectCoverUrl('');
            }}
          />
          <form 
            onSubmit={handleAddBookToShelf}
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card-bg border-t border-card-border rounded-t-2xl p-5 pb-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-slide-up"
            style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">새로운 책꽂이 채우기</span>
                <h3 className="text-xs font-black text-foreground mt-0.5">내 책장에 책 추가</h3>
              </div>
              <button 
                type="button"
                disabled={isAddBookLoading}
                onClick={() => {
                  setIsAddBookModalOpen(false);
                  setSelectedAddBook(null);
                  setSearchQuery('');
                  setAddBookStatus('reading');
                  setIsDirectInput(false);
                  setDirectTitle('');
                  setDirectAuthor('');
                  setDirectCoverUrl('');
                  setAddBookErrorMsg('');
                }}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer disabled:opacity-50"
              >
                <X size={12} />
              </button>
            </div>

            {/* 에러 메시지 인라인 노출 */}
            {addBookErrorMsg && (
              <div className="bg-red-50/15 border border-red-200/50 rounded-xl p-3 text-[9px] text-red-500 font-semibold leading-relaxed animate-fade-in">
                ⚠️ {addBookErrorMsg}
              </div>
            )}

            {/* Step 1: 책 검색 선택 또는 직접 등록 */}
            {!selectedAddBook && !isDirectInput && (
              <div className="flex flex-col gap-3">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest font-extrabold">도서 찾기</span>
                <div className="relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={handleSearchBook}
                    placeholder="추천하고 싶은 도서명 또는 작가 입력..."
                    className="w-full bg-background border border-card-border rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-sage-medium placeholder:text-foreground/30 text-foreground"
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

                {/* 찾는 책이 없나요? 직접 등록하기 버튼 */}
                <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-card-border/30">
                  <span className="text-[8px] text-foreground/40 font-bold">찾는 책이 목록에 없나요?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDirectInput(true);
                      setSelectedAddBook(null);
                    }}
                    className="px-3 py-1 bg-sage-light/10 border border-sage-light text-sage-dark text-[9px] font-black rounded-lg hover:bg-sage-light/30 transition-all cursor-pointer shadow-xs"
                  >
                    직접 입력해서 등록하기
                  </button>
                </div>
              </div>
            )}

            {/* 직접 입력 폼 */}
            {isDirectInput && (
              <div className="flex flex-col gap-3 animate-fade-in bg-background/30 p-3.5 border border-card-border rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">직접 입력 등록</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDirectInput(false);
                      setDirectTitle('');
                      setDirectAuthor('');
                      setDirectCoverUrl('');
                    }}
                    className="text-[9px] text-foreground/40 hover:text-foreground/75 font-bold underline cursor-pointer"
                  >
                    도서 검색으로 돌아가기
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-foreground/45 uppercase">책 제목 *</label>
                    <input 
                      type="text"
                      value={directTitle}
                      onChange={(e) => setDirectTitle(e.target.value)}
                      placeholder="도서 제목을 입력해 주세요 (필수)"
                      className="px-2.5 py-1.5 bg-background border border-card-border rounded-lg text-[10px] font-semibold focus:outline-none focus:border-sage-medium text-foreground w-full"
                      required={isDirectInput}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-foreground/45 uppercase">지은이 (저자)</label>
                    <input 
                      type="text"
                      value={directAuthor}
                      onChange={(e) => setDirectAuthor(e.target.value)}
                      placeholder="저자명을 입력해 주세요 (선택)"
                      className="px-2.5 py-1.5 bg-background border border-card-border rounded-lg text-[10px] font-semibold focus:outline-none focus:border-sage-medium text-foreground w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-foreground/45 uppercase">표지 이미지 (선택)</label>
                    <div className="flex gap-3 items-center mt-1">
                      {directCoverUrl ? (
                        <div className="relative w-12 h-16 rounded object-cover border border-card-border shadow-xs flex-shrink-0 overflow-hidden bg-sage-light/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={directCoverUrl} alt="미리보기" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setDirectCoverUrl('')}
                            className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all cursor-pointer"
                            title="이미지 삭제"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="w-12 h-16 rounded border border-dashed border-card-border/80 hover:border-sage-medium bg-background flex flex-col justify-center items-center cursor-pointer transition-all flex-shrink-0 text-foreground/40 hover:text-sage-dark">
                          <Plus size={14} />
                          <span className="text-[7.5px] font-extrabold mt-1">업로드</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <span className="text-[8px] text-foreground/40 font-semibold leading-relaxed">
                          직접 찍은 사진이나 표지 파일(1MB 이하)을 선택해 주세요.
                        </span>
                        <input 
                          type="url"
                          value={directCoverUrl.startsWith('data:') ? '' : directCoverUrl}
                          onChange={(e) => setDirectCoverUrl(e.target.value)}
                          placeholder="또는 이미지 주소(https://...) 입력"
                          className="px-2.5 py-1 bg-background border border-card-border rounded-lg text-[9.5px] font-semibold focus:outline-none focus:border-sage-medium text-foreground w-full placeholder:text-foreground/30"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 선택된 책 노출 (검색 결과 선택 시) */}
            {selectedAddBook && !isDirectInput && (
              <div className="bg-background border border-card-border rounded-xl p-3 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedAddBook.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={selectedAddBook.cover_url} 
                      alt="표지" 
                      className="w-8 h-11 rounded object-cover border border-card-border"
                    />
                  ) : (
                    <div className="w-8 h-11 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border flex justify-center items-center text-sage-dark font-black text-[10px] select-none flex-shrink-0 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-0.5 h-full bg-sage-dark/10" />
                      {selectedAddBook.title.charAt(0)}
                    </div>
                  )}
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
                disabled={isAddBookLoading}
                onClick={() => {
                  setIsAddBookModalOpen(false);
                  setSelectedAddBook(null);
                  setSearchQuery('');
                  setAddBookStatus('reading');
                  setAddBookErrorMsg('');
                }}
                className="flex-1 py-2.5 border border-card-border text-foreground/60 rounded-xl text-[10px] font-black hover:bg-foreground/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button 
                type="submit"
                disabled={isAddBookLoading}
                className="flex-1 py-2.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddBookLoading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isAddBookLoading ? '등록 중...' : '내 서재에 등록'}
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
        <div className="fixed inset-0 z-[100]">
          <div 
            className="absolute inset-0 bg-foreground/45 backdrop-blur-xs animate-fade-in"
            onClick={() => {
              setSelectedRecommendBook(null);
              setRecommendReason('');
              setIsRecommendModalOpen(false);
            }}
          />
          <form 
            onSubmit={handleRecommendToClub}
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card-bg border-t border-card-border rounded-t-2xl p-5 pb-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-slide-up"
            style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
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
              {selectedRecommendBook.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={selectedRecommendBook.cover_url} 
                  alt="책 표지" 
                  className="w-8 h-11 rounded object-cover border border-card-border"
                />
              ) : (
                <div className="w-8 h-11 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border flex justify-center items-center text-sage-dark font-black text-[10px] select-none flex-shrink-0 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-sage-dark/10" />
                  {selectedRecommendBook.title.charAt(0)}
                </div>
              )}
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

      {/* ==========================================
          MODAL 3: 책장 정리 액션 메뉴 Bottom Sheet
      ========================================== */}
      {isMenuOpen && activeMenuBook && (
        <div className="fixed inset-0 z-[100]">
          <div 
            className="absolute inset-0 bg-foreground/45 backdrop-blur-xs animate-fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card-bg border border-card-border rounded-t-2xl px-5 pt-5 pb-6 shadow-2xl flex flex-col gap-4 max-h-[80vh] overflow-y-auto animate-slide-up"
            style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-card-border/30">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">책장 정리</span>
                <h3 className="text-xs font-black text-foreground mt-0.5 truncate max-w-[280px]">{activeMenuBook.title}</h3>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleOpenEdit(activeMenuBook)}
                className="w-full text-left py-3 px-4.5 bg-background hover:bg-sage-light/10 border border-card-border/60 rounded-xl text-[10.5px] font-bold text-foreground/80 cursor-pointer transition-all flex items-center justify-between"
              >
                <span>✏ 책 정보 수정</span>
                <span className="text-[8px] font-bold text-foreground/35">상태, 진행률, 표지 등</span>
              </button>

              <button
                onClick={() => handleOpenRecommendEdit(activeMenuBook)}
                className="w-full text-left py-3 px-4.5 bg-background hover:bg-sage-light/10 border border-card-border/60 rounded-xl text-[10.5px] font-bold text-foreground/80 cursor-pointer transition-all flex items-center justify-between"
              >
                <span>🌲 모임 추천 설정 수정</span>
                <span className="text-[8px] font-bold text-sage-medium">후보방 코멘트 관리</span>
              </button>

              {currentClubBook && currentClubBook.title === activeMenuBook.title && currentClubBook.author === activeMenuBook.author ? (
                <div className="w-full bg-background/40 border border-card-border/50 rounded-xl py-2 px-4.5 flex flex-col gap-1">
                  <div className="flex items-center gap-3 opacity-30 select-none">
                    <span className="text-[11px] select-none text-rose-800/80">🗑</span>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[10.5px] font-bold text-foreground">내 책장에서 삭제</span>
                      <span className="text-[7.5px] text-foreground/70 font-semibold">책장과 메모에서 제거됩니다</span>
                    </div>
                  </div>
                  <p className="text-[7.5px] text-red-500/80 font-black text-center pt-1 border-t border-card-border/30">
                    ℹ️ 현재 모임 공유책으로 사용 중이라 삭제할 수 없어요.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDeleteOpen(true);
                  }}
                  className="w-full text-left py-2 px-4.5 bg-rose-900/5 hover:bg-rose-900/10 border border-rose-900/15 rounded-xl text-rose-800/90 hover:text-rose-900 cursor-pointer transition-all flex items-center gap-3"
                >
                  <span className="text-[11px] select-none text-rose-800/80">🗑</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10.5px] font-bold">내 책장에서 삭제</span>
                    <span className="text-[7.5px] text-rose-800/60 font-semibold">책장과 메모에서 제거됩니다</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 4: 책 정보 수정 Bottom Sheet
      ========================================== */}
      {isEditOpen && activeMenuBook && (
        <div className="fixed inset-0 z-[100]">
          <div 
            className="absolute inset-0 bg-foreground/45 backdrop-blur-xs animate-fade-in"
            onClick={() => {
              setIsEditOpen(false);
              setActiveMenuBook(null);
            }}
          />
          <form 
            onSubmit={handleSaveEdit}
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card-bg border-t border-card-border rounded-t-2xl p-5 pb-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-slide-up"
            style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">책장에서 다듬기</span>
                <h3 className="text-xs font-black text-foreground mt-0.5">책 정보 수정</h3>
              </div>
              <button 
                type="button"
                disabled={isEditBookLoading}
                onClick={() => {
                  setIsEditOpen(false);
                  setActiveMenuBook(null);
                  setEditBookErrorMsg('');
                }}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer disabled:opacity-50"
              >
                <X size={12} />
              </button>
            </div>

            {/* 에러 메시지 인라인 노출 */}
            {editBookErrorMsg && (
              <div className="bg-red-50/15 border border-red-200/50 rounded-xl p-3 text-[9px] text-red-500 font-semibold leading-relaxed animate-fade-in">
                ⚠️ {editBookErrorMsg}
              </div>
            )}

            {/* 정보 입력 필드 */}
            <div className="flex flex-col gap-3 bg-background/30 p-3.5 border border-card-border rounded-2xl">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-foreground/45 uppercase">책 제목 *</label>
                <input 
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="px-2.5 py-1.5 bg-background border border-card-border rounded-lg text-[10px] font-semibold focus:outline-none focus:border-sage-medium text-foreground w-full"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-foreground/45 uppercase">지은이 (저자)</label>
                <input 
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="px-2.5 py-1.5 bg-background border border-card-border rounded-lg text-[10px] font-semibold focus:outline-none focus:border-sage-medium text-foreground w-full"
                />
              </div>
              
              {/* 이미지 파일 업로드 */}
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-foreground/45 uppercase">표지 이미지 (선택)</label>
                <div className="flex gap-3 items-center mt-1">
                  {editCoverUrl ? (
                    <div className="relative w-12 h-16 rounded object-cover border border-card-border shadow-xs flex-shrink-0 overflow-hidden bg-sage-light/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={editCoverUrl} alt="미리보기" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditCoverUrl('')}
                        className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="w-12 h-16 rounded border border-dashed border-card-border/80 hover:border-sage-medium bg-background flex flex-col justify-center items-center cursor-pointer transition-all flex-shrink-0 text-foreground/40 hover:text-sage-dark">
                      <Plus size={14} />
                      <span className="text-[7.5px] font-extrabold mt-1">업로드</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) {
                              alert("이미지 파일 크기가 너무 큽니다. 1MB 이하의 이미지를 업로드해 주세요.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditCoverUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <span className="text-[8px] text-foreground/40 font-semibold leading-relaxed">
                      새로운 표지 파일(1MB 이하)을 선택해 주세요.
                    </span>
                    <input 
                      type="url"
                      value={editCoverUrl.startsWith('data:') ? '' : editCoverUrl}
                      onChange={(e) => setEditCoverUrl(e.target.value)}
                      placeholder="또는 이미지 주소(https://...) 입력"
                      className="px-2.5 py-1 bg-background border border-card-border rounded-lg text-[9.5px] font-semibold focus:outline-none focus:border-sage-medium text-foreground w-full placeholder:text-foreground/30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 독서 상태 선택 (Segmented Control) */}
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
                    onClick={() => {
                      setEditStatus(item.value as any);
                      if (item.value === 'completed') setEditProgress(100);
                      else if (item.value === 'wish') setEditProgress(0);
                    }}
                    className={`py-2 rounded-xl text-[9.5px] font-black text-center transition-all cursor-pointer ${
                      editStatus === item.value
                        ? 'bg-sage-medium text-white shadow-xs'
                        : 'bg-background border border-card-border text-foreground/55 hover:bg-sage-light/25'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 진행률 (읽는 중 선택 시 노출) */}
            {editStatus === 'reading' && (
              <div className="flex flex-col gap-2 animate-fade-in">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">현재 진행률 (%)</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="range"
                    min={0}
                    max={100}
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                    className="flex-1 accent-sage-medium cursor-pointer"
                  />
                  <span className="text-xs font-black text-foreground w-8 text-right">{editProgress}%</span>
                </div>
              </div>
            )}

            {/* 버튼 영역 */}
            <div className="flex gap-2.5 mt-2">
              <button 
                type="button"
                disabled={isEditBookLoading}
                onClick={() => {
                  setIsEditOpen(false);
                  setActiveMenuBook(null);
                  setEditBookErrorMsg('');
                }}
                className="flex-1 py-2.5 border border-card-border text-foreground/60 rounded-xl text-[10px] font-black hover:bg-foreground/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button 
                type="submit"
                disabled={isEditBookLoading}
                className="flex-1 py-2.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditBookLoading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isEditBookLoading ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL 4-2: 모임 추천 수정 Bottom Sheet
      ========================================== */}
      {isRecommendEditOpen && activeMenuBook && (
        <div className="fixed inset-0 z-[100]">
          <div 
            className="absolute inset-0 bg-foreground/45 backdrop-blur-xs animate-fade-in"
            onClick={() => {
              setIsRecommendEditOpen(false);
              setActiveMenuBook(null);
            }}
          />
          <form 
            onSubmit={handleSaveRecommendEdit}
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card-bg border-t border-card-border rounded-t-2xl p-5 pb-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-slide-up"
            style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">생각 나누기</span>
                <h3 className="text-xs font-black text-foreground mt-0.5">모임 추천 수정</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsRecommendEditOpen(false);
                  setActiveMenuBook(null);
                }}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* 책 기본 프리뷰 */}
            <div className="bg-background border border-card-border rounded-xl p-3 flex gap-2.5 items-center">
              {activeMenuBook.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeMenuBook.cover_url} alt="책" className="w-7 h-10 rounded object-cover border border-card-border" />
              ) : (
                <div className="w-7 h-10 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border flex justify-center items-center text-sage-dark font-black text-[10px] select-none flex-shrink-0 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-sage-dark/10" />
                  {activeMenuBook.title.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h5 className="text-[10px] font-black text-foreground truncate">{activeMenuBook.title}</h5>
                <span className="text-[8.5px] text-foreground/45 font-medium truncate">{activeMenuBook.author}</span>
              </div>
            </div>

            {/* 추천 여부 및 폼 */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center justify-between cursor-pointer py-1.5 border-b border-card-border/30">
                <span className="text-[10px] font-black text-foreground/75">🌲 우리 모임에 이 책을 추천하기</span>
                <input 
                  type="checkbox" 
                  checked={editIsRecommended}
                  onChange={(e) => setEditIsRecommended(e.target.checked)}
                  className="w-4 h-4 accent-sage-medium cursor-pointer"
                />
              </label>

              {/* 추천 활성화 시 세부 정보 설정 */}
              {editIsRecommended ? (
                <div className="flex flex-col gap-3 bg-sage-light/10 border border-sage-light/35 rounded-2xl p-3.5 mt-1 animate-fade-in">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-sage-dark uppercase">추천 사색 유형</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditRecommendType('read')}
                        className={`py-1.5 rounded-lg text-[9px] font-black text-center cursor-pointer transition-all ${
                          editRecommendType === 'read'
                            ? 'bg-sage-medium text-white shadow-xs'
                            : 'bg-background border border-card-border text-foreground/50 hover:bg-sage-light/20'
                        }`}
                      >
                        ✓ 읽어봤고 추천해요
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditRecommendType('wish')}
                        className={`py-1.5 rounded-lg text-[9px] font-black text-center cursor-pointer transition-all ${
                          editRecommendType === 'wish'
                            ? 'bg-warm-beige text-white shadow-xs'
                            : 'bg-background border border-card-border text-foreground/50 hover:bg-warm-beige/10'
                        }`}
                      >
                        📖 같이 읽고 싶어요
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-sage-dark uppercase">추천 한마디 (사유)</span>
                    <textarea 
                      value={editRecommendReason}
                      onChange={(e) => setEditRecommendReason(e.target.value)}
                      placeholder="이 책을 함께 읽고 싶은 이유나 짤막한 사색 구절을 적어주세요."
                      className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-[10px] font-semibold h-15 resize-none focus:outline-none focus:border-sage-medium placeholder:text-foreground/35 text-foreground leading-relaxed"
                      maxLength={150}
                      required={editIsRecommended}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[9.5px] text-foreground/35 font-medium text-center py-4">
                  추천을 켜면 모임의 다음 책 후보방에 자동으로 등록됩니다.
                </p>
              )}
            </div>

            {/* 버튼 영역 */}
            <div className="flex gap-2.5 mt-2">
              <button 
                type="button"
                onClick={() => {
                  setIsRecommendEditOpen(false);
                  setActiveMenuBook(null);
                }}
                className="flex-1 py-2.5 border border-card-border text-foreground/60 rounded-xl text-[10px] font-black hover:bg-foreground/5 cursor-pointer"
              >
                취소
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-[10px] font-black shadow-xs cursor-pointer"
              >
                설정 저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL 5: 책장에서 삭제 확인 팝업
      ========================================== */}
      {isDeleteOpen && activeMenuBook && (
        <div className="fixed inset-0 bg-foreground/45 backdrop-blur-xs flex items-center justify-center z-[100] p-6 animate-fade-in">
          <div className="bg-card-bg border border-card-border w-full max-w-[340px] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div className="text-center flex flex-col gap-1.5">
              <h4 className="text-xs font-black text-foreground">내 책장에서 삭제할까요?</h4>
              <p className="text-[10px] text-foreground/45 font-semibold leading-relaxed">
                이 책에 기록했던 모든 사색 문장 일기와<br />모임 추천 내역도 함께 정리되어 사라집니다.
              </p>
            </div>

            {/* 에러 메시지 인라인 노출 */}
            {deleteBookErrorMsg && (
              <div className="bg-red-50/15 border border-red-200/50 rounded-xl p-3 text-[9px] text-red-500 font-semibold leading-relaxed text-center">
                ⚠️ {deleteBookErrorMsg}
              </div>
            )}

            <div className="bg-sage-light/10 border border-card-border/40 rounded-xl p-3 flex gap-2.5 items-center">
              {activeMenuBook.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeMenuBook.cover_url} alt="책" className="w-7 h-10 rounded object-cover border border-card-border" />
              ) : (
                <div className="w-7 h-10 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border flex justify-center items-center text-sage-dark font-black text-[9px] select-none flex-shrink-0 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-sage-dark/10" />
                  {activeMenuBook.title.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h5 className="text-[10px] font-black text-foreground truncate">{activeMenuBook.title}</h5>
                <span className="text-[8.5px] text-foreground/45 font-medium truncate">{activeMenuBook.author}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button"
                disabled={isDeleteBookLoading}
                onClick={() => {
                  setIsDeleteOpen(false);
                  setActiveMenuBook(null);
                  setDeleteBookErrorMsg('');
                }}
                className="flex-1 py-2 border border-card-border text-foreground/60 rounded-xl text-[9.5px] font-black hover:bg-foreground/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button 
                type="button"
                disabled={isDeleteBookLoading}
                onClick={handleDeleteBook}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[9.5px] font-black shadow-xs cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleteBookLoading && <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isDeleteBookLoading ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => {}} />
    </div>
  );
}
