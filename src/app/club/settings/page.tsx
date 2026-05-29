'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../../lib/supabase';
import { BookClub, Book, UserBookProgress } from '../../../types';
import { 
  ArrowLeft, 
  BookOpen, 
  Check, 
  Copy, 
  Edit3, 
  Search, 
  Settings, 
  Users, 
  X,
  UserX,
  MessageSquareQuote,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sliders,
  ChevronRight
} from 'lucide-react';

// 책 검색용 더미 리스트
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

export default function ClubSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [activeClub, setActiveClub] = useState<BookClub | null>(null);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [members, setMembers] = useState<UserBookProgress[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // 모달 제어 상태
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isClubInfoModalOpen, setIsClubInfoModalOpen] = useState(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);

  // 책 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(DUMMY_SEARCH_BOOKS);

  // 모임 정보 수정 상태
  const [clubTitleInput, setClubTitleInput] = useState('');
  const [clubDescInput, setClubDescInput] = useState('');

  // 질문 후보 정렬 상태
  const [sortOrder, setSortOrder] = useState<'likes' | 'latest'>('likes');

  // --- 독서 흐름 및 타임라인 자동 계산용 상태 ---
  const [startDate, setStartDate] = useState('2026-05-01');
  const [endDate, setEndDate] = useState('2026-05-31');
  const [qDays, setQDays] = useState(10);
  const [tDays, setTDays] = useState(5);
  const [stage, setStage] = useState<'reading' | 'question_collecting' | 'discussion' | 'archiving'>('question_collecting');
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [qStartDate, setQStartDate] = useState('2026-05-20');
  const [qEndDate, setQEndDate] = useState('2026-05-25');
  const [tStartDate, setTStartDate] = useState('2026-05-26');
  const [tEndDate, setTEndDate] = useState('2026-05-31');
  const [validationError, setValidationError] = useState('');

  // 1. 초기 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        const { data } = await mockApi.auth.getUser();
        if (!data?.user) {
          router.push('/login');
          return;
        }
        setCurrentUser(data.user);

        const myClubs = await mockApi.clubs.getMyClubs(data.user.id);
        if (myClubs.length > 0) {
          const club = myClubs[0];
          setActiveClub(club);
          setClubTitleInput(club.title);
          setClubDescInput(club.description || '');

          // 로컬스토리지에 저장된 독서 흐름 설정 로드
          const localStart = localStorage.getItem(`bookclub_start_date_${club.id}`);
          const localEnd = localStorage.getItem(`bookclub_end_date_${club.id}`);
          const localQDays = localStorage.getItem(`bookclub_q_days_${club.id}`);
          const localTDays = localStorage.getItem(`bookclub_t_days_${club.id}`);
          const localStage = localStorage.getItem(`bookclub_mock_club_stage_${club.id}`);
          const localIsAdvanced = localStorage.getItem(`bookclub_is_advanced_${club.id}`);
          const localQStart = localStorage.getItem(`bookclub_q_start_date_${club.id}`);
          const localQEnd = localStorage.getItem(`bookclub_q_end_date_${club.id}`);
          const localTStart = localStorage.getItem(`bookclub_t_start_date_${club.id}`);
          const localTEnd = localStorage.getItem(`bookclub_t_end_date_${club.id}`);

          if (localStart) setStartDate(localStart);
          if (localEnd) setEndDate(localEnd);
          if (localQDays) setQDays(Number(localQDays));
          if (localTDays) setTDays(Number(localTDays));
          if (localStage) setStage(localStage as any);
          if (localQStart) setQStartDate(localQStart);
          if (localQEnd) setQEndDate(localQEnd);
          if (localTStart) setTStartDate(localTStart);
          if (localTEnd) setTEndDate(localTEnd);

          const book = await mockApi.books.getByClub(club.id);
          setActiveBook(book);

          if (book) {
            const progresses = await mockApi.progress.getMemberProgressList(club.id, book.id);
            setMembers(progresses);

            const qList = await mockApi.discussion.getQuestions(club.id, book.id);
            setQuestions(qList);
          }
        }
      } catch (err) {
        console.error('설정 데이터 로드 중 오류:', err);
      }
    }
    loadData();
  }, [router]);

  // 날짜 MM.DD 형식 포맷 헬퍼
  const formatDateStr = (date: Date) => {
    if (isNaN(date.getTime())) return '';
    return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  // 자동 흐름 일정 계산 함수
  const getTimelineDates = () => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { reading: '', question: '', discussion: '' };
      }

      if (isAdvanced) {
        const qs = new Date(qStartDate);
        const qe = new Date(qEndDate);
        const ts = new Date(tStartDate);
        const te = new Date(tEndDate);

        let rEndStr = '';
        if (!isNaN(qs.getTime())) {
          const rEnd = new Date(qs);
          rEnd.setDate(qs.getDate() - 1);
          rEndStr = formatDateStr(rEnd);
        }

        return {
          reading: `${formatDateStr(start)} ~ ${rEndStr || '?'}`,
          question: `${isNaN(qs.getTime()) ? '?' : formatDateStr(qs)} ~ ${isNaN(qe.getTime()) ? '?' : formatDateStr(qe)}`,
          discussion: `${isNaN(ts.getTime()) ? '?' : formatDateStr(ts)} ~ ${isNaN(te.getTime()) ? '?' : formatDateStr(te)}`
        };
      } else {
        // 3단계: 생각 나누기 (종료일 기준 tDays일 전부터 종료일까지)
        const tStart = new Date(end);
        tStart.setDate(end.getDate() - tDays + 1);

        // 2단계: 질문 정제 (종료일 기준 qDays일 전부터 토론 시작 전날까지)
        const qStart = new Date(end);
        qStart.setDate(end.getDate() - qDays + 1);
        
        const qEnd = new Date(tStart);
        qEnd.setDate(tStart.getDate() - 1);

        // 1단계: 책에 몰입 (시작일 ~ 질문 정제 시작 전날까지)
        const rEnd = new Date(qStart);
        rEnd.setDate(qStart.getDate() - 1);

        return {
          reading: `${formatDateStr(start)} ~ ${formatDateStr(rEnd)}`,
          question: `${formatDateStr(qStart)} ~ ${formatDateStr(qEnd)}`,
          discussion: `${formatDateStr(tStart)} ~ ${formatDateStr(end)}`
        };
      }
    } catch {
      return { reading: '05.01 ~ 05.14', question: '05.15 ~ 05.25', discussion: '05.26 ~ 05.31' };
    }
  };

  // 자동 계산 값을 수동 입력 필드에도 기본값으로 동기화 (isAdvanced 가 꺼져 있을 때만)
  useEffect(() => {
    if (!isAdvanced) {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const tStart = new Date(end);
          tStart.setDate(end.getDate() - tDays + 1);

          const qStart = new Date(end);
          qStart.setDate(end.getDate() - qDays + 1);
          
          const qEnd = new Date(tStart);
          qEnd.setDate(tStart.getDate() - 1);

          const toYmd = (d: Date) => {
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
          };

          setQStartDate(toYmd(qStart));
          setQEndDate(toYmd(qEnd));
          setTStartDate(toYmd(tStart));
          setTEndDate(toYmd(end));
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, [startDate, endDate, qDays, tDays, isAdvanced]);

  // 실시간 날짜 유효성 체크
  useEffect(() => {
    const validate = () => {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return '읽기 시작일과 종료일을 올바르게 입력해 주세요.';
      }

      // 1. 읽기 시작일은 읽기 종료일보다 이전이어야 함
      if (start >= end) {
        return '읽기 종료일은 시작일보다 뒤여야 해요.';
      }

      if (!isAdvanced) {
        // 자동 설정값 유효성 체크
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // 질문 정리 기간 n일이 토론 기간 m일보다 커야 함
        if (qDays <= tDays) {
          return '질문 정리 기간은 토론 기간보다 길게 설정되어야 해요.';
        }
        
        // 전체 읽기 기간보다 질문/토론 기간이 길면 안 됨
        if (qDays > totalDays) {
          return '전체 읽기 기간보다 질문/토론 기간이 길 수 없어요.';
        }
      } else {
        // 수동 설정 유효성 체크
        const qs = new Date(qStartDate);
        const qe = new Date(qEndDate);
        const ts = new Date(tStartDate);
        const te = new Date(tEndDate);

        if (isNaN(qs.getTime()) || isNaN(qe.getTime()) || isNaN(ts.getTime()) || isNaN(te.getTime())) {
          return '모든 세부 일정을 올바르게 입력해 주세요.';
        }

        // 2. 질문 모집 시작일은 읽기 시작일 이후여야 함
        if (qs < start) {
          return '질문 모집 시작일은 전체 읽기 시작일 이후여야 해요.';
        }

        // 질문 모집 시작일이 종료일보다 이전이어야 함
        if (qs > qe) {
          return '질문 모집 종료일은 시작일보다 뒤여야 해요.';
        }

        // 3. 질문 모집 종료일은 토론 시작일보다 이전이어야 함
        if (qe >= ts) {
          return '토론 시작일은 질문 모집 종료일 이후여야 해요.';
        }

        // 4. 토론 시작일은 토론 종료일보다 이전이어야 함
        if (ts >= te) {
          return '토론 종료일은 시작일보다 뒤여야 해요.';
        }

        // 5. 토론 종료일은 읽기 종료일과 같거나 이전이어야 함
        if (te > end) {
          return '토론 종료일은 전체 읽기 종료일을 넘길 수 없어요.';
        }
      }

      return '';
    };

    setValidationError(validate());
  }, [startDate, endDate, qDays, tDays, qStartDate, qEndDate, tStartDate, tEndDate, isAdvanced]);

  const calculatedTimeline = getTimelineDates();

  // 2. 공유책 변경 기능
  const handleSelectBook = (selectedBook: typeof DUMMY_SEARCH_BOOKS[0]) => {
    if (!activeClub || !activeBook) return;

    try {
      const KEY_BOOKS = 'bookclub_mock_books';
      const storedBooks = localStorage.getItem(KEY_BOOKS);
      const booksList: Book[] = storedBooks ? JSON.parse(storedBooks) : [];

      const updatedBooks = booksList.map(b => {
        if (b.club_id === activeClub.id) {
          return {
            ...b,
            title: selectedBook.title,
            author: selectedBook.author,
            total_pages: selectedBook.total_pages,
            cover_url: selectedBook.cover_url,
            created_at: new Date().toISOString()
          };
        }
        return b;
      });

      localStorage.setItem(KEY_BOOKS, JSON.stringify(updatedBooks));
      
      const matchedBook = updatedBooks.find(b => b.club_id === activeClub.id);
      if (matchedBook) {
        setActiveBook(matchedBook);
        const KEY_PROGRESS = 'bookclub_mock_progress';
        const storedProg = localStorage.getItem(KEY_PROGRESS);
        const progList = storedProg ? JSON.parse(storedProg) : [];
        const resetProgress = progList.map((p: any) => {
          if (p.book_id === activeBook.id) {
            return {
              ...p,
              current_page: 0,
              status: 'reading',
              updated_at: new Date().toISOString()
            };
          }
          return p;
        });
        localStorage.setItem(KEY_PROGRESS, JSON.stringify(resetProgress));
        
        setMembers(prev => prev.map(m => ({
          ...m,
          current_page: 0,
          status: 'reading'
        })));
      }

      setIsBookModalOpen(false);
      alert(`공유 도서가 [${selectedBook.title}]로 변경되었으며, 진척도가 리셋되었습니다.`);
    } catch (err) {
      console.error(err);
      alert('공유 도서 변경에 실패했습니다.');
    }
  };

  // 3. 질문 선정/보류 토글
  const handleToggleQuestionStatus = (questionId: string) => {
    try {
      const KEY_DISCUSSIONS = 'bookclub_mock_discussions';
      const storedQuestions = localStorage.getItem(KEY_DISCUSSIONS);
      const questionsList = storedQuestions ? JSON.parse(storedQuestions) : [];

      const updated = questionsList.map((q: any) => {
        if (q.id === questionId) {
          return {
            ...q,
            status: q.status === 'selected' ? 'suggested' : 'selected'
          };
        }
        return q;
      });

      localStorage.setItem(KEY_DISCUSSIONS, JSON.stringify(updated));

      setQuestions(prev => prev.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            status: q.status === 'selected' ? 'suggested' : 'selected'
          };
        }
        return q;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  // 4. 모임원 내보내기
  const handleKickMember = (memberUserId: string, username: string) => {
    if (memberUserId === currentUser?.id) {
      alert('방장 본인은 모임에서 나갈 수 없습니다.');
      return;
    }

    const confirmKick = confirm(`정말로 [${username}] 님을 내보내시겠습니까?\n다시 초대코드를 입력해야만 참여가 가능합니다.`);
    if (!confirmKick) return;

    try {
      const KEY_MEMBERS = 'bookclub_mock_members';
      const storedMembers = localStorage.getItem(KEY_MEMBERS);
      const membersList = storedMembers ? JSON.parse(storedMembers) : [];

      const updated = membersList.filter((m: any) => !(m.club_id === activeClub?.id && m.user_id === memberUserId));
      localStorage.setItem(KEY_MEMBERS, JSON.stringify(updated));

      setMembers(prev => prev.filter(m => m.user_id !== memberUserId));
      alert(`[${username}] 님이 제외되었습니다.`);
    } catch (err) {
      console.error(err);
      alert('멤버 내보내기에 실패했습니다.');
    }
  };

  // 5. 모임 정보 수정
  const handleUpdateClubInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClub) return;
    if (!clubTitleInput.trim()) {
      alert('모임 이름을 입력해 주세요.');
      return;
    }

    try {
      const KEY_CLUBS = 'bookclub_mock_clubs';
      const storedClubs = localStorage.getItem(KEY_CLUBS);
      const clubsList = storedClubs ? JSON.parse(storedClubs) : [];

      const updated = clubsList.map((c: any) => {
        if (c.id === activeClub.id) {
          return {
            ...c,
            title: clubTitleInput,
            description: clubDescInput
          };
        }
        return c;
      });

      localStorage.setItem(KEY_CLUBS, JSON.stringify(updated));
      
      setActiveClub(prev => prev ? { ...prev, title: clubTitleInput, description: clubDescInput } : null);
      setIsClubInfoModalOpen(false);
      alert('모임 정보가 수정되었습니다.');
    } catch (err) {
      console.error(err);
      alert('모임 정보 수정에 실패했습니다.');
    }
  };

  // 6. 초대 코드 복사
  const handleCopyInviteCode = () => {
    if (!activeClub) return;
    navigator.clipboard.writeText(activeClub.invite_code);
    alert(`초대 코드 [ ${activeClub.invite_code} ] 가 복사되었습니다.`);
  };

  // 독서 흐름 설정 최종 저장 (로컬스토리지 반영)
  const handleSaveFlowSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClub) return;

    if (validationError) {
      return;
    }

    try {
      localStorage.setItem(`bookclub_start_date_${activeClub.id}`, startDate);
      localStorage.setItem(`bookclub_end_date_${activeClub.id}`, endDate);
      localStorage.setItem(`bookclub_q_days_${activeClub.id}`, String(qDays));
      localStorage.setItem(`bookclub_t_days_${activeClub.id}`, String(tDays));
      localStorage.setItem(`bookclub_mock_club_stage_${activeClub.id}`, stage);
      localStorage.setItem(`bookclub_is_advanced_${activeClub.id}`, String(isAdvanced));
      
      localStorage.setItem(`bookclub_q_start_date_${activeClub.id}`, qStartDate);
      localStorage.setItem(`bookclub_q_end_date_${activeClub.id}`, qEndDate);
      localStorage.setItem(`bookclub_t_start_date_${activeClub.id}`, tStartDate);
      localStorage.setItem(`bookclub_t_end_date_${activeClub.id}`, tEndDate);

      setIsFlowModalOpen(false);
      alert('독서 흐름 설정이 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('설정 저장에 실패했습니다.');
    }
  };

  // 도서 실시간 검색
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

  const selectedQuestions = questions.filter(q => q.status === 'selected');
  const suggestedQuestions = questions.filter(q => q.status === 'suggested');

  // 질문 후보 리스트 정렬
  const sortedSuggestedQuestions = [...suggestedQuestions].sort((a, b) => {
    if (sortOrder === 'likes') {
      const aLikes = (a.reaction_curious_count || 0) + (a.reaction_talk_count || 0);
      const bLikes = (b.reaction_curious_count || 0) + (b.reaction_talk_count || 0);
      return bLikes - aLikes;
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // 단계 라벨 한국어 맵
  const getStageLabel = (s: string) => {
    switch (s) {
      case 'reading': return '책에 몰입 중';
      case 'question_collecting': return '질문 정제 중';
      case 'discussion': return '생각 나누기 중';
      case 'archiving': return '결산 준비 중';
      default: return '질문 정제 중';
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-background text-foreground">
      
      {/* 1. 상단 내비바 헤더 */}
      <header className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-card-border px-4 py-3 flex items-center gap-3 z-30">
        <button 
          onClick={() => router.push('/club')}
          className="w-8 h-8 rounded-full border border-card-border flex justify-center items-center text-foreground/75 hover:bg-sage-light/30 transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="flex flex-col min-w-0">
          <span className="text-[7.5px] font-black text-sage-dark uppercase tracking-widest leading-none">독서 흐름 운영 패널</span>
          <h1 className="text-sm font-black text-foreground mt-0.5 truncate">{activeClub?.title || '북클럽'}</h1>
        </div>
        <div className="ml-auto w-7 h-7 bg-sage-light/40 border border-sage-light rounded-lg flex justify-center items-center text-sage-dark">
          <Settings size={13} className="animate-spin-slow" />
        </div>
      </header>

      {/* 2. 모임 정보 수정 UX 카드화 */}
      <div 
        onClick={() => setIsClubInfoModalOpen(true)}
        className="mx-4 mt-4 bg-card-bg border border-card-border hover:border-sage-medium rounded-xl p-3.5 flex flex-col gap-1.5 shadow-xs cursor-pointer transition-all duration-200 hover:shadow-sm group"
      >
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-black text-sage-dark/80 uppercase tracking-widest leading-none">모임 소개 정보</span>
          <span className="text-[9.5px] text-sage-dark font-black flex items-center gap-1 group-hover:text-sage-medium transition-colors">
            <Edit3 size={10} />
            모임 소개 다듬기
          </span>
        </div>
        <p className="text-[10.5px] text-foreground/60 font-semibold leading-relaxed">
          {activeClub?.description || '소개글과 다짐이 채워지는 공간'}
        </p>
      </div>

      {/* 3. 본문 콤팩트 패널 영역 */}
      <main className="p-4 flex flex-col gap-4 pb-10">
        
        {/* 가이드 메시지 배너 */}
        <div className="bg-sage-light/15 border border-sage-light/40 rounded-xl p-3 flex gap-2.5 items-start shadow-xs">
          <CheckCircle2 size={14} className="text-sage-medium mt-0.5 flex-shrink-0" />
          <p className="text-[9px] text-foreground/60 leading-relaxed font-semibold">
            이곳은 독서 흐름을 정돈하는 조용한 운영 공간입니다. 책을 선정하고, 사색 질문을 정제하며 서재를 가꾸어보세요.
          </p>
        </div>

        {/* SECTION 1. 이번 달 독서 흐름 (자동 계산 적용) */}
        <section className="bg-card-bg border border-card-border rounded-xl p-4.5 shadow-sm flex flex-col gap-3.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-6.5 h-6.5 bg-sage-light rounded-lg flex justify-center items-center text-sage-dark">
                <BookOpen size={12} />
              </div>
              <h3 className="text-xs font-black text-foreground">이번 달 독서 흐름</h3>
            </div>
            <span className="bg-sage-medium/15 text-sage-dark border border-sage-medium/20 text-[8.5px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {getStageLabel(stage)}
            </span>
          </div>

          {/* 공유책 및 흐름 조율 버튼 */}
          {activeBook ? (
            <div className="bg-background border border-card-border/80 rounded-xl p-3 flex gap-3 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={activeBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80'} 
                alt="책 표지" 
                className="w-10 h-14 rounded object-cover border border-card-border shadow-xs"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-bold text-sage-dark uppercase leading-none">선정 도서</span>
                <h4 className="text-xs font-black text-foreground truncate mt-0.5">{activeBook.title}</h4>
                <span className="text-[9px] text-foreground/45 font-medium truncate leading-none">{activeBook.author}</span>
              </div>
              <button 
                onClick={() => {
                  setIsAdvanced(false);
                  setIsFlowModalOpen(true);
                }}
                className="px-2.5 py-1.5 bg-sage-medium hover:bg-sage-dark text-white rounded-lg text-[9px] font-black transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Edit3 size={10} />
                흐름 설정
              </button>
            </div>
          ) : (
            <div className="h-14 bg-background border border-dashed border-card-border rounded-xl flex items-center justify-center text-[9px] text-foreground/40 font-medium">
              선택된 책이 없습니다.
            </div>
          )}

          {/* 타임라인 가로 3단 그리드 (계산된 날짜 투영) */}
          <div className="grid grid-cols-3 gap-2 mt-0.5">
            <div className={`flex flex-col items-center p-1.5 border rounded-lg text-center ${
              stage === 'reading' 
                ? 'bg-sage-light/20 border-sage-medium text-sage-dark font-black' 
                : 'bg-background/55 border-card-border/40 text-foreground/50'
            }`}>
              <span className="text-[7.5px] font-black uppercase">1단계: 몰입</span>
              <span className="text-[8.5px] font-semibold mt-0.5">{calculatedTimeline.reading}</span>
            </div>
            <div className={`flex flex-col items-center p-1.5 border rounded-lg text-center ${
              stage === 'question_collecting' 
                ? 'bg-sage-light/20 border-sage-medium text-sage-dark font-black' 
                : 'bg-background/55 border-card-border/40 text-foreground/50'
            }`}>
              <span className="text-[7.5px] font-black uppercase flex items-center gap-0.5">
                {stage === 'question_collecting' && <span className="w-1 h-1 bg-sage-medium rounded-full animate-pulse" />}
                2단계: 정제
              </span>
              <span className="text-[8.5px] font-semibold mt-0.5">{calculatedTimeline.question}</span>
            </div>
            <div className={`flex flex-col items-center p-1.5 border rounded-lg text-center ${
              stage === 'discussion' 
                ? 'bg-sage-light/20 border-sage-medium text-sage-dark font-black' 
                : 'bg-background/55 border-card-border/40 text-foreground/50'
            }`}>
              <span className="text-[7.5px] font-black uppercase flex items-center gap-0.5">
                {stage === 'discussion' && <span className="w-1 h-1 bg-sage-medium rounded-full animate-pulse" />}
                3단계: 나눔
              </span>
              <span className="text-[8.5px] font-semibold mt-0.5">{calculatedTimeline.discussion}</span>
            </div>
          </div>
        </section>

        {/* SECTION 2. 사색 질문 정리 및 큐레이터 */}
        <section className="bg-card-bg border border-card-border rounded-xl p-4.5 shadow-sm flex flex-col gap-3.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-6.5 h-6.5 bg-warm-beige/10 rounded-lg flex justify-center items-center text-warm-beige">
                <MessageSquareQuote size={12} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xs font-black text-foreground">사색 질문 정리</h3>
              </div>
            </div>
            <div className="bg-warm-beige/15 border border-warm-beige/20 text-warm-beige text-[8.5px] font-black px-2 py-0.5 rounded-full">
              선정 {selectedQuestions.length}개
            </div>
          </div>

          {/* 2-A. 선정 질문 요약 (제거 액션 바인딩) */}
          {selectedQuestions.length > 0 ? (
            <div className="bg-sage-light/10 border border-sage-light/45 rounded-xl p-3 flex flex-col gap-1.5">
              <span className="text-[8px] font-black text-sage-dark uppercase tracking-wider">선정된 사색 질문 목록</span>
              <ul className="flex flex-col gap-1.5">
                {selectedQuestions.map((q) => (
                  <li key={q.id} className="text-[10px] text-foreground/80 font-bold leading-normal flex items-center justify-between gap-3 bg-background/55 border border-card-border/30 px-2 py-1 rounded-lg shadow-xs">
                    <div className="flex items-start gap-1 min-w-0">
                      <span className="text-sage-medium flex-shrink-0 font-bold mt-0.5">•</span>
                      <span className="truncate">{q.content}</span>
                    </div>
                    <button 
                      onClick={() => handleToggleQuestionStatus(q.id)}
                      className="flex-shrink-0 text-[8px] text-red-500/70 hover:text-red-500 hover:bg-red-50 font-black px-1.5 py-0.5 border border-red-200/40 rounded transition-all cursor-pointer"
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-sage-light/5 border border-sage-light/35 rounded-xl p-2.5 text-center text-[9px] text-sage-dark/60 font-semibold">
              선정된 질문이 없습니다. 아래 후보 중에서 선정해 주세요.
            </div>
          )}

          {/* 2-B. 질문 후보 divide-y 리스트 및 필터 */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[8.5px] font-extrabold text-foreground/45 uppercase tracking-wider">질문 후보 리스트</span>
              
              {/* 정렬 필터 */}
              <div className="flex bg-foreground/5 p-0.5 rounded-lg border border-card-border/40">
                <button 
                  onClick={() => setSortOrder('likes')}
                  className={`px-2 py-0.5 text-[8.5px] font-black rounded-md transition-all cursor-pointer ${
                    sortOrder === 'likes' 
                      ? 'bg-card-bg text-sage-dark shadow-xs' 
                      : 'text-foreground/45 hover:text-foreground/70'
                  }`}
                >
                  공감순
                </button>
                <button 
                  onClick={() => setSortOrder('latest')}
                  className={`px-2 py-0.5 text-[8.5px] font-black rounded-md transition-all cursor-pointer ${
                    sortOrder === 'latest' 
                      ? 'bg-card-bg text-sage-dark shadow-xs' 
                      : 'text-foreground/45 hover:text-foreground/70'
                  }`}
                >
                  최신순
                </button>
              </div>
            </div>
            
            {sortedSuggestedQuestions.length === 0 ? (
              <div className="text-center py-5 text-[9px] text-foreground/40 font-semibold border border-card-border border-dashed rounded-xl">
                후보 리스트가 비어 있습니다.
              </div>
            ) : (
              <div className="flex flex-col border border-card-border rounded-xl divide-y divide-card-border overflow-hidden">
                {sortedSuggestedQuestions.map(q => {
                  const isSelected = q.status === 'selected';
                  return (
                    <div 
                      key={q.id} 
                      className="bg-card-bg p-3 flex justify-between items-center gap-3.5 hover:bg-background/25 transition-all"
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-[11px] text-foreground/85 leading-relaxed font-semibold text-justify line-clamp-2">
                          {q.content}
                        </p>
                        
                        <div className="flex items-center gap-1.5 text-[8.5px] text-foreground/40 font-medium">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={q.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${q.user_id}`} 
                            alt="제안자" 
                            className="w-3.5 h-3.5 rounded-full object-cover border border-card-border"
                          />
                          <span className="truncate">{q.profile?.username || '익명'}</span>
                          <span>•</span>
                          <span>공감 {q.reaction_curious_count + q.reaction_talk_count}개</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleToggleQuestionStatus(q.id)}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all flex items-center gap-0.5 cursor-pointer active:scale-95 ${
                          isSelected 
                            ? 'bg-warm-beige text-white hover:bg-warm-beige/95 shadow-xs' 
                            : 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10'
                        }`}
                      >
                        {isSelected ? '선정됨' : '보류'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3. 참여자 관리 */}
        <section className="bg-card-bg border border-card-border rounded-xl p-4.5 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-6.5 h-6.5 bg-sage-light rounded-lg flex justify-center items-center text-sage-dark">
                <Users size={12} />
              </div>
              <h3 className="text-xs font-black text-foreground">
                {members.length === 1 ? '서재 관리 및 동반자 초대' : `참여자 관리 (${members.length}명)`}
              </h3>
            </div>
            <button 
              onClick={handleCopyInviteCode}
              className="text-[8.5px] text-sage-dark font-black flex items-center gap-1 border border-sage-light/80 px-2 py-0.5 rounded-lg bg-sage-light/10 hover:bg-sage-light/45 transition-all cursor-pointer"
            >
              <Copy size={9} />
              초대코드
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {members.map(member => {
              const avatarUrl = member.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user_id}`;
              const isMe = member.user_id === currentUser?.id;
              
              return (
                <div key={member.id} className="flex items-center justify-between bg-background border border-card-border/50 rounded-xl p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={avatarUrl} 
                      alt="아바타" 
                      className="w-6 h-6 rounded-full object-cover border border-card-border"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-extrabold text-foreground truncate">
                          {member.profile?.username || '독서가'}
                        </span>
                        {isMe && (
                          <span className="text-[7.5px] bg-sage-medium text-white px-1 rounded-sm font-black scale-95">나</span>
                        )}
                      </div>
                      <span className="text-[8px] text-foreground/40 font-medium">
                        {isMe ? '모임지기(Admin)' : '독서 파트너(Member)'}
                      </span>
                    </div>
                  </div>

                  {!isMe && (
                    <button 
                      onClick={() => handleKickMember(member.user_id, member.profile?.username || '모임원')}
                      className="w-6.5 h-6.5 rounded-md border border-card-border flex justify-center items-center text-foreground/30 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                      title="내보내기"
                    >
                      <UserX size={10} />
                    </button>
                  )}
                </div>
              );
            })}

            {members.length === 1 && (
              <div className="mt-0.5 bg-sage-light/15 border border-sage-light/45 rounded-xl p-2.5 text-[8.5px] text-sage-dark/85 leading-relaxed font-semibold">
                🌱 <b>나만의 아늑한 서재</b>: 현재 혼자서 생각을 기록 중입니다. 초대코드를 공유해 친구와 함께 읽는 공간으로 확장해보세요.
              </div>
            )}
          </div>
        </section>

      </main>

      {/* ==========================================
          MODAL 1: 독서 흐름 조정 바텀 시트 (신규)
      ========================================== */}
      {isFlowModalOpen && (
        <div className="fixed inset-0 bg-foreground/45 backdrop-blur-xs flex items-end justify-center z-50 animate-fade-in">
          <form 
            onSubmit={handleSaveFlowSettings}
            className="bg-card-bg border-t border-card-border w-full max-w-[480px] rounded-t-2xl p-5 shadow-2xl flex flex-col gap-4.5 max-h-[90vh] overflow-y-auto animate-slide-up"
          >
            {/* 시트 헤더 */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-sage-medium" />
                <h3 className="text-xs font-black text-foreground">이번 달 독서 흐름 조정</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsFlowModalOpen(false)}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* SECTION 1: 공유책 (모달 내 모달 전환 연계) */}
            <div className="bg-background border border-card-border rounded-xl p-3 flex flex-col gap-2">
              <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">공유책 설정</span>
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={activeBook?.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80'} 
                    alt="책 표지" 
                    className="w-8 h-11 rounded object-cover border border-card-border"
                  />
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-black text-foreground truncate">{activeBook?.title || '선택 도서'}</h4>
                    <p className="text-[9px] text-foreground/45 font-medium truncate">{activeBook?.author}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setIsBookModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-sage-light/20 border border-sage-light text-sage-dark text-[9px] font-black rounded-lg hover:bg-sage-light/40 transition-all cursor-pointer"
                >
                  책 변경
                </button>
              </div>
            </div>

            {/* SECTION 2: 독서 흐름 (일정 범위) */}
            <div className="bg-background border border-card-border rounded-xl p-3.5 flex flex-col gap-3">
              <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest flex items-center gap-1">
                <Calendar size={11} />
                독서 흐름 일정
              </span>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-foreground/45 uppercase">읽기 시작일</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-foreground/45 uppercase">읽기 종료일</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground"
                    required
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: 자동 흐름 설정 */}
            <div className="bg-background border border-card-border rounded-xl p-3.5 flex flex-col gap-3">
              <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">자동 흐름 설정</span>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-foreground/45 uppercase">질문 정제 기간</label>
                  <div className="flex items-center gap-1 bg-card-bg border border-card-border rounded-lg px-2.5 py-1">
                    <span className="text-[9px] text-foreground/40 font-bold">종료</span>
                    <input 
                      type="number"
                      value={qDays}
                      onChange={(e) => setQDays(Math.max(1, Number(e.target.value)))}
                      className="w-10 bg-transparent text-[10px] font-extrabold focus:outline-none text-center text-foreground"
                      min={1}
                      required
                    />
                    <span className="text-[9px] text-foreground/50 font-bold">일 전 시작</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-foreground/45 uppercase">생각 나누기 기간</label>
                  <div className="flex items-center gap-1 bg-card-bg border border-card-border rounded-lg px-2.5 py-1">
                    <span className="text-[9px] text-foreground/40 font-bold">종료</span>
                    <input 
                      type="number"
                      value={tDays}
                      onChange={(e) => setTDays(Math.max(1, Number(e.target.value)))}
                      className="w-10 bg-transparent text-[10px] font-extrabold focus:outline-none text-center text-foreground"
                      min={1}
                      required
                    />
                    <span className="text-[9px] text-foreground/50 font-bold">일 전 시작</span>
                  </div>
                </div>
              </div>

              <span className="text-[8px] text-foreground/45 leading-relaxed mt-0.5">
                * 읽기 종료일을 기준으로 사색 질문 수집 및 토론 일정의 흐름이 자동 생성됩니다.
              </span>
            </div>

            {/* SECTION 4: 현재 진행 단계 변경 */}
            <div className="bg-background border border-card-border rounded-xl p-3 flex flex-col gap-2.5">
              <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">현재 진행 단계</span>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'reading', label: '1. 책에 몰입' },
                  { value: 'question_collecting', label: '2. 질문 정제' },
                  { value: 'discussion', label: '3. 생각 나누기' },
                  { value: 'archiving', label: '4. 결산 준비' }
                ].map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => setStage(item.value as any)}
                    className={`py-2 px-2.5 rounded-xl text-[10px] font-black text-center transition-all cursor-pointer ${
                      stage === item.value
                        ? 'bg-sage-medium text-white shadow-xs'
                        : 'bg-card-bg border border-card-border text-foreground/55 hover:bg-sage-light/25'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 5: 고급 설정 (세부 일정 수동 조율) */}
            <div className="border border-card-border/60 rounded-xl p-3.5 flex flex-col gap-2.5 bg-background/40 transition-all duration-300">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">고급 설정</span>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span className="text-[9px] text-foreground/60 font-bold">세부 일정 직접 설정</span>
                  <input 
                    type="checkbox"
                    checked={isAdvanced}
                    onChange={(e) => setIsAdvanced(e.target.checked)}
                    className="w-3.5 h-3.5 border border-card-border rounded text-sage-medium focus:ring-sage-medium cursor-pointer"
                  />
                </label>
              </div>

              {/* 아코디언 형태로 펼쳐지는 영역 */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isAdvanced ? 'max-h-[300px] opacity-100 mt-1 pt-2 border-t border-card-border/30' : 'max-h-0 opacity-0 pointer-events-none'
              }`}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-foreground/45 uppercase">질문 모집 시작일</label>
                    <input 
                      type="date"
                      value={qStartDate}
                      onChange={(e) => setQStartDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground w-full"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-foreground/45 uppercase">질문 모집 종료일</label>
                    <input 
                      type="date"
                      value={qEndDate}
                      onChange={(e) => setQEndDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground w-full"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-foreground/45 uppercase">토론 시작일</label>
                    <input 
                      type="date"
                      value={tStartDate}
                      onChange={(e) => setTStartDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground w-full"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-foreground/45 uppercase">토론 종료일</label>
                    <input 
                      type="date"
                      value={tEndDate}
                      onChange={(e) => setTEndDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground w-full"
                      required
                    />
                  </div>
                </div>
                <p className="text-[8px] text-foreground/40 leading-relaxed mt-2.5">
                  * 세부 일정 직접 설정을 활성화하시면 질문 모집 및 토론의 시작/종료일을 커스텀하게 입력하실 수 있습니다.
                </p>
              </div>
            </div>

            {/* 유효성 에러 메시지 표시 */}
            {validationError && (
              <div className="bg-red-500/5 border border-red-500/20 text-red-500/85 text-[9px] font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 animate-fade-in">
                <AlertCircle size={12} className="flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* 저장 버튼 그룹 */}
            <div className="flex gap-2.5 mt-1">
              <button 
                type="button"
                onClick={() => setIsFlowModalOpen(false)}
                className="flex-1 py-2.5 border border-card-border text-foreground/60 rounded-xl text-[10px] font-black hover:bg-foreground/5 cursor-pointer"
              >
                취소
              </button>
              <button 
                type="submit"
                disabled={!!validationError}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black shadow-sm transition-all ${
                  validationError
                    ? 'bg-foreground/10 text-foreground/35 cursor-not-allowed border border-card-border/40'
                    : 'bg-sage-medium hover:bg-sage-dark text-white cursor-pointer'
                }`}
              >
                설정 저장
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ==========================================
          MODAL 2: 공유책 검색 변경 바텀 시트
      ========================================== */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-foreground/45 backdrop-blur-xs flex items-end justify-center z-50 animate-fade-in">
          <div className="bg-card-bg border-t border-card-border w-full max-w-[480px] rounded-t-2xl p-5 shadow-2xl flex flex-col gap-4.5 max-h-[85vh] animate-slide-up">
            
            {/* 시트 헤더 */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">새로운 여정 준비</span>
                <h3 className="text-xs font-black text-foreground mt-0.5">선정 도서 고르기</h3>
              </div>
              <button 
                onClick={() => {
                  setIsBookModalOpen(false);
                  setSearchQuery('');
                  setSearchResults(DUMMY_SEARCH_BOOKS);
                }}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* 검색창 */}
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

            {/* 검색 결과 리스트 */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1">
              <span className="text-[8px] font-extrabold text-foreground/45 uppercase tracking-wider px-0.5">추천 도서 목록</span>
              
              {searchResults.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center gap-1.5">
                  <AlertCircle size={18} className="text-foreground/30" />
                  <span className="text-[9px] text-foreground/40 font-semibold">검색 결과가 없습니다.</span>
                </div>
              ) : (
                searchResults.map((bookItem, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleSelectBook(bookItem)}
                    className="bg-background border border-card-border/70 hover:border-sage-medium rounded-xl p-2.5 flex gap-3.5 items-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={bookItem.cover_url} 
                      alt="책 표지" 
                      className="w-9 h-12 rounded object-cover border border-card-border flex-shrink-0"
                    />
                    <div className="flex-grow min-w-0 flex flex-col">
                      <h4 className="text-[10px] font-black text-foreground group-hover:text-sage-dark transition-colors truncate">{bookItem.title}</h4>
                      <span className="text-[9px] text-foreground/45 font-medium truncate leading-none mt-0.5">{bookItem.author}</span>
                      <span className="text-[8px] font-bold text-sage-medium uppercase mt-1">{bookItem.total_pages}p font-bold</span>
                    </div>
                    <div className="w-5.5 h-5.5 rounded-full bg-sage-light/20 group-hover:bg-sage-medium/20 flex justify-center items-center text-sage-medium opacity-0 group-hover:opacity-100 transition-all">
                      <Check size={10} />
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="bg-sage-light/15 border border-sage-light/45 rounded-xl p-3 text-[8.5px] text-sage-dark leading-relaxed font-semibold">
              ⚠️ 새로운 책을 변경하시면, 기존 책에 대한 모임원들의 개인별 독서 페이지 수는 0페이지로 안전하게 초기화 처리됩니다.
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: 모임 정보 수정 다이얼로그
      ========================================== */}
      {isClubInfoModalOpen && (
        <div className="fixed inset-0 bg-foreground/45 backdrop-blur-xs flex items-center justify-center p-5 z-50 animate-fade-in">
          <form 
            onSubmit={handleUpdateClubInfo}
            className="bg-card-bg border border-card-border w-full max-w-[340px] rounded-2xl p-5 shadow-2xl flex flex-col gap-4.5 animate-scale-up"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-foreground">모임 상세 정보 수정</h3>
              <button 
                type="button"
                onClick={() => setIsClubInfoModalOpen(false)}
                className="w-6 h-6 rounded-full border border-card-border flex justify-center items-center text-foreground/40 hover:bg-foreground/5 cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-foreground/45 uppercase">모임 이름</label>
                <input 
                  type="text" 
                  value={clubTitleInput}
                  onChange={(e) => setClubTitleInput(e.target.value)}
                  placeholder="모임 제목"
                  className="px-3 py-2 bg-background border border-card-border rounded-xl text-xs font-extrabold focus:outline-none focus:border-sage-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-foreground/45 uppercase">소개 및 다짐</label>
                <textarea 
                  value={clubDescInput}
                  onChange={(e) => setClubDescInput(e.target.value)}
                  placeholder="모임 다짐과 소개글"
                  className="px-3 py-2 bg-background border border-card-border rounded-xl text-xs font-semibold h-18 resize-none focus:outline-none focus:border-sage-medium leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-1">
              <button 
                type="button"
                onClick={() => setIsClubInfoModalOpen(false)}
                className="flex-1 py-2 border border-card-border text-foreground/60 rounded-xl text-[10px] font-black hover:bg-foreground/5 cursor-pointer"
              >
                취소
              </button>
              <button 
                type="submit"
                className="flex-1 py-2 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-[10px] font-black shadow-sm cursor-pointer"
              >
                저장하기
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
