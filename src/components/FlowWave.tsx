// FlowWave — the same flowing edge we used before: two tiled chalk waves that
// slide at different speeds so the bottom of the header dissolves into the page
// instead of ending on a hard line. Amplitude and opacity respond to scroll.
export function FlowWave({ intensity = 0 }: { intensity?: number }) {
  const t = Math.min(1, Math.max(0, intensity));

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-full h-10 overflow-hidden"
      aria-hidden
      style={{ opacity: 0.35 + t * 0.65 }}
    >
      {/* back wave — slower, softer */}
      <div
        className="flowwave-track absolute inset-y-0 left-0"
        style={{ ["--wave-speed" as string]: "26s", transform: `scaleY(${0.6 + t * 0.7})` }}
      >
        <WaveSvg opacity={0.16 + t * 0.14} />
      </div>
      {/* front wave — faster, brighter, offset */}
      <div
        className="flowwave-track absolute inset-y-0 left-0"
        style={{
          ["--wave-speed" as string]: "15s",
          transform: `scaleY(${0.75 + t * 0.9}) translateY(${-2 - t * 3}px)`,
        }}
      >
        <WaveSvg opacity={0.28 + t * 0.3} bright />
      </div>
    </div>
  );
}

function WaveSvg({ opacity, bright = false }: { opacity: number; bright?: boolean }) {
  return (
    <svg
      viewBox="0 0 1200 40"
      preserveAspectRatio="none"
      className="h-full w-full"
      style={{ opacity }}
      aria-hidden
    >
      <defs>
        <linearGradient id={bright ? "fw-bright" : "fw-soft"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path
        d="M0 12 C 75 2, 150 26, 225 16 S 375 2, 450 14 S 600 28, 675 16 S 825 2, 900 14 S 1050 26, 1125 15 S 1200 8, 1200 12 L 1200 0 L 0 0 Z"
        fill={`url(#${bright ? "fw-bright" : "fw-soft"})`}
      />
      <path
        d="M0 12 C 75 2, 150 26, 225 16 S 375 2, 450 14 S 600 28, 675 16 S 825 2, 900 14 S 1050 26, 1125 15 S 1200 8, 1200 12"
        fill="none"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="1.4"
        filter="url(#chalk-stroke)"
      />
    </svg>
  );
}
