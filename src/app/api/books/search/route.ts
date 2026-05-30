import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const lookup = searchParams.get('lookup');

  const ttbKey = process.env.ALADIN_TTB_KEY;

  if (!ttbKey) {
    console.error('[API Route Error] 알라딘 API TTB Key 환경변수가 설정되지 않았습니다.');
    return NextResponse.json(
      { error: '서버 환경변수 미설정 (ALADIN_TTB_KEY)' },
      { status: 500 }
    );
  }

  // 1. 상세 조회 (Lookup) 모드
  if (lookup && lookup.trim()) {
    try {
      const aladinApiUrl = `http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${ttbKey}&itemIdType=ISBN13&ItemId=${encodeURIComponent(lookup.trim())}&output=js&Version=20131101&OptResult=itemPage`;
      const response = await fetch(aladinApiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[API Route Error] 알라딘 상세조회 API 호출 실패:', response.status, errorText);
        return NextResponse.json(
          { error: '알라딘 API 상세조회 호출 오류' },
          { status: response.status }
        );
      }

      const responseText = await response.text();
      let cleanJson = responseText.trim();
      if (cleanJson.endsWith(';')) {
        cleanJson = cleanJson.slice(0, -1);
      }

      const data = JSON.parse(cleanJson);

      if (data.errorCode) {
        console.error('[Aladin Lookup API Error]', data.errorCode, data.errorMessage);
        return NextResponse.json(
          { error: data.errorMessage || '알라딘 API 상세조회 오류' },
          { status: 400 }
        );
      }

      const item = data.item?.[0] || null;
      if (!item) {
        return NextResponse.json({ error: '도서를 찾을 수 없습니다.' }, { status: 404 });
      }

      const totalPages = item.subInfo?.itemPage || item.itemPage || null;
      
      // HTML 태그 및 특수기호 제거 헬퍼
      const cleanHtml = (text: string): string => {
        if (!text) return '';
        return text
          .replace(/<[^>]*>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      };

      return NextResponse.json({
        title: cleanHtml(item.title),
        author: cleanHtml(item.author),
        totalPages: totalPages,
        total_pages: totalPages, // 호환용
        description: cleanHtml(item.description) || null,
        publisher: cleanHtml(item.publisher) || null,
        published_at: item.pubDate || null,
        publishedAt: item.pubDate || null,
        cover_url: item.cover || null,
        coverUrl: item.cover || null,
        isbn13: item.isbn13 || null,
        isbn: item.isbn || null,
        category_name: item.categoryName || null,
        categoryName: item.categoryName || null
      });
    } catch (err) {
      console.error('[API Route Lookup Error] 예외 발생:', err);
      return NextResponse.json({ error: '서버 내부 오류' }, { status: 500 });
    }
  }

  // 2. 키워드 검색 (Search) 모드
  if (!query || !query.trim()) {
    return NextResponse.json({ items: [] });
  }

  try {
    const aladinApiUrl = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=20&start=1&SearchTarget=Book&output=js&Version=20131101`;
    
    const response = await fetch(aladinApiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API Route Error] 알라딘 API 호출 실패:', response.status, errorText);
      return NextResponse.json(
        { error: '알라딘 책검색 API 호출 오류' },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    let cleanJson = responseText.trim();
    if (cleanJson.endsWith(';')) {
      cleanJson = cleanJson.slice(0, -1);
    }

    const data = JSON.parse(cleanJson);

    if (data.errorCode) {
      console.error('[Aladin API Error]', data.errorCode, data.errorMessage);
      return NextResponse.json(
        { error: data.errorMessage || '알라딘 API 책검색 오류' },
        { status: 400 }
      );
    }

    const items = data.item || [];

    // HTML 태그 및 특수기호 제거 함수
    const cleanHtml = (text: string): string => {
      if (!text) return '';
      return text
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    };

    // 정규화(normalize) 처리
    const normalizedItems = items.map((item: any) => {
      const isbn = item.isbn || '';
      const isbn13 = item.isbn13 || '';
      const sourceId = isbn13 || isbn || item.itemId?.toString() || '';

      return {
        title: cleanHtml(item.title),
        author: cleanHtml(item.author),
        publisher: cleanHtml(item.publisher),
        coverUrl: item.cover || '',
        cover_url: item.cover || '', // 호환성 유지용
        isbn: isbn || isbn13 || undefined,
        isbn13: isbn13 || undefined,
        publishedAt: item.pubDate || undefined,
        published_at: item.pubDate || undefined, // 호환성 유지용
        description: cleanHtml(item.description) || undefined,
        source: 'aladin',
        sourceId: sourceId,
        source_id: sourceId, // 호환성 유지용
        priceStandard: item.priceStandard || undefined,
        priceSales: item.priceSales || undefined,
        categoryName: item.categoryName || undefined,
      };
    });

    return NextResponse.json({ items: normalizedItems });
  } catch (err: any) {
    console.error('[API Route Error] 예외 발생:', err);
    return NextResponse.json({ error: '서버 내부 오류' }, { status: 500 });
  }
}
