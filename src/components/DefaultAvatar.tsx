// Fallback avatar. Ten hand-mixed chalk gradients — white, graphite, soot and
// their faint accents. Each account gets one, picked from a hash of its id so
// the assignment is random-looking but stable forever.

interface Palette {
  a: string;
  b: string;
  c: string;
  /** faint accent bloom */
  accent: string;
  angle: number;
}

const PALETTES: Palette[] = [
  { a: "#f5f5f5", b: "#8d8d8d", c: "#0d0d0d", accent: "rgba(255,255,255,0.55)", angle: 135 },
  { a: "#e6e9ee", b: "#6f7681", c: "#101215", accent: "rgba(180,205,255,0.40)", angle: 200 },
  { a: "#f2ece6", b: "#8b8078", c: "#141110", accent: "rgba(255,214,170,0.35)", angle: 45 },
  { a: "#0e0e0e", b: "#5c5c5c", c: "#e8e8e8", accent: "rgba(255,255,255,0.45)", angle: 315 },
  { a: "#e9eeec", b: "#6d7a75", c: "#0c1110", accent: "rgba(170,255,225,0.30)", angle: 160 },
  { a: "#efe8f0", b: "#7a7280", c: "#100d12", accent: "rgba(215,180,255,0.32)", angle: 100 },
  { a: "#d9d9d9", b: "#3f3f3f", c: "#000000", accent: "rgba(255,255,255,0.30)", angle: 250 },
  { a: "#f7f4ef", b: "#9a938a", c: "#1a1713", accent: "rgba(255,240,200,0.30)", angle: 20 },
  { a: "#dfe3e6", b: "#4d5559", c: "#08090a", accent: "rgba(210,235,255,0.34)", angle: 290 },
  { a: "#ffffff", b: "#a6a6a6", c: "#232323", accent: "rgba(255,255,255,0.60)", angle: 75 },
];

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function DefaultAvatar({ size = 40, seed = "" }: { size?: number; seed?: string }) {
  const idx = seed ? hash(seed) % PALETTES.length : 0;
  const p = PALETTES[idx];
  const id = `pfp${idx}-${hash(seed || "x").toString(36)}`;
  const rad = (p.angle * Math.PI) / 180;
  const x1 = 0.5 - Math.cos(rad) / 2;
  const y1 = 0.5 - Math.sin(rad) / 2;
  const x2 = 0.5 + Math.cos(rad) / 2;
  const y2 = 0.5 + Math.sin(rad) / 2;

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="rounded-full">
      <defs>
        <linearGradient id={`${id}-g`} x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0%" stopColor={p.a} />
          <stop offset="52%" stopColor={p.b} />
          <stop offset="100%" stopColor={p.c} />
        </linearGradient>
        <radialGradient id={`${id}-b`} cx="30%" cy="26%" r="62%">
          <stop offset="0%" stopColor={p.accent} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <pattern id={`${id}-d`} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="0.75" fill="rgba(255,255,255,0.22)" />
          <circle cx="3.6" cy="3.6" r="0.5" fill="rgba(0,0,0,0.20)" />
        </pattern>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${id}-g)`} />
      <circle cx="32" cy="32" r="32" fill={`url(#${id}-b)`} />
      <circle cx="32" cy="32" r="32" fill={`url(#${id}-d)`} />
      <circle cx="32" cy="32" r="31" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4" />
    </svg>
  );
}
