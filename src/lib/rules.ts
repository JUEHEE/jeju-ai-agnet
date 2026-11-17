// 전달문서 "반드시 지킬 것 10가지"를 코드로 옮긴 곳.
// 라벨·색은 여기 적지 않고 config/ui.json 에서 읽는다 (규칙 5).
import ui from "../config/ui.json";
import type { Badge, SupportResult, Tone } from "../api/types";

export const UI = ui as {
  service_name: string | null;
  service_name_fallback: string;
  show_probability: boolean;
  chart_cards_in_chat: boolean;
  badges: Record<string, { verdict: string; label: string; tone: Tone; symbol: string }>;
  tones: Record<Tone, { text: string; bg: string }>;
};

/** 규칙 10: 서비스 이름 미정이면 임시 문구 */
export const SERVICE_NAME = UI.service_name ?? UI.service_name_fallback;
export const SERVICE_NAME_PENDING = UI.service_name == null;
/** 이름 아래 한 줄 설명 (채팅 머리말) */
export const SERVICE_TAGLINE = "제주 농산물 물류비 도우미";

/** 규칙 7: 판정이 보이는 화면에 항상 */
export const DISCLAIMER = "최종 지원 여부는 제주도 공고로 확정돼요. 예측은 판단을 돕는 참고 정보예요.";

export const tone = (t: Tone | undefined) => UI.tones[t ?? "neutral"] ?? UI.tones.neutral;

const fromCode = (code: string): Badge => {
  const b = UI.badges[code];
  return { code, label: b.label, tone: b.tone, symbol: b.symbol };
};

/** 규칙 6: 판정 → 배지 */
export function supportBadge(r: Pick<SupportResult, "status" | "verdict" | "announced">): Badge {
  if (r.status === "공고 확정" && r.announced) return fromCode(r.announced.eligible ? "supported" : "not_supported");
  if (r.status === "판정 불가" || !r.verdict) return fromCode("no_data");
  const code = Object.keys(UI.badges).find((k) => UI.badges[k].verdict === r.verdict) ?? "no_data";
  return fromCode(code);
}

/** 상단 칩·도넛 안에 들어갈 짧은 말 */
export const SHORT: Record<string, string> = {
  high: "높아요",
  uncertain: "아직 몰라요",
  low: "낮아요",
  no_data: "출하 전",
  supported: "지원됐어요",
  not_supported: "미지원",
};

/**
 * 규칙 8: 경고 → 쉬운 문구 (CHAT_SPEC.md 6절).
 * null 은 "표시 안 함". 표에 없는 경고는 원문 그대로 보여준다.
 */
const WARNING_TABLE: [string, string | null][] = [
  ["손익분기점 공고 전", "이번 시즌 기준 금액이 아직 발표되지 않아 지난 시즌 기준(2025/26)으로 계산했어요."],
  ["관측 0일", "아직 이달 거래가 시작되기 전이라, 월초 가격 흐름에 따라 크게 바뀔 수 있어요."],
  ["가락시장 거래가 없음", "최근 가락시장에서 거래된 기록이 없어 예측할 수 없어요. 보통 출하가 시작되면 판단할 수 있어요."],
  ["환산 비율 근거가 1개월", "이 품목은 비교할 공식 자료가 적어서 참고용으로만 봐 주세요."],
  ["지원기간(11월~4월) 밖", "물류비 지원기간(11월~이듬해 4월)이 아닌 달이에요."],
  ["문서마다 값이 다른", "신청 기간 등 일부 내용은 문서마다 달라서 최종 공고로 꼭 확인해 주세요."],
  ["검증된 범위 밖", "너무 먼 달이라 예측이 정확하지 않을 수 있어요."],
  ["이미 공고된 달", null],
  ["mode=replay", null],
  // 아래 3개는 CHAT_SPEC 표에 없던 경고라 프론트에서 쉬운 문구를 정했다 (2026-11-17, 백엔드에 공유)
  ["그 시점에 알 수 있던 정보만 사용", "이 날짜까지 알 수 있던 정보로만 계산했어요."],
  ["개별 농가는 직접 신청 주체가 아니며", "개별 농가는 직접 신청할 수 없어요. 소속 농협이나 영농조합법인이 신청하고, 지원금은 출하한 농가에 지급돼요."],
  ["observed_years", "달마다 쌓인 자료 기간이 달라서, 거래가 적은 달은 참고로만 봐 주세요."],
];

export function plainWarnings(warnings: string[] | undefined): string[] {
  const out: string[] = [];
  for (const w of warnings ?? []) {
    const hit = WARNING_TABLE.find(([k]) => w.includes(k));
    const text = hit ? hit[1] : w;
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

/** 규칙 9: 신청 시작일은 두 값을 모두 */
export function applyPeriod(schedule: { round1: { apply_start: string | null; apply_end: string } }, conflicts: { field: string; values: Record<string, string> }[]) {
  const end = schedule.round1.apply_end;
  const c = conflicts.find((x) => x.field === "schedule.round1.apply_start");
  const md = (d: string) => `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일`;
  if (c) {
    const starts = [...new Set(Object.values(c.values))].sort();
    return `${starts.map(md).join(" 또는 ")} ~ ${md(end)} (시작일 확인 필요)`;
  }
  return schedule.round1.apply_start ? `${md(schedule.round1.apply_start)} ~ ${md(end)}` : `~ ${md(end)}`;
}
