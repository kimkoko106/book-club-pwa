'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { mockApi } from '../../../../lib/supabase';
import Navigation from '../../../../components/Navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Quote, BookOpen } from 'lucide-react';

interface ReportDetailProps {
  params: Promise<{ id: string }>;
}

interface MemoComment {
  author: string;
  date: string;
  content: string;
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
  metaInfo: string; // [선택 구현] 짧고 가벼운 기록 통계 한 줄
  questions: ArchiveQuestion[];
}

export default function ArchiveReportDetailPage({ params }: ReportDetailProps) {
  // params Promise 언랩
  const { id: reportId } = use(params);

  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 아코디언 상태 관리 (한 번에 하나만 펼쳐지도록 관리)
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const router = useRouter();

  // 더미 결산 상세 아카이브 데이터
  const reportsData: Record<string, ArchiveReportData> = {
    'report-4': {
      month: '2026년 4월',
      title: '모순',
      author: '양귀자',
      coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
      tags: ['선택과책임', '삶의이면'],
      metaInfo: '질문 3개 · 생각 메모 7개 · 함께 읽은 사람 3명',
      questions: [
        {
          questionText: 'Q. 안진진이 낭만적인 김장우 대신 지루하리만치 반듯한 나영규와의 현실적인 연대를 선택한 것에 대해 어떻게 생각하시나요?',
          commentCount: 3,
          comments: [
            {
              author: '지은',
              date: '4월 6일',
              content: '“김장우와의 쓸쓸한 연애가 주는 자유보다는 나영규와의 규칙적인 현실을 택한 건, 결국 불안한 자신의 삶을 보호하기 위한 서글픈 모순이라고 느껴져요. 안진진의 서글픈 현실감이 깊은 여운을 남겼습니다.”'
            },
            {
              author: '민수',
              date: '4월 6일',
              content: '“저는 조금 다르게 봤어요. 낭만을 좇기보다 현실을 타협한 평범한 인간의 나약함이자, 동시에 가장 솔직한 생존 본능이 아닐까 싶네요. 우리의 매일도 이상과 밥그릇 사이에서 끊임없이 흔들리니까요.”'
            },
            {
              author: '오후의 사색',
              date: '4월 7일',
              content: '“결국 나영규와의 숨 막히는 배려 속에서도 안진진은 새로운 결핍을 느끼게 될 거예요. 한쪽을 채우면 다른 쪽이 텅 비어버리는 것이 이 소설이 가리키는 궁극적인 모순이겠죠.”'
            }
          ]
        },
        {
          questionText: 'Q. 소설 속에서 풍요로웠으나 스스로 생을 놓은 이모와, 가난 속에서 억척스럽게 살아남은 엄마의 대비가 주는 메시지는 무엇일까요?',
          commentCount: 2,
          comments: [
            {
              author: '소희',
              date: '4월 9일',
              content: '“이모의 완벽한 일상은 결국 변화와 소음이 통제된 무덤이었고, 엄마의 상처투성이 하루는 고통스럽지만 살아 꿈틀대는 푸른 숲 같았습니다. 삶의 불행조차 생명력의 일부임을 실감했습니다.”'
            },
            {
              author: '준호',
              date: '4월 10일',
              content: '“풍요 속 빈곤이라는 역설적인 감각을 아주 극단적으로 구현해 낸 챕터라고 생각합니다. 타인의 삶을 밖에서만 비추어 보며 함부로 동경해서는 안 되겠다는 생각이 들었어요.”'
            }
          ]
        },
        {
          questionText: 'Q. 모든 일정을 철저히 조율하고 헌신하는 나영규의 성의가 안진진에게 점차 피로감으로 다가왔던 까닭은 관계의 거리감과 어떤 연관이 있을까요?',
          commentCount: 2,
          comments: [
            {
              author: '혜원',
              date: '4월 12일',
              content: '“배려도 과잉되면 상대의 독립적인 자유를 침범하는 폭력이 될 수 있음을 보여줍니다. 나와 너 사이의 아주 얇고 투명한 거리의 존중이 왜 중요한지 보여주는 대목이었어요.”'
            },
            {
              author: '지훈',
              date: '4월 13일',
              content: '“나영규의 친절함에는 상대방에 대한 탐구가 빠져 있기 때문이라 생각해요. 내 기준의 좋은 것을 일방적으로 선물하는 관계는 금방 지치기 마련인 것 같아요.”'
            }
          ]
        }
      ]
    },
    'report-3': {
      month: '2026년 3월',
      title: '아몬드',
      author: '손원평',
      coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&auto=format&fit=crop&q=80',
      tags: ['공감의온기', '타인의아픔'],
      metaInfo: '질문 2개 · 생각 메모 4개 · 함께 읽은 사람 3명',
      questions: [
        {
          questionText: 'Q. 감정을 전혀 느끼지 못하는 소년 윤재의 건조한 태도를 보며, 우리가 역설적으로 타인의 고통에서 느낀 진짜 감정의 무게는 어떠한가요?',
          commentCount: 2,
          comments: [
            {
              author: '지은',
              date: '3월 5일',
              content: '“윤재가 곤이에게 투박하게 건넨 손길은 계산된 윤리가 아니었습니다. 그 무구하고 있는 그대로의 응시야말로 가식적인 위선이 가득한 우리의 공감을 뛰어넘는 진짜 온기였어요.”'
            },
            {
              author: '민수',
              date: '3월 6일',
              content: '“현대 사회는 윤재의 감정 불능증보다, 감정을 멀쩡히 느끼면서도 타인의 외침을 뉴스 보듯 차갑게 외면하는 방관자들의 무서운 둔감함을 꼬집고 있습니다.”'
            }
          ]
        },
        {
          questionText: 'Q. 거친 소년 곤이의 파괴적인 분노 이면에 자리 잡은 여리고 두려운 상처를 윤재가 알아볼 수 있었던 본질적인 원동력은 무엇이었을까요?',
          commentCount: 2,
          comments: [
            {
              author: '소희',
              date: '3월 8일',
              content: '“정상과 비정상이라는 무거운 딱지를 떼어내고 두 소년이 부딪힌 교차점에서 우정이 시작되었다고 봅니다. 타인을 향한 편견 없는 눈빛만이 상대를 구원할 수 있으니까요.”'
            },
            {
              author: '준호',
              date: '3월 9일',
              content: '“윤재의 호기심과 곤이의 외로움이 자석처럼 맞닿은 것 같아요. 서로의 결핍을 귀신같이 알아보며, 가해자가 아닌 같은 아픔을 겪는 소년으로서 알아본 것이겠죠.”'
            }
          ]
        }
      ]
    }
  };

  const report = reportsData[reportId] || null;

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
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

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
        <span className="text-sm font-extrabold text-foreground">해당 월의 독서 기록집이 존재하지 않습니다.</span>
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
            <h1 className="text-base font-black text-foreground mt-1">우리들의 도란도란 기록</h1>
          </div>
        </div>

        {/* 📚 [1] 상단 도서 정보 카드 */}
        <div className="bg-card-bg border border-card-border rounded-3xl p-5 flex gap-4.5 shadow-sm items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={report.coverUrl} 
            alt={report.title} 
            className="w-18 h-25 rounded-xl object-cover shadow border border-card-border/60 flex-shrink-0"
          />
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

        {/* 🏷️ [2] 가벼운 정적 메타 정보 바 (과도한 설명글 배제) */}
        <div className="py-2.5 px-4 bg-sage-light/20 border border-sage-light/40 rounded-2xl text-center shadow-inner">
          <span className="text-[10px] font-black text-sage-dark tracking-wide">
            {report.metaInfo}
          </span>
        </div>

        {/* 💬 [3] 질문 아코디언 목록 섹션 (도서 카드 + 메타 바에서 바로 연결) */}
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-sage-medium rounded-full" />
            <h3 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">나누었던 질문과 사색들</h3>
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
                      <p className="text-xs font-extrabold text-foreground/85 leading-relaxed text-justify pr-1">
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
                      {q.comments.map((comment, cIdx) => (
                        <div 
                          key={cIdx}
                          className="flex flex-col gap-1.5 bg-card-bg border border-card-border/60 rounded-xl p-4 shadow-inner"
                        >
                          <div className="flex justify-between items-center text-[10px] text-foreground/45 font-bold">
                            <span className="text-foreground/70">{comment.author} 님의 보관된 생각</span>
                            <span>{comment.date}</span>
                          </div>
                          <p className="text-[11px] font-semibold text-foreground/70 leading-relaxed text-justify pl-1 border-l-2 border-sage-medium/35 whitespace-pre-line">
                            {comment.content}
                          </p>
                        </div>
                      ))}
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
