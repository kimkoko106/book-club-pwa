// Inline replication of getMbStartEndDates and parseDateString to run directly in Node.js
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

  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      if (!isNaN(month) && !isNaN(day)) {
        const currentYear = 2026; // System year
        const d = new Date(currentYear, month - 1, day);
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

console.log("=== TIMEZONE AND STAGE TEST ===");

// 1. Current local time from ADDITIONAL_METADATA
const localTimeStr = "2026-06-06T01:18:48+09:00";
const localDate = new Date(localTimeStr);
console.log("Local Time:", localTimeStr);
console.log("Local Date Object:", localDate.toString());

// Simulate how s.toISOString() works
console.log("Local Date toISOString():", localDate.toISOString());
console.log("Local Date split('T')[0]:", localDate.toISOString().split('T')[0]);

// Helper formatToLocalYmd output
console.log("formatToLocalYmd Output:", formatToLocalYmd(localDate));

// 2. 종료일 판정값 테스트 (today == 종료일)
const todayStr = "2026-06-06"; // KST 6월 6일 기준
const endDateParsed = parseDateString("06.06"); // 종료일이 6.6인 경우
const endDateFormattedOld = endDateParsed.toISOString().split('T')[0];
const endDateFormattedNew = formatToLocalYmd(endDateParsed);

console.log("\n--- 종료일 판정 (종료일: 06.06) ---");
console.log("기존 (toISOString):");
console.log("  종료일 포맷값:", endDateFormattedOld);
console.log("  판정 (todayStr == endDate):", todayStr === endDateFormattedOld ? "종료일 당일 (true)" : "종료일 아님 (false)");

console.log("변경 후 (formatToLocalYmd):");
console.log("  종료일 포맷값:", endDateFormattedNew);
console.log("  판정 (todayStr == endDate):", todayStr === endDateFormattedNew ? "종료일 당일 (true)" : "종료일 아님 (false)");
