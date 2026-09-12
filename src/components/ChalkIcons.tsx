// Hand-drawn chalk SVG icons. All use stroke=currentColor so they inherit chalk white.
type Props = { className?: string; size?: number };

const wrap = "stroke-current fill-none";

export function ClockDoodle({ className = "", size = 48 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} filter="url(#chalk-stroke)">
      <g className={wrap} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 33 C 8 18, 20 8, 32 8 S 56 18, 56 33 S 44 57, 32 57 S 8 47, 8 33 Z" />
        <path d="M32 16 L 32 33 L 44 39" />
        <path d="M32 6 L 32 10 M32 56 L 32 60 M6 32 L10 32 M54 32 L58 32" />
      </g>
    </svg>
  );
}

export function CameraDoodle({ className = "", size = 48 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} filter="url(#chalk-stroke)">
      <g className={wrap} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 20 L 22 20 L 26 12 L 40 12 L 44 20 L 58 20 L 58 52 L 6 52 Z" />
        <circle cx="32" cy="34" r="11" />
        <circle cx="32" cy="34" r="6" />
        <circle cx="50" cy="26" r="1.5" fill="currentColor" />
      </g>
    </svg>
  );
}

export function CoinDoodle({ className = "", size = 48 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} filter="url(#chalk-stroke)">
      <g className={wrap} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="32" cy="32" rx="22" ry="22" />
        <ellipse cx="32" cy="32" rx="16" ry="16" />
        <path d="M32 20 L 32 44 M 26 24 Q 24 30 28 32 Q 40 34 36 40 Q 32 44 26 40" />
      </g>
    </svg>
  );
}

export function BrainDoodle({ className = "", size = 48 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} filter="url(#chalk-stroke)">
      <g className={wrap} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 14 C 12 14, 8 22, 12 28 C 6 32, 8 42, 16 44 C 16 52, 26 54, 32 50 C 38 54, 48 52, 48 44 C 56 42, 58 32, 52 28 C 56 22, 52 14, 42 14 C 38 8, 26 8, 22 14 Z" />
        <path d="M32 22 L 32 50 M 24 28 Q 30 30 32 34 M 40 28 Q 34 30 32 34 M 22 38 Q 28 36 30 40 M 42 38 Q 36 36 34 40" />
      </g>
    </svg>
  );
}

export function LockDoodle({ className = "", size = 48 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} filter="url(#chalk-stroke)">
      <g className={wrap} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 30 L 18 22 C 18 14, 24 8, 32 8 S 46 14, 46 22 L 46 30" />
        <path d="M12 30 L 52 30 L 52 56 L 12 56 Z" />
        <circle cx="32" cy="42" r="3" />
        <path d="M32 45 L 32 50" />
      </g>
    </svg>
  );
}

export function FlameDoodle({ className = "", size = 32 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} filter="url(#chalk-stroke)">
      <g className={wrap} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3 C 12 8, 8 12, 8 18 C 8 24, 12 29, 16 29 C 20 29, 24 24, 24 18 C 24 14, 22 12, 20 10 C 20 14, 18 15, 17 15 C 18 11, 17 6, 16 3 Z" />
        <path d="M16 20 C 14 21, 13 23, 14 26 C 16 25, 18 25, 18 22 C 18 20, 17 20, 16 20 Z" />
      </g>
    </svg>
  );
}

export function ChartDoodle({ className = "", size = 40 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 40" className={className} filter="url(#chalk-stroke)">
      <g className={wrap} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 36 L 60 36" />
        <path d="M4 36 L 4 4" />
        <path d="M8 28 Q 18 8, 28 22 T 48 12 T 60 6" />
      </g>
    </svg>
  );
}

export function ArrowDoodle({ className = "", size = 24 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} filter="url(#chalk-stroke)">
      <g className={wrap} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12 L 20 12" />
        <path d="M14 6 L 20 12 L 14 18" />
      </g>
    </svg>
  );
}
