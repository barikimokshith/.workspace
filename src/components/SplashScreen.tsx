// The LOIN splash. Not an app opening — a mode being entered.
// The lock is drawn stroke by stroke, then settles with one crisp click before
// the app is shown.
import { useEffect, useRef, useState } from "react";
import { playSound, preloadSound } from "@/lib/sfx";
import { haptic } from "@/lib/haptics";

const STROKES = [
  // shackle
  {
    d: "M26 48 V33 c0-8.2 6.4-14.6 14.4-14.6 S54.8 24.8 54.8 33 V48",
    len: 78,
    delay: 0.52,
    dur: 0.42,
  },
  // body outline
  {
    d: "M17.5 47.5 h45.6 a4 4 0 0 1 4 4 v30.4 a4 4 0 0 1 -4 4 h-45.6 a4 4 0 0 1 -4 -4 v-30.4 a4 4 0 0 1 4 -4 z",
    len: 168,
    delay: 0.74,
    dur: 0.34,
  },
  // keyhole
  { d: "M40.4 60.6 a4.4 4.4 0 1 0 0.1 0 z", len: 30, delay: 1.02, dur: 0.14 },
  { d: "M40.4 65 v9.4", len: 10, delay: 1.1, dur: 0.1 },
  // chalk shading ticks on the body
  { d: "M21 78 l7 -6 M30 80 l9 -8 M50 79 l8 -7", len: 40, delay: 1.14, dur: 0.18 },
];

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [settle, setSettle] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    preloadSound("lock-click");

    const push = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

    // The lock arms itself.
    push(() => {
      setSettle(true);
      playSound("lock-click", 0.7);
      haptic("lock");
    }, 1800);

    // Hold the completed lock, then show the app.
    push(onDone, 3200);

    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background chalk-texture"
      role="status"
      aria-label="LOIN is starting"
    >
      <LockAnimation settle={settle} />
    </div>
  );
}

export function LockAnimation({ settle = false }: { settle?: boolean }) {
  return (
    <svg
      width="150"
      height="180"
      viewBox="0 0 80 96"
      className={`chalk-glow ${settle ? "anim-lock-settle" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ color: "var(--chalk)" }}
    >
      <g filter="url(#chalk-stroke)">
        {STROKES.map((s) => (
          <path
            key={s.d}
            d={s.d}
            strokeDasharray={s.len}
            style={{
              ["--len" as string]: String(s.len),
              animation: `chalk-sketch ${s.dur}s cubic-bezier(0.4, 0, 0.3, 1) ${s.delay}s both`,
            }}
          />
        ))}
      </g>
    </svg>
  );
}

/** Shows the splash on every app launch, then renders the app. */
export function SplashGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  return (
    <>
      {children}
      {!ready && <SplashScreen onDone={() => setReady(true)} />}
    </>
  );
}
