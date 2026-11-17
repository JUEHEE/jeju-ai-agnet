// 지난 결과: GET /api/market/{item}/monthly 의 공고된 달 (official_per_spec, eligible)
import { useState } from "react";
import { getMarketMonthly } from "../api/endpoints";
import { ITEMS, type Item } from "../api/types";
import { specLabel, won } from "../lib/format";
import { supportBadge } from "../lib/rules";
import { useApi } from "../lib/useApi";
import { Badge, ItemAvatar, Skeleton } from "./common";

const ymLong = (ym: string) => `${ym.slice(0, 4)}년 ${+ym.slice(5, 7)}월`;

export function Results({ dataEnd }: { dataEnd?: string }) {
  const [filter, setFilter] = useState<Item | "전체">("전체");
  const all = useApi(() => Promise.allSettled(ITEMS.map((it) => getMarketMonthly(it))), []);

  const rows =
    all.data?.flatMap((s, i) =>
      s.status === "fulfilled" ? s.value.result.rows.filter((r) => r.eligible != null).map((r) => ({ item: ITEMS[i], ...r })) : [],
    ) ?? [];
  const errors = all.data?.flatMap((s, i) => (s.status === "rejected" ? [`${ITEMS[i]}: ${(s.reason as Error).message}`] : [])) ?? [];
  const shown = rows
    .filter((r) => filter === "전체" || r.item === filter)
    .sort((a, b) => (a.ym === b.ym ? ITEMS.indexOf(a.item) - ITEMS.indexOf(b.item) : b.ym.localeCompare(a.ym)));
  const seasons = [...new Set(shown.map((r) => r.season))];
  const supported = shown.filter((r) => r.eligible === 1).length;

  return (
    <div className="page">
      <div className="page-head">
        <h1>지난 결과</h1>
        <p>공고가 난 달에 실제로 지원됐는지 보여드려요{dataEnd ? ` · 데이터 ${dataEnd}까지` : ""}</p>
      </div>

      <div className="filters" role="group" aria-label="품목">
        <button className="all" aria-pressed={filter === "전체"} onClick={() => setFilter("전체")}>
          전체
        </button>
        {ITEMS.map((it) => (
          <button key={it} aria-pressed={filter === it} onClick={() => setFilter(it)}>
            <ItemAvatar item={it} size={26} />
            {it}
          </button>
        ))}
      </div>

      {all.loading && <Skeleton h={200} />}

      {shown.length > 0 && (
        <div className="sheet hero">
          <div className="eyebrow">{filter === "전체" ? "전체 품목" : filter}</div>
          <div className="big">
            공고된 {shown.length}개월 중 <span style={{ color: "#3182F6" }}>{supported}개월</span> 지원됐어요
          </div>
          <div className="stats">
            <div>
              <b>{supported}</b>
              <span>지원된 달</span>
            </div>
            <div>
              <b>{shown.length - supported}</b>
              <span>지원 안 된 달</span>
            </div>
            <div>
              <b>{seasons.length}</b>
              <span>시즌</span>
            </div>
          </div>
        </div>
      )}

      {shown.length > 0 && (
        <div className="sheet">
          <h2>달별 결과</h2>
          <p className="desc">공식 월평균이 지원 기준 이하이면 지원돼요</p>
          {seasons.map((season) => (
            <div key={season}>
              <div className="season-h">{season} 시즌</div>
              <ul className="rows">
                {shown
                  .filter((r) => r.season === season)
                  .map((r) => (
                    <li key={r.item + r.ym}>
                      <ItemAvatar item={r.item} />
                      <div className="body">
                        <div className="t">
                          {ymLong(r.ym)} · {r.item}
                        </div>
                        <div className="s">
                          공식 월평균 {r.official_per_spec == null ? "자료 없음" : won(r.official_per_spec)} · 기준 {won(r.bep_per_spec)} ({specLabel(r.item)})
                        </div>
                      </div>
                      <div className="end">
                        <Badge b={supportBadge({ status: "공고 확정", verdict: null, announced: { eligible: r.eligible!, official_per_spec: r.official_per_spec, bep_per_spec: r.bep_per_spec ?? 0 } })} />
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!all.loading && shown.length === 0 && errors.length === 0 && (
        <div className="sheet">
          <p className="desc" style={{ margin: 0 }}>아직 공고된 결과가 없어요.</p>
        </div>
      )}

      {errors.filter((e) => filter === "전체" || e.startsWith(filter)).length > 0 && (
        <div className="infobox err">
          {errors
            .filter((e) => filter === "전체" || e.startsWith(filter))
            .map((e) => (
              <div key={e}>{e}</div>
            ))}
        </div>
      )}
    </div>
  );
}
