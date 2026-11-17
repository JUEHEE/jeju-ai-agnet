// 채팅 카드 버튼(POST /api/tools/{tool})의 엔진 응답을 카드로 바꾼다.
// 채팅 API가 생기면 카드는 백엔드(api/chat_cards.py)가 만들어 주지만,
// 버튼은 프론트가 LLM 없이 바로 부르므로 여기서 같은 모양으로 그린다 (CHAT_SPEC 3·4·5절).
import type { Card, Envelope, SupportResult, ToolCall } from "../api/types";
import { addMonths, eunNeun, mdKR, specLabel, won, ymKR } from "./format";
import { applyPeriod, plainWarnings, supportBadge } from "./rules";

/** 기준일 대비 "이번 달" / "다음 달" / "2월" / "2025년 12월" */
export function monthWord(ym: string, asOf: string) {
  const cur = asOf.slice(0, 7);
  if (ym === cur) return "이번 달";
  if (ym === addMonths(cur, 1)) return "다음 달";
  if (ym.slice(0, 4) === asOf.slice(0, 4)) return ymKR(ym);
  return `${ym.slice(0, 4)}년 ${ymKR(ym)}`;
}

const TITLE: Record<string, string> = {
  high: "지원받을 가능성이 높아요",
  uncertain: "아직 판단하기 어려워요",
  low: "지원받을 가능성이 낮아요",
  no_data: "지금은 판단할 수 없어요",
  supported: "지원 대상이었어요",
  not_supported: "지원 대상이 아니었어요",
};
const LEAD: Record<string, string> = {
  high: "가락시장 가격으로 예측해 봤어요. 지금 흐름이면 이달 평균이 기준보다 낮을 가능성이 커요.",
  uncertain: "가락시장 가격으로 예측해 봤어요. 기준선 근처라 남은 기간 가격에 따라 달라질 수 있어요.",
  low: "가락시장 가격으로 예측해 봤어요. 지금 가격이 기준보다 높아서 지원 가능성은 낮아 보여요.",
  no_data: "지금은 판단할 근거가 부족해요.",
  supported: "이미 공고가 난 달이라 실제 결과로 알려드릴게요.",
  not_supported: "이미 공고가 난 달이라 실제 결과로 알려드릴게요.",
};

export function supportCard(r: SupportResult, warnings: string[]): Card {
  const badge = supportBadge(r);
  const head = `${monthWord(r.ym, r.as_of)} ${eunNeun(r.item)}`;
  const replayArgs = r.mode === "replay" ? { mode: "replay", as_of: r.as_of } : { as_of: r.as_of };
  if (r.status === "공고 확정" && r.announced) {
    const a = r.announced;
    return {
      type: "announced",
      badge,
      title: `${ymKR(r.ym)} ${eunNeun(r.item)} ${TITLE[badge.code]}`,
      subtitle: `공고 결과 · 가락시장 ${specLabel(r.item, r.spec_kg)}`,
      summary: `공식 월평균 ${a.official_per_spec == null ? "자료 없음" : won(a.official_per_spec)} · 기준 ${won(a.bep_per_spec)}`,
      notes: plainWarnings(warnings),
      lead: LEAD[badge.code],
    };
  }
  const has = r.m_hat_per_spec != null;
  return {
    type: "support",
    badge,
    title: `${head} ${TITLE[badge.code]}`,
    subtitle: `${mdKR(r.as_of)} 기준 · 가락시장 ${specLabel(r.item, r.spec_kg)}`,
    summary: has ? `예상 ${won(r.m_hat_per_spec)} · 기준 ${won(r.bep_per_spec)}` : null,
    range: r.interval_per_spec ? { display: `${won(r.interval_per_spec[0])} ~ ${won(r.interval_per_spec[1])}`, meaning: "10번 중 8번은 이 범위" } : null,
    probability: r.p_below != null ? { value: r.p_below, display: `${Math.round(r.p_below * 100)}%`, show: false } : null,
    notes: plainWarnings(warnings),
    lead: LEAD[badge.code],
    actions: has
      ? [
          { id: "basis", label: "근거 보기", call: { tool: "predict_support", args: { item: r.item, ym: r.ym, ...replayArgs }, view: "basis" } },
          { id: "docs", label: "서류 준비", call: { tool: "get_config", args: { topic: "documents" } } },
          { id: "notice", label: "공고", call: { tool: "get_config", args: { topic: "summary" } } },
        ]
      : [
          { id: "season", label: "언제 거래가 많아요?", call: { tool: "analyze_season", args: { item: r.item } } },
          { id: "compare", label: "다른 품목 보기", call: { tool: "predict_support", args: { item: "전체", ...replayArgs } } },
        ],
  };
}

