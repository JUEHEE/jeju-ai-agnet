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

/** 품목 질문 ("어떤 게 있어요?", "무슨 채소예요?", "가락시장에 뭐가 올라가요?") */
const ITEMS_Q = /(어떤|무슨|뭐|뭔|무엇).{0,8}(품목|채소|작물|물품|농산물|종류)|(품목|채소|작물|물품|농산물|종류).{0,6}(뭐|뭔|무엇|어떤)|어떤 ?게|뭐가 있|무엇이 있|올라가|올라와/;

const INTENTS: [string, RegExp][] = [
  ["06", /왜|근거|어떻게 (계산|나)/],
  ["07", /다른 품목|품목별|비교/],
  ["15", /브로콜리|감귤|귤|마늘|감자/],
  ["10", /서류|필요/],
  ["11", /자격|신청할 수|요건/],
  ["items", ITEMS_Q],
  ["09", /기간|언제 신청|단가|얼마|문의|공고|신청 방법/],
  ["14", /언제 거래|시기|제일 많/],
  ["13", /거래량/],
  ["12", /시세|가격/],
  ["08", /지난|됐어요|결과|작년|\d+월/],
];

/** 지원 가능성 질문 ("어때요"만으로는 판단하지 않음: "날씨 어때?" 같은 질문이 걸리지 않게) */
const SUPPORT_Q = /지원|가능|될까|받을 수|이번 ?달|다음 ?달|양배추|월동무|당근|양파|무는/;
const GREETING_Q = /^\s*(안녕|하이|헬로|hello|hi\b|반가)/i;

/** 품목 질문 답: 사업 안내 예시(품목별 규격·단가·기준 표 포함)에 첫 문장만 바꿈 */
function itemsAnswer(): ChatResponse {
  const r = ex("09");
  const first = r.messages.findIndex((m) => m.type === "text");
  const lead = "바당 PASS에서는 가락시장에서 거래되는 양배추·월동무·당근·조생양파 네 가지를 볼 수 있어요.";
  if (first >= 0) r.messages[first] = { type: "text", text: lead };
  else r.messages.unshift({ type: "text", text: lead });
  r.suggestions = ["이번 달 지원받을 수 있나요?", "다른 품목은 어때요?", "요즘 양배추 시세 어때요?"];
  return r;
}

/** 규칙에 안 걸리는 질문: 엉뚱한 카드 대신 모른다고 하고 물어볼 수 있는 것을 보여줌 */
function fallback(): ChatResponse {
  return {
    ok: true,
    error: null,
    session_id: "demo-session",
    messages: [
      {
        type: "text",
        text: "아직 이 질문은 잘 이해하지 못했어요. 지금은 아래 같은 걸 물어볼 수 있어요.",
      },
    ],
    suggestions: ["이번 달 지원받을 수 있나요?", "지원 품목이 뭐예요?", "신청 기간이 언제예요?", "어떤 서류가 필요해요?", "요즘 시세 어때요?"],
  };
}

export async function mockChat(message: string | null, ctx: ChatContext): Promise<ChatResponse> {
  await new Promise((r) => setTimeout(r, 250));
  if (!message || GREETING_Q.test(message)) return ex("01");
  for (const [id, re] of INTENTS) if (re.test(message)) return id === "items" ? itemsAnswer() : ex(id);
  if (!SUPPORT_Q.test(message)) return fallback();
  // 지원 가능성 질문: 품목·모드에 가장 가까운 예시
  if (/월동무|무는/.test(message) || (ctx.item === "월동무" && !/양배추|당근|양파/.test(message))) return ex("05");
  if (ctx.mode === "replay") return ex(ctx.as_of && ctx.as_of < "2026-01-01" ? "03" : "02");
  return ex("04");
}
