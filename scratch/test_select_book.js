const today = new Date("2026-06-06T14:42:31+09:00");

function formatToLocalYm(d) {
  if (!d || isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const targetMonthCurrent = formatToLocalYm(today);

const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
const targetMonthNext = formatToLocalYm(nextMonthDate);

console.log("=== FIXED TIMEZONE AND STAGE TEST ===");
console.log("today KST:", today.toString());
console.log("targetMonthCurrent:", targetMonthCurrent);
console.log("nextMonthDate KST:", nextMonthDate.toString());
console.log("targetMonthNext:", targetMonthNext);
console.log("Are they different now?:", targetMonthCurrent !== targetMonthNext);
