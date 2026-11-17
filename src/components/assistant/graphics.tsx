import type { ReactNode } from "react";

const P = {
  plus: "M12 5v14M5 12h14",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  calc: "M6 3h12v18H6zM9 7h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  send: "M12 19V5M6 11l6-6 6 6",
  close: "M6 6l12 12M18 6 6 18",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  reduce: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5",
  cube: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
  check: "M5 12l5 5L20 7",
  bolt: "M13 3L5 14h6l-1 7 8-11h-6z",
  left: "M15 6l-6 6 6 6",
  right: "M9 6l6 6-6 6",
  down: "M6 9l6 6 6-6",
  up: "M6 15l6-6 6 6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  door: "M5 3h11v18H5zM13 12h.01",
  doc: "M6 3h9l5 5v13H6zM14 3v6h6",
  zin: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M11 8v6M8 11h6",
  zout: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6",
  file: "M6 3h9l5 5v13H6z",
  alert: "M12 3l10 18H2zM12 10v5M12 18h.01",
  stop: "M7 7h10v10H7z",
} as const;

export type IconName = keyof typeof P;

export function Icon({ n, s = 15, w = 1.8, fill = "none" }: { n: IconName; s?: number; w?: number; fill?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n]} />
    </svg>
  );
}

export function Car({ w, fill = "#cbd5e1", glass = "#f1f5f9", extra }: { w: number; fill?: string; glass?: string; extra?: ReactNode }) {
  const h = Math.round((w * 100) / 240);
  const light = ["#f1f5f9", "#e2e8f0"].includes(fill.toLowerCase());
  return (
    <svg width={w} height={h} viewBox="0 0 240 100" aria-hidden="true">
      <ellipse cx="120" cy="90" rx="112" ry="6" fill="#dbe2ea" />
      <path
        d="M14 76 L18 58 Q22 48 44 44 L80 40 Q104 20 132 20 L158 20 Q182 22 202 40 L222 46 Q232 50 232 62 L232 76 Z"
        fill={fill}
        stroke="#94a3b8"
        strokeWidth={light ? 1 : 0}
      />
      <path d="M90 41 Q108 26 132 26 L156 26 Q176 28 192 41 Z" fill={glass} />
      <path d="M141 26 L141 41" stroke={fill} strokeWidth="3" />
      {extra}
      <circle cx="62" cy="78" r="15" fill="#334155" />
      <circle cx="62" cy="78" r="6" fill="#cbd5e1" />
      <circle cx="190" cy="78" r="15" fill="#334155" />
      <circle cx="190" cy="78" r="6" fill="#cbd5e1" />
    </svg>
  );
}

export function Interior({ w = 520, h = 280 }: { w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 560 300" aria-hidden="true">
      <rect x="0" y="0" width="560" height="110" fill="#e2e8f0" />
      <rect x="20" y="150" width="520" height="120" rx="24" fill="#334155" />
      <rect x="300" y="110" width="180" height="70" rx="10" fill="#0f172a" />
      <rect x="312" y="122" width="156" height="46" rx="6" fill="#1e3a8a" />
      <circle cx="170" cy="190" r="72" fill="none" stroke="#1e293b" strokeWidth="16" />
      <circle cx="170" cy="190" r="18" fill="#1e293b" />
    </svg>
  );
}

export function Photo({ w, h, cw, color, tag }: { w: number | string; h: number; cw: number; color: string; tag?: string }) {
  return (
    <div className="photo" style={{ width: typeof w === "number" ? `${w}px` : w, height: h, flexShrink: 0 }}>
      {tag && <span className="tag">[{tag}]</span>}
      <Car w={cw} fill={color} />
    </div>
  );
}
