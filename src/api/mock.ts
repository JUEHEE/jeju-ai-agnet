// 목업 서버: 백엔드가 준 docs/api_examples/*.json(실제 서버 응답)으로 답한다.
// 1) 요청이 예시와 정확히 같으면 그 응답
// 2) 같은 데이터를 다른 예시에서 찾을 수 있으면 거기서 꺼냄 (예: /support/all 안의 품목 하나)
// 3) 그래도 없으면 "목업에 없는 요청" 오류 → 실제 서버를 연결하면 보인다
import type { Envelope, SupportResult } from "./types";

interface Example {
  request: { method: string; url: string; body: unknown };
  status: number;
  response: any;
}

const files = import.meta.glob("../mocks/api/*.json", { eager: true, import: "default" }) as Record<string, Example>;
const EXAMPLES = Object.values(files);

function parse(url: string) {
  const [p, qs = ""] = url.split("?");
  const path = decodeURIComponent(p);
  const params: Record<string, string> = {};
  for (const kv of qs.split("&").filter(Boolean)) {
    const [k, v = ""] = kv.split("=");
    params[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return { path, params };
}

const sameParams = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

const find = (method: string, path: string, params?: Record<string, string>) =>
  EXAMPLES.find((e) => {
    if (e.request.method !== method || e.status !== 200) return false;
    const r = parse(e.request.url);
    return r.path === path && (!params || sameParams(r.params, params));
  });

const byFile = (name: string) => files[`../mocks/api/${name}.json`];

const DATA_END = byFile("health").response.data_end as string;
const MODEL = byFile("health").response.model_version as string;

function envelopeFromRecord(fn: string, rec: SupportResult, sources: string[]): Envelope<SupportResult> {
  const { warnings = [], ...result } = rec;
  return { function: fn, ok: true, error: null, data_end: DATA_END, model_version: MODEL, result: result as SupportResult, warnings, sources };
}

function missing(url: string) {
  return {
    status: 404,
    data: {
      ok: false,
      error: `목업 예시에 없는 요청이에요 (${decodeURIComponent(url)}). 실제 서버를 연결하면 볼 수 있어요.`,
      data_end: DATA_END,
      model_version: MODEL,
      result: null,
      warnings: [],
      sources: [],
    },
  };
}

/** 채팅 카드 버튼(POST /api/tools/{name})을 같은 뜻의 GET 요청으로 바꿔 목업에서 찾는다 */
function toolToGet(name: string, args: Record<string, any>): string | null {
  const q = (o: Record<string, any>) =>
    Object.entries(o)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
  switch (name) {
    case "predict_support": {
      const { item, ...rest } = args;
      if (item === "전체") return `/api/support/all${q(rest) ? "?" + q(rest) : ""}`;
      return `/api/support?${q(args)}`;
    }
    case "get_config":
      return `/api/config/${args.topic ?? "all"}`;
    case "get_market_data":
      return `/api/market/${encodeURIComponent(args.item)}/${args.level ?? "monthly"}`;
    case "analyze_volume":
      return `/api/volume?${q(args)}`;
    case "analyze_season":
      return `/api/season?${q(args)}`;
    default:
      return null;
  }
}

export async function mockRequest(method: string, url: string, body?: any): Promise<{ status: number; data: any }> {
  await new Promise((r) => setTimeout(r, 120)); // 네트워크 흉내
  const { path, params } = parse(url);

  // 1) 정확히 같은 요청
  if (method === "GET") {
    const ex = find("GET", path, params);
    if (ex) return { status: 200, data: ex.response };
  }

  // 2) 비슷한 예시에서 찾기
  if (method === "POST" && path.startsWith("/api/tools/")) {
    const name = path.slice("/api/tools/".length);
    const allowed: string[] = byFile("health").response.agent_tools;
    if (!allowed.includes(name)) return { status: 404, data: byFile("error_not_agent_tool").response };
    const get = toolToGet(name, body ?? {});
    if (get) return mockRequest("GET", get);
    const ex = EXAMPLES.find((e) => e.request.url === `/api/${name === "check_docs" ? "docs-check" : "eligibility"}` && e.status === 200);
    return ex ? { status: 200, data: ex.response } : missing(url);
  }

  if (method === "POST") {
    const exact = EXAMPLES.find((e) => e.request.url === path && JSON.stringify(e.request.body) === JSON.stringify(body));
    const any = exact ?? EXAMPLES.find((e) => e.request.url === path && e.status === 200);
    return any ? { status: any.status, data: any.response } : missing(url);
  }

  if (path === "/api/support") {
    const { item, ym, as_of, mode } = params;
    if (mode === "replay" && as_of) {
      const replay = byFile("support_replay").response;
      const rec = (replay.result.records as SupportResult[]).find((r) => r.item === item && r.as_of === as_of && (!ym || r.ym === ym));
      if (rec) return { status: 200, data: envelopeFromRecord("predict_support", rec, replay.sources) };
      const demo = byFile("support_all_demo").response;
      const it = (demo.result.items as SupportResult[]).find((r) => r.item === item && r.as_of === as_of);
      if (it) return { status: 200, data: envelopeFromRecord("predict_support", it, demo.sources) };
    }
    if ((!as_of || as_of === DATA_END) && (!mode || mode === "live")) {
      const all = byFile("support_all").response;
      const it = (all.result.items as SupportResult[]).find((r) => r.item === item && (!ym || r.ym === ym));
      if (it) return { status: 200, data: envelopeFromRecord("predict_support", it, all.sources) };
    }
  }

  if (path === "/api/support/all") {
    if (params.mode === "replay" && params.as_of === "2026-03-14") return { status: 200, data: byFile("support_all_demo").response };
    if (!params.as_of) return { status: 200, data: byFile("support_all").response };
  }

  // 월별 시세: 양배추만 예시가 있다 → 기간(start, end)에 맞게 잘라서 준다
  const m = path.match(/^\/api\/market\/([^/]+)\/(status|daily|monthly)$/);
  if (m && m[2] === "monthly" && m[1] === "양배추") {
    const res = structuredClone(byFile("market_monthly").response);
    res.result.rows = MOCK_MONTHLY_CABBAGE.filter((r) => (!params.start || r.ym >= params.start) && (!params.end || r.ym <= params.end));
    return { status: 200, data: res };
  }
  if (m) {
    const ex = EXAMPLES.find((e) => e.status === 200 && parse(e.request.url).path === path);
    if (ex) return { status: 200, data: ex.response };
  }

  if (path.startsWith("/api/config/")) {
    const ex = find("GET", path);
    if (ex) return { status: 200, data: ex.response };
  }

  if (path === "/api/volume" || path === "/api/season") {
    const ex = EXAMPLES.find((e) => e.status === 200 && parse(e.request.url).path === path && parse(e.request.url).params.item === params.item);
    if (ex) return { status: 200, data: ex.response };
  }

  return missing(url);
}

/**
 * 양배추 월별 목업: api_examples/market_monthly(2025-11~2026-03 전체 필드)에
 * chat_examples/12_market 의 차트 값(2026-04~10 공식 기준 추정·지원 기준)을 이어 붙였다.
 * 이어 붙인 달은 days·hub_per_spec·volume_ton 이 예시에 없어 days=20(차트 표시용 가정), 나머지는 null.
 */
const MOCK_MONTHLY_CABBAGE = (() => {
  const base = byFile("market_monthly").response.result.rows as any[];
  const chatFiles = import.meta.glob("../mocks/chat/12_market.json", { eager: true, import: "default" }) as Record<string, any>;
  const card = Object.values(chatFiles)[0].response.messages.find((x: any) => x.type === "card").card;
  const ch = card.chart;
  const extra = ch.x
    .map((ym: string, i: number) => ({
      ym,
      season: ym >= "2026-11" || ym < "2026-05" ? "2025/26" : "비시즌",
      days: 20,
      hub_per_spec: null,
      official_est_per_spec: ch.series[0].values[i],
      official_per_spec: ch.series[1].values[i],
      bep_per_spec: ch.reference_line.values[i],
      eligible: null,
      volume_ton: null,
    }))
    .filter((r: any) => !base.some((b) => b.ym === r.ym));
  return [...base, ...extra];
})();

/** 목업 시연 슬라이더가 쓸 수 있는 (품목, 월) */
export const MOCK_REPLAY = { item: "양배추", ym: "2026-03", as_of: "2026-03-14" } as const;
