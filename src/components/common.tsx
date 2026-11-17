import type { Badge as BadgeT } from "../api/types";
import { SHORT, UI, tone } from "../lib/rules";

export function Badge({ b }: { b?: BadgeT | null }) {
  if (!b) return null;
  const t = tone(b.tone);
  return (
    <span className="badge" style={{ color: t.text, background: t.bg }}>
      {b.symbol && <span aria-hidden="true">{b.symbol}</span>}
      {b.label}
    </span>
  );
}

/** 판정 도넛. 확률 숫자는 ui.json show_probability 가 true 일 때만 (규칙 5) */
export function Ring({ b, p }: { b: BadgeT; p?: number | null }) {
  const t = tone(b.tone);
  const C = 2 * Math.PI * 54;
  const show = UI.show_probability && p != null;
  const frac = show ? p! : 1;
  const lab = SHORT[b.code] ?? b.label;
  return (
    <svg className="ring" viewBox="0 0 140 140" role="img" aria-label={b.label}>
      <circle cx="70" cy="70" r="54" fill="none" stroke={t.bg} strokeWidth="13" />
      <circle cx="70" cy="70" r="54" fill="none" stroke={t.text} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} transform="rotate(-90 70 70)" />
      <text x="70" y={show ? 70 : 77} textAnchor="middle" fontSize={lab.length > 4 ? 16 : 22} fontWeight="800" fill={t.text}>
        {lab}
      </text>
      {show && (
        <text x="70" y="92" textAnchor="middle" fontSize="13" fill={t.text}>
          {Math.round(p! * 100)}%
        </text>
      )}
    </svg>
  );
}

export function Logo({ size = 46, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="27" r="17" fill="#F5A044" />
      <path d="M24 10c2-5 8-6 11-4-2 4-7 6-11 4z" fill="#3E9B5B" />
      <rect x="7" y="23" width="34" height="6" fill="#F8D29A" opacity=".8" />
      <circle cx="18" cy="30" r="1.8" fill="#5A3A1A" />
      <circle cx="30" cy="30" r="1.8" fill="#5A3A1A" />
      <path d="M20 35q4 3 8 0" stroke="#5A3A1A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const PICS: Record<string, JSX.Element> = {
  양배추: (
    <>
      <circle cx="48" cy="50" r="34" fill="#9CC98A" />
      <path d="M48 18c-14 10-14 54 0 64M48 18c14 10 14 54 0 64M20 44q28-12 56 0" stroke="#5E9A54" strokeWidth="3" fill="none" />
    </>
  ),
  월동무: (
    <>
      <path d="M38 30q10-4 20 0l-4 52q-6 8-12 0z" fill="#F3F1E6" stroke="#CFC8B0" strokeWidth="2" />
      <path d="M48 30q-6-16-16-20M48 30q4-18 14-22M48 30q0-16 2-24" stroke="#5E9A54" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  당근: (
    <>
      <path d="M36 34h24l-10 52q-2 4-4 0z" fill="#F08A24" />
      <path d="M48 34q-8-14-18-16M48 34q2-16 12-20M48 34q0-14 0-22" stroke="#5E9A54" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  조생양파: (
    <>
      <path d="M48 22q26 18 20 46q-6 16-20 16q-14 0-20-16q-6-28 20-46z" fill="#E7C27F" />
      <path d="M48 22v-10M38 60q10 6 20 0" stroke="#A8823F" strokeWidth="3" fill="none" />
    </>
  ),
};

export const ItemPic = ({ item }: { item: string }) => (
  <svg className="pic" viewBox="0 0 96 96" aria-hidden="true">
    {PICS[item]}
  </svg>
);

export const ErrorBox = ({ msg }: { msg?: string }) => (msg ? <div className="errbox" role="alert">{msg}</div> : null);
export const Skeleton = ({ h = 60 }: { h?: number }) => <div className="skeleton" style={{ minHeight: h }} aria-hidden="true" />;
