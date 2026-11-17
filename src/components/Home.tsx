// 홈 화면 (Figma node 1:844). 화면 영역 ↔ API 는 전달문서 4절 표를 따른다.
import { getMarketMonthly } from "../api/endpoints";
import type { Envelope, Item, Requirement, Schedule, ConfigResult, SupportResult } from "../api/types";
import { ITEMS } from "../api/types";
import { addMonths, mdKR, specLabel, won, ymKR } from "../lib/format";
import { DISCLAIMER, applyPeriod, plainWarnings, supportBadge } from "../lib/rules";
import { useApi } from "../lib/useApi";
import { LineChart, type LinePoint } from "./Charts";
import { Badge, ErrorBox, ItemPic, Ring, Skeleton } from "./common";

interface Props {
  item: Item;
  onItem: (i: Item) => void;
  support: { data?: Envelope<SupportResult>; error?: string; loading: boolean };
  schedule: { data?: Envelope<ConfigResult<{ schedule: Schedule }>>; error?: string };
  requirements: { data?: Envelope<ConfigResult<{ requirements: Requirement[] }>>; error?: string };
  onDocs: () => void;
}

export function Home({ item, onItem, support, schedule, requirements, onDocs }: Props) {
  const r = support.data?.result;
  const idx = ITEMS.indexOf(item);

  return (
    <>
      <div className="pagehead">
        <h1>홈</h1>
      </div>
      <div className="sec">
        <h2>{r ? `${ymKR(r.ym)} 예측 정보` : "이번 달 예측 정보"}</h2>
        {r && <span>{`${r.as_of.slice(0, 4)}년 ${mdKR(r.as_of)} 기준`}</span>}
      </div>

      <div className="grid3">
        <div className="card itemcard">
          <ItemPic item={item} />
          <div className="name">{item}</div>
          <div className="muted">{specLabel(item)} 기준</div>
          <div className="pager">
            <button aria-label="이전 품목" onClick={() => onItem(ITEMS[(idx + ITEMS.length - 1) % ITEMS.length])}>
              ‹
            </button>
            <span className="num">
              {idx + 1}/{ITEMS.length}
            </span>
            <button aria-label="다음 품목" onClick={() => onItem(ITEMS[(idx + 1) % ITEMS.length])}>
              ›
            </button>
          </div>
        </div>

        <SupportCard support={support} />

        <div className="card prepcard">
          <h3>출하 증빙 준비하기</h3>
          <div className="muted">
            신청 기간 {schedule.data ? applyPeriod(schedule.data.result.data.schedule, schedule.data.result.conflicts) : "…"}
          </div>
          <ErrorBox msg={schedule.error} />
          <Crate />
          <div className="btnrow">
            <button className="btn primary" onClick={onDocs}>
              서류 보기
            </button>
            {schedule.data && (
              <a className="btn ghost" href={`tel:${schedule.data.result.data.schedule.contact.replace(/[^0-9]/g, "")}`}>
                도청에 전화
              </a>
            )}
          </div>
          {schedule.data && <div className="muted">{schedule.data.result.data.schedule.contact}</div>}
        </div>
      </div>

      <div className="sec">
        <h2>신청 전 확인 정보</h2>
        <span>{requirements.data ? `${requirements.data.result.season} 공고 기준` : ""}</span>
      </div>
      <div className="grid2">
        <ReqCard requirements={requirements} />
        <PriceChart item={item} r={r} />
      </div>
      <div className="footnote">{DISCLAIMER}</div>
    </>
  );
}

