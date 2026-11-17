import { useId, useState } from "react";
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
const LINE = "#3B7DF0"; // Figma 그래프 선 색
const REF = "#E5484D"; // 지원 기준선

/**
 * 월별 가격 선 그래프 (Figma "월별 양배추 가격" 카드 스타일)
 * - 선 아래 위→아래로 옅어지는 그라데이션
 * - 지원 기준: 빨간 점선 + 왼쪽 위 라벨
 * - 이번 달 예측: 점선 연결, 파란 점, 값 말풍선, 바닥까지 세로 점선
 */
export function LineChart({ pts, bep, bepLabel, w = 560, h = 230 }: { pts: LinePoint[]; bep?: number | null; bepLabel?: string; w?: number; h?: number }) {
  const [tip, setTip] = useState<{ x: number; y: number; t: string } | null>(null);
  const gid = `g${useId().replace(/:/g, "")}`;
  if (!pts.length) return <p className="muted">그릴 수 있는 거래 기록이 없어요.</p>;
  const L = 48, R = 18, T = 22, B = 30;
  const vals = pts.map((p) => p.v).concat(bep ? [bep] : []);
  let mn = Math.min(...vals), mx = Math.max(...vals);
  const pad = (mx - mn) * 0.15 || mx * 0.1;
  mn = Math.max(0, mn - pad);
  mx = mx + pad;
  const step = niceStep((mx - mn) / 3);
  mn = Math.floor(mn / step) * step;
  mx = Math.ceil(mx / step) * step;
  const x = (i: number) => L + (pts.length === 1 ? (w - L - R) / 2 : (i * (w - L - R)) / (pts.length - 1));
  const y = (v: number) => T + (h - T - B) * (1 - (v - mn) / (mx - mn));
  const base = h - B;
  const pastN = pts.filter((p) => p.kind === "past").length;
  const nowI = pts.findIndex((p) => p.kind === "now");
  const now = nowI >= 0 ? pts[nowI] : null;
  const pathAll = pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join("");
  const pathPast = pts.slice(0, pastN).map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join("");
  const grid: number[] = [];
  for (let v = mn; v <= mx + 1e-6; v += step) grid.push(v);
  const label = now ? won(now.v) : "";
  const bw = label.length * 7.2 + 14;

  return (
    <div className="chartwrap" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="월별 가격 차트">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={LINE} stopOpacity="0.22" />
            <stop offset="1" stopColor={LINE} stopOpacity="0" />
          </linearGradient>
          <filter id={`${gid}s`} x="-20%" y="-40%" width="140%" height="180%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
          </filter>
        </defs>
        {grid.map((v) => (
          <g key={v}>
            <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
            <text x={L - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">
              {Math.round(v)}
            </text>
          </g>
        ))}
        {pts.length > 1 && <path d={`${pathAll}L${x(pts.length - 1)},${base}L${x(0)},${base}Z`} fill={`url(#${gid})`} />}
        {bep != null && (
          <>
            <line x1={L} x2={w - R} y1={y(bep)} y2={y(bep)} stroke={REF} strokeDasharray="2 3" strokeWidth="1.2" opacity="0.7" />
            {bepLabel && (
              <text x={L + 4} y={y(bep) - 6} fontSize="11" fill={REF}>
                {bepLabel}
              </text>
            )}
          </>
        )}
        {pastN > 1 && <path d={pathPast} fill="none" stroke={LINE} strokeWidth="1.6" strokeLinejoin="round" />}
        {now && pastN > 0 && (
          <path d={`M${x(nowI - 1)},${y(pts[nowI - 1].v)}L${x(nowI)},${y(now.v)}`} stroke={LINE} strokeWidth="1.6" strokeDasharray="5 4" fill="none" />
        )}
        {now && (
          <g>
            <line x1={x(nowI)} x2={x(nowI)} y1={y(now.v)} y2={base} stroke={LINE} strokeWidth="1.2" strokeDasharray="2 3" />
            <circle cx={x(nowI)} cy={y(now.v)} r="5" fill={LINE} stroke="#fff" strokeWidth="2" />
            <g filter={`url(#${gid}s)`}>
              <rect x={x(nowI) - bw - 2} y={y(now.v) - 34} width={bw} height="22" rx="6" fill="#fff" />
            </g>
            <text x={x(nowI) - 2 - bw / 2} y={y(now.v) - 19} textAnchor="middle" fontSize="12" fontWeight="800" fill="#1B1F1D">
              {label}
            </text>
          </g>
        )}
        {pts.map((p, i) => {
          const t = `${ymKR(p.ym)} ${p.kind === "now" ? "예측 " : ""}${won(p.v)}`;
          return (
            <g key={p.ym}>
              {/* 마우스를 올리면 값이 보이는 투명한 영역 */}
              <circle cx={x(i)} cy={y(p.v)} r="10" fill="transparent" onMouseEnter={() => setTip({ x: (x(i) / w) * 100, y: (y(p.v) / h) * 100, t })} onMouseLeave={() => setTip(null)}>
                <title>{t}</title>
              </circle>
              {tip && p.kind === "past" && tip.t === t && <circle cx={x(i)} cy={y(p.v)} r="3.5" fill={LINE} />}
              <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="11.5" fill={p.kind === "now" ? LINE : "var(--ink-3)"} fontWeight={p.kind === "now" ? 800 : 400}>
                {ymKR(p.ym)}
              </text>
            </g>
          );
        })}
      </svg>
      {tip && (
        <div
          style={{ position: "absolute", left: `${tip.x}%`, top: `${tip.y}%`, transform: "translate(-50%,-150%)", background: "var(--ink)", color: "var(--surface)", fontSize: 12, padding: "4px 8px", borderRadius: 8, pointerEvents: "none", whiteSpace: "nowrap" }}
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
