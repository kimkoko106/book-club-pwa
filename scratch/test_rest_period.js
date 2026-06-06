// 휴식 기간 판단 및 다음 예정 회차 정밀 정렬 로직 단위 테스트
const { format } = require('path');

function parseDateString(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const d = new Date(year, month - 1, day);
        d.setHours(0, 0, 0, 0);
        return d;
      }
    }
  }
  return null;
}

function formatToLocalYmd(d) {
  if (!d || isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMbStartEndDates(mb) {
  let startDate = null;
  let endDate = null;
  if (mb.timeline_reading) {
    const parts = mb.timeline_reading.split('~');
    if (parts.length === 2) {
      const s = parseDateString(parts[0]);
      const e = parseDateString(parts[1]);
      if (s) startDate = formatToLocalYmd(s);
      if (e) endDate = formatToLocalYmd(e);
    }
  }
  return { startDate, endDate };
}

function calculateDefaultNextTimeline(allMbs) {
  if (!allMbs || allMbs.length === 0) return null;
  const validMbs = allMbs.filter(mb => mb.timeline_reading && mb.stage !== 'scheduled');
  if (validMbs.length === 0) return null;

  let latestEndStr = '';
  validMbs.forEach(mb => {
    const { endDate } = getMbStartEndDates(mb);
    if (endDate && endDate > latestEndStr) {
      latestEndStr = endDate;
    }
  });

  if (!latestEndStr) return null;

  const lastDate = parseDateString(latestEndStr);
  if (!lastDate) return null;

  const nextStart = new Date(lastDate);
  nextStart.setDate(nextStart.getDate() + 1); // 종료일 + 1
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextEnd.getDate() + 29); // 30일 동안 (시작일 포함 30일)

  const sStr = formatToLocalYmd(nextStart);
  const eStr = formatToLocalYmd(nextEnd);

  if (sStr && eStr) {
    return `${sStr}~${eStr}`;
  }
  return null;
}

// 가상 데이터 세트 정의
const mockMonthlyBooks = [
  {
    id: 'mb-1',
    book_id: 'book-walden',
    stage: 'archived',
    timeline_reading: '2026-06-01~2026-06-15',
    created_at: '2026-05-25T10:00:00Z'
  },
  {
    id: 'mb-2',
    book_id: 'book-parenting',
    stage: 'scheduled',
    timeline_reading: '2026-06-30~2026-07-31',
    created_at: '2026-06-05T12:00:00Z'
  },
  {
    id: 'mb-3',
    book_id: 'book-third',
    stage: 'scheduled',
    timeline_reading: '2026-08-05~2026-09-05',
    created_at: '2026-06-06T09:00:00Z'
  }
];

// --- 1. 자동 시작일 기본값 계산 검증 ---
console.log("=== 1. 자동 시작일 기본값 계산 검증 ===");
const expectedDefaultTimeline = calculateDefaultNextTimeline(mockMonthlyBooks);
console.log("이전 마지막 종료일: 2026-06-15");
console.log("추천된 기본 timeline_reading:", expectedDefaultTimeline);
console.log("기대 결과: '2026-06-16~2026-07-15'");
console.log("결과 일치 여부:", expectedDefaultTimeline === "2026-06-16~2026-07-15" ? "PASS" : "FAIL");

// --- 2. 오늘 날짜별 다음 회차 정밀 조회 검증 ---
console.log("\n=== 2. 다음 회차 정밀 조회 검증 (가장 가까운 미래 회차 우선) ===");

function getNextMonthlyBookSimulated(todayStr, data) {
  const candidates = data.filter(mb => {
    if (!mb.book_id || mb.book_id.trim() === '') return false;
    if (mb.stage === 'recap' || mb.stage === 'archived') return false;

    if (mb.timeline_reading) {
      const { startDate } = getMbStartEndDates(mb);
      if (startDate) {
        return startDate > todayStr;
      }
    }

    if (mb.stage === 'scheduled') return true;
    return false;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const { startDate: aStart } = getMbStartEndDates(a);
    const { startDate: bStart } = getMbStartEndDates(b);
    
    const aHasStart = !!a.timeline_reading && !!aStart;
    const bHasStart = !!b.timeline_reading && !!bStart;

    if (aHasStart && !bHasStart) return -1;
    if (!aHasStart && bHasStart) return 1;

    if (aHasStart && bHasStart) {
      if (aStart < bStart) return -1;
      if (aStart > bStart) return 1;
    }

    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });

  return candidates[0];
}

// 시나리오 A: 오늘이 6월 20일 (1회차 종료 6/15와 2회차 시작 6/30 사이의 휴식 기간)
const todayA = "2026-06-20";
const nextBookA = getNextMonthlyBookSimulated(todayA, mockMonthlyBooks);
console.log(`[오늘: ${todayA}] 다음 회차 조회 결과:`, nextBookA ? `${nextBookA.id} (${nextBookA.timeline_reading})` : "없음");
console.log("기대 결과: mb-2 (2026-06-30~2026-07-31)");
console.log("결과 일치 여부:", nextBookA && nextBookA.id === "mb-2" ? "PASS" : "FAIL");

// 시나리오 B: 오늘이 8월 1일 (2회차 종료 7/31과 3회차 시작 8/5 사이의 휴식 기간)
const todayB = "2026-08-01";
const nextBookB = getNextMonthlyBookSimulated(todayB, mockMonthlyBooks);
console.log(`[오늘: ${todayB}] 다음 회차 조회 결과:`, nextBookB ? `${nextBookB.id} (${nextBookB.timeline_reading})` : "없음");
console.log("기대 결과: mb-3 (2026-08-05~2026-09-05)");
console.log("결과 일치 여부:", nextBookB && nextBookB.id === "mb-3" ? "PASS" : "FAIL");
