// 채팅 API(/api/agent/chat)가 생기기 전까지 쓰는 예시 답변.
// 질문을 규칙으로 분류해서 docs/chat_examples 의 실제 응답 중 하나를 고른다.
// 예시는 고정된 품목·날짜 기준이라, 화면에서 고른 품목과 다를 수 있다.
import type { ChatContext, ChatResponse } from "./types";

const files = import.meta.glob("../mocks/chat/*.json", { eager: true, import: "default" }) as Record<
  string,
  { request: unknown; response: ChatResponse }
>;
const ex = (prefix: string) => {
  const key = Object.keys(files).find((k) => k.includes(`/${prefix}_`));
  return structuredClone(files[key!].response);
};

const INTENTS: [string, RegExp][] = [
  ["06", /왜|근거|어떻게 (계산|나)/],
  ["07", /다른 품목|품목별|비교|어떤 품목/],
  ["15", /브로콜리|감귤|귤|마늘|감자/],
  ["10", /서류|필요/],
  ["11", /자격|신청할 수|요건/],
  ["09", /기간|언제 신청|단가|얼마|문의|공고|신청 방법|품목이 뭐/],
  ["14", /언제 거래|시기|제일 많/],
  ["13", /거래량/],
  ["12", /시세|가격/],
  ["08", /지난|됐어요|결과|작년|\d+월/],
];

export async function mockChat(message: string | null, ctx: ChatContext): Promise<ChatResponse> {
  await new Promise((r) => setTimeout(r, 250));
  if (!message) return ex("01");
  for (const [id, re] of INTENTS) if (re.test(message)) return ex(id);
  // 지원 가능성 질문: 품목·모드에 가장 가까운 예시
  if (/월동무|무는/.test(message) || ctx.item === "월동무") return ex("05");
  if (ctx.mode === "replay") return ex(ctx.as_of && ctx.as_of < "2026-01-01" ? "03" : "02");
  return ex("04");
}
