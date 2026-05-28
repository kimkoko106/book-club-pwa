'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, PauseCircle, Edit3, Save, X } from 'lucide-react';
import { Book, UserBookProgress } from '../types';

interface BookProgressCardProps {
  book: Book;
  progress: UserBookProgress | null;
  onUpdate: (currentPage: number, status: 'reading' | 'completed' | 'paused') => Promise<void>;
}

export default function BookProgressCard({ book, progress, onUpdate }: BookProgressCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPageInput, setCurrentPageInput] = useState(progress?.current_page || 0);
  const [statusInput, setStatusInput] = useState<'reading' | 'completed' | 'paused'>(progress?.status || 'reading');
  const [isLoading, setIsLoading] = useState(false);

  // progress 변경 시 동기화
  useEffect(() => {
    if (progress) {
      setCurrentPageInput(progress.current_page);
      setStatusInput(progress.status);
    }
  }, [progress]);

  const totalPages = book.total_pages;
  const progressPercent = Math.min(
    100,
    Math.round(((progress?.current_page || 0) / totalPages) * 100)
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPageInput < 0 || currentPageInput > totalPages) {
      alert(`페이지 수는 0부터 전체 페이지 수(${totalPages}p) 사이여야 합니다.`);
      return;
    }
    
    setIsLoading(true);
    try {
      let finalStatus = statusInput;
      // 페이지가 최대 페이지와 같거나 넘어가면 자동으로 완독 상태로 변경 처리
      if (currentPageInput === totalPages) {
        finalStatus = 'completed';
        setStatusInput('completed');
      }
      await onUpdate(currentPageInput, finalStatus);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('진행 상태 저장에 실패했습니다.');
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

      <div className="flex flex-col gap-1 pr-6">
        <span className="text-xs font-semibold text-sage-dark tracking-wider uppercase">현재 읽고 있는 책</span>
        <h3 className="text-lg font-bold text-foreground leading-snug">{book.title}</h3>
        <p className="text-sm text-foreground/75 font-medium">{book.author} 저 · 전체 {book.total_pages}p</p>
      </div>

      <div className="h-px bg-card-border" />

      {!isEditing ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-foreground/50">내 진행률</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-foreground">{progressPercent}%</span>
                <span className="text-xs text-foreground/60">({progress?.current_page || 0} / {totalPages}p)</span>
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
            className="mt-2 w-full py-2.5 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all duration-200 shadow-sm"
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
              onClick={() => setIsEditing(false)}
              className="text-foreground/40 hover:text-foreground/80"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {/* 페이지 입력 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-foreground/60">현재 페이지</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={totalPages}
                  value={currentPageInput}
                  onChange={(e) => setCurrentPageInput(Number(e.target.value))}
                  className="flex-1 px-4 py-2 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold"
                  placeholder="예: 120"
                  required
                />
                <span className="text-sm text-foreground/60">/ {totalPages}p</span>
              </div>
            </div>

            {/* 상태 설정 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-foreground/60">상태 변경</label>
              <div className="grid grid-cols-3 gap-2">
                {(['reading', 'paused', 'completed'] as const).map((statusOption) => (
                  <button
                    key={statusOption}
                    type="button"
                    onClick={() => statusOption !== 'completed' && setStatusInput(statusOption)}
                    disabled={statusOption === 'completed' && currentPageInput < totalPages}
                    className={`py-2 px-1 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      statusInput === statusOption
                        ? 'border-sage-medium bg-sage-light text-sage-dark'
                        : 'border-card-border bg-card-bg text-foreground/60 hover:bg-sage-light/20'
                    } ${
                      statusOption === 'completed' && currentPageInput < totalPages
                        ? 'opacity-40 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    {getStatusIcon(statusOption)}
                    <span>{getStatusLabel(statusOption)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-sage-dark hover:bg-sage-medium disabled:bg-sage-light/80 text-white rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all shadow-sm"
          >
            <Save size={15} />
            {isLoading ? '저장 중...' : '저장하기'}
          </button>
        </form>
      )}
    </div>
  );
}
