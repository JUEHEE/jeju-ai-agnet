import { useEffect, useMemo, useState } from "react";
import { API_BASE, IS_MOCK } from "./api/client";
import { getReplay, getRequirements, getSchedule, getSupport, getSupportAll, type Basis } from "./api/endpoints";
import { MOCK_REPLAY } from "./api/mock";
import { ITEMS, type Item } from "./api/types";
import { Apply } from "./components/Apply";
import { Chat } from "./components/Chat";
import { Logo } from "./components/common";
import { Home } from "./components/Home";
import { Results } from "./components/Results";
import { dateKR } from "./lib/format";
import { SERVICE_NAME, SHORT, plainWarnings, supportBadge, tone } from "./lib/rules";
import { useApi } from "./lib/useApi";

type View = "home" | "results" | "apply";

/** 시연에서 고를 수 있는 달: 2025/26 지원 시즌 (11월~이듬해 4월) */
const DEMO_MONTHS = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"];

export default function App() {
  const [view, setView] = useState<View>("home");
  const [item, setItem] = useState<Item>("양배추");
  const [demo, setDemo] = useState(false);
  const [demoYm, setDemoYm] = useState<string>(MOCK_REPLAY.ym);
  const [demoAsOf, setDemoAsOf] = useState<string>(MOCK_REPLAY.as_of);
  const [big, setBig] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("big", big);
  }, [big]);

  // 시연 슬라이더: 그달 거래일 목록
  const replay = useApi(demo ? () => getReplay(item, demoYm) : null, [demo, item, demoYm]);
  const dates = useMemo(() => replay.data?.result.records.map((r) => r.as_of) ?? [], [replay.data]);
  useEffect(() => {
    if (dates.length && !dates.includes(demoAsOf)) setDemoAsOf(dates[Math.min(10, dates.length - 1)]);
  }, [dates, demoAsOf]);

  const basis: Basis = demo ? { mode: "replay", as_of: demoAsOf } : { mode: "live" };
  const ym = demo ? demoYm : undefined;
  const all = useApi(() => getSupportAll(basis, ym), [demo, demoAsOf, ym]);
  const support = useApi(() => getSupport(item, basis, ym), [item, demo, demoAsOf, ym]);
  const schedule = useApi(getSchedule, []);
  const requirements = useApi(getRequirements, []);

  const dataEnd = all.data?.data_end ?? support.data?.data_end;
  const asOf = support.data?.result.as_of ?? all.data?.result.as_of;
  const idx = dates.indexOf(demoAsOf);

  const goDocs = () => {
    setView("apply");
    setTimeout(() => document.getElementById("docs")?.scrollIntoView({ behavior: "smooth" }), 300);
  };

  return (
    <div className="app">
      <aside className="rail" aria-label="메뉴">
        <Logo className="logo" />
        <div className="brand railname">{SERVICE_NAME}</div>
        <nav className="nav">
          <NavBtn label="홈" on={view === "home"} onClick={() => setView("home")} icon={<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />} />
          <NavBtn label="지난 결과" on={view === "results"} onClick={() => setView("results")} icon={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />
          <NavBtn label="신청 안내" on={view === "apply"} onClick={() => setView("apply")} icon={<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>} />
        </nav>
        <div className="bigtext">
          큰 글씨
          <br />
          <button className="switch" aria-pressed={big} aria-label="큰 글씨" onClick={() => setBig(!big)} />
        </div>
      </aside>

      <main className="main">
        <div className="topbar" aria-label="품목 선택">
          {(all.data?.result.items ?? ITEMS.map((it) => ({ item: it }) as any)).map((r: any) => {
            const b = r.status ? supportBadge(r) : null;
            const on = r.item === item;
            return (
              <button key={r.item} className="chip" aria-pressed={on} onClick={() => setItem(r.item)}>
                {b && (
                  <span className="sym" style={{ color: on ? "inherit" : tone(b.tone).text }}>
                    {b.symbol}
                  </span>
                )}
                {r.item} {b ? SHORT[b.code] : ""}
              </button>
            );
          })}
          <span className="spacer" />
          <div className="seg" role="group" aria-label="기준">
            <button aria-pressed={!demo} onClick={() => setDemo(false)}>
              최신 데이터
            </button>
            <button aria-pressed={demo} onClick={() => setDemo(true)}>
              시연
            </button>
          </div>
          <span className={`conn ${IS_MOCK ? "mock" : "live"}`} title={IS_MOCK ? "docs/api_examples 응답으로 동작 중" : API_BASE}>
            {IS_MOCK ? "목업 데이터" : "API 연결"}
          </span>
        </div>
        {all.error && <div className="errbox">{all.error}</div>}

        <div className="datebar">
          <label htmlFor="dateRange">기준일</label>
          {demo ? (
            <>
              <select value={demoYm} onChange={(e) => setDemoYm(e.target.value)} aria-label="시연할 달">
                {DEMO_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button className="iconbtn" aria-label="하루 전" disabled={idx <= 0} onClick={() => setDemoAsOf(dates[idx - 1])}>
                ◀
              </button>
              <input id="dateRange" type="range" min={0} max={Math.max(0, dates.length - 1)} value={Math.max(0, idx)} disabled={!dates.length} onChange={(e) => setDemoAsOf(dates[+e.target.value])} />
              <button className="iconbtn" aria-label="하루 후" disabled={idx < 0 || idx >= dates.length - 1} onClick={() => setDemoAsOf(dates[idx + 1])}>
                ▶
              </button>
              <span className="d num">{dateKR(demoAsOf)}</span>
              <span className="muted">
                {/* 슬라이더 API(replay)의 경고도 빠짐없이 표시 (규칙 8). 응답 전에는 같은 뜻의 기본 안내 */}
                시연: {(replay.data && plainWarnings(replay.data.warnings).join(" ")) || "그날까지 알 수 있던 정보만 사용"}
              </span>
              {replay.error && <span className="errbox" style={{ flexBasis: "100%" }}>{replay.error}</span>}
            </>
          ) : (
            <>
              <span className="d num">{asOf ? dateKR(asOf) : "…"}</span>
              <span className="muted">저장 데이터 마지막 날 기준 · 공고가 끝난 달은 실제 결과</span>
            </>
          )}
          {dataEnd && <span className="muted" style={{ marginLeft: "auto" }}>데이터 {dataEnd}까지 (갱신 안 함)</span>}
        </div>

        {view === "home" && <Home item={item} onItem={setItem} support={support} schedule={schedule} requirements={requirements} onDocs={goDocs} />}
        {view === "results" && <Results dataEnd={dataEnd} />}
        {view === "apply" && <Apply />}
      </main>

      <Chat context={{ item, as_of: demo ? demoAsOf : asOf, mode: demo ? "replay" : "live" }} />
    </div>
  );
}

function NavBtn({ label, icon, on, onClick, disabled }: { label: string; icon: JSX.Element; on?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button aria-current={on ? "page" : undefined} onClick={onClick} disabled={disabled} title={disabled ? "준비 중" : undefined}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        {icon}
      </svg>
      {label}
    </button>
  );
}
