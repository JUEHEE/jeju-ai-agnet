// 화면별 호출 API (전달문서 4절). 화면은 이 함수들만 쓴다.
import { request, IS_MOCK, ApiError } from "./client";
import { mockChat } from "./chatMock";
import type {
  ChatContext,
  ChatResponse,
  ConfigResult,
  DocItem,
  Envelope,
  Item,
  MarketMonthlyResult,
  ReplayResult,
  Requirement,
  Schedule,
  SupportAllResult,
  SupportResult,
} from "./types";

/** 서비스 화면은 live(기본), 시연 화면은 replay + as_of (전달문서 2-2) */
export interface Basis {
  mode: "live" | "replay";
  as_of?: string;
}

const modeQuery = (b: Basis) => (b.mode === "replay" ? { as_of: b.as_of, mode: "replay" } : {});

/** 상단 품목 칩 */
export const getSupportAll = (b: Basis, ym?: string) =>
  request<Envelope<SupportAllResult>>("GET", "/api/support/all", { query: { ym, ...modeQuery(b) } });

/** 이번 달 지원 가능성 카드 */
export const getSupport = (item: Item, b: Basis, ym?: string) =>
  request<Envelope<SupportResult>>("GET", "/api/support", { query: { item, ym, ...modeQuery(b) } });

/** 날짜 슬라이더 데모: 그달 거래일마다 한 건 */
export const getReplay = (item: Item, ym: string) =>
  request<Envelope<ReplayResult>>("GET", "/api/support/replay", { query: { item, ym } });

/** 월별 가격 차트, 지난 결과 */
export const getMarketMonthly = (item: Item, start?: string, end?: string) =>
  request<Envelope<MarketMonthlyResult>>("GET", `/api/market/${encodeURIComponent(item)}/monthly`, {
    query: { start, end },
  });

/** 출하 증빙 준비, 신청 전 확인 정보, 신청 안내 */
export const getConfig = <D = Record<string, unknown>>(topic: string) =>
  request<Envelope<ConfigResult<D>>>("GET", `/api/config/${topic}`);

export const getSchedule = () => getConfig<{ schedule: Schedule }>("schedule");
export const getDocuments = () =>
  getConfig<{ documents: { common: DocItem[]; 영농조합법인: DocItem[]; later: string } }>("documents");
export const getRequirements = () => getConfig<{ requirements: Requirement[] }>("requirements");
export const getSummary = () =>
  getConfig<{ summary: { support: string; price_condition: string; applicant: string } }>("summary");
export const getItemsConfig = () => getConfig<{ items: Record<string, any> }>("items");

/** 채팅 카드 버튼: actions[].call 을 그대로 보낸다 */
export const callTool = (tool: string, args: Record<string, unknown>) =>
  request<Envelope<any>>("POST", `/api/tools/${tool}`, { body: args });

/**
 * 채팅. POST /api/agent/chat 은 아직 백엔드에 없다 (전달문서 6절).
 * 실제 서버에 붙였는데 이 엔드포인트가 없으면(404·405) 예시 답변으로 대신한다.
 */
export async function chat(sessionId: string, message: string | null, context: ChatContext): Promise<ChatResponse & { demo: boolean }> {
  if (!IS_MOCK) {
    try {
      const res = await request<ChatResponse>("POST", "/api/agent/chat", { body: { session_id: sessionId, message, context } });
      return { ...res, demo: false };
    } catch (e) {
      if (!(e instanceof ApiError) || ![404, 405].includes(e.status)) throw e;
    }
  }
  return { ...(await mockChat(message, context)), demo: true };
}
