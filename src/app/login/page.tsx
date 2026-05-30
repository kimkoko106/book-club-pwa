'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi, isMockMode } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import { BookOpen } from 'lucide-react';



export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 에러 및 성공 피드백용 인라인 상태
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  
  const router = useRouter();

  // 이미 로그인되어 있는지 체크
  useEffect(() => {
    mockApi.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
        router.replace('/');
      }
    }).catch(err => {
      console.error('로그인 세션 확인 실패:', err);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. 로컬 Mock 모드 동작
    if (isMockMode) {
      if (!username.trim()) {
        setErrorMsg('사용할 닉네임을 입력해 주세요.');
        return;
      }

      setIsLoading(true);
      try {
        console.log('로그인 시도 (정적 Mock) 닉네임:', username);
        const { data } = await mockApi.auth.signIn(username.trim());
        if (data?.user) {
          router.replace('/');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('입장에 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. 실제 Supabase Auth 연동 동작
    if (!email.trim() || !password) {
      setErrorMsg('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    if (isSignUp && !username.trim()) {
      setErrorMsg('책방에서 사용할 닉네임을 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        // 회원가입 요청
        const { data, error } = await mockApi.auth.signIn(email.trim(), password, true, username.trim());
        if (error) {
          // Supabase 에러 메시지를 한국어로 순화하여 표시
          if (error.message.includes('User already registered')) {
            setErrorMsg('이미 가입된 이메일 주소입니다.');
          } else if (error.message.includes('Password should be')) {
            setErrorMsg('비밀번호는 최소 6자 이상이어야 합니다.');
          } else {
            setErrorMsg(error.message || '회원가입에 실패했습니다.');
          }
          return;
        }

        if (data?.user) {
          // 자동 로그인이 되어 세션이 발급되었거나, 이메일 확인 정책에 따라 대기 중인 상태 판별
          // Supabase 설정에서 Confirm Email이 비활성화되어 있는 경우 바로 로그인 처리됨
          // user가 반환되었는데 세션이 활성화되지 않았다면 인증 메일 발송 안내
          const { data: sessionData } = await mockApi.auth.getUser();
          if (sessionData?.user) {
            router.replace('/');
          } else {
            setSuccessMsg('가입 인증 메일이 발송되었습니다. 이메일을 확인해 주세요.');
          }
        }
      } else {
        // 로그인 요청
        const { data, error } = await mockApi.auth.signIn(email.trim(), password, false);
        if (error) {
          setErrorMsg('이메일 또는 비밀번호를 다시 확인해주세요.');
          return;
        }

        if (data?.user) {
          router.replace('/');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      {/* 상단 엠블럼 및 인트로 */}
      <div className="flex-1 flex flex-col justify-center items-center gap-6 my-auto">
        <div className="w-20 h-20 bg-sage-light rounded-3xl flex justify-center items-center shadow-inner relative">
          <BookOpen className="text-sage-dark" size={36} />
          {/* 포인트 디자인 작은 점 */}
          <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-warm-beige rounded-full animate-pulse" />
        </div>
        
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-2xl font-black text-foreground">도란도란</h1>
          <p className="text-xs text-foreground/60 leading-relaxed font-medium">
            책장을 넘기는 조용한 소리와 사색을 나누는<br />
            소규모 초대 기반 온라인 독서 공간
          </p>
        </div>

        {/* 로그인 폼 카드 */}
        <div className="w-full bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          
          {/* 실제 Auth 모드일 때만 로그인/회원가입 탭 토글 노출 */}
          {!isMockMode ? (
            <div className="flex border-b border-card-border pb-1 mb-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 text-center pb-2 text-xs font-bold transition-all ${
                  !isSignUp 
                    ? 'text-sage-dark border-b-2 border-sage-medium font-black' 
                    : 'text-foreground/45 hover:text-foreground/70'
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 text-center pb-2 text-xs font-bold transition-all ${
                  isSignUp 
                    ? 'text-sage-dark border-b-2 border-sage-medium font-black' 
                    : 'text-foreground/45 hover:text-foreground/70'
                }`}
              >
                회원가입
              </button>
            </div>
          ) : (
            <h2 className="text-sm font-bold text-foreground/80">닉네임으로 시작하기</h2>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            
            {/* 이메일/비밀번호 필드 (실제 Auth 모드 전용) */}
            {!isMockMode && (
              <>
                <div className="flex flex-col gap-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일 주소"
                    className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30"
                    required
                  />
                </div>
              </>
            )}

            {/* 닉네임 필드 (Mock 모드 전용, 또는 실제 Auth 모드의 회원가입 모드일 때만 노출) */}
            {(isMockMode || isSignUp) && (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="책방에서 사용할 닉네임"
                  className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-sage-medium font-semibold placeholder:text-foreground/30"
                  maxLength={15}
                  required
                />
              </div>
            )}

            {/* 에러 및 성공 안내문구 인라인 표시 */}
            {errorMsg && (
              <p className="text-[11px] text-red-500 font-semibold px-1 mt-0.5">
                ⚠️ {errorMsg}
              </p>
            )}
            {successMsg && (
              <p className="text-[11px] text-sage-dark font-extrabold px-1 mt-0.5 bg-sage-light/20 p-2 rounded-lg border border-sage-medium/30">
                ✨ {successMsg}
              </p>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-sage-medium hover:bg-sage-dark text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm mt-1"
            >
              {isLoading ? '처리 중...' : (isMockMode ? '독서모임 시작하기' : (isSignUp ? '가입하기' : '로그인하기'))}
            </button>
          </form>

          {/* 안내 텍스트 */}
          {isMockMode ? (
            <p className="text-[10px] text-center text-foreground/40 leading-relaxed">
              * MVP 1단계에서는 비밀번호 없이 닉네임 입력만으로 간단하게 로그인/회원가입이 진행됩니다.
            </p>
          ) : (
            <p className="text-[10px] text-center text-foreground/40 leading-relaxed">
              * 실제 Supabase Auth 및 데이터베이스 보안 시스템으로 안전하게 계정이 보호됩니다.
            </p>
          )}
        </div>
      </div>

      {/* 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
    </div>
  );
}
