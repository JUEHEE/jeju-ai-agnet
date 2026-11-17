export const won = (v: number | null | undefined) =>
  v == null ? "–" : `${Math.round(v).toLocaleString("ko-KR")}원`;

/** "2026-03-14" → "3월 14일" */
export const mdKR = (d: string) => `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일`;

/** "2026-03-14" → "2026년 3월 14일 (토)" */
export function dateKR(d: string) {
  const t = new Date(`${d}T00:00:00`);
  return `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일 (${"일월화수목금토"[t.getDay()]})`;
}

/** "2026-03" → "3월" */
export const ymKR = (ym: string) => `${+ym.slice(5, 7)}월`;

export function addMonths(ym: string, n: number) {
  const y = +ym.slice(0, 4);
  const m = +ym.slice(5, 7) - 1 + n;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, "0")}`;
}

/** 받침에 맞춰 은/는 */
export function eunNeun(word: string) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return `${word}는`;
  return (c - 0xac00) % 28 ? `${word}은` : `${word}는`;
}

/** 품목 규격 (전달문서 2-4) */
export const SPEC_NAME: Record<string, string> = {
  양배추: "8kg 망",
  월동무: "20kg 상자",
  당근: "20kg 상자",
  조생양파: "15kg 망",
};
export const specLabel = (item: string, kg?: number) => SPEC_NAME[item] ?? (kg ? `${kg}kg` : "");
