'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi, isMockMode, supabase, getStageByDates, calculateTimelineDates, parseDateString, formatToLocalYmd, getMbStartEndDates } from '../../../lib/supabase';
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

  // 단계 라벨 한국어 변환
  const getStageLabel = (s: string) => {
    switch (s) {
      case 'reading': return '1단계: 책 읽기 🌱';
      case 'question_collecting': return '2단계: 토론 주제 선정 🗳️';
      case 'discussion': return '3단계: 토론 진행 💬';
      case 'archiving': return '4단계: 결산 회고 🌙';
      case 'archived_recap': return '결산 완료 🌙';
      default: return '책 읽기 🌱';
    }
  };

  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [activeClub, setActiveClub] = useState<BookClub | null>(null);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [nextBook, setNextBook] = useState<Book | null>(null);
  const [nextMonthlyBook, setNextMonthlyBook] = useState<any | null>(null);
  const [members, setMembers] = useState<UserBookProgress[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [editingMbId, setEditingMbId] = useState<string | null>(null); // null: 현재 회차 편집, string: 특정 다음 회차 편집

  // 모달 제어 상태
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isClubInfoModalOpen, setIsClubInfoModalOpen] = useState(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // 책 상세 수정 상태
  const [isBookEditModalOpen, setIsBookEditModalOpen] = useState(false);
  const [editBookTitle, setEditBookTitle] = useState('');
  const [editBookAuthor, setEditBookAuthor] = useState('');
  const [editBookPages, setEditBookPages] = useState<string | number>('');
  const [editBookIsbn13, setEditBookIsbn13] = useState('');
  const [isFetchDetailLoading, setIsFetchDetailLoading] = useState(false);
  const [editBookError, setEditBookError] = useState<string | null>(null);
  const [editBookSuccess, setEditBookSuccess] = useState<string | null>(null);

  // 모달 오픈 시 기존 책 정보 채워넣기
  const openEditBookModal = () => {
    if (isPastEpisode) return; // 과거 회차 수정 금지
    if (activeBook) {
      setEditBookTitle(activeBook.title);
      setEditBookAuthor(activeBook.author || '');
      setEditBookPages(activeBook.total_pages && activeBook.total_pages > 1 ? activeBook.total_pages : '');
      setEditBookIsbn13(activeBook.isbn13 || '');
      setEditBookError(null);
      setEditBookSuccess(null);
      setIsBookEditModalOpen(true);
    }
  };

  // 책 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 과거 회차 여부 및 회차 전체 데이터 상태 추가
  const [isPastEpisode, setIsPastEpisode] = useState(false);
  const [allMbs, setAllMbs] = useState<any[]>([]);
  const [currentMbId, setCurrentMbId] = useState<string | null>(null);

  // 1. 초기 데이터 로드 함수 분리
  const loadData = async () => {
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

        // 모든 회차 리스트 조회
        const mbs = await mockApi.clubs.getAllMonthlyBooks(club.id);
        setAllMbs(mbs);

        // monthly_books 정보 조회 및 로컬 백업
        const monthlyBook = await mockApi.clubs.getMonthlyBook(club.id);
        const nextMb = await mockApi.clubs.getNextMonthlyBook(club.id);
        if (nextMb) {
          setNextMonthlyBook(nextMb);
          setNextBook(nextMb.books);
        } else {
          setNextMonthlyBook(null);
          setNextBook(null);
        }
        let tempStart = '2026-05-01';
        let tempEnd = '2026-05-31';
        let tempQStart = '2026-05-20';
        let tempQEnd = '2026-05-25';
        let tempTStart = '2026-05-26';
        let tempTEnd = '2026-05-31';
        let tempQDays = 10;
        let tempTDays = 5;
        let tempIsAdvanced = false;

        if (monthlyBook) {
          setCurrentMbId(monthlyBook.id);
          if (monthlyBook.timeline_reading) {
            const parts = monthlyBook.timeline_reading.split('~');
            if (parts.length === 2) {
              tempStart = parts[0];
              tempEnd = parts[1];
              localStorage.setItem(`bookclub_start_date_${club.id}`, parts[0]);
              localStorage.setItem(`bookclub_end_date_${club.id}`, parts[1]);
            }
          }
          if (monthlyBook.timeline_question) {
            const parts = monthlyBook.timeline_question.split('~');
            if (parts.length === 2) {
              tempQStart = parts[0];
              tempQEnd = parts[1];
              localStorage.setItem(`bookclub_q_start_date_${club.id}`, parts[0]);
              localStorage.setItem(`bookclub_q_end_date_${club.id}`, parts[1]);
            }
          }
          if (monthlyBook.timeline_discussion) {
            const parts = monthlyBook.timeline_discussion.split('~');
            if (parts.length === 2) {
              tempTStart = parts[0];
              tempTEnd = parts[1];
              localStorage.setItem(`bookclub_t_start_date_${club.id}`, parts[0]);
              localStorage.setItem(`bookclub_t_end_date_${club.id}`, parts[1]);
            }
          }

          // 과거 회차 수정 금지 판단 로직 추가
          const d = new Date();
          const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          let mbEnd: string | null = null;
          if (monthlyBook.timeline_reading) {
            const parts = monthlyBook.timeline_reading.split('~');
            if (parts.length === 2) {
              const parseEnd = parseDateString(parts[1]);
              if (parseEnd) mbEnd = parseEnd.toISOString().split('T')[0];
            }
          }

          if (mbEnd && todayStr > mbEnd) {
            const hasNextStarted = mbs.some((item: any) => {
              if (item.id === monthlyBook.id) return false;
              
              let nextStart: string | null = null;
              if (item.timeline_reading) {
                const p = item.timeline_reading.split('~');
                if (p.length === 2) {
                  const parseStart = parseDateString(p[0]);
                  if (parseStart) nextStart = parseStart.toISOString().split('T')[0];
                }
              }
              
              return nextStart && nextStart > mbEnd! && todayStr >= nextStart;
            });
            
            if (hasNextStarted) {
              setIsPastEpisode(true);
            }
          }
        }

        // 로컬스토리지에 저장된 독서 흐름 설정 로드
        const localStart = localStorage.getItem(`bookclub_start_date_${club.id}`);
        const localEnd = localStorage.getItem(`bookclub_end_date_${club.id}`);
        const localQDays = localStorage.getItem(`bookclub_q_days_${club.id}`);
        const localTDays = localStorage.getItem(`bookclub_t_days_${club.id}`);
        const localIsAdvanced = localStorage.getItem(`bookclub_is_advanced_${club.id}`);
        const localQStart = localStorage.getItem(`bookclub_q_start_date_${club.id}`);
        const localQEnd = localStorage.getItem(`bookclub_q_end_date_${club.id}`);
        const localTStart = localStorage.getItem(`bookclub_t_start_date_${club.id}`);
        const localTEnd = localStorage.getItem(`bookclub_t_end_date_${club.id}`);

        if (localStart) tempStart = localStart;
        if (localEnd) tempEnd = localEnd;
        if (localQDays) tempQDays = Number(localQDays);
        if (localTDays) tempTDays = Number(localTDays);
        if (localIsAdvanced) tempIsAdvanced = localIsAdvanced === 'true';
        if (localQStart) tempQStart = localQStart;
        if (localQEnd) tempQEnd = localQEnd;
        if (localTStart) tempTStart = localTStart;
        if (localTEnd) tempTEnd = localTEnd;

        if (!tempIsAdvanced) {
          const calc = calculateTimelineDates(tempStart, tempEnd, tempQDays, tempTDays, false);
          if (calc) {
            tempQStart = calc.qStartDate;
            tempQEnd = calc.qEndDate;
            tempTStart = calc.tStartDate;
            tempTEnd = calc.tEndDate;
          }
        }

        setStartDate(tempStart);
        setEndDate(tempEnd);
        setQDays(tempQDays);
        setTDays(tempTDays);
        setIsAdvanced(tempIsAdvanced);
        setQStartDate(tempQStart);
        setQEndDate(tempQEnd);
        setTStartDate(tempTStart);
        setTEndDate(tempTEnd);

        const calculated = getStageByDates({
          timeline_reading: `${tempStart}~${tempEnd}`,
          timeline_question: tempQStart && tempQEnd ? `${tempQStart}~${tempQEnd}` : null,
          timeline_discussion: tempTStart && tempTEnd ? `${tempTStart}~${tempTEnd}` : null,
          reading_start_date: tempStart,
          reading_end_date: tempEnd,
          question_start_date: tempQStart,
          question_end_date: tempQEnd,
          discussion_start_date: tempTStart,
          discussion_end_date: tempTEnd
        });
        let uiStage = calculated === 'archived_recap' ? 'archiving' : calculated;
        setStage(uiStage as any);
        localStorage.setItem(`bookclub_mock_club_stage_${club.id}`, uiStage);

        const book = monthlyBook ? monthlyBook.books : null;
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
  };

  useEffect(() => {
    loadData();
  }, [router]);


  // 날짜 간 차이를 계산하는 헬퍼 (일수 단위)
  const getDaysBetween = (startStr: string, endStr: string): number => {
    const start = parseDateString(startStr);
    const end = parseDateString(endStr);
    if (!start || !end) return 1;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const handleOpenFlowModalForCurrentMb = () => {
    if (isPastEpisode) return;
    setEditingMbId(null);

    const curMb = allMbs.find(mb => mb.id === currentMbId);
    if (curMb) {
      if (curMb.timeline_reading) {
        const parts = curMb.timeline_reading.split('~');
        if (parts.length === 2) {
          setStartDate(parts[0]);
          setEndDate(parts[1]);
        }
      }
      let qStart = '';
      let qEnd = '';
      let tStart = '';
      let tEnd = '';
      if (curMb.timeline_question) {
        const parts = curMb.timeline_question.split('~');
        if (parts.length === 2) {
          qStart = parts[0];
          qEnd = parts[1];
        }
      }
      if (curMb.timeline_discussion) {
        const parts = curMb.timeline_discussion.split('~');
        if (parts.length === 2) {
          tStart = parts[0];
          tEnd = parts[1];
        }
      }

      setQStartDate(qStart);
      setQEndDate(qEnd);
      setTStartDate(tStart);
      setTEndDate(tEnd);

      if (qStart && qEnd) {
        setQDays(getDaysBetween(qStart, qEnd));
      }
      if (tStart && tEnd) {
        setTDays(getDaysBetween(tStart, tEnd));
      }
    }

    setIsAdvanced(false);
    setIsFlowModalOpen(true);
  };

  const handleOpenFlowModalForNextMb = () => {
    if (!nextMonthlyBook) return;
    setEditingMbId(nextMonthlyBook.id);

    let tempStart = '';
    let tempEnd = '';

    if (nextMonthlyBook.timeline_reading) {
      const parts = nextMonthlyBook.timeline_reading.split('~');
      if (parts.length === 2) {
        tempStart = parts[0];
        tempEnd = parts[1];
      }
    } else {
      // 현재 회차의 종료일 다음 날로 자동 추천
      const curMb = allMbs.find(mb => mb.id === currentMbId);
      let curEnd: Date | null = null;
      if (curMb && curMb.timeline_reading) {
        const parts = curMb.timeline_reading.split('~');
        if (parts.length === 2) {
          curEnd = parseDateString(parts[1]);
        }
      }

      const baseDate = curEnd ? new Date(curEnd) : new Date();
      if (curEnd) {
        baseDate.setDate(baseDate.getDate() + 1); // 종료일 다음 날
      }
      
      tempStart = formatToLocalYmd(baseDate) || '';
      
      const targetEnd = new Date(baseDate);
      targetEnd.setDate(targetEnd.getDate() + 29); // 30일 뒤
      tempEnd = formatToLocalYmd(targetEnd) || '';
    }

    setStartDate(tempStart);
    setEndDate(tempEnd);

    let qStart = '';
    let qEnd = '';
    let tStart = '';
    let tEnd = '';
    if (nextMonthlyBook.timeline_question) {
      const parts = nextMonthlyBook.timeline_question.split('~');
      if (parts.length === 2) {
        qStart = parts[0];
        qEnd = parts[1];
      }
    }
    if (nextMonthlyBook.timeline_discussion) {
      const parts = nextMonthlyBook.timeline_discussion.split('~');
      if (parts.length === 2) {
        tStart = parts[0];
        tEnd = parts[1];
      }
    }

    // 만약 timeline_question / discussion도 없으면 qDays, tDays 기준으로 자동 계산
    if (!qStart || !qEnd || !tStart || !tEnd) {
      const calc = calculateTimelineDates(tempStart, tempEnd, qDays, tDays, false);
      if (calc) {
        qStart = calc.qStartDate;
        qEnd = calc.qEndDate;
        tStart = calc.tStartDate;
        tEnd = calc.tEndDate;
      }
    }

    setQStartDate(qStart);
    setQEndDate(qEnd);
    setTStartDate(tStart);
    setTEndDate(tEnd);

    if (qStart && qEnd) {
      setQDays(getDaysBetween(qStart, qEnd));
    }
    if (tStart && tEnd) {
      setTDays(getDaysBetween(tStart, tEnd));
    }

    setIsAdvanced(false);
    setIsFlowModalOpen(true);
  };

  // --- 양방향 동기화 핸들러 (calculateTimelineDates 적용) ---
  const handleQDaysChange = (val: number) => {
    setQDays(val);
    const calc = calculateTimelineDates(startDate, endDate, val, tDays, isAdvanced, {
      qStartDate,
      qEndDate,
      tStartDate,
      tEndDate
    });
    if (calc) {
      setQStartDate(calc.qStartDate);
      setQEndDate(calc.qEndDate);
      setTStartDate(calc.tStartDate);
      setTEndDate(calc.tEndDate);
    }
  };

  const handleTDaysChange = (val: number) => {
    setTDays(val);
    const calc = calculateTimelineDates(startDate, endDate, qDays, val, isAdvanced, {
      qStartDate,
      qEndDate,
      tStartDate,
      tEndDate
    });
    if (calc) {
      setQStartDate(calc.qStartDate);
      setQEndDate(calc.qEndDate);
      setTStartDate(calc.tStartDate);
      setTEndDate(calc.tEndDate);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    const calc = calculateTimelineDates(val, endDate, qDays, tDays, isAdvanced, {
      qStartDate,
      qEndDate,
      tStartDate,
      tEndDate
    });
    if (calc) {
      setQStartDate(calc.qStartDate);
      setQEndDate(calc.qEndDate);
      setTStartDate(calc.tStartDate);
      setTEndDate(calc.tEndDate);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    const calc = calculateTimelineDates(startDate, val, qDays, tDays, isAdvanced, {
      qStartDate,
      qEndDate,
      tStartDate,
      tEndDate
    });
    if (calc) {
      setQStartDate(calc.qStartDate);
      setQEndDate(calc.qEndDate);
      setTStartDate(calc.tStartDate);
      setTEndDate(calc.tEndDate);
    }
  };

  const handleQStartDateChange = (val: string) => {
    setQStartDate(val);
    const days = getDaysBetween(val, qEndDate);
    setQDays(days);
  };

  const handleQEndDateChange = (val: string) => {
    setQEndDate(val);
    const days = getDaysBetween(qStartDate, val);
    setQDays(days);
  };

  const handleTStartDateChange = (val: string) => {
    setTStartDate(val);
    const days = getDaysBetween(val, tEndDate);
    setTDays(days);
  };

  const handleTEndDateChange = (val: string) => {
    setTEndDate(val);
    const days = getDaysBetween(tStartDate, val);
    setTDays(days);
  };

  const handleIsAdvancedChange = (checked: boolean) => {
    setIsAdvanced(checked);
    const calc = calculateTimelineDates(startDate, endDate, qDays, tDays, checked, {
      qStartDate,
      qEndDate,
      tStartDate,
      tEndDate
    });
    if (calc) {
      setQStartDate(calc.qStartDate);
      setQEndDate(calc.qEndDate);
      setTStartDate(calc.tStartDate);
      setTEndDate(calc.tEndDate);
    }
  };

  // 날짜 MM.DD 형식 포맷 헬퍼
  const formatDateStr = (date: Date) => {
    if (isNaN(date.getTime())) return '';
    return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatPreviewDate = (dateStr: string) => {
    if (!dateStr) return '??.??';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[1]}.${parts[2]}`;
  };

  const getReadingEndDate = () => {
    const qs = parseDateString(qStartDate);
    if (!qs || isNaN(qs.getTime())) return '';
    qs.setDate(qs.getDate() - 1);
    const year = qs.getFullYear();
    const month = String(qs.getMonth() + 1).padStart(2, '0');
    const day = String(qs.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 자동 흐름 일정 계산 함수
  const getTimelineDates = () => {
    try {
      const calc = calculateTimelineDates(startDate, endDate, qDays, tDays, isAdvanced, {
        qStartDate,
        qEndDate,
        tStartDate,
        tEndDate
      });
      if (!calc) return { reading: '', question: '', discussion: '' };

      const start = parseDateString(calc.startDate);
      const end = parseDateString(calc.endDate);
      const rEnd = parseDateString(calc.rEndDate);
      const qStart = parseDateString(calc.qStartDate);
      const qEnd = parseDateString(calc.qEndDate);
      const tStart = parseDateString(calc.tStartDate);
      const tEnd = parseDateString(calc.tEndDate);

      return {
        reading: `${start ? formatDateStr(start) : ''} ~ ${rEnd ? formatDateStr(rEnd) : ''}`,
        question: `${qStart ? formatDateStr(qStart) : ''} ~ ${qEnd ? formatDateStr(qEnd) : ''}`,
        discussion: `${tStart ? formatDateStr(tStart) : ''} ~ ${tEnd ? formatDateStr(tEnd) : ''}`
      };
    } catch {
      return { reading: '06.01 ~ 06.24', question: '06.25 ~ 06.27', discussion: '06.28 ~ 06.30' };
    }
  };

  // 실시간 날짜 유효성 체크
  useEffect(() => {
    const validate = () => {
      if (!editingMbId && isPastEpisode) {
        return '이미 다음 독서 회차가 시작되어 이전 회차는 수정할 수 없습니다.';
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return '회차 시작일과 종료일을 올바르게 입력해 주세요.';
      }

      if (start >= end) {
        return '회차 종료일은 시작일보다 뒤여야 해요.';
      }

      // 다른 회차들과의 겹침(충돌) 실시간 검사 추가
      if (allMbs.length > 0) {
        const newStart = start.toISOString().split('T')[0];
        const newEnd = end.toISOString().split('T')[0];
        
        for (const mb of allMbs) {
          const selfId = editingMbId || currentMbId;
          if (selfId && mb.id === selfId) continue;

          // 유효하지 않은 회차 제외
          if (!mb.book_id || mb.book_id.trim() === '') continue;
          if (mb.stage === 'recap' || mb.stage === 'archived' || mb.stage === 'cancelled' || mb.stage === 'replaced') continue;
          if (!mb.timeline_reading) continue;
          
          const { startDate: targetStart, endDate: targetEnd } = getMbStartEndDates(mb);
          if (targetStart && targetEnd) {
            if (newStart <= targetEnd && targetStart <= newEnd) {
              const bookTitle = mb.books?.title || '제목 없음';
              let formattedTimeline = '';
              if (mb.timeline_reading) {
                formattedTimeline = mb.timeline_reading.split('~').map((d: string) => {
                  const parts = d.trim().split('-');
                  if (parts.length === 3) return `${Number(parts[1])}.${Number(parts[2])}`;
                  return d;
                }).join(' ~ ');
              }

              if ((!editingMbId || editingMbId === currentMbId) && nextMonthlyBook && mb.id === nextMonthlyBook.id) {
                return `다음 예정 공유도서와 일정이 겹칩니다.\n겹치는 회차:\n${bookTitle}\n${formattedTimeline}`;
              }
              return `다른 회차의 일정과 기간이 겹칩니다.\n겹치는 회차:\n${bookTitle}\n${formattedTimeline}`;
            }
          }
        }
      }

      if (!isAdvanced) {
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (qDays + tDays + 1 > totalDays) {
          return '전체 독서 일정보다 토론 주제 선정 및 토론 기간의 합이 길 수 없습니다.';
        }
      } else {
        const qs = new Date(qStartDate);
        const qe = new Date(qEndDate);
        const ts = new Date(tStartDate);
        const te = new Date(tEndDate);

        if (isNaN(qs.getTime()) || isNaN(qe.getTime()) || isNaN(ts.getTime()) || isNaN(te.getTime())) {
          return '모든 세부 일정을 올바르게 입력해 주세요.';
        }

        if (qs < start) {
          return '토론 주제 선정 시작일은 전체 회차 시작일 이후여야 해요.';
        }

        if (qs > qe) {
          return '토론 주제 선정 종료일은 시작일보다 뒤여야 해요.';
        }

        if (qe >= ts) {
          return '토론 시작일은 토론 주제 선정 종료일 이후여야 해요.';
        }

        if (ts >= te) {
          return '토론 종료일은 시작일보다 뒤여야 해요.';
        }

        if (te >= end) {
          return '토론 종료일은 결산일(전체 종료일) 이전이어야 해요.';
        }
      }

      return '';
    };

    setValidationError(validate());
  }, [startDate, endDate, qDays, tDays, qStartDate, qEndDate, tStartDate, tEndDate, isAdvanced, editingMbId, currentMbId, allMbs, nextMonthlyBook, isPastEpisode]);

  const calculatedTimeline = getTimelineDates();

  // 2. 공유책 변경 기능
  const handleSelectBook = async (selectedBook: any) => {
    if (!activeClub || !activeBook) return;

    setIsActionLoading(true);

    try {
      if (!isMockMode && supabase) {
        // 공용 findOrCreateBook 헬퍼를 사용하여 DB 중복 검사 및 생성 수행
        const { id: targetBookId } = await mockApi.books.findOrCreateBook({
          title: selectedBook.title,
          author: selectedBook.author,
          total_pages: selectedBook.total_pages || selectedBook.totalPages || null,
          cover_url: selectedBook.cover_url || selectedBook.coverUrl,
          isbn: selectedBook.isbn,
          isbn13: selectedBook.isbn13,
          source: selectedBook.source || 'aladin',
          source_id: selectedBook.source_id || selectedBook.sourceId,
          publisher: selectedBook.publisher,
          description: selectedBook.description,
          published_at: selectedBook.published_at || selectedBook.publishedAt
        });

        // 3. monthly_books.book_id 업데이트
        await mockApi.clubs.updateMonthlyBook(activeClub.id, {
          book_id: targetBookId
        });

        // 4. 방장 본인 진행도 리셋 (새 도서의 user_books 레코드를 0p / reading으로 셋팅)
        if (currentUser) {
          console.log('[settings] handleSelectBook resetting progress for admin. userId:', currentUser.id, 'bookId:', targetBookId);
          const { data: ub, error: ubError } = await supabase
            .from('user_books')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('book_id', targetBookId)
            .maybeSingle();

          if (ubError) throw ubError;

          if (ub) {
            console.log('[settings] handleSelectBook updating existing user_books entry. id:', ub.id);
            const { error: updError } = await supabase
              .from('user_books')
              .update({
                current_page: 0,
                status: 'reading',
                updated_at: new Date().toISOString()
              })
              .eq('id', ub.id);

            if (updError) throw updError;
          } else {
            console.log('[settings] handleSelectBook inserting new user_books entry for admin.');
            const { error: insError } = await supabase
              .from('user_books')
              .insert({
                user_id: currentUser.id,
                book_id: targetBookId,
                current_page: 0,
                status: 'reading'
              });

            if (insError) throw insError;
          }
        }

        // 5. 프론트엔드 UI 상태 반영
        const newBookObj: Book = {
          id: targetBookId,
          club_id: activeClub.id,
          title: selectedBook.title,
          author: selectedBook.author,
          total_pages: selectedBook.total_pages,
          cover_url: selectedBook.cover_url,
          created_at: new Date().toISOString()
        };

        setActiveBook(newBookObj);
        setMembers(prev => prev.map(m => ({
          ...m,
          book_id: targetBookId,
          current_page: 0,
          status: 'reading'
        })));

      } else {
        // 로컬 Mock 모드 기존 동작 유지
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
      }

      setIsBookModalOpen(false);
      alert(`공유 도서가 [${selectedBook.title}]로 변경되었으며, 진척도가 리셋되었습니다.`);
    } catch (err: any) {
      const errDetails = {
        function: 'handleSelectBook',
        message: err?.message || err,
        code: err?.code || 'No code',
        details: err?.details || 'No details',
        hint: err?.hint || 'No hint',
        payload: {
          clubId: activeClub?.id,
          book: selectedBook
        }
      };
      console.error('[settings] handleSelectBook error:', errDetails);
      alert(`공유 도서 변경에 실패했습니다.\n\n[상세 에러]\n${errDetails.message} (Code: ${errDetails.code})`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 도서 정보 보완 기능 (알라딘 ItemLookUp 연동)
  const handleEnhanceBookInfo = async () => {
    if (!activeBook) return;
    
    const searchIsbn = editBookIsbn13 || activeBook.isbn13 || activeBook.isbn;
    if (!searchIsbn) {
      setEditBookError('도서의 ISBN 정보가 없어 알라딘 정보를 불러올 수 없습니다. 직접 입력란에 입력해 주세요.');
      return;
    }

    setIsFetchDetailLoading(true);
    setEditBookError(null);
    setEditBookSuccess(null);

    try {
      const response = await fetch(`/api/books/search?lookup=${encodeURIComponent(searchIsbn.trim())}`);
      if (!response.ok) {
        throw new Error('API request failed');
      }
      const data = await response.json();
      const fetchedPages = data.totalPages || data.total_pages;
      
      const updateData: any = {
        description: data.description || activeBook.description || null,
        publisher: data.publisher || activeBook.publisher || null,
        published_at: data.published_at || activeBook.published_at || null,
        cover_url: data.cover_url || activeBook.cover_url || null,
        isbn13: data.isbn13 || activeBook.isbn13 || null,
        isbn: data.isbn || activeBook.isbn || null
      };

      if (fetchedPages && fetchedPages > 1) {
        updateData.total_pages = fetchedPages;
        setEditBookPages(fetchedPages);
      }

      if (!isMockMode && supabase) {
        const { error } = await supabase
          .from('books')
          .update(updateData)
          .eq('id', activeBook.id);
        if (error) throw error;
      } else {
        const KEY_BOOKS = 'bookclub_mock_books';
        const storedBooks = localStorage.getItem(KEY_BOOKS);
        const booksList = storedBooks ? JSON.parse(storedBooks) : [];
        const updated = booksList.map((b: any) => {
          if (b.id === activeBook.id) {
            return { ...b, ...updateData };
          }
          return b;
        });
        localStorage.setItem(KEY_BOOKS, JSON.stringify(updated));
      }

      if (fetchedPages && fetchedPages > 1) {
        setEditBookSuccess('도서 정보가 보완되었어요. ✨');
      } else {
        setEditBookSuccess('일부 정보만 보완되었어요. (페이지 수 누락)');
      }

      // UI 및 activeBook 동기화
      if (currentUser && activeClub) {
        const activeMb = await mockApi.clubs.getMonthlyBook(activeClub.id);
        const updatedBook = activeMb ? activeMb.books : null;
        setActiveBook(updatedBook);
      }
    } catch (err) {
      console.error(err);
      setEditBookError('도서 정보를 불러오지 못했어요. 직접 입력해주세요.');
    } finally {
      setIsFetchDetailLoading(false);
    }
  };

  // 도서 정보 수동 저장
  const handleSaveBookInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook || !activeClub || !currentUser) return;

    setIsActionLoading(true);
    setEditBookError(null);
    setEditBookSuccess(null);

    const pages = Number(editBookPages);
    if (editBookPages !== '' && (isNaN(pages) || pages < 2 || !Number.isInteger(pages))) {
      setEditBookError('총 페이지 수는 2페이지 이상의 정수여야 합니다.');
      setIsActionLoading(false);
      return;
    }

    const updateData: any = {
      title: editBookTitle.trim(),
      author: editBookAuthor.trim(),
      total_pages: editBookPages !== '' ? pages : null,
      isbn13: editBookIsbn13.trim() || null
    };

    try {
      if (!isMockMode && supabase) {
        const { error } = await supabase
          .from('books')
          .update(updateData)
          .eq('id', activeBook.id);
        if (error) throw error;
      } else {
        const KEY_BOOKS = 'bookclub_mock_books';
        const storedBooks = localStorage.getItem(KEY_BOOKS);
        const booksList = storedBooks ? JSON.parse(storedBooks) : [];
        const updated = booksList.map((b: any) => {
          if (b.id === activeBook.id) {
            return { ...b, ...updateData };
          }
          return b;
        });
        localStorage.setItem(KEY_BOOKS, JSON.stringify(updated));
      }

      setIsBookEditModalOpen(false);
      const activeMb = await mockApi.clubs.getMonthlyBook(activeClub.id);
      const updatedBook = activeMb ? activeMb.books : null;
      setActiveBook(updatedBook);
      alert('도서 정보가 저장되었습니다.');
    } catch (err) {
      console.error(err);
      setEditBookError('도서 정보 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3. 질문 선정/보류 토글
  const [actionError, setActionError] = useState('');
  const handleToggleQuestionStatus = async (questionId: string) => {
    const targetQ = questions.find(q => q.id === questionId);
    if (!targetQ) return;

    const nextStatus = targetQ.status === 'selected' ? 'suggested' : 'selected';
    setIsActionLoading(true);
    setActionError('');

    try {
      await mockApi.discussion.updateQuestionStatus(questionId, nextStatus);

      setQuestions(prev => prev.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            status: nextStatus
          };
        }
        return q;
      }));
    } catch (err: any) {
      console.error(err);
      setActionError('질문 선정 상태를 변경하지 못했어요.');
    } finally {
      setIsActionLoading(false);
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

  // 독서 흐름 설정 최종 저장 (로컬스토리지 및 Supabase DB 반영)
  const handleSaveFlowSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClub) return;

    if (validationError) {
      return;
    }

    setSaveError('');
    setIsSaving(true);

    try {
      // timeline range assembly
      const timelineReading = `${startDate}~${endDate}`;
      const timelineQuestion = qStartDate && qEndDate ? `${qStartDate}~${qEndDate}` : null;
      const timelineDiscussion = tStartDate && tEndDate ? `${tStartDate}~${tEndDate}` : null;

      // Calculate stage based on dates
      const calculated = getStageByDates({
        timeline_reading: timelineReading,
        timeline_question: timelineQuestion,
        timeline_discussion: timelineDiscussion,
        reading_start_date: startDate,
        reading_end_date: endDate,
        question_start_date: qStartDate,
        question_end_date: qEndDate,
        discussion_start_date: tStartDate,
        discussion_end_date: tEndDate
      });
      
      // DB stage mapping
      let dbStage: 'reading' | 'question' | 'discussion' | 'recap' = 'reading';
      let uiStage: 'reading' | 'question_collecting' | 'discussion' | 'archiving' = 'reading';

      if (calculated === 'question_collecting') {
        dbStage = 'question';
        uiStage = 'question_collecting';
      } else if (calculated === 'discussion') {
        dbStage = 'discussion';
        uiStage = 'discussion';
      } else if (calculated === 'archiving' || calculated === 'archived_recap') {
        dbStage = 'recap';
        uiStage = 'archiving';
      }

      setStage(uiStage);

      // API Call
      if (editingMbId) {
        // 다음 예정 회차 수정
        await mockApi.clubs.updateMonthlyBookById(activeClub.id, editingMbId, {
          timeline_reading: timelineReading,
          timeline_question: timelineQuestion,
          timeline_discussion: timelineDiscussion
        });
      } else {
        // 현재 회차 수정
        await mockApi.clubs.updateMonthlyBook(activeClub.id, {
          stage: dbStage,
          timeline_reading: timelineReading,
          timeline_question: timelineQuestion,
          timeline_discussion: timelineDiscussion
        });

        setStage(uiStage);

        localStorage.setItem(`bookclub_start_date_${activeClub.id}`, startDate);
        localStorage.setItem(`bookclub_end_date_${activeClub.id}`, endDate);
        localStorage.setItem(`bookclub_q_days_${activeClub.id}`, String(qDays));
        localStorage.setItem(`bookclub_t_days_${activeClub.id}`, String(tDays));
        localStorage.setItem(`bookclub_mock_club_stage_${activeClub.id}`, uiStage);
        localStorage.setItem(`bookclub_is_advanced_${activeClub.id}`, String(isAdvanced));
        
        localStorage.setItem(`bookclub_q_start_date_${activeClub.id}`, qStartDate);
        localStorage.setItem(`bookclub_q_end_date_${activeClub.id}`, qEndDate);
        localStorage.setItem(`bookclub_t_start_date_${activeClub.id}`, tStartDate);
        localStorage.setItem(`bookclub_t_end_date_${activeClub.id}`, tEndDate);
      }

      await loadData();
      setIsFlowModalOpen(false);
      alert('독서 흐름 설정이 저장되었습니다.');
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.message || '독서 흐름을 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // 도서 실시간 검색
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
        setSearchResults(data.books || []);
      } catch (err) {
        console.error(err);
        setSearchError('도서 검색에 실패했습니다.');
      } finally {
        setIsSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-foreground font-sans flex flex-col max-w-[480px] mx-auto relative border-x border-card-border/40 pb-16">
      
      {/* 1. 상단 타이틀 바 */}
      <header className="sticky top-0 bg-[#FBFBF9]/80 backdrop-blur-md z-30 px-4 py-3 border-b border-card-border/30 flex items-center justify-between">
        <button 
          onClick={() => router.push('/club')}
          className="w-8 h-8 rounded-full border border-card-border flex justify-center items-center text-foreground/75 hover:bg-foreground/5 transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
        </button>
        <h2 className="text-xs font-black tracking-wide text-foreground">운영실</h2>
        <div className="w-8" />
      </header>

      {isPastEpisode && (
        <div className="mx-4 mt-3 bg-red-500/5 border border-red-500/20 text-red-500/85 text-[10px] font-black px-3 py-2.5 rounded-xl flex items-center gap-1.5 animate-fade-in shadow-xs">
          <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
          <span>이미 다음 독서 회차가 시작되어 이전 회차는 수정할 수 없습니다.</span>
        </div>
      )}

       {/* 2. 운영 상태 요약 대시보드 (상단) */}
      <div className="mx-4 mt-4 bg-card-bg border border-card-border rounded-xl p-5 shadow-xs flex flex-col gap-4 relative overflow-hidden">
        {/* 데코 링 */}
        <div className="absolute -top-12 -left-12 w-28 h-28 bg-sage-light/10 rounded-full -z-10" />
        
        <div className="flex justify-between items-center pb-2 border-b border-card-border/40">
          <span className="text-[9.5px] font-black text-sage-dark uppercase tracking-widest leading-none">운영실 대시보드 🌙</span>
          <span className="text-[8px] font-extrabold text-foreground/45">현재 회차 독서 현황 요약</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-sage-light/5 border border-card-border/55 rounded-lg p-2.5 text-center flex flex-col justify-between h-14">
            <span className="text-[7.5px] font-extrabold text-foreground/45 leading-none">현재 단계</span>
            <span className="text-[9.5px] font-black text-sage-dark truncate mt-1.5">{getStageLabel(stage)}</span>
          </div>
          <div className="bg-sage-light/5 border border-card-border/55 rounded-lg p-2.5 text-center flex flex-col justify-between h-14">
            <span className="text-[7.5px] font-extrabold text-foreground/45 leading-none">참여 인원</span>
            <span className="text-xs font-black text-sage-dark mt-1.5">{members.length}명</span>
          </div>
          <div className="bg-sage-light/5 border border-card-border/55 rounded-lg p-2.5 text-center flex flex-col justify-between h-14">
            <span className="text-[7.5px] font-extrabold text-foreground/45 leading-none">사색 질문</span>
            <span className="text-xs font-black text-sage-dark mt-1.5">선정 {selectedQuestions.length} / 후보 {suggestedQuestions.length}</span>
          </div>
        </div>

        {activeBook && (
          <div className="flex gap-2.5 items-center bg-background/40 border border-card-border/30 rounded-xl p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activeBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80'} 
              alt="책 표지" 
              className="w-7 h-10 rounded object-cover border border-card-border flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[7px] font-bold text-sage-medium uppercase tracking-wider block">진행 중인 도서</span>
              <h4 className="text-[11px] font-black text-foreground truncate mt-0.5">{activeBook.title}</h4>
              <p className="text-[9px] text-foreground/45 truncate leading-none mt-0.5">{activeBook.author}</p>
            </div>
          </div>
        )}

        {nextBook && (
          <div className="flex gap-2.5 items-center bg-background/40 border border-card-border/30 rounded-xl p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={nextBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80'} 
              alt="책 표지" 
              className="w-7 h-10 rounded object-cover border border-card-border flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[7px] font-bold text-sage-medium uppercase tracking-wider block">다음 예정 공유도서 🌱</span>
              <h4 className="text-[11px] font-black text-foreground truncate mt-0.5">{nextBook.title}</h4>
              <p className="text-[9px] text-foreground/45 truncate leading-none mt-0.5">{nextBook.author}</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. 본문 콤팩트 패널 영역 */}
      <main className="p-4 flex flex-col gap-4 pb-10">

        {/* SECTION 1. 현재 회차 독서 운영 (일정 및 질문 통합 섹션) */}
        <section className="bg-card-bg border border-card-border rounded-xl p-5 shadow-sm flex flex-col gap-5">
          <div className="flex justify-between items-center pb-2 border-b border-card-border/40">
            <div className="flex items-center gap-1.5">
              <div className="w-6.5 h-6.5 bg-sage-light rounded-lg flex justify-center items-center text-sage-dark">
                <BookOpen size={12} />
              </div>
              <h3 className="text-xs font-black text-foreground">현재 회차 독서 운영</h3>
            </div>
            <span className="bg-sage-medium/15 text-sage-dark border border-sage-medium/20 text-[8.5px] font-black px-2 py-0.5 rounded-full">
              {getStageLabel(stage)}
            </span>
          </div>

          {/* 현재 진행 중인 도서 정보 및 수정/변경 버튼 */}
          {activeBook ? (
            <div className="bg-background border border-card-border/80 rounded-xl p-3 flex gap-3 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={activeBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80'} 
                alt="책 표지" 
                className="w-10 h-14 rounded object-cover border border-card-border shadow-xs"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-bold text-sage-dark uppercase leading-none">선정 도서 (현재 공유도서)</span>
                <h4 className="text-xs font-black text-foreground truncate mt-0.5">{activeBook.title}</h4>
                <p className="text-[9.5px] text-foreground/45 truncate mt-0.5">
                  {activeBook.author} {activeBook.total_pages && activeBook.total_pages > 1 ? `· 전체 ${activeBook.total_pages}p` : ''}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button 
                  type="button"
                  onClick={openEditBookModal}
                  disabled={isPastEpisode}
                  className={`px-2 py-1 border border-sage-light text-sage-dark hover:bg-sage-light/20 text-[9px] font-black rounded-lg transition-all flex items-center justify-center gap-1 ${
                    isPastEpisode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  도서 수정
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (isPastEpisode) return;
                    setIsBookModalOpen(true);
                  }}
                  disabled={isPastEpisode}
                  className={`px-2 py-1 text-[9px] font-black rounded-lg transition-all flex items-center justify-center gap-1 shadow-xs ${
                    isPastEpisode 
                      ? 'bg-sage-light text-sage-dark/50 opacity-50 cursor-not-allowed' 
                      : 'bg-sage-medium hover:bg-sage-dark text-white cursor-pointer'
                  }`}
                >
                  책 변경
                </button>
              </div>
            </div>
          ) : (
            <div className="h-14 bg-background border border-dashed border-card-border rounded-xl flex items-center justify-center text-[9px] text-foreground/40 font-medium">
              선택된 책이 없습니다.
            </div>
          )}

          {nextBook && nextMonthlyBook ? (
            <div className="bg-background border border-card-border/80 rounded-xl p-3 flex gap-3 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={nextBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80'} 
                alt="책 표지" 
                className="w-10 h-14 rounded object-cover border border-card-border shadow-xs flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-bold text-sage-dark uppercase leading-none">다음 예정 공유도서</span>
                <h4 className="text-xs font-black text-foreground truncate mt-0.5">{nextBook.title}</h4>
                <p className="text-[9.5px] text-foreground/45 truncate mt-0.5">
                  {nextMonthlyBook.timeline_reading ? `${nextMonthlyBook.timeline_reading.split('~').map((d: string) => {
                    const parts = d.trim().split('-');
                    if (parts.length === 3) return `${Number(parts[1])}.${Number(parts[2])}`;
                    return d;
                  }).join(' ~ ')}` : ''}
                </p>
              </div>
              <button 
                type="button"
                onClick={handleOpenFlowModalForNextMb}
                className="px-2 py-1 border border-sage-light text-sage-dark hover:bg-sage-light/20 text-[9px] font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                일정 수정
              </button>
            </div>
          ) : (
            <div className="bg-background border border-dashed border-card-border/80 rounded-xl p-4 text-center text-[10px] text-foreground/50 font-bold">
              다음 예정 공유도서가 아직 없어요.
            </div>
          )}

          {/* 독서 일정 타임라인 */}
          <div className="flex flex-col gap-2 bg-background/30 border border-card-border/40 rounded-xl p-3">
            <div className="flex justify-between items-center">
              <span className="text-[8.5px] font-extrabold text-foreground/45 uppercase tracking-wider">독서 흐름 일정</span>
              <button 
                type="button"
                onClick={handleOpenFlowModalForCurrentMb}
                disabled={isPastEpisode}
                className={`text-[9px] font-black flex items-center gap-0.5 ${
                  isPastEpisode 
                    ? 'text-sage-dark/40 cursor-not-allowed opacity-50' 
                    : 'text-sage-dark hover:text-sage-medium cursor-pointer'
                }`}
              >
                <Sliders size={10} />
                일정 조율
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-1">
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
                <span className="text-[7.5px] font-black uppercase flex items-center gap-0.5 justify-center">
                  {stage === 'question_collecting' && <span className="w-1 h-1 bg-sage-medium rounded-full animate-pulse" />}
                  2단계: 씨앗 고르기
                </span>
                <span className="text-[8.5px] font-semibold mt-0.5">{calculatedTimeline.question}</span>
              </div>
              <div className={`flex flex-col items-center p-1.5 border rounded-lg text-center ${
                stage === 'discussion' 
                  ? 'bg-sage-light/20 border-sage-medium text-sage-dark font-black' 
                  : 'bg-background/55 border-card-border/40 text-foreground/50'
              }`}>
                <span className="text-[7.5px] font-black uppercase flex items-center gap-0.5 justify-center">
                  {stage === 'discussion' && <span className="w-1 h-1 bg-sage-medium rounded-full animate-pulse" />}
                  3단계: 나눔
                </span>
                <span className="text-[8.5px] font-semibold mt-0.5">{calculatedTimeline.discussion}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-card-border/50 my-0.5" />

          {/* 사색 질문 정리 및 큐레이터 */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-[8.5px] font-extrabold text-foreground/45 uppercase tracking-wider">선정된 사색 질문 ({selectedQuestions.length}개)</span>
            </div>

            {actionError && (
              <div className="bg-red-500/5 border border-red-500/20 text-red-500/85 text-[9px] font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 animate-fade-in">
                <AlertCircle size={12} className="flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {selectedQuestions.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {selectedQuestions.map((q) => (
                  <li key={q.id} className="text-[10px] text-foreground/80 font-bold leading-normal flex items-center justify-between gap-3 bg-background border border-card-border/40 px-3 py-1.5 rounded-lg shadow-xs">
                    <div className="flex items-start gap-1 min-w-0">
                      <span className="text-sage-medium flex-shrink-0 font-bold">•</span>
                      <span className="truncate">{q.content}</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (isPastEpisode) return;
                        handleToggleQuestionStatus(q.id);
                      }}
                      disabled={isPastEpisode || isActionLoading}
                      className="flex-shrink-0 text-[8px] text-red-500/70 hover:text-red-500 hover:bg-red-50 font-black px-1.5 py-0.5 border border-red-200/40 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-sage-light/5 border border-sage-light/35 rounded-xl p-2.5 text-center text-[9px] text-sage-dark/60 font-semibold">
                선정된 질문이 없습니다. 아래 후보 중에서 선정해 주세요.
              </div>
            )}
          </div>

          {/* 질문 후보 리스트 */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[8.5px] font-extrabold text-foreground/45 uppercase tracking-wider">사색 질문 후보</span>
              
              {/* 정렬 필터 */}
              <div className="flex bg-foreground/5 p-0.5 rounded-lg border border-card-border/40">
                <button 
                  type="button"
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
                  type="button"
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
              <div className="text-center py-4 px-3 text-[9.5px] text-foreground/50 font-semibold bg-background/40 border border-card-border border-dashed rounded-xl leading-relaxed">
                🌱 아직 질문 후보가 없어요.<br />
                읽으며 떠오른 질문을 토론방에서 제안해보세요.
              </div>
            ) : (
              <div className="flex flex-col border border-card-border rounded-xl divide-y divide-card-border overflow-hidden bg-background/25">
                {sortedSuggestedQuestions.map(q => {
                  const isSelected = q.status === 'selected';
                  return (
                    <div 
                      key={q.id} 
                      className="p-3 flex justify-between items-center gap-3.5 hover:bg-background/45 transition-all"
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
                        onClick={() => {
                          if (isPastEpisode) return;
                          handleToggleQuestionStatus(q.id);
                        }}
                        disabled={isPastEpisode || isActionLoading}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all flex items-center gap-0.5 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed ${
                          isPastEpisode ? 'bg-foreground/5 text-foreground/30 cursor-not-allowed' : 'cursor-pointer'
                        } ${
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

        {/* SECTION 2. 하단: 모임 관리 */}
        <section className="bg-card-bg border border-card-border rounded-xl p-4.5 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center pb-1 border-b border-card-border/40">
            <div className="flex items-center gap-1.5">
              <div className="w-6.5 h-6.5 bg-sage-light rounded-lg flex justify-center items-center text-sage-dark">
                <Users size={12} />
              </div>
              <h3 className="text-xs font-black text-foreground">
                {members.length === 1 ? '서재 관리 및 동반자 초대' : '모임 관리'}
              </h3>
            </div>
            <div className="flex gap-1.5">
              <button 
                type="button"
                onClick={() => {
                  if (isPastEpisode) return;
                  setIsClubInfoModalOpen(true);
                }}
                disabled={isPastEpisode}
                className={`text-[8.5px] font-black flex items-center gap-1 border border-sage-light/80 px-2 py-0.5 rounded-lg bg-sage-light/10 hover:bg-sage-light/45 transition-all ${
                  isPastEpisode ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <Edit3 size={9} />
                정보 수정
              </button>
              <button 
                type="button"
                onClick={handleCopyInviteCode}
                className="text-[8.5px] text-sage-dark font-black flex items-center gap-1 border border-sage-light/80 px-2 py-0.5 rounded-lg bg-sage-light/10 hover:bg-sage-light/45 transition-all cursor-pointer"
              >
                <Copy size={9} />
                초대코드
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[8.5px] font-extrabold text-foreground/45 uppercase tracking-wider pl-0.5">참여자 목록 ({members.length}명)</span>
            
            {members.map(member => {
              const avatarUrl = member.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user_id}`;
              const isMe = member.user_id === currentUser?.id;
              
              return (
                <div key={member.id} className="flex items-center justify-between bg-background border border-card-border/50 rounded-xl p-2 shadow-xs">
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
                      onClick={() => {
                        if (isPastEpisode) return;
                        handleKickMember(member.user_id, member.profile?.username || '모임원');
                      }}
                      disabled={isPastEpisode}
                      className={`w-6.5 h-6.5 rounded-md border border-card-border flex justify-center items-center transition-all animate-fade-in ${
                        isPastEpisode 
                          ? 'text-foreground/20 cursor-not-allowed' 
                          : 'text-foreground/30 hover:text-red-500 hover:bg-red-50 cursor-pointer'
                      }`}
                      title="내보내기"
                    >
                      <UserX size={10} />
                    </button>
                  )}
                </div>
              );
            })}

            {members.length === 1 && (
              <div className="mt-1 bg-sage-light/10 border border-sage-light/40 rounded-xl p-3 text-[9px] text-sage-dark/85 leading-relaxed font-semibold">
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
                <h3 className="text-xs font-black text-foreground">현재 회차 독서 흐름 조정</h3>
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
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-foreground/45 uppercase">결산일 (종료일)</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground"
                    required
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: 일정 설정 */}
            <div className="bg-background border border-card-border rounded-xl p-3.5 flex flex-col gap-3">
              <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">일정 설정</span>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-foreground/45 uppercase">토론 주제 선정 기간</label>
                  <div className="flex items-center gap-1 bg-card-bg border border-card-border rounded-lg px-2.5 py-1">
                    <span className="text-[9px] text-foreground/40 font-bold">토론 전</span>
                    <input 
                      type="number"
                      value={qDays}
                      onChange={(e) => handleQDaysChange(Math.max(1, Number(e.target.value)))}
                      className="w-10 bg-transparent text-[10px] font-extrabold focus:outline-none text-center text-foreground"
                      min={1}
                      required
                    />
                    <span className="text-[9px] text-foreground/50 font-bold">일간</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-foreground/45 uppercase">토론 기간</label>
                  <div className="flex items-center gap-1 bg-card-bg border border-card-border rounded-lg px-2.5 py-1">
                    <span className="text-[9px] text-foreground/40 font-bold">결산 전</span>
                    <input 
                      type="number"
                      value={tDays}
                      onChange={(e) => handleTDaysChange(Math.max(1, Number(e.target.value)))}
                      className="w-10 bg-transparent text-[10px] font-extrabold focus:outline-none text-center text-foreground"
                      min={1}
                      required
                    />
                    <span className="text-[9px] text-foreground/50 font-bold">일간</span>
                  </div>
                </div>
              </div>

              {/* 동적 예상 일정 미리보기 영역 */}
              <div className="bg-foreground/5 rounded-lg p-3 flex flex-col gap-2 mt-0.5 text-left border border-card-border/40">
                <span className="text-[8.5px] font-black text-sage-dark leading-none flex items-center gap-1 uppercase tracking-wider">
                  📅 예상 일정 미리보기
                </span>
                <div className="flex flex-col gap-2.5 mt-1.5 pl-1.5 border-l border-sage-medium/30">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold text-foreground/75 leading-none flex items-center gap-1">
                      📖 책 읽기
                    </span>
                    <span className="text-[8px] font-bold text-foreground/45 mt-0.5">
                      {formatPreviewDate(startDate)} ~ {formatPreviewDate(getReadingEndDate())}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold text-foreground/75 leading-none flex items-center gap-1">
                      🗳️ 토론 주제 선정
                    </span>
                    <span className="text-[8px] font-bold text-foreground/45 mt-0.5">
                      {formatPreviewDate(qStartDate)} ~ {formatPreviewDate(qEndDate)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold text-foreground/75 leading-none flex items-center gap-1">
                      💬 토론
                    </span>
                    <span className="text-[8px] font-bold text-foreground/45 mt-0.5">
                      {formatPreviewDate(tStartDate)} ~ {formatPreviewDate(tEndDate)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold text-foreground/75 leading-none flex items-center gap-1">
                      🌙 결산
                    </span>
                    <span className="text-[8px] font-bold text-foreground/45 mt-0.5">
                      {formatPreviewDate(endDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 수동 진행 단계 변경 UI가 삭제되고, 고급 설정(세부 일정 수동 조율)으로 이어짐 */}
            <div className="border border-card-border/60 rounded-xl p-3.5 flex flex-col gap-2.5 bg-background/40 transition-all duration-300">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-sage-dark uppercase tracking-widest">고급 설정</span>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span className="text-[9px] text-foreground/60 font-bold">세부 일정 직접 설정</span>
                  <input 
                    type="checkbox"
                    checked={isAdvanced}
                    onChange={(e) => handleIsAdvancedChange(e.target.checked)}
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
                    <label className="text-[8px] font-black text-foreground/45 uppercase">토론 주제 선정 시작일</label>
                    <input 
                      type="date"
                      value={qStartDate}
                      onChange={(e) => handleQStartDateChange(e.target.value)}
                      className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground w-full"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-foreground/45 uppercase">토론 주제 선정 종료일</label>
                    <input 
                      type="date"
                      value={qEndDate}
                      onChange={(e) => handleQEndDateChange(e.target.value)}
                      className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground w-full"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-foreground/45 uppercase">토론 시작일</label>
                    <input 
                      type="date"
                      value={tStartDate}
                      onChange={(e) => handleTStartDateChange(e.target.value)}
                      className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground w-full"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-foreground/45 uppercase">토론 종료일</label>
                    <input 
                      type="date"
                      value={tEndDate}
                      onChange={(e) => handleTEndDateChange(e.target.value)}
                      className="px-2.5 py-1.5 bg-card-bg border border-card-border rounded-lg text-[10px] font-extrabold focus:outline-none focus:border-sage-medium text-foreground w-full"
                      required
                    />
                  </div>
                </div>
                <p className="text-[8px] text-foreground/40 leading-relaxed mt-2.5">
                  * 세부 일정 직접 설정을 활성화하시면 토론 주제 선정 및 토론의 시작/종료일을 커스텀하게 입력하실 수 있습니다.
                </p>
              </div>
            </div>

            {/* 유효성 에러 메시지 표시 */}
            {validationError && (
              <div className="flex flex-col gap-2 bg-red-500/5 border border-red-500/20 text-red-500/85 text-[9px] font-extrabold px-3 py-2.5 rounded-xl animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  <span className="whitespace-pre-line leading-relaxed">{validationError}</span>
                </div>
                {validationError.includes('다음 예정 공유도서와 일정이 겹칩니다.') && (
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleOpenFlowModalForNextMb}
                      className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-[8.5px] font-black cursor-pointer hover:bg-red-600 transition-all border-none"
                    >
                      다음 회차 일정 수정하기
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFlowModalOpen(false)}
                      className="px-2.5 py-1 bg-foreground/10 text-foreground/60 rounded-lg text-[8.5px] font-black cursor-pointer hover:bg-foreground/15 transition-all border-none"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 저장 API 에러 메시지 표시 */}
            {saveError && (
              <div className="bg-red-500/5 border border-red-500/20 text-red-500/85 text-[9px] font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 animate-fade-in">
                <AlertCircle size={12} className="flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* 저장 버튼 그룹 */}
            <div className="flex gap-2.5 mt-1">
              <button 
                type="button"
                disabled={isSaving}
                onClick={() => setIsFlowModalOpen(false)}
                className="flex-1 py-2.5 border border-card-border text-foreground/60 rounded-xl text-[10px] font-black hover:bg-foreground/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button 
                type="submit"
                disabled={!!validationError || isSaving}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black shadow-sm transition-all ${
                  (validationError || isSaving)
                    ? 'bg-foreground/10 text-foreground/35 cursor-not-allowed border border-card-border/40'
                    : 'bg-sage-medium hover:bg-sage-dark text-white cursor-pointer'
                }`}
              >
                {isSaving ? '저장 중...' : '설정 저장'}
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
                  if (isActionLoading) return;
                  setIsBookModalOpen(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                disabled={isActionLoading}
                className="w-6.5 h-6.5 rounded-full border border-card-border flex justify-center items-center text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              
              {isSearchLoading ? (
                <div className="py-8 flex justify-center items-center gap-2">
                  <div className="w-4 h-4 border-2 border-sage-medium border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-sage-dark font-semibold">책 검색 중...</span>
                </div>
              ) : searchError ? (
                <div className="py-4 text-center text-xs text-red-500 font-semibold leading-relaxed flex flex-col items-center gap-1.5 animate-fade-in">
                  <AlertCircle size={18} className="text-red-500/50" />
                  <span>⚠️ {searchError}</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center gap-1.5">
                  <AlertCircle size={18} className="text-foreground/30" />
                  <span className="text-[9px] text-foreground/40 font-semibold">검색 결과가 없습니다.</span>
                </div>
              ) : (
                searchResults.map((bookItem, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => {
                      if (!isActionLoading) handleSelectBook(bookItem);
                    }}
                    className={`bg-background border border-card-border/70 rounded-xl p-2.5 flex gap-3.5 items-center transition-all duration-200 group ${
                      isActionLoading 
                        ? 'opacity-55 cursor-not-allowed' 
                        : 'hover:border-sage-medium hover:-translate-y-0.5 cursor-pointer'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={bookItem.cover_url || bookItem.coverUrl} 
                      alt="책 표지" 
                      className="w-9 h-12 rounded object-cover border border-card-border flex-shrink-0"
                    />
                    <div className="flex-grow min-w-0 flex flex-col">
                      <h4 className="text-[10px] font-black text-foreground group-hover:text-sage-dark transition-colors truncate">{bookItem.title}</h4>
                      <span className="text-[9px] text-foreground/45 font-medium truncate leading-none mt-0.5">{bookItem.author}</span>
                      {bookItem.total_pages && (
                        <span className="text-[8px] font-bold text-sage-medium uppercase mt-1">{bookItem.total_pages}p</span>
                      )}
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

      {/* ==========================================
          MODAL 4: 현재 공유도서 수정 및 보완 모달 (신규)
      ========================================== */}
      {isBookEditModalOpen && activeBook && (
        <div className="fixed inset-0 bg-foreground/45 backdrop-blur-xs flex items-center justify-center p-5 z-50 animate-fade-in">
          <form 
            onSubmit={handleSaveBookInfo}
            className="bg-card-bg border border-card-border w-full max-w-[340px] rounded-2xl p-5 shadow-2xl flex flex-col gap-4.5 animate-scale-up"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-foreground">도서 상세 정보 수정</h3>
              <button 
                type="button"
                onClick={() => setIsBookEditModalOpen(false)}
                className="w-6 h-6 rounded-full border border-card-border flex justify-center items-center text-foreground/40 hover:bg-foreground/5 cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-foreground/45 uppercase">도서 제목</label>
                <input 
                  type="text" 
                  value={editBookTitle}
                  onChange={(e) => setEditBookTitle(e.target.value)}
                  className="px-3 py-2 bg-background border border-card-border rounded-xl text-xs font-extrabold focus:outline-none focus:border-sage-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-foreground/45 uppercase">저자</label>
                <input 
                  type="text" 
                  value={editBookAuthor}
                  onChange={(e) => setEditBookAuthor(e.target.value)}
                  className="px-3 py-2 bg-background border border-card-border rounded-xl text-xs font-semibold focus:outline-none focus:border-sage-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-foreground/45 uppercase">총 페이지 수 (수동 입력)</label>
                <input 
                  type="number" 
                  min="2"
                  value={editBookPages}
                  onChange={(e) => setEditBookPages(e.target.value)}
                  placeholder="예: 250"
                  className="px-3 py-2 bg-background border border-card-border rounded-xl text-xs font-semibold focus:outline-none focus:border-sage-medium"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-foreground/45 uppercase">ISBN13 (정보 조회용)</label>
                <input 
                  type="text" 
                  value={editBookIsbn13}
                  onChange={(e) => setEditBookIsbn13(e.target.value)}
                  placeholder="알라딘 조회를 위해 필요합니다"
                  className="px-3 py-2 bg-background border border-card-border rounded-xl text-xs font-semibold focus:outline-none focus:border-sage-medium"
                />
              </div>

              {/* 고급 설정 - 도서 정보 보완 */}
              <div className="border border-card-border/50 rounded-xl p-3 bg-background/50 flex flex-col gap-2 mt-1">
                <span className="text-[8.5px] font-black text-sage-dark uppercase tracking-wider">고급 설정 (도서 정보 보완)</span>
                <p className="text-[8px] text-foreground/50 leading-relaxed font-semibold">
                  ISBN13 기준으로 알라딘에서 상세 정보(총 페이지 수, 책 소개글, 카테고리 등)를 가져와 보완합니다.
                </p>
                <button
                  type="button"
                  onClick={handleEnhanceBookInfo}
                  disabled={isFetchDetailLoading}
                  className="w-full py-2 bg-sage-medium hover:bg-sage-dark disabled:bg-sage-light/60 text-white text-[9.5px] font-black rounded-lg transition-all shadow-xs flex justify-center items-center gap-1 cursor-pointer"
                >
                  {isFetchDetailLoading ? '보완 정보 불러오는 중...' : '알라딘 정보로 보완 🌱'}
                </button>
              </div>
            </div>

            {/* 에러 및 성공 피드백 배너 */}
            {editBookError && (
              <div className="bg-red-50 text-red-500 border border-red-100 rounded-xl px-3 py-2 text-[8.5px] font-bold flex justify-between items-center animate-fade-in">
                <span>{editBookError}</span>
              </div>
            )}
            {editBookSuccess && (
              <div className="bg-sage-light/25 text-sage-dark border border-sage-light rounded-xl px-3 py-2 text-[8.5px] font-bold flex justify-between items-center animate-fade-in">
                <span>{editBookSuccess}</span>
              </div>
            )}

            <div className="flex gap-2.5 mt-1">
              <button 
                type="button"
                onClick={() => setIsBookEditModalOpen(false)}
                className="flex-1 py-2 border border-card-border text-foreground/60 rounded-xl text-[10px] font-black hover:bg-foreground/5 cursor-pointer"
              >
                취소
              </button>
              <button 
                type="submit"
                disabled={isActionLoading}
                className="flex-1 py-2 bg-sage-dark hover:bg-sage-medium text-white rounded-xl text-[10px] font-black shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isActionLoading ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
