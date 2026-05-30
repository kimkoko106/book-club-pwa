'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import { FolderPlus, BookOpen, User, HelpCircle } from 'lucide-react';

export default function CreateClubPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [clubTitle, setClubTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [totalPages, setTotalPages] = useState<number>(300);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    mockApi.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.replace('/login');
      } else {
        setCurrentUser(data.user);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!clubTitle.trim() || !bookTitle.trim() || !bookAuthor.trim() || totalPages <= 0) {
      alert('필수 입력란을 올바르게 채워주세요.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('독서 모임 개설 시도 (정적 Mock):', { clubTitle, description, bookTitle, bookAuthor, totalPages });
      
      // Mock API를 통해 모임 생성
      const newClub = await mockApi.clubs.createClub(
        currentUser.id,
        clubTitle.trim(),
        description.trim(),
        bookTitle.trim(),
        bookAuthor.trim(),
        totalPages
      );
      
      alert(`모임 [${newClub.title}]이 개설되었습니다!\n초대 코드: ${newClub.invite_code}`);
      router.push('/');
    } catch (err: any) {
      console.error('모임 개설 상세 에러:', err);
      alert(`모임 개설에 실패했습니다.\n\n[상세 오류]\n${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      <div className="flex-1 flex flex-col gap-6 my-4">
        {/* 타이틀 헤더 */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-sage-medium tracking-wider uppercase">새로운 이야기의 시작</span>
          <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <FolderPlus size={22} className="text-sage-dark" />
            독서 모임 개설하기
          </h1>
          <p className="text-xs text-foreground/50 leading-relaxed font-medium">
            함께 책을 선정하고 진행도를 공유할 모임을 만듭니다.
          </p>
        </div>

        {/* 개설 폼 카드 */}
        <form onSubmit={handleSubmit} className="bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          {/* 모임 정보 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-sage-dark uppercase tracking-wider">1. 모임 정보</h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-foreground/60">모임 이름 *</label>
              <input
                type="text"
                value={clubTitle}
                onChange={(e) => setClubTitle(e.target.value)}
                placeholder="예: 금요일 밤의 사색"
                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-foreground/60">모임 설명 (선택)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="어떤 모임인지 간단히 적어주세요."
                rows={2}
                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30 resize-none"
              />
            </div>
          </div>

          <div className="h-px bg-card-border" />

          {/* 선정 도서 정보 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-sage-dark uppercase tracking-wider">2. 첫 함께 읽을 책</h3>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-foreground/60">도서명 *</label>
              <div className="relative">
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="정확한 책 제목을 입력하세요."
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30"
                  required
                />
                <BookOpen size={16} className="absolute left-3.5 top-3.5 text-foreground/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-foreground/60">저자명 *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    placeholder="저자 이름"
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30"
                    required
                  />
                  <User size={14} className="absolute left-3.5 top-3.5 text-foreground/30" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-foreground/60">전체 페이지 수 *</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={totalPages}
                    onChange={(e) => setTotalPages(Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold"
                    required
                  />
                  <HelpCircle size={14} className="absolute left-3.5 top-3.5 text-foreground/30" />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full py-3 bg-sage-medium hover:bg-sage-dark disabled:bg-sage-light text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm"
          >
            {isLoading ? '모임 개설 중...' : '모임 방 개설하기'}
          </button>
        </form>
      </div>

      {/* 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
    </div>
  );
}