function SupportCard({ support }: { support: Props["support"] }) {
  const r = support.data?.result;
  if (!r)
    return (
      <div className="card">
        <h3>지원 가능성</h3>
        {support.error ? <ErrorBox msg={support.error} /> : <Skeleton h={160} />}
      </div>
    );
  const b = supportBadge(r);
  const notes = plainWarnings(support.data!.warnings);
  const announced = r.status === "공고 확정" && r.announced;
  return (
    <div className="card" style={{ opacity: support.loading ? 0.6 : 1 }}>
      <div className="row">
        <h3>{ymKR(r.ym)} 지원 가능성</h3>
        <Badge b={b} />
      </div>
      <div className="muted num">
        {announced
          ? `공식 월평균 ${r.announced!.official_per_spec == null ? "자료 없음" : won(r.announced!.official_per_spec)} · 기준 ${won(r.announced!.bep_per_spec)}`
          : r.m_hat_per_spec != null
            ? `예상 ${won(r.m_hat_per_spec)} · 기준 ${won(r.bep_per_spec)}`
            : `기준 ${won(r.bep_per_spec)}`}
      </div>
      <div className="ringrow">
        <Ring b={b} p={r.p_below} />
        {r.interval_per_spec && (
          <div className="metrics">
            <div className="metric">
              <span>80% 범위</span>
              <span className="num">
                {won(r.interval_per_spec[0])} ~ {won(r.interval_per_spec[1])}
              </span>
            </div>
            {r.observed_days != null && (
              <div className="metric">
                <span>이달 거래일</span>
                <span className="num">
                  {r.observed_days}일 지남 · {r.remaining_days}일 남음
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {notes.length > 0 && (
        <ul className="notes">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <div className="muted">
        📍 가락시장 {specLabel(r.item, r.spec_kg)} 기준{r.bep_season ? ` · 지원 기준 ${r.bep_season} 시즌` : ""}
      </div>
    </div>
  );
}

function ReqCard({ requirements }: { requirements: Props["requirements"] }) {
  const req = requirements.data?.result.data.requirements;
  const pick = req ? ["R01", "R03", "R05", "R11"].map((id) => req.find((x) => x.id === id)).filter(Boolean) as Requirement[] : [];
  return (
    <div className="card">
      <h3>신청 자격</h3>
      <ErrorBox msg={requirements.error} />
      {!req && !requirements.error && <Skeleton />}
      <ul className="checklist">
        {pick.map((x) => (
          <li key={x.id}>
            <span className={x.id === "R11" ? "warnmark" : "ok"}>{x.id === "R11" ? "!" : "✓"}</span>
            <span>{x.rule}</span>
          </li>
        ))}
      </ul>
      <h3 style={{ marginTop: 8 }}>출하 조건</h3>
      <ul className="checklist">
        <li><span className="ok">✓</span><span>도외 도매시장(산지공판장 포함) 출하</span></li>
        <li><span className="ok">✓</span><span>출하 월 공식 월평균이 지원 기준 이하</span></li>
        <li><span className="ok">✓</span><span>월동무·양배추·당근·조생양파</span></li>
      </ul>
    </div>
  );
}

function PriceChart({ item, r }: { item: Item; r?: SupportResult }) {
  const ym = r?.ym;
  const monthly = useApi(ym ? () => getMarketMonthly(item, addMonths(ym, -6), addMonths(ym, -1)) : null, [item, ym]);
  const rows = monthly.data?.result.rows.filter((x) => x.ym < (ym ?? "") && x.days >= 15 && x.official_est_per_spec != null).slice(-6) ?? [];
  const pts: LinePoint[] = rows.map((x) => ({ ym: x.ym, v: x.official_est_per_spec!, kind: "past" }));
  if (r?.m_hat_per_spec != null)
    pts.push({ ym: r.ym, v: r.m_hat_per_spec, kind: "now", lo: r.interval_per_spec?.[0], hi: r.interval_per_spec?.[1] });
  const bep = r?.bep_per_spec;
  return (
    <div className="card">
      <div className="row" style={{ flexWrap: "wrap" }}>
        <h3>월별 {item} 가격</h3>
        <span className="muted">
          <span style={{ color: "#B0352C", fontWeight: 700 }}>- - 지원 기준 {won(bep)}</span> · 원/{specLabel(item)}
        </span>
      </div>
      <ErrorBox msg={monthly.error} />
      {monthly.loading && !monthly.data ? <Skeleton h={200} /> : !monthly.error && <LineChart pts={pts} bep={bep} />}
      <div className="muted">실선은 지난달까지 공식 가격 추정, 마지막 점은 이번 달 예측과 80% 범위예요.</div>
    </div>
  );
}

/** 채소 바구니 그림: Figma 대시보드의 "Vegetable Basket"(node 43:180)을 SVG로 내보낸 것 */
const Crate = () => (
  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
    <img src="/illust/basket.svg" alt="" aria-hidden="true" width={111} height={111} />
  </div>
);
