// src/lib/mclp/periods/utils.ts
export function getPeriodKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // YYYY-MM
}
