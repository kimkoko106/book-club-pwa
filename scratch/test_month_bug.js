const today = new Date("2026-06-06T14:42:31+09:00");
const targetMonthCurrent = today.toISOString().substring(0, 7);

const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
const targetMonthNext = nextMonthDate.toISOString().substring(0, 7);

console.log("today KST:", today.toString());
console.log("targetMonthCurrent (toISOString):", targetMonthCurrent);
console.log("nextMonthDate KST:", nextMonthDate.toString());
console.log("nextMonthDate toISOString():", nextMonthDate.toISOString());
console.log("targetMonthNext (toISOString):", targetMonthNext);
console.log("Is equal?:", targetMonthCurrent === targetMonthNext);
