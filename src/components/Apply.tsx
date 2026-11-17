// 신청 안내: GET /api/config/{summary, schedule, items, documents, requirements}
import { useState } from "react";
import { getDocuments, getItemsConfig, getRequirements, getSchedule, getSummary } from "../api/endpoints";
import { won } from "../lib/format";
import { applyPeriod, plainWarnings } from "../lib/rules";
import { useApi } from "../lib/useApi";
import { ItemAvatar, Skeleton } from "./common";

const Err = ({ msg }: { msg?: string }) => (msg ? <div className="infobox err">{msg}</div> : null);

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
  const allDocs = D ? [...D.common.map((d) => ({ ...d, extra: false })), ...D["영농조합법인"].map((d) => ({ ...d, extra: true }))] : [];
  const done = allDocs.filter((d) => checked[d.id]).length;
  const contact = sc?.data.schedule.contact;
  const tel = contact?.replace(/[^0-9]/g, "");

  return (
    <div className="page">
      <div className="page-head">
        <h1>신청 안내</h1>
        <p>{sc ? `${sc.season} 시즌 공고 기준이에요` : "공고 내용을 불러오고 있어요"}</p>
      </div>

      {/* 한눈에 */}
      <div className="sheet hero">
        <div className="eyebrow">물류비 지원사업</div>
        {s ? (
          <>
            <div className="big">{s.support}</div>
            <div className="sub">
              {s.price_condition}
              <br />
              {s.applicant}
            </div>
          </>
        ) : (
          <>
            <Err msg={summary.error} />
            {!summary.error && <Skeleton h={80} />}
          </>
        )}
      </div>

      {/* 일정 */}
      <div className="sheet">
        <h2>신청 일정</h2>
        <Err msg={schedule.error} />
        {sc ? (
          <dl className="facts">
            <div>
              <dt>신청 기간</dt>
              <dd>{applyPeriod(sc.data.schedule, sc.conflicts)}</dd>
            </div>
            <div>
              <dt>신청 방법</dt>
              <dd>{sc.data.schedule.round1.method}</dd>
            </div>
            <div>
              <dt>2차 신청</dt>
              <dd>
                {sc.data.schedule.round2.when} ({sc.data.schedule.round2.scope})
              </dd>
            </div>
            <div>
              <dt>문의</dt>
              <dd>{tel ? <a href={`tel:${tel}`}>{contact}</a> : contact}</dd>
            </div>
          </dl>
        ) : (
          !schedule.error && <Skeleton h={120} />
        )}
        {notes.length > 0 && (
          <div className="infobox">
            {notes.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>
        )}
      </div>

      {/* 품목 */}
      <div className="sheet">
        <h2>품목별 지원 기준</h2>
        <p className="desc">공식 월평균이 기준 금액 이하인 달에 지원돼요</p>
        <Err msg={items.error} />
        {items.data ? (
          <ul className="rows">
            {Object.entries(items.data.result.data.items).map(([k, v]) => (
              <li key={k}>
                <ItemAvatar item={k} />
                <div className="body">
                  <div className="t">{k}</div>
                  <div className="s">
                    {v.spec} · kg당 {v.unit_price_won_per_kg}원 지원
                  </div>
                </div>
                <div className="end">
                  {won(v.bep_per_spec)}
                  <small>지원 기준</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          !items.error && <Skeleton h={160} />
        )}
      </div>

      {/* 서류 */}
      <div className="sheet" id="docs">
        <h2>제출 서류</h2>
        <p className="desc">
          {allDocs.length ? `${allDocs.length}개 중 ${done}개 준비했어요 · 눌러서 체크해 보세요 (저장 안 함)` : "서류 목록을 불러오고 있어요"}
        </p>
        <Err msg={docs.error} />
        {allDocs.length > 0 && (
          <div className="progress" aria-hidden="true">
            <i style={{ width: `${(done / allDocs.length) * 100}%` }} />
          </div>
        )}
        <ul className="rows">
          {allDocs.map((d) => (
            <li
              key={d.id}
              className="check"
              role="checkbox"
              aria-checked={!!checked[d.id]}
              tabIndex={0}
              onClick={() => setChecked({ ...checked, [d.id]: !checked[d.id] })}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  setChecked({ ...checked, [d.id]: !checked[d.id] });
                }
              }}
            >
              <span className={`circle-check${checked[d.id] ? " on" : ""}`}>
                {checked[d.id] && (
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3 7.2l2.7 2.6L11 4.2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <div className="body">
                <div className="t">
                  {d.name}
                  {d.extra && <span className="tag">영농조합법인만</span>}
                </div>
                {d.note && <div className="s">{d.note}</div>}
              </div>
            </li>
          ))}
        </ul>
        {D && <div className="infobox">{D.later}</div>}
      </div>

      {/* 요건 */}
      <div className="sheet">
        <h2>신청 요건</h2>
        <p className="desc">신청은 지역농협·영농조합법인이 하고, 지원금은 출하한 농가에 지급돼요</p>
        <Err msg={reqs.error} />
        {reqs.data && (
          <ul className="rows">
            {reqs.data.result.data.requirements.map((r, i) => (
              <li key={r.id}>
                <span className="num-badge">{i + 1}</span>
                <div className="body">
                  <div className="t" style={{ fontWeight: 600 }}>
                    {r.rule.replace(/^\(영농조합법인만\)\s*/, "")}
                    {r.applies_to && <span className="tag">{r.applies_to}만</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
