// Chalk-drawn chains. Used sparingly — only where a commitment is being made.
// Rarity is the point: chains mean something is being given up.
type ChainProps = { className?: string; links?: number };

/** A horizontal run of chalk chain links. Wraps around commitment surfaces. */
export function ChainStrip({ className = "", links = 12 }: ChainProps) {
  const items = Array.from({ length: links });
  return (
    <svg
      viewBox={`0 0 ${links * 18} 24`}
      preserveAspectRatio="none"
      className={`h-5 w-full ${className}`}
      aria-hidden
      filter="url(#chalk-stroke)"
    >
      {items.map((_, i) => (
        <ellipse
          key={i}
          cx={12 + i * 18}
          cy={12}
          rx={9}
          ry={i % 2 === 0 ? 6.5 : 4}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

/** Chains that wrap a block — drawn top and bottom. Animates in when sealing. */
export function ChainWrap({
  className = "",
  sealing = false,
  children,
}: {
  className?: string;
  sealing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        className={`pointer-events-none absolute -top-3 left-0 right-0 text-chalk/70 ${
          sealing ? "anim-chain-in" : ""
        }`}
      >
        <ChainStrip />
      </div>
      {children}
      <div
        className={`pointer-events-none absolute -bottom-3 left-0 right-0 text-chalk/70 ${
          sealing ? "anim-chain-in" : ""
        }`}
        style={{ animationDelay: "0.12s" }}
      >
        <ChainStrip />
      </div>
    </div>
  );
}

/** A single closed padlock shackle + chain, for the sealing moment. */
export function ChainLock({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} filter="url(#chalk-stroke)" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 30 L 18 22 C 18 14, 24 8, 32 8 S 46 14, 46 22 L 46 30" />
        <path d="M12 30 L 52 30 L 52 56 L 12 56 Z" />
        <ellipse cx="8" cy="40" rx="5" ry="3.5" />
        <ellipse cx="56" cy="46" rx="5" ry="3.5" />
        <circle cx="32" cy="42" r="3" />
        <path d="M32 45 L 32 50" />
      </g>
    </svg>
  );
}
