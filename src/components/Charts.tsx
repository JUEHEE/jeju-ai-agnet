import { useState } from "react";
import { won, ymKR } from "../lib/format";

export interface LinePoint {
  ym: string;
  v: number;
  /** now = 이번 달 예측 (점선 + 80% 범위) */
  kind: "past" | "now";
  lo?: number;
  hi?: number;
}

function niceStep(r: number) {
  const p = Math.pow(10, Math.floor(Math.log10(r || 1)));
  const n = r / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** 월별 가격 선 그래프: 지원 기준선(빨간 점선) + 마지막 예측 점 */
export function LineChart({ pts, bep, w = 560, h = 220 }: { pts: LinePoint[]; bep?: number | null; w?: number; h?: number }) {
  const [tip, setTip] = useState<{ x: number; y: number; t: string } | null>(null);
  if (!pts.length) return <p className="muted">그릴 수 있는 거래 기록이 없어요.</p>;
  const L = 52, R = 16, T = 18, B = 30;
  const vals = pts.flatMap((p) => [p.v, p.lo, p.hi]).filter((v): v is number => v != null).concat(bep ? [bep] : []);
  let mn = Math.min(...vals), mx = Math.max(...vals);
  const pad = (mx - mn) * 0.15 || mx * 0.1;
  mn = Math.max(0, mn - pad);
  mx = mx + pad;
  const step = niceStep((mx - mn) / 4);
  mn = Math.floor(mn / step) * step;
  mx = Math.ceil(mx / step) * step;
  const x = (i: number) => L + (pts.length === 1 ? (w - L - R) / 2 : (i * (w - L - R)) / (pts.length - 1));
  const y = (v: number) => T + (h - T - B) * (1 - (v - mn) / (mx - mn));
  const past = pts.filter((p) => p.kind === "past");
  const nowI = pts.findIndex((p) => p.kind === "now");
  const now = nowI >= 0 ? pts[nowI] : null;
  const path = past.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join("");
  const grid: number[] = [];
  for (let v = mn; v <= mx + 1e-6; v += step) grid.push(v);

  return (
    <div className="chartwrap" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="월별 가격 차트">
        {grid.map((v) => (
          <g key={v}>
            <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">
              {Math.round(v).toLocaleString("ko-KR")}
            </text>
          </g>
        ))}
        {past.length > 1 && <path d={`${path}L${x(past.length - 1)},${h - B}L${x(0)},${h - B}Z`} fill="var(--accent)" opacity=".08" />}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.2" />
        {bep != null && <line x1={L} x2={w - R} y1={y(bep)} y2={y(bep)} stroke="#B0352C" strokeDasharray="5 4" strokeWidth="1.5" />}
        {now && past.length > 0 && (
          <path d={`M${x(nowI - 1)},${y(past[past.length - 1].v)}L${x(nowI)},${y(now.v)}`} stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
        )}
        {now && now.lo != null && now.hi != null && (
          <line x1={x(nowI)} x2={x(nowI)} y1={y(now.lo)} y2={y(now.hi)} stroke="var(--accent)" strokeWidth="6" opacity=".25" strokeLinecap="round" />
        )}
        {pts.map((p, i) => {
          const t = `${ymKR(p.ym)} ${p.kind === "now" ? "예측 " : ""}${won(p.v)}`;
          return (
            <g key={p.ym}>
              <circle
                cx={x(i)}
                cy={y(p.v)}
                r={p.kind === "now" ? 6 : 4}
                fill={p.kind === "now" ? "var(--surface)" : "var(--accent)"}
                stroke="var(--accent)"
                strokeWidth="2.5"
                onMouseEnter={() => setTip({ x: (x(i) / w) * 100, y: (y(p.v) / h) * 100, t })}
                onMouseLeave={() => setTip(null)}
              >
                <title>{t}</title>
              </circle>
              <text x={x(i)} y={h - 10} textAnchor="middle" fontSize="11.5" fill={p.kind === "now" ? "var(--accent)" : "var(--ink-3)"} fontWeight={p.kind === "now" ? 800 : 400}>
                {ymKR(p.ym)}
              </text>
              {p.kind === "now" && (
                <text x={x(i) - 10} y={y(p.v) - 12} textAnchor="end" fontSize="12" fontWeight="800" fill="var(--ink)">
                  {won(p.v)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {tip && (
        <div
          style={{ position: "absolute", left: `${tip.x}%`, top: `${tip.y}%`, transform: "translate(-50%,-130%)", background: "var(--ink)", color: "var(--surface)", fontSize: 12, padding: "4px 8px", borderRadius: 8, pointerEvents: "none", whiteSpace: "nowrap" }}
        >
          {tip.t}
        </div>
      )}
    </div>
  );
}

export function BarChart({ x, values, highlight = [] }: { x: string[]; values: number[]; highlight?: string[] }) {
  const W = 320, H = 160, L = 8, B = 24, T = 10;
  const mx = Math.max(...values, 1);
  const bw = (W - L * 2) / values.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }} role="img" aria-label="월별 거래량">
      {values.map((v, i) => {
        const bh = ((H - B - T) * v) / mx;
        return (
          <g key={x[i]}>
            <rect x={L + i * bw + 3} y={H - B - bh} width={bw - 6} height={bh} rx="3" fill={highlight.includes(x[i]) ? "var(--tangerine)" : "var(--line)"}>
              <title>{`${x[i]} ${Math.round(v).toLocaleString("ko-KR")}톤`}</title>
            </rect>
            <text x={L + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--ink-3)">
              {x[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
