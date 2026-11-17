// 지난 결과: GET /api/market/{item}/monthly 의 공고된 달 (official_per_spec, eligible)
import { getMarketMonthly } from "../api/endpoints";
import { ITEMS } from "../api/types";
import { won } from "../lib/format";
import { supportBadge } from "../lib/rules";
import { useApi } from "../lib/useApi";
import { Badge, ErrorBox, Skeleton } from "./common";

export function Results({ dataEnd }: { dataEnd?: string }) {
  const all = useApi(
    () => Promise.allSettled(ITEMS.map((it) => getMarketMonthly(it))),
    [],
  );
  const rows =
    all.data?.flatMap((s, i) =>
      s.status === "fulfilled"
        ? s.value.result.rows.filter((r) => r.eligible != null).map((r) => ({ item: ITEMS[i], ...r }))
        : [],
    ) ?? [];
  const errors = all.data?.flatMap((s, i) => (s.status === "rejected" ? [`${ITEMS[i]}: ${(s.reason as Error).message}`] : [])) ?? [];
  rows.sort((a, b) => (a.ym === b.ym ? ITEMS.indexOf(a.item) - ITEMS.indexOf(b.item) : b.ym.localeCompare(a.ym)));

  return (
    <>
      <div className="pagehead">
        <h1>지난 결과</h1>
        <span className="sub">공고가 난 달의 실제 결과{dataEnd ? ` · 데이터 ${dataEnd}까지` : ""}</span>
      </div>
      <div className="card">
        {all.loading && <Skeleton h={200} />}
        {errors.map((e) => (
          <ErrorBox key={e} msg={e} />
        ))}
        {rows.length > 0 && (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>품목</th>
                  <th>월</th>
                  <th>시즌</th>
                  <th className="n">공식 월평균</th>
                  <th className="n">지원 기준</th>
                  <th>결과</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.item + r.ym}>
                    <td>{r.item}</td>
                    <td className="num">{r.ym}</td>
                    <td className="num">{r.season}</td>
                    <td className="n">{r.official_per_spec == null ? <span className="muted">자료 없음</span> : won(r.official_per_spec)}</td>
                    <td className="n">{won(r.bep_per_spec)}</td>
                    <td>
                      <Badge b={supportBadge({ status: "공고 확정", verdict: null, announced: { eligible: r.eligible!, official_per_spec: r.official_per_spec, bep_per_spec: r.bep_per_spec ?? 0 } })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="footnote">금액은 공고 규격(양배추 8kg 망, 월동무·당근 20kg 상자, 조생양파 15kg 망) 기준이에요.</p>
      </div>
    </>
  );
}
