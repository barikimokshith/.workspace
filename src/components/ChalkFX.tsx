// Reusable chalk-flavored primitives: SVG roughen filter, chalk button, dust particles.
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export function ChalkFilters() {
  // Global SVG filter used by chalk-border utility. Mount once near root.
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="roughen">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
        </filter>
        <filter id="roughen-strong">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
        <filter id="chalk-stroke" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
        </filter>
      </defs>
    </svg>
  );
}

type ChalkButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  children: ReactNode;
};

export function ChalkButton({ variant = "primary", className = "", children, ...rest }: ChalkButtonProps) {
  const base =
    "relative inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 font-sketch text-base leading-tight tracking-wide select-none transition-transform active:scale-[0.97] hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none liquid-glass-pill";
  const styles =
    variant === "primary"
      ? "text-chalk"
      : variant === "danger"
      ? "text-chalk"
      : "text-chalk-dim";
  return (
    <button {...rest} className={`${base} ${styles} ${className}`}>
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

export function ChalkCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`liquid-glass relative p-4 chalk-texture ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function DustParticles() {
  const [seeds, setSeeds] = useState<{ id: number; x: number; y: number; dx: number; dy: number; d: number; s: number }[]>([]);
  useEffect(() => {
    const arr = Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 60 + Math.random() * 40,
      dx: (Math.random() - 0.5) * 80,
      dy: -40 - Math.random() * 100,
      d: 4 + Math.random() * 6,
      s: Math.random() * 4,
    }));
    setSeeds(arr);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {seeds.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-chalk/50"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: 2,
            height: 2,
            animation: `dust-drift ${p.d}s ease-out ${p.s}s infinite`,
            // @ts-expect-error CSS vars
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
          }}
        />
      ))}
    </div>
  );
}

export function Fireflies({ count = 14 }: { count?: number }) {
  const [flies, setFlies] = useState<
    { id: number; x: number; y: number; size: number; dur: number; delay: number; fx1: number; fy1: number; fx2: number; fy2: number; fx3: number; fy3: number }[]
  >([]);
  useEffect(() => {
    setFlies(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 2.5,
        dur: 10 + Math.random() * 14,
        delay: Math.random() * 6,
        fx1: (Math.random() - 0.5) * 180,
        fy1: (Math.random() - 0.5) * 180,
        fx2: (Math.random() - 0.5) * 220,
        fy2: (Math.random() - 0.5) * 220,
        fx3: (Math.random() - 0.5) * 160,
        fy3: (Math.random() - 0.5) * 160,
      })),
    );
  }, [count]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
      {flies.map((f) => (
        <span
          key={f.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: f.size,
            height: f.size,
            boxShadow: "0 0 8px 2px rgba(255,255,255,0.55), 0 0 18px 4px rgba(255,255,255,0.2)",
            animation: `firefly-drift ${f.dur}s ease-in-out ${f.delay}s infinite, firefly-pulse ${f.dur / 2}s ease-in-out ${f.delay}s infinite`,
            // @ts-expect-error CSS vars
            "--fx1": `${f.fx1}px`, "--fy1": `${f.fy1}px`,
            "--fx2": `${f.fx2}px`, "--fy2": `${f.fy2}px`,
            "--fx3": `${f.fx3}px`, "--fy3": `${f.fy3}px`,
          }}
        />
      ))}
    </div>
  );
}

export function GlassOrbs({ count = 7 }: { count?: number }) {
  const [orbs, setOrbs] = useState<
    { id: number; x: number; y: number; size: number; dur: number; delay: number; dx: number; dy: number; hue: number }[]
  >([]);
  useEffect(() => {
    setOrbs(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 180 + Math.random() * 340,
        dur: 22 + Math.random() * 26,
        delay: Math.random() * 8,
        dx: (Math.random() - 0.5) * 300,
        dy: (Math.random() - 0.5) * 260,
        hue: Math.random() * 360,
      })),
    );
  }, [count]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[0] overflow-hidden" aria-hidden>
      {orbs.map((o) => (
        <span
          key={o.id}
          className="absolute rounded-full"
          style={{
            left: `${o.x}%`,
            top: `${o.y}%`,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), rgba(255,255,255,0.06) 45%, transparent 70%)`,
            filter: "blur(30px) saturate(140%)",
            mixBlendMode: "screen",
            animation: `orb-drift ${o.dur}s ease-in-out ${o.delay}s infinite`,
            // @ts-expect-error CSS vars
            "--odx": `${o.dx}px`,
            "--ody": `${o.dy}px`,
          }}
        />
      ))}
    </div>
  );
}

// Rough scribbled underline used under headings
export function Scribble({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 12" className={`w-full h-3 ${className}`} preserveAspectRatio="none" aria-hidden>
      <path
        d="M2 7 C 30 2, 60 11, 95 5 S 160 10, 198 4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        filter="url(#chalk-stroke)"
      />
    </svg>
  );
}
