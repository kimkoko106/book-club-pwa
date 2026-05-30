'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, PauseCircle, Edit3, Save, X, AlertCircle } from 'lucide-react';
import { Book, UserBookProgress } from '../types';

interface BookProgressCardProps {
  book: Book;
  progress: UserBookProgress | null;
  onUpdate: (currentPage: number, status: 'reading' | 'completed' | 'paused') => Promise<void>;
  onUpdateTotalPages?: (totalPages: number) => Promise<void>;
}

export default function BookProgressCard({ 
  book, 
  progress, 
  onUpdate, 
  onUpdateTotalPages 
}: BookProgressCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPageInput, setCurrentPageInput] = useState(progress?.current_page || 0);
  const [statusInput, setStatusInput] = useState<'reading' | 'completed' | 'paused'>(progress?.status || 'reading');
  const [isLoading, setIsLoading] = useState(false);

  // 총 페이지 수 수정을 위한 상태
  const [isEditingTotalPages, setIsEditingTotalPages] = useState(false);
  const [totalPagesInput, setTotalPagesInput] = useState<string | number>(book.total_pages && book.total_pages > 1 ? book.total_pages : '');
  const [isUpdatingTotalPages, setIsUpdatingTotalPages] = useState(false);
  const [isFetchingLazy, setIsFetchingLazy] = useState(false);

  // % / page 입력 개선을 위한 상태 추가
  const totalPages = book.total_pages;
  const hasTotalPages = totalPages !== undefined && totalPages !== null && totalPages > 1;

  const [inputMode, setInputMode] = useState<'page' | 'percent'>(hasTotalPages ? 'page' : 'percent');
  const [percentInput, setPercentInput] = useState<number>(
    progress?.current_page
      ? (hasTotalPages
          ? Math.round((progress.current_page / (totalPages as number)) * 100)
          : progress.current_page)
      : 0
  );

  // 피드백 배너 상태 추가
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // progress 및 total_pages 변경 시 동기화
  useEffect(() => {
    if (progress) {
      setCurrentPageInput(progress.current_page);
      setStatusInput(progress.status);
      if (hasTotalPages) {
        setPercentInput(Math.min(100, Math.max(0, Math.round((progress.current_page / (totalPages as number)) * 100))));
      } else {
        setPercentInput(Math.min(100, Math.max(0, progress.current_page)));
        setInputMode('percent');
      }
    }
  }, [progress, totalPages, hasTotalPages]);

  useEffect(() => {
    setTotalPagesInput(book.total_pages && book.total_pages > 1 ? book.total_pages : '');
    if (!hasTotalPages) {
      setInputMode('percent');
    }
  }, [book.total_pages, hasTotalPages]);

  const progressPercent = Math.min(
    100,
    hasTotalPages
      ? Math.round(((progress?.current_page || 0) / (totalPages as number)) * 100)
      : (progress?.current_page || 0)
  );

  const handlePageChange = (val: number) => {
    if (!hasTotalPages) return;
    const cleanVal = Math.min(totalPages as number, Math.max(0, val));
    setCurrentPageInput(cleanVal);
    setPercentInput(Math.round((cleanVal / (totalPages as number)) * 100));
  };

  const handlePercentChange = (val: number) => {
    const cleanVal = Math.min(100, Math.max(0, val));
    setPercentInput(cleanVal);
    if (hasTotalPages) {
      setCurrentPageInput(Math.round((cleanVal / 100) * (totalPages as number)));
    } else {
      setCurrentPageInput(cleanVal);
    }
  };

  const handleFetchLazyTotalPages = async () => {
    if (!book.isbn13) {
      setErrorMsg('ISBN13 정보가 없어 페이지 정보를 불러올 수 없습니다. 직접 입력해주세요.');
      setIsEditingTotalPages(true);
      return;
    }

    setIsFetchingLazy(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch(`/api/books/search?lookup=${encodeURIComponent(book.isbn13.trim())}`);
      if (!response.ok) {
        throw new Error('API request failed');
      }
      const data = await response.json();
      const fetchedPages = data.totalPages || data.total_pages;

      if (fetchedPages && fetchedPages > 1) {
        if (onUpdateTotalPages) {
          await onUpdateTotalPages(fetchedPages);
          setSuccessMsg('페이지 정보를 성공적으로 불러왔어요. ✨');
          setTimeout(() => {
            setSuccessMsg(null);
          }, 1500);
        }
      } else {
        throw new Error('No page info found');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('페이지 정보를 찾을 수 없습니다. 직접 입력해주세요.');
      setIsEditingTotalPages(true);
    } finally {
      setIsFetchingLazy(false);
    }
  };

  const handleSaveTotalPages = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const pages = Number(totalPagesInput);
    if (isNaN(pages) || pages < 2 || !Number.isInteger(pages)) {
      setErrorMsg('총 페이지 수는 2페이지 이상의 정수여야 합니다.');
      return;
    }

    if (!onUpdateTotalPages) return;

    setIsUpdatingTotalPages(true);
    try {
      await onUpdateTotalPages(pages);
      setSuccessMsg('페이지 수가 저장되었어요. ✨');
      setIsEditingTotalPages(false);
      setTimeout(() => {
        setSuccessMsg(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg('총 페이지 수 업데이트에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsUpdatingTotalPages(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (hasTotalPages) {
      if (currentPageInput < 0 || currentPageInput > (totalPages as number)) {
        setErrorMsg(`페이지 수는 0부터 전체 페이지 수(${totalPages}p) 사이여야 합니다.`);
        return;
      }
    } else {
      if (currentPageInput < 0 || currentPageInput > 100) {
        setErrorMsg('퍼센트 입력값은 0%에서 100% 사이여야 합니다.');
        return;
      }
    }
    
    setIsLoading(true);
    try {
      let finalStatus = statusInput;
      // 페이지가 최대 페이지와 같거나 넘어가면 자동으로 완독 상태로 변경 처리
      if ((hasTotalPages && currentPageInput === totalPages) || percentInput === 100) {
        finalStatus = 'completed';
        setStatusInput('completed');
      }
      await onUpdate(currentPageInput, finalStatus);
      setSuccessMsg('저장됨 ✨');
      
      setTimeout(() => {
        setIsEditing(false);
        setSuccessMsg(null);
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg('진행 상태 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: 'reading' | 'completed' | 'paused') => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-sage-medium" size={18} />;
      case 'paused':
        return <PauseCircle className="text-warm-beige" size={18} />;
      default:
        return <BookOpen className="text-sage-dark" size={18} />;
    }
  };

  const getStatusLabel = (status: 'reading' | 'completed' | 'paused') => {
    switch (status) {
      case 'completed':
        return '완독함';
      case 'paused':
        return '잠시 쉬는 중';
      default:
        return '읽는 중';
    }
  };

  return (
    <div className="bg-card-bg rounded-2xl border border-card-border p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* 장식용 북마크 디자인 리본 */}
      <div className="absolute top-0 right-6 w-5 h-8 bg-warm-beige/80 rounded-b-md shadow-inner flex justify-center items-center">
        <div className="w-1.5 h-1.5 bg-card-bg rounded-full" />
      </div>

      <div className="flex gap-4 items-start">
        {/* 책 표지 이미지 추가 */}
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={book.cover_url} 
            alt="표지" 
            className="w-14 h-20 rounded object-cover border border-card-border shadow-xs flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-20 rounded bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border/70 flex flex-col justify-between py-2.5 px-1.5 shadow-xs flex-shrink-0 text-center select-none relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-sage-dark/10" />
            <span className="text-[9px] font-black text-sage-dark leading-tight line-clamp-2 w-full px-0.5 mt-0.5">
              {book.title}
            </span>
            <span className="text-[7.5px] font-extrabold text-sage-medium/90 truncate w-full px-0.5">
              {book.author || '지은이 없음'}
            </span>
          </div>
        )}

        <div className="flex-grow flex flex-col gap-1 pr-6 min-w-0">
          <span className="text-[9.5px] font-bold text-sage-medium uppercase tracking-wider">현재 읽고 있는 책</span>
          <h3 className="text-base font-black text-foreground leading-snug truncate">{book.title}</h3>
          
          <p className="text-xs text-foreground/60 font-medium truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{book.author} 저</span>
            {hasTotalPages && (
              <>
                <span>·</span>
                <span>전체 {book.total_pages}p</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="h-px bg-card-border" />

      {/* 에러 및 성공 피드백 배너 (통합 관리) */}
      {errorMsg && (
        <div className="bg-red-50/15 border border-red-200/50 rounded-xl p-3 text-[10px] text-red-500 font-semibold leading-relaxed flex items-center gap-1.5 animate-fade-in">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-sage-light/20 border border-sage-light/50 rounded-xl p-3 text-[10px] text-sage-dark font-semibold leading-relaxed flex items-center gap-1.5 animate-fade-in">
          <span>{successMsg}</span>
        </div>
      )}

      {!isEditing ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-foreground/50">내 진행률</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-foreground">{progressPercent}%</span>
                {hasTotalPages && (
                  <span className="text-xs text-foreground/60">({progress?.current_page || 0} / {totalPages}p)</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sage-light rounded-full text-xs font-bold text-sage-dark">
              {getStatusIcon(progress?.status || 'reading')}
              <span>{getStatusLabel(progress?.status || 'reading')}</span>
            </div>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full h-3 bg-sage-light/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-sage-medium rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>

          <button
            onClick={() => setIsEditing(true)}
            className="mt-2 w-full py-2.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all duration-200 shadow-sm cursor-pointer"
          >
            <Edit3 size={15} />
            읽기 기록 남기기
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-foreground">읽기 기록 수정</span>
            <button 
              type="button"
              onClick={() => {
                setIsEditing(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-foreground/40 hover:text-foreground/80 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {/* 입력 방식 선택 탭 (이북 vs 종이책 대응) - 전체 페이지 수가 있을 때만 노출 */}
            {hasTotalPages && (
              <div className="flex bg-foreground/5 p-0.5 rounded-lg border border-card-border/40">
                <button
                  type="button"
                  onClick={() => setInputMode('page')}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    inputMode === 'page'
                      ? 'bg-card-bg text-sage-dark shadow-xs'
                      : 'text-foreground/45 hover:text-foreground/75'
                  }`}
                >
                  페이지(p)로 입력
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('percent')}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    inputMode === 'percent'
                      ? 'bg-card-bg text-sage-dark shadow-xs'
                      : 'text-foreground/45 hover:text-foreground/75'
                  }`}
                >
                  퍼센트(%)로 입력
                </button>
              </div>
            )}

            {/* 입력 방식 분기 */}
            {inputMode === 'percent' ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground/60">진행률 (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={percentInput}
                    onChange={(e) => handlePercentChange(Number(e.target.value))}
                    className="flex-1 px-4 py-2 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold"
                    placeholder="예: 50"
                    required
                  />
                  <span className="text-sm text-foreground/60">%</span>
                </div>
                {hasTotalPages && (
                  <span className="text-[9.5px] text-foreground/45 leading-none mt-1">
                    (계산된 페이지: 약 {currentPageInput} / {totalPages}p)
                  </span>
                )}
              </div>
            ) : (
              hasTotalPages && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground/60">현재 페이지</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={totalPages as number}
                      value={currentPageInput}
                      onChange={(e) => handlePageChange(Number(e.target.value))}
                      className="flex-1 px-4 py-2 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold"
                      placeholder="예: 120"
                      required
                    />
                    <span className="text-sm text-foreground/60">/ {totalPages}p</span>
                  </div>
                  <span className="text-[9.5px] text-foreground/45 leading-none mt-1">
                    (계산된 비율: {percentInput}%)
                  </span>
                </div>
              )
            )}

            {/* 상태 설정 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-foreground/60">상태 변경</label>
              <div className="grid grid-cols-3 gap-2">
                {(['reading', 'paused', 'completed'] as const).map((statusOption) => {
                  return (
                    <button
                      key={statusOption}
                      type="button"
                      onClick={() => {
                        if (statusOption === 'completed') {
                          handlePercentChange(100);
                        }
                        setStatusInput(statusOption);
                      }}
                      className={`py-2 px-1 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        statusInput === statusOption
                          ? 'border-sage-medium bg-sage-light text-sage-dark'
                          : 'border-card-border bg-card-bg text-foreground/60 hover:bg-sage-light/20'
                      }`}
                    >
                      {getStatusIcon(statusOption)}
                      <span>{getStatusLabel(statusOption)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-sage-dark hover:bg-sage-medium disabled:bg-sage-light/80 text-white rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Save size={15} />
            {isLoading ? '저장 중...' : '저장하기'}
          </button>
        </form>
      )}
    </div>
  );
}