export function basisCard(r: SupportResult): Card {
  const f = r.basis?.forecast;
  const c = r.basis?.conversion;
  const badge = supportBadge(r);
  if (!f || r.m_hat_per_spec == null) return supportCard(r, []);
  const pct = c ? Math.round((c.ratio_mean - 1) * 100) : null;
  const steps = [
    f.observed_days
      ? { label: "지금까지 실제 평균", display: won(f.observed_mean_hub_per_spec), text: `이달 ${f.observed_days}일 동안 가락시장 평균이에요.` }
      : { label: "지금까지 실제 평균", display: "거래 전", text: "아직 이달 거래가 시작되기 전이에요." },
    { label: "남은 날 예상 가격", display: won(f.remaining_price_hub_per_spec), text: `남은 ${f.remaining_days}거래일은 최근 가격(최근 며칠에 더 무게)을 이어간다고 봤어요.` },
    { label: "이달 평균 예상 (데이터허브)", display: won(f.m_hat_hub_per_spec), text: "실제 거래된 날과 남은 날 예상을 합친 평균이에요." },
    { label: "공식 가격으로 환산", display: won(r.m_hat_per_spec), text: pct != null ? `공식 발표 가격은 데이터허브 가격보다 보통 ${pct}% 정도 ${pct >= 0 ? "높아서" : "낮아서"} 그만큼 맞췄어요.` : "" },
    { label: "지원 기준 (손익분기점)", display: won(r.bep_per_spec), text: "공식 월평균이 이 금액 이하이면 지원 대상이에요." },
    { label: "판단", display: badge.label, badge, text: "과거 예측이 틀렸던 정도를 반영해, 기준 아래로 내려갈 가능성을 따져 정했어요." },
  ];
  return {
    type: "basis",
    title: `${r.item} ${monthWord(r.ym, r.as_of)} 예측 근거`,
    subtitle: `${mdKR(r.as_of)} 기준`,
    steps,
    lead: "이렇게 계산했어요.",
    actions: [{ id: "docs", label: "서류 준비", call: { tool: "get_config", args: { topic: "documents" } } }],
  };
}

export function compareCard(items: SupportResult[], asOf: string, ym: string): Card {
  return {
    type: "compare",
    title: `${monthWord(ym, asOf)} 품목별 지원 가능성`,
    subtitle: `${mdKR(asOf)} 기준`,
    rows: items.map((r) => ({
      item: r.item,
      badge: supportBadge(r),
      summary: r.m_hat_per_spec != null ? `예상 ${won(r.m_hat_per_spec)} · 기준 ${won(r.bep_per_spec)}` : null,
      action: {
        id: "detail",
        label: "자세히",
        call: { tool: "predict_support", args: { item: r.item, ym: r.ym, as_of: r.as_of, ...(r.mode === "replay" ? { mode: "replay" } : {}) } },
      },
    })),
    lead: "품목별로 비교해 봤어요.",
  };
}

