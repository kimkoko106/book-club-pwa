'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../lib/supabase';
import { BookClub, Book, UserBookProgress } from '../../types';
import Navigation from '../../components/Navigation';
import { 
  Users, 
  BookOpen, 
  Compass, 
  Plus, 
  ArrowRight, 
  History, 
  Settings, 
  KeyRound, 
  Sparkles, 
  CheckCircle,
  Copy,
  ChevronRight
} from 'lucide-react';

export default function ClubHubPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [activeClub, setActiveClub] = useState<BookClub | null>(null);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [members, setMembers] = useState<UserBookProgress[]>([]);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('admin');
  const router = useRouter();

  // 모임 데이터 로드 함수
  const loadClubData = useCallback(async (userId: string, clubId: string) => {
    try {
      const book = await mockApi.books.getByClub(clubId);
      setActiveBook(book);

      if (book) {
        // 멤버 목록 및 각 진행 현황 로드 (멤버 프로필 포함)
        const progresses = await mockApi.progress.getMemberProgressList(clubId, book.id);
        setMembers(progresses);
      }
    } catch (err) {
      console.error('모임 허브 데이터 로드 실패:', err);
    }
  }, []);

  // 초기 로그인 상태 및 모임 체크
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const { data } = await mockApi.auth.getUser();
        if (!data?.user) {
          window.location.href = '/login';
          return;
        }
        setCurrentUser(data.user);

        const myClubs = await mockApi.clubs.getMyClubs(data.user.id);
        if (myClubs.length > 0) {
          const club = myClubs[0];
          setActiveClub(club);
          await loadClubData(data.user.id, club.id);
        } else {
          setActiveClub(null);
        }
      } catch (err) {
        console.error('모임 허브 로딩 오류:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [loadClubData]);

  // 초대 코드로 모임 가입 핸들러
  const handleJoinClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!inviteCodeInput.trim()) {
      alert('초대 코드를 입력해 주세요.');
      return;
    }

    setIsActionLoading(true);
    try {
      const club = await mockApi.clubs.joinClubByCode(currentUser.id, inviteCodeInput.trim().toUpperCase());
      if (club) {
        alert(`[${club.title}] 모임에 성공적으로 가입되었습니다!`);
        setActiveClub(club);
        await loadClubData(currentUser.id, club.id);
      } else {
        alert('존재하지 않거나 올바르지 않은 초대 코드입니다.\n(테스트용 기본 코드: SAGE123)');
      }
    } catch (err) {
      console.error(err);
      alert('모임 참가에 실패했습니다.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 초대 코드 클립보드 복사
  const handleCopyCode = () => {
    if (!activeClub) return;
    navigator.clipboard.writeText(activeClub.invite_code);
    alert(`초대 코드 [ ${activeClub.invite_code} ] 가 클립보드에 복사되었습니다! 친구를 초대해 보세요.`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sage-medium border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-sage-dark">모임방을 정리하고 있습니다...</span>
        </div>
      </div>
    );
  }

  // 모임 단계 정의 (더미 상태 매핑)
  const workflowSteps = [
    { label: '읽기 중', active: false },
    { label: '질문 모으는 중', active: true },
    { label: '토론', active: false },
    { label: '결산', active: false }
  ];

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      <main className="flex-1 flex flex-col gap-5 pb-20">
        
        {/* 헤더 타이틀 */}
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-black text-foreground">나의 독서 공간</h1>
            <p className="text-[10px] text-foreground/50 font-medium">차분한 독서의 흐름</p>
          </div>
          <div className="w-8 h-8 bg-sage-light/60 rounded-xl flex justify-center items-center">
            <Users className="text-sage-dark" size={16} />
          </div>
        </div>

        {/* 역할 시뮬레이터 배너 */}
        <div className="bg-sage-light/20 border border-sage-light/50 rounded-2xl p-3 flex items-center justify-between shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-bold text-sage-dark/80 uppercase tracking-widest">시뮬레이션 모드</span>
            <span className="text-xs font-extrabold text-foreground">
              현재 역할: {userRole === 'admin' ? '방장 (Admin)' : '모임원 (Member)'}
            </span>
          </div>
          <div className="flex bg-background/80 border border-card-border p-1 rounded-xl gap-1">
            <button
              onClick={() => setUserRole('admin')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                userRole === 'admin' 
                  ? 'bg-sage-medium text-white shadow-sm' 
                  : 'text-foreground/50 hover:bg-sage-light/30'
              }`}
            >
              방장
            </button>
            <button
              onClick={() => setUserRole('member')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                userRole === 'member' 
                  ? 'bg-sage-medium text-white shadow-sm' 
                  : 'text-foreground/50 hover:bg-sage-light/30'
              }`}
            >
              모임원
            </button>
          </div>
        </div>

        {!activeClub ? (
          /* Empty State: 참여한 모임이 없는 경우 (기존 가입 UI 조립) */
          <div className="flex-grow flex flex-col justify-center items-center gap-6 my-auto">
            <div className="w-16 h-16 bg-sage-light/40 rounded-3xl flex justify-center items-center shadow-inner relative">
              <Compass size={28} className="text-sage-medium" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-warm-beige rounded-full animate-pulse" />
            </div>

            <div className="text-center flex flex-col gap-2">
              <h3 className="text-base font-extrabold text-foreground">참여 중인 모임이 없습니다</h3>
              <p className="text-xs text-foreground/50 leading-relaxed max-w-[280px]">
                함께 책을 나누어 읽고 사색을 남기는 독서모임입니다.<br />
                직접 모임을 개설하거나 초대 코드로 참가해보세요!
              </p>
            </div>

            <div className="w-full flex flex-col gap-5 mt-2">
              {/* 초대코드 참가 폼 */}
              <form onSubmit={handleJoinClub} className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider text-center">초대코드로 모임 가입</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    placeholder="예: SAGE123"
                    className="flex-1 px-4 py-2.5 bg-background border border-card-border rounded-xl text-center text-xs font-bold tracking-widest uppercase focus:outline-none focus:border-sage-medium placeholder:tracking-normal placeholder:text-foreground/30"
                    maxLength={10}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="px-4 bg-sage-medium hover:bg-sage-dark disabled:bg-sage-light text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    참여
                  </button>
                </div>
              </form>

              <div className="flex items-center gap-3">
                <div className="h-px bg-card-border flex-1" />
                <span className="text-[10px] text-foreground/30 font-bold">또는</span>
                <div className="h-px bg-card-border flex-1" />
              </div>

              {/* 새 모임 만들기 버튼 */}
              <button
                onClick={() => router.push('/create-club')}
                className="w-full py-3.5 bg-sage-dark hover:bg-sage-medium text-white rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all shadow-sm"
              >
                <Plus size={16} />
                새로운 모임 개설하기
              </button>
            </div>

            <div className="bg-sage-light/20 border border-sage-light rounded-xl p-4 text-[10px] text-sage-dark leading-relaxed font-medium mt-4">
              💡 <b>기본 가이드</b>: 테스트용 초대코드 <span className="font-bold underline">SAGE123</span>을 사용하시면, 미리 생성된 숲속의 북클럽에 바로 동참하여 정적 UI의 다양한 면모를 곧바로 확인하실 수 있습니다.
            </div>
          </div>
        ) : (
          /* Active State: 참여한 모임이 있는 경우 (허브 화면) */
          <div className="flex flex-col gap-4">
            
            {/* 1. 모임 대문 정보 카드 */}
            <div className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sage-light/20 rounded-full translate-x-12 -translate-y-12 -z-10" />
              
              <span className="text-[9px] font-black text-sage-medium uppercase tracking-widest">현재 독서 공간</span>
              <h2 className="text-base font-black text-foreground">{activeClub.title}</h2>
              {activeClub.description ? (
                <p className="text-[11px] text-foreground/50 leading-relaxed font-medium">{activeClub.description}</p>
              ) : (
                <p className="text-[11px] text-foreground/40 leading-relaxed font-medium">따뜻하고 사색적인 독서 공간</p>
              )}
            </div>

            {/* 2. 현재 읽는 책 & 독서 단계 카드 (간략형) */}
            {activeBook && (
              <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-sage-light rounded-lg flex justify-center items-center text-sage-dark">
                      <BookOpen size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-foreground/40 uppercase">읽고 있는 책</span>
                      <span className="text-xs font-extrabold text-foreground leading-none mt-0.5">{activeBook.title}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-foreground/40 font-semibold">{activeBook.author}</span>
                </div>

                <div className="h-px bg-card-border" />

                {/* 독서 흐름 4단계 수평 인디케이터 */}
                <div className="flex justify-between items-center relative mt-1 px-1">
                  <div className="absolute left-6 right-6 top-3 h-0.5 bg-sage-light -z-10" />
                  
                  {workflowSteps.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded-full border-2 flex justify-center items-center text-[9px] font-black transition-all ${
                        step.active 
                          ? 'border-sage-dark bg-sage-medium text-white shadow-sm' 
                          : 'border-sage-light bg-card-bg text-sage-medium/40'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`text-[9px] font-extrabold ${
                        step.active ? 'text-sage-dark font-black' : 'text-foreground/45'
                      }`}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. 읽고 있는 사람들 아바타 리스트 */}
            {members.length > 0 && (
              <div className="bg-card-bg border border-card-border rounded-2xl p-4.5 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-sage-dark uppercase tracking-wider">
                    {members.length === 1 ? '홀로 채워가는 책장' : `책장을 넘기는 사람들 (${members.length}명)`}
                  </span>
                  <span className="text-[9px] text-foreground/40 font-medium">
                    {members.length === 1 ? '기록 저장 중' : '실시간 진행 공유 중'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                  {members.map((member) => {
                    const avatarUrl = member.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user_id}`;
                    const isMe = currentUser && member.user_id === currentUser.id;
                    return (
                      <div key={member.id} className="flex items-center gap-1.5 bg-background border border-card-border rounded-xl px-2.5 py-1.5 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={avatarUrl} 
                          alt={member.profile?.username || '멤버'} 
                          className="w-5.5 h-5.5 rounded-full object-cover border border-card-border"
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold text-foreground leading-none">
                            {member.profile?.username} {isMe && '(나)'}
                          </span>
                          <span className="text-[8px] text-foreground/40 font-medium mt-0.5">
                            {member.status === 'completed' ? '완독!' : `${member.current_page}p`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 1인 상태 동반자 초대 팁 배너 */}
                {members.length === 1 && (
                  <div className="mt-1 bg-sage-light/20 border border-sage-light/45 rounded-xl p-3 text-[9px] text-sage-dark/85 leading-relaxed font-semibold">
                    💡 <b>안내</b>: 현재 방에 홀로 머무는 중입니다. 친구와 함께 읽고 싶다면 하단의 <b>초대코드</b>를 복사해 전해 보세요.
                  </div>
                )}
              </div>
            )}

            {/* 4. 허브 메뉴 카드 격자 레이아웃 */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              
              {/* 지난 이야기 (아카이브 페이지 연결) */}
              <div 
                onClick={() => router.push('/group/archive')}
                className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-4 flex flex-col justify-between h-28 shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
              >
                <div className="w-8 h-8 bg-sage-light/70 rounded-xl flex justify-center items-center text-sage-dark">
                  <History size={16} />
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-xs font-black text-foreground group-hover:text-sage-dark transition-colors">지난 이야기</h3>
                    <p className="text-[9px] text-foreground/40 font-medium">우리의 독서 기록물</p>
                  </div>
                  <ChevronRight size={14} className="text-foreground/35 group-hover:text-sage-dark" />
                </div>
              </div>

              {/* 다음 책 후보 */}
              <div 
                onClick={() => alert('다음 책 투표방은 현재 기획 중입니다. 함께 읽을 소중한 다음 도서들의 등장을 조금만 기다려주세요! 🗳️')}
                className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-4 flex flex-col justify-between h-28 shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
              >
                <div className="w-8 h-8 bg-warm-beige/25 rounded-xl flex justify-center items-center text-warm-beige">
                  <Sparkles size={15} />
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-xs font-black text-foreground group-hover:text-warm-beige transition-colors">다음 책 후보</h3>
                    <p className="text-[9px] text-foreground/40 font-medium">미리 엿보는 설렘</p>
                  </div>
                  <ChevronRight size={14} className="text-foreground/35 group-hover:text-warm-beige" />
                </div>
              </div>

              {/* 초대코드 복사 */}
              <div 
                onClick={handleCopyCode}
                className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-4 flex flex-col justify-between h-28 shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
              >
                <div className="w-8 h-8 bg-sage-light/70 rounded-xl flex justify-center items-center text-sage-dark">
                  <KeyRound size={15} />
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-xs font-black text-foreground group-hover:text-sage-dark transition-colors">초대코드</h3>
                    <p className="text-[9px] text-foreground/40 font-medium">{activeClub.invite_code} (클릭 복사)</p>
                  </div>
                  <Copy size={12} className="text-foreground/35 group-hover:text-sage-dark" />
                </div>
              </div>

              {/* 모임 설정 (방장에게만 노출) */}
              {userRole === 'admin' && (
                <div 
                  onClick={() => router.push('/club/settings')}
                  className="bg-card-bg border border-card-border hover:border-sage-medium rounded-2xl p-4 flex flex-col justify-between h-28 shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 group"
                >
                  <div className="w-8 h-8 bg-foreground/5 rounded-xl flex justify-center items-center text-foreground/50 group-hover:bg-sage-light/60 group-hover:text-sage-dark transition-all">
                    <Settings size={15} />
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-xs font-black text-foreground group-hover:text-sage-dark transition-colors">모임 설정</h3>
                      <p className="text-[9px] text-foreground/40 font-medium">관리자 메뉴</p>
                    </div>
                    <ChevronRight size={14} className="text-foreground/35 group-hover:text-sage-dark transition-colors" />
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => {}} />
    </div>
  );
}
