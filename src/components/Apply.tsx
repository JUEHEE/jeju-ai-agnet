// 신청 안내: GET /api/config/{summary, schedule, items, documents, requirements}
import { useState } from "react";
import { getDocuments, getItemsConfig, getRequirements, getSchedule, getSummary } from "../api/endpoints";
import { won } from "../lib/format";
import { applyPeriod, plainWarnings } from "../lib/rules";
import { useApi } from "../lib/useApi";
import { ErrorBox, Skeleton } from "./common";

export function Apply() {
  const summary = useApi(getSummary, []);
  const schedule = useApi(getSchedule, []);
  const items = useApi(getItemsConfig, []);
  const docs = useApi(getDocuments, []);
  const reqs = useApi(getRequirements, []);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const s = summary.data?.result.data.summary;
  const sc = schedule.data?.result;
  const notes = plainWarnings([...(schedule.data?.warnings ?? []), ...(summary.data?.warnings ?? [])]);
  const D = docs.data?.result.data.documents;
  const allDocs = D ? [...D.common, ...D["영농조합법인"].map((d) => ({ ...d, extra: true }))] : [];
  const done = allDocs.filter((d) => checked[d.id]).length;

  return (
    <>
      <div className="pagehead">
        <h1>신청 안내</h1>
        <span className="sub">{sc ? `${sc.season} 시즌 공고 기준` : ""}</span>
      </div>
      <div className="grid2">
        <div className="card">
          <h3>물류비 지원사업</h3>
          <ErrorBox msg={summary.error || schedule.error} />
          {!s || !sc ? (
            <Skeleton h={160} />
          ) : (
            <dl className="kv">
              <dt>지원 내용</dt>
              <dd>{s.support}</dd>
              <dt>가격 조건</dt>
              <dd>{s.price_condition}</dd>
              <dt>신청 주체</dt>
              <dd>{s.applicant}</dd>
              <dt>신청 기간</dt>
              <dd>{applyPeriod(sc.data.schedule, sc.conflicts)}</dd>
              <dt>신청 방법</dt>
              <dd>{sc.data.schedule.round1.method}</dd>
              <dt>2차 신청</dt>
              <dd>
                {sc.data.schedule.round2.when} ({sc.data.schedule.round2.scope})
              </dd>
              <dt>문의</dt>
              <dd>{sc.data.schedule.contact}</dd>
            </dl>
          )}
          {notes.length > 0 && (
            <ul className="notes">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3>품목별 지원 기준</h3>
          <ErrorBox msg={items.error} />
          {items.data ? (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>품목</th>
                    <th>규격</th>
                    <th className="n">지원 단가</th>
                    <th className="n">지원 기준</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(items.data.result.data.items).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{v.spec}</td>
                      <td className="n">kg당 {v.unit_price_won_per_kg}원</td>
                      <td className="n">{won(v.bep_per_spec)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !items.error && <Skeleton h={120} />
          )}
        </div>
      </div>
      <div className="grid2">
        <div className="card" id="docs">
          <div className="row">
            <h3>제출 서류 체크</h3>
            <span className="num muted">
              {done}/{allDocs.length} 준비
            </span>
          </div>
          <ErrorBox msg={docs.error} />
          <p className="muted" style={{ margin: 0 }}>
            준비한 서류를 체크해 보세요 (이 화면에서만 표시, 저장 안 함). 영농조합법인은 마지막 2종이 추가로 필요해요.
          </p>
          <ul className="checklist">
            {allDocs.map((d) => (
              <li key={d.id}>
                <input type="checkbox" id={`doc-${d.id}`} checked={!!checked[d.id]} onChange={(e) => setChecked({ ...checked, [d.id]: e.target.checked })} />
                <label htmlFor={`doc-${d.id}`}>
                  {"extra" in d && <span className="pill">영농법인</span>} {d.name}
                  {d.note && <span className="muted"> · {d.note}</span>}
                </label>
              </li>
            ))}
          </ul>
          {D && <p className="footnote">{D.later}</p>}
        </div>
        <div className="card">
          <h3>신청 요건</h3>
          <ErrorBox msg={reqs.error} />
          {reqs.data && (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>요건</th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.data.result.data.requirements.map((r) => (
                    <tr key={r.id}>
                      <td className="num">{r.id}</td>
                      <td>{r.rule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