/** 버튼 응답 → 카드. 모르는 응답이면 null (호출한 쪽에서 안내 문구) */
export function toolResultToCard(call: ToolCall, env: Envelope<any>): Card | null {
  const r = env.result;
  const notes = plainWarnings(env.warnings);
  switch (call.tool) {
    case "predict_support":
      if (Array.isArray(r?.items)) return compareCard(r.items, r.as_of, r.ym);
      return call.view === "basis" ? basisCard(r) : supportCard(r, env.warnings);
    case "get_config": {
      const d = r?.data ?? {};
      const sub = `${r?.season ?? ""} 시즌 공고 기준`;
      if (d.documents) {
        const docs = d.documents;
        return {
          type: "list",
          title: "제출 서류",
          subtitle: sub,
          facts: [
            ...docs.common.map((x: any) => ({ label: x.id, display: x.name + (x.note ? ` · ${x.note}` : "") })),
            ...docs["영농조합법인"].map((x: any) => ({ label: x.id, display: `(영농조합법인) ${x.name}` })),
          ],
          notes: [docs.later, ...notes].filter(Boolean),
          lead: "공식 공고 내용으로 정리했어요.",
        };
      }
      if (d.summary) {
        return {
          type: "program",
          title: "물류비 지원사업 안내",
          subtitle: sub,
          facts: [
            { label: "지원 내용", display: d.summary.support },
            { label: "가격 조건", display: d.summary.price_condition },
            { label: "신청 주체", display: d.summary.applicant },
          ],
          notes,
          lead: "공식 공고 내용으로 정리했어요.",
        };
      }
      if (d.schedule) {
        return {
          type: "program",
          title: "신청 일정",
          subtitle: sub,
          facts: [
            { label: "신청 기간", display: applyPeriod(d.schedule, r.conflicts ?? []) },
            { label: "신청 방법", display: d.schedule.round1.method },
            { label: "2차 신청", display: `${d.schedule.round2.when} (${d.schedule.round2.scope})` },
            { label: "문의", display: d.schedule.contact },
          ],
          notes,
        };
      }
      if (d.items) {
        return {
          type: "program",
          title: "지원 품목",
          subtitle: sub,
          facts: Object.entries(d.items).map(([k, v]: [string, any]) => ({
            label: k,
            display: `${v.spec} · 기준 ${won(v.bep_per_spec)} · kg당 ${v.unit_price_won_per_kg}원`,
          })),
          notes,
        };
      }
      return null;
    }
    case "get_market_data": {
      if (!Array.isArray(r?.rows)) return null;
      const rows = r.rows.slice(-12);
      return {
        type: "market",
        title: `${r.item} 월별 결과`,
        subtitle: `${mdKR(env.data_end)} 기준 · ${specLabel(r.item, r.spec_kg)} 단위`,
        facts: rows
          .filter((x: any) => x.eligible != null)
          .map((x: any) => ({ label: x.ym, display: `${x.eligible ? "지원됨" : "미지원"} · 공식 ${won(x.official_per_spec)}` })),
        chart: {
          kind: "line",
          x: rows.map((x: any) => x.ym),
          series: [{ name: "공식 기준 추정", values: rows.map((x: any) => x.official_est_per_spec) }],
          reference_line: { name: "지원 기준", values: rows.map((x: any) => x.bep_per_spec) },
        },
        notes,
      };
    }
    case "analyze_season":
      return {
        type: "season",
        title: `${r.item} 거래가 많은 시기`,
        subtitle: "과거 가락시장 월별 거래량",
        chart: {
          kind: "bar",
          x: r.months.map((m: any) => `${m.month}월`),
          series: [{ name: "월평균 거래량(톤)", values: r.months.map((m: any) => m.mean_volume_ton) }],
          highlight: r.top_months.map((m: number) => `${m}월`),
        },
        notes: ["거래가 많은 달과 물류비 지원 대상 달은 달라요.", ...notes],
        lead: `${[...r.top_months].sort((a: number, b: number) => a - b).map((m: number) => `${m}월`).join(", ")}에 거래가 가장 많아요.`,
      };
    case "analyze_volume":
      return {
        type: "volume",
        title: `${r.item} 거래량 변화`,
        subtitle: `${mdKR(r.reference_date)} 기준 · 최근 ${r.period.replace("d", "일")} vs 그 전`,
        facts: [
          { label: "최근 하루 평균", display: `${r.recent.avg_per_trading_day_ton.toFixed(1)}톤` },
          { label: "그 전 하루 평균", display: `${r.previous.avg_per_trading_day_ton.toFixed(1)}톤` },
          { label: "변화", display: `${r.avg_volume_change_pct > 0 ? "+" : ""}${r.avg_volume_change_pct.toFixed(1)}%` },
        ],
        notes: ["서울 가락시장 거래량이에요 (제주 전체 출하량이 아님).", ...notes],
      };
    default:
      return null;
  }
}
