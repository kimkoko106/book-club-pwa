'use client';

import React, { useState, useEffect } from 'react';
import { Home, MessageSquare, Library, Users } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { checkIsCompleted } from '../lib/supabase';

interface NavigationProps {
  currentUser: { username: string; id: string } | null;
  onLogout: () => void;
}

export default function Navigation({ currentUser }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  // 전역 모달 상태 트래킹
  const [hasModal, setHasModal] = useState(false);

  useEffect(() => {
    const checkModals = () => {
      const backdrop = document.querySelector('.backdrop-blur-xs, .bg-foreground\\/45, .bg-black\\/40');
      const isOpened = !!backdrop;
      setHasModal(isOpened);
      document.body.classList.toggle('has-modal', isOpened);
    };

    checkModals();

    const observer = new MutationObserver(() => {
      checkModals();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
      document.body.classList.remove('has-modal');
    };
  }, []);

  if (hasModal) return null;

  const getTabClass = (path: string) => {
    const isActive = 
      pathname === path || 
      (path === '/discussion' && pathname === '/discussion-warning') ||
      (path === '/club' && (pathname === '/club' || pathname.startsWith('/group')));
    return `flex flex-col items-center gap-1 transition-all ${
      isActive 
        ? 'text-sage-dark scale-105 font-bold' 
        : 'text-sage-medium/60 hover:text-sage-medium'
    }`;
  };

  const handleShelfClick = () => {
    router.push('/bookshelf');
  };

  const handleClubClick = () => {
    router.push('/club');
  };

  // 토론방 진입 시 스포일러 조건 분기 핸들러 (공통 헬퍼 활용)
  const handleDiscussionClick = () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (checkIsCompleted(currentUser.id)) {
      router.push('/discussion');
    } else {
      router.push('/discussion-warning');
    }
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card-bg/95 backdrop-blur-md border-t border-card-border px-6 py-3.5 flex justify-around items-center z-[110] shadow-lg">
      <button
        onClick={() => router.push('/')}
        className={getTabClass('/')}
      >
        <Home size={20} />
        <span className="text-[10px]">홈</span>
      </button>

      {currentUser && (
        <>
          <button
            onClick={handleDiscussionClick}
            className={getTabClass('/discussion')}
          >
            <MessageSquare size={20} />
            <span className="text-[10px]">토론</span>
          </button>
          
          <button
            onClick={handleShelfClick}
            className={getTabClass('/bookshelf')}
          >
            <Library size={20} />
            <span className="text-[10px]">내 책장</span>
          </button>

          <button
            onClick={handleClubClick}
            className={getTabClass('/club')}
          >
            <Users size={20} />
            <span className="text-[10px]">모임</span>
          </button>
        </>
      )}
    </nav>
  );
}



