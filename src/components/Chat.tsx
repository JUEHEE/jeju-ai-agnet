// 오른쪽 채팅 (CHAT_SPEC.md). messages 를 순서대로 그리고, 카드 버튼은 POST /api/tools/{tool} 로 바로 부른다.
import { useEffect, useRef, useState } from "react";
import { callTool, chat } from "../api/endpoints";
import type { Card, CardAction, ChatContext } from "../api/types";
import { toolResultToCard } from "../lib/cards";
import { DISCLAIMER, SERVICE_NAME, SERVICE_NAME_PENDING, SERVICE_TAGLINE, UI, plainWarnings } from "../lib/rules";
import { BarChart, LineChart, type LinePoint } from "./Charts";
import { Badge, Logo } from "./common";

type Entry =
  | { kind: "me" | "text" | "foot" | "error"; text: string }
  | { kind: "card"; card: Card }
  | { kind: "sugs"; list: string[] };

const NEEDS_DISCLAIMER = ["support", "compare", "announced"];

export function Chat({ context }: { context: ChatContext }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const [input, setInput] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const session = useRef(`web-${Math.random().toString(36).slice(2, 10)}`);
  const ctxRef = useRef(context);
  ctxRef.current = context;

  const push = (...e: Entry[]) => setEntries((cur) => [...cur.filter((x) => x.kind !== "sugs"), ...e]);

  async function ask(message: string | null) {
    if (message) push({ kind: "me", text: message });
    setBusy(true);
    try {
      const res = await chat(session.current, message, ctxRef.current);
      setDemo(res.demo);
      const out: Entry[] = res.messages.map((m) =>
        m.type === "card" && m.card ? { kind: "card", card: m.card } : { kind: m.style === "footnote" ? "foot" : "text", text: m.text ?? "" },
      );
      if (res.suggestions?.length) out.push({ kind: "sugs", list: res.suggestions });
      push(...out);
    } catch (e) {
      push({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function act(a: CardAction) {
    push({ kind: "me", text: a.label });
    setBusy(true);
    try {
      const env = await callTool(a.call.tool, a.call.args);
      const card = toolResultToCard(a.call, env);
      if (!card) {
        push({ kind: "text", text: "결과를 받았지만 아직 화면에 그리는 방법이 없는 응답이에요." });
      } else {
        const e: Entry[] = [];
        if (card.lead) e.push({ kind: "text", text: card.lead });
        e.push({ kind: "card", card });
        if (NEEDS_DISCLAIMER.includes(card.type)) e.push({ kind: "foot", text: DISCLAIMER });
        push(...e);
      }
    } catch (e) {
      push({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    ask(null); // 첫 인사
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [entries, busy]);

  return (
    <aside className="chat" aria-label="채팅">
      <div className="chathead">
        <Logo size={30} />
        <span className="t">
          <span className="brand">{SERVICE_NAME}</span>
          <small>{SERVICE_NAME_PENDING ? "서비스 이름 미정 · 임시 표기" : SERVICE_TAGLINE}</small>
        </span>
        {demo && (
          <span className="pill demo" title="채팅 API(/api/agent/chat)가 아직 없어 백엔드가 만든 예시 답변을 보여줘요">
            예시 답변
          </span>
        )}
      </div>
      <div className="msgs" ref={box} aria-live="polite">
        {entries.map((e, i) => {
          if (e.kind === "card") return <ChatCard key={i} c={e.card} onAction={act} />;
          if (e.kind === "sugs")
            return (
              <div key={i} className="sugs">
                {e.list.map((s) => (
                  <button key={s} onClick={() => ask(s)} disabled={busy}>
                    {s}
                  </button>
                ))}
              </div>
            );
          if (e.kind === "error")
            return (
              <div key={i} className="errbox" role="alert">
                {e.text}
              </div>
            );
          return (
            <div key={i} className={`bubble${e.kind === "me" ? " me" : ""}${e.kind === "foot" ? " foot" : ""}`}>
              {e.text}
            </div>
          );
        })}
        {busy && <div className="typing">답변을 준비하고 있어요…</div>}
      </div>
      <form
        className="chatin"
        onSubmit={(e) => {
          e.preventDefault();
          const t = input.trim();
          if (!t || busy) return;
          setInput("");
          ask(t);
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="궁금한 걸 물어보세요" autoComplete="off" aria-label="질문 입력" />
        <button aria-label="보내기" disabled={busy}>
          ↑
        </button>
      </form>
    </aside>
  );
}

function ChatCard({ c, onAction }: { c: Card; onAction: (a: CardAction) => void }) {
  return (
    <div className="ccard">
      {(c.badge || c.subtitle) && (
        <div className="row">
          {c.badge ? <Badge b={c.badge} /> : <span />}
          <span className="muted" style={{ fontSize: "0.7188rem" }}>
            {c.subtitle}
          </span>
        </div>
      )}
      {c.title && <h4>{c.title}</h4>}
      {c.text && <div className="sum">{c.text}</div>}
      {c.summary && <div className="sum num">{c.summary}</div>}
      {c.probability?.show && <div className="sum">기준 이하일 가능성 {c.probability.display}</div>}
      {c.range && (
        <div className="sum num">
          80% 범위 {c.range.display}
        </div>
      )}

      {c.steps && (
        <ol className="steps">
          {c.steps.map((s) => (
            <li key={s.label}>
              <b>{s.label}</b>
              {s.badge ? <Badge b={s.badge} /> : <b className="num">{s.display}</b>}
              {s.text && <span className="t">{s.text}</span>}
            </li>
          ))}
        </ol>
      )}

      {c.type === "compare" && c.rows && (
        <div style={{ display: "grid", gap: 8 }}>
          {c.rows.map((r) => (
            <div key={r.item}>
              <div className="row">
                <b>{r.item}</b>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge b={r.badge} />
                  {r.action && (
                    <button className="mini" onClick={() => onAction({ ...r.action, label: `${r.item} ${r.action.label}` })}>
                      {r.action.label}
                    </button>
                  )}
                </span>
              </div>
              {r.summary && <div className="sum num" style={{ fontSize: "0.75rem" }}>{r.summary}</div>}
            </div>
          ))}
        </div>
      )}

      {c.type === "program" && c.rows && (
        <table>
          <tbody>
            {c.rows.map((r) => (
              <tr key={r.item}>
                <td>{r.item}</td>
                <td>{r.spec}</td>
                <td className="n">{r.unit_price}</td>
                <td className="n">{r.bep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {c.type === "eligibility" && c.rows && (
        <div style={{ display: "grid", gap: 3, fontSize: "0.75rem" }}>
          {c.rows.map((r) => (
            <div className="row" key={r.id}>
              <span>{r.rule}</span>
              <span className={r.status === "충족" ? "ok" : r.status === "미충족" ? "" : "warnmark"} style={{ whiteSpace: "nowrap", color: r.status === "미충족" ? "#B0352C" : undefined, fontWeight: 700 }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {c.type === "docs" && c.missing && (
        <>
          {c.progress && (
            <div className="sum num">
              준비 {c.progress.done}/{c.progress.total}
            </div>
          )}
          <div className="sum">빠진 서류 {c.missing.length}종</div>
          <ul className="notes">
            {c.missing.map((d) => (
              <li key={d.id}>{d.name}</li>
            ))}
          </ul>
        </>
      )}

      {c.facts && (
        <dl className="kv" style={{ fontSize: "0.7812rem" }}>
          {c.facts.map((f) => (
            <FactRow key={f.label + f.display} label={f.label} display={f.display} />
          ))}
        </dl>
      )}

      {c.chart && UI.chart_cards_in_chat && <CardChart chart={c.chart} />}

      {c.notes && c.notes.length > 0 && (
        <ul className="notes">
          {plainWarnings(c.notes).map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {c.actions && c.actions.length > 0 && (
        <div className="acts">
          {c.actions.map((a) => (
            <button key={a.id} onClick={() => onAction(a)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const FactRow = ({ label, display }: { label: string; display: string }) => (
  <>
    <dt>{label}</dt>
    <dd>{display}</dd>
  </>
);

function CardChart({ chart }: { chart: NonNullable<Card["chart"]> }) {
  if (chart.kind === "bar") return <BarChart x={chart.x} values={chart.series[0].values.map((v) => v ?? 0)} highlight={chart.highlight} />;
  const main = chart.series[0];
  const pts: LinePoint[] = chart.x.flatMap((ym, i) => (main.values[i] != null ? [{ ym, v: main.values[i]!, kind: "past" as const }] : []));
  const bep = chart.reference_line?.values.find((v) => v != null) ?? null;
  return (
    <>
      <LineChart pts={pts} bep={bep} w={340} h={180} />
      <div className="muted" style={{ fontSize: "0.7188rem" }}>
        <span style={{ color: "#B0352C", fontWeight: 700 }}>- - {chart.reference_line?.name ?? "지원 기준"}</span> · {main.name}
      </div>
    </>
  );
}
