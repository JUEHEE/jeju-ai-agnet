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

/** 바당 PASS 로고: Figma 왼쪽 메뉴의 귤 캐릭터(node 43:16)를 SVG로 내보낸 것 (47×53) */
export function Logo({ size = 46, className }: { size?: number; className?: string }) {
  return <img className={className} src="/illust/logo.svg" alt="" aria-hidden="true" width={size} height={Math.round((size * 53) / 47)} />;
}

/** 체크리스트 아이콘 (Figma 신청 자격 카드): 연한 원 + 체크 / 느낌표 */
export function CheckIcon({ kind = "ok" }: { kind?: "ok" | "warn" }) {
  const ok = kind === "ok";
  return (
    <svg width="18" height="18" viewBox="0 0 18.4 18.4" aria-label={ok ? "충족" : "주의"} role="img" style={{ flex: "none", marginTop: 1 }}>
      <circle cx="9.2" cy="9.2" r="9.2" fill={ok ? "#E8F3FF" : "#FFF3DA"} />
      {ok ? (
        <path d="M5.25 9.15L8.15 12.05L13.35 6.25" stroke="#1B64DA" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ) : (
        <text x="9.2" y="13.6" textAnchor="middle" fontSize="12" fontWeight="800" fill="#E8930C">
          !
        </text>
      )}
    </svg>
  );
}

/** 품목 사진: public/items/ (위키미디어 공용 CC0·퍼블릭 도메인, 출처는 public/items/CREDITS.md) */
const PHOTOS: Record<string, string> = {
  양배추: "/items/cabbage.jpg",
  월동무: "/items/radish.jpg",
  당근: "/items/carrot.jpg",
  조생양파: "/items/onion.jpg",
};

export const ItemPic = ({ item }: { item: string }) => <img className="pic" src={PHOTOS[item]} alt={`${item} 사진`} width={104} height={104} />;

export const ErrorBox = ({ msg }: { msg?: string }) => (msg ? <div className="errbox" role="alert">{msg}</div> : null);
export const Skeleton = ({ h = 60 }: { h?: number }) => <div className="skeleton" style={{ minHeight: h }} aria-hidden="true" />;
