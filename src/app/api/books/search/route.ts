import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query || !query.trim()) {
    return NextResponse.json({ items: [] });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[API Route Error] 네이버 책 API 환경변수가 설정되지 않았습니다.');
    return NextResponse.json(
      { error: '서버 환경변수 미설정 (NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)' },
      { status: 500 }
    );
  }

  try {
    const naverApiUrl = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=20`;
    const response = await fetch(naverApiUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API Route Error] 네이버 API 호출 실패:', response.status, errorText);
      return NextResponse.json(
        { error: '네이버 책검색 API 호출 오류' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const items = data.items || [];

    // HTML 태그 제거 함수
    const cleanHtml = (text: string): string => {
      if (!text) return '';
      return text.replace(/<[^>]*>/g, '').trim();
    };

    // 정규화(normalize) 처리
    const normalizedItems = items.map((item: any) => {
      const rawIsbn = item.isbn || '';
      const isbnParts = rawIsbn.split(' ');
      let isbn = '';
      let isbn13 = '';

      if (isbnParts.length > 0) {
        isbnParts.forEach((part: string) => {
          const cleanPart = part.trim();
          if (cleanPart.length === 13) {
            isbn13 = cleanPart;
          } else if (cleanPart.length === 10) {
            isbn = cleanPart;
          }
        });
      }

      if (!isbn && !isbn13) {
        if (rawIsbn.length === 13) {
          isbn13 = rawIsbn;
        } else {
          isbn = rawIsbn;
        }
      }

      // 출간일 YYYYMMDD -> YYYY-MM-DD 포맷팅
      let publishedAt = '';
      if (item.pubdate && item.pubdate.length === 8) {
        publishedAt = `${item.pubdate.substring(0, 4)}-${item.pubdate.substring(4, 6)}-${item.pubdate.substring(6, 8)}`;
      } else {
        publishedAt = item.pubdate || '';
      }

      const sourceId = isbn13 || isbn || item.link || '';

      return {
        title: cleanHtml(item.title),
        author: cleanHtml(item.author),
        publisher: cleanHtml(item.publisher),
        coverUrl: item.image || '',
        cover_url: item.image || '', // 기존 UI 호환성 지원용
        isbn: isbn || isbn13, // fallbacks
        isbn13: isbn13 || undefined,
        publishedAt: publishedAt || undefined,
        description: cleanHtml(item.description) || undefined,
        source: 'naver',
        sourceId: sourceId,
      };
    });

    return NextResponse.json({ items: normalizedItems });
  } catch (err: any) {
    console.error('[API Route Error] 예외 발생:', err);
    return NextResponse.json({ error: '서버 내부 오류' }, { status: 500 });
  }
}
