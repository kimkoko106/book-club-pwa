'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../../../lib/supabase';
import Navigation from '../../../../components/Navigation';
import { ArrowLeft, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

interface ReportDetailProps {
  params: Promise<{ id: string }>;
}

interface MemoComment {
  author: string;
  date: string;
  content: string;
  avatarUrl?: string;
}

interface ArchiveQuestion {
  questionText: string;
  commentCount: number;
  comments: MemoComment[];
}

interface ArchiveReportData {
  month: string;
  title: string;
  author: string;
  coverUrl: string;
  tags: string[];
  metaInfo: string;
  questions: ArchiveQuestion[];
}

export default function ArchiveReportDetailPage({ params }: ReportDetailProps) {
  // params Promise 언랩
  const { id: reportId } = use(params);

  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [report, setReport] = useState<ArchiveReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 아코디언 상태 관리 (한 번에 하나만 펼쳐지도록 관리)
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const router = useRouter();

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

        // Supabase DB 또는 Mock 로컬스토리지로부터 상세 데이터 조회
        const detail = await mockApi.discussion.getArchiveDetail(reportId);
        setReport(detail);
      } catch (err) {
        console.warn('[ArchiveDetail] 상세 로딩 에러:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [reportId]);

  const handleAccordionToggle = (idx: number) => {
    setOpenIndex(prev => (prev === idx ? null : idx));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sage-medium border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-sage-dark">기록집을 펼치는 중...</span>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background p-6 gap-4">
        <span className="text-sm font-extrabold text-foreground">아직 남겨진 기록이 없어요.</span>
        <button 
          onClick={() => router.push('/group/archive')}
          className="px-4 py-2 bg-sage-medium text-white rounded-xl text-xs font-bold"
        >
          아카이브로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background">
      <main className="flex-1 flex flex-col gap-4 pb-20">
        
        {/* 상단 뒤로가기 헤더 */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/group/archive')}
            className="p-1 hover:bg-sage-light/30 rounded-full text-foreground/75"
            title="지난 이야기 리스트로 가기"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="text-[9px] font-black text-sage-dark bg-sage-light px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              {report.month} 독서 기록집
            </span>
            <h1 className="text-base font-black text-foreground mt-1">소중히 보관된 사색 기록</h1>
          </div>
        </div>

        {/* 📚 [1] 상단 도서 정보 카드 */}
        <div className="bg-card-bg border border-card-border rounded-3xl p-5 flex gap-4.5 shadow-sm items-center">
          {report.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={report.coverUrl} 
              alt={report.title} 
              className="w-18 h-25 rounded-xl object-cover shadow border border-card-border/60 flex-shrink-0"
            />
          ) : (
            <div className="w-18 h-25 rounded-xl bg-gradient-to-tr from-sage-light/35 to-sage-light/10 border border-card-border/70 flex flex-col justify-between py-3 px-1.5 shadow flex-shrink-0 text-center select-none relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-sage-dark/10" />
              <span className="text-[11px] font-black text-sage-dark leading-tight line-clamp-2 w-full mt-1.5 px-1">
                {report.title}
              </span>
              <span className="text-[9px] font-extrabold text-sage-medium/95 truncate w-full px-1">
                {report.author || '지은이 미상'}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex gap-1.5 flex-wrap">
              {report.tags.map((tag, idx) => (
                <span key={idx} className="text-[8px] text-sage-dark bg-sage-light px-2 py-0.5 rounded font-black">
                  #{tag}
                </span>
              ))}
            </div>
            <h2 className="text-base font-black text-foreground leading-tight mt-1 truncate">
              {report.title}
            </h2>
            <p className="text-[11px] text-foreground/45 font-bold leading-none mt-0.5">
              {report.author} 저
            </p>
          </div>
        </div>

        {/* 🏷️ [2] 가벼운 정적 메타 정보 바 */}
        <div className="py-2.5 px-4 bg-sage-light/20 border border-sage-light/40 rounded-2xl text-center shadow-inner">
          <span className="text-[10px] font-black text-sage-dark tracking-wide">
            {report.metaInfo}
          </span>
        </div>

        {/* 💬 [3] 질문 아코디언 목록 섹션 */}
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-sage-medium rounded-full" />
            <h3 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">붙잡고 있었던 질문과 사색들</h3>
          </div>

          <div className="flex flex-col gap-3">
            {report.questions.map((q, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div 
                  key={idx}
                  className="bg-card-bg border border-card-border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm"
                >
                  {/* 아코디언 헤더 */}
                  <div 
                    onClick={() => handleAccordionToggle(idx)}
                    className="p-4.5 flex justify-between items-start gap-3 cursor-pointer hover:bg-sage-light/10 transition-colors"
                  >
                    <div className="flex flex-col gap-1 flex-1">
                      <p className="text-xs font-extrabold text-foreground/85 leading-relaxed text-justify pr-1 whitespace-pre-wrap">
                        {q.questionText}
                      </p>
                      <span className="text-[9px] text-foreground/40 font-bold mt-0.5">
                        나눈 생각 메모 {q.commentCount}개
                      </span>
                    </div>
                    <div className="text-foreground/40 p-1 flex-shrink-0 mt-0.5">
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>

                  {/* 아코디언 바디 (댓글 아카이브 노출) */}
                  {isOpen && (
                    <div className="border-t border-card-border bg-background/55 p-4.5 flex flex-col gap-3.5">
                      {q.comments.length === 0 ? (
                        <div className="text-center py-6 text-[10px] text-foreground/30 font-semibold">
                          당시 기록된 생각 메모가 존재하지 않습니다.
                        </div>
                      ) : (
                        q.comments.map((comment, cIdx) => {
                          const avatarUrl = comment.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(comment.author)}`;
                          return (
                            <div 
                              key={cIdx}
                              className="flex flex-col gap-1.5 bg-card-bg border border-card-border/60 rounded-xl p-4 shadow-inner"
                            >
                              <div className="flex justify-between items-center text-[10px] text-foreground/45 font-bold">
                                <div className="flex items-center gap-1.5">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img 
                                    src={avatarUrl} 
                                    alt={comment.author}
                                    className="w-4 h-4 rounded-full object-cover border border-card-border"
                                  />
                                  <span className="text-foreground/70">{comment.author} 님의 보관된 생각</span>
                                </div>
                                <span>{comment.date}</span>
                              </div>
                              <p className="text-[11px] font-semibold text-foreground/70 leading-relaxed text-justify pl-1 border-l-2 border-sage-medium/35 whitespace-pre-wrap">
                                &ldquo;{comment.content}&rdquo;
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 안내 메모 */}
        <div className="bg-sage-light/10 border border-card-border/60 rounded-2xl p-4 text-center mt-1">
          <p className="text-[10px] font-bold text-foreground/40 flex justify-center items-center gap-1.5">
            <BookOpen size={12} className="text-sage-medium" />
            이곳은 독서 흔적이 보관된 읽기 전용 아카이브 공간입니다.
          </p>
          <p className="text-[8px] text-foreground/35 mt-1 leading-snug">
            정적인 기록물이므로 대댓글 작성, 리액션 공감, 입력 폼 등의 참여 기능은 제외되었습니다.<br />
            당시의 깊이 있는 기록들을 차분히 짚어보며 감상해 보세요.
          </p>
        </div>

      </main>

      {/* 하단 내비게이션 바 */}
      <Navigation currentUser={currentUser} onLogout={() => {}} />
    </div>
  );
}
