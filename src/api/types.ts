// 백엔드 API 응답 타입. 근거: docs/handoff/API.md, openapi.json, api_examples/

export const ITEMS = ["양배추", "월동무", "당근", "조생양파"] as const;
export type Item = (typeof ITEMS)[number];

/** 모든 응답(오류 포함)의 공통 틀 */
export interface Envelope<R = unknown> {
  function?: string;
  ok: boolean;
  error: string | null;
  data_end: string;
  model_version: string;
  result: R;
  warnings: string[];
  sources: string[];
}

export type Verdict = "높음" | "불확실" | "낮음" | null;
export type SupportStatus = "예측" | "확정(환산 오차만)" | "공고 확정" | "판정 불가";

export interface Announced {
  official_per_spec: number | null;
  eligible: 0 | 1;
  bep_per_spec: number;
}

export interface SupportBasis {
  forecast?: {
    observed_days: number | null;
    remaining_days: number | null;
    observed_mean_hub_per_spec: number | null;
    remaining_price_hub_per_spec: number | null;
    m_hat_hub_per_spec: number | null;
    available: boolean;
    last_trade_date: string | null;
  };
  conversion?: { ratio_mean: number; ratio_sd: number; n_months: number };
  probability?: { p_below: number; interval_per_spec: [number, number]; verdict: Verdict };
}

export interface SupportResult {
  item: Item;
  ym: string;
  as_of: string;
  mode: "live" | "replay";
  spec_kg: number;
  status: SupportStatus;
  observed_days: number | null;
  remaining_days: number | null;
  observed_mean_hub_per_spec: number | null;
  m_hat_hub_per_spec: number | null;
  m_hat_per_spec: number | null;
  interval_per_spec: [number, number] | null;
  bep_per_spec: number | null;
  bep_season: string | null;
  p_below: number | null;
  verdict: Verdict;
  in_support_period: boolean;
  announced: Announced | null;
  basis?: SupportBasis;
  /** /support/all, /support/replay 안의 항목에만 붙는다 */
  warnings?: string[];
}

export interface SupportAllResult {
  ym: string;
  as_of: string;
  items: SupportResult[];
}

export interface ReplayResult {
  item: Item;
  ym: string;
  records: SupportResult[];
  announced: Announced | null;
}

export interface MonthlyRow {
  ym: string;
  season: string;
  days: number;
  hub_per_spec: number | null;
  official_est_per_spec: number | null;
  official_per_spec: number | null;
  bep_per_spec: number | null;
  eligible: 0 | 1 | null;
  volume_ton: number | null;
}

export interface MarketMonthlyResult {
  item: Item;
  level: "monthly";
  spec_kg: number;
  rows: MonthlyRow[];
}

export interface ConfigConflict {
  field: string;
  values: Record<string, string>;
  handling: string;
}

export interface ConfigResult<D = Record<string, unknown>> {
  season: string;
  is_latest_announced: boolean;
  data: D;
  conflicts: ConfigConflict[];
}

export interface DocItem {
  id: string;
  name: string;
  note?: string | null;
}

export interface Requirement {
  id: string;
  field: string;
  rule: string;
  applies_to?: string;
  source: string;
}

export interface Schedule {
  round1: { apply_start: string | null; apply_end: string; method: string };
  round2: { when: string; scope: string };
  contact: string;
}

/* ---------- 채팅 (docs/handoff/CHAT_SPEC.md) ---------- */

export type Tone = "positive" | "caution" | "negative" | "neutral" | "info";

export interface Badge {
  code: string;
  label: string;
  tone: Tone;
  symbol?: string;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  view?: string;
}

export interface CardAction {
  id: string;
  label: string;
  call: ToolCall;
}

export interface Card {
  type: string;
  badge?: Badge | null;
  title?: string;
  subtitle?: string;
  text?: string;
  summary?: string | null;
  metrics?: { label: string; value?: number; display: string }[];
  facts?: { label: string; display: string }[];
  steps?: { label: string; display: string; text?: string; badge?: Badge }[];
  rows?: Record<string, any>[];
  range?: { display: string; meaning?: string } | null;
  probability?: { value: number; display: string; show: boolean } | null;
  chart?: {
    kind: "line" | "bar";
    x: string[];
    series: { name: string; values: (number | null)[] }[];
    reference_line?: { name: string; values: (number | null)[] };
    highlight?: string[];
  };
  progress?: { done: number; total: number };
  prepared?: DocItem[];
  missing?: DocItem[];
  later?: string;
  notes?: string[];
  actions?: CardAction[];
  lead?: string | null;
}

export interface ChatMessage {
  type: "text" | "card";
  text?: string;
  style?: "footnote";
  card?: Card;
}

export interface ChatResponse {
  ok: boolean;
  error: string | null;
  session_id: string;
  messages: ChatMessage[];
  suggestions: string[];
  tool_calls?: { name: string; args: Record<string, unknown> }[];
  data_end?: string;
}

export interface ChatContext {
  item?: Item;
  as_of?: string;
  mode?: "live" | "replay";
}
