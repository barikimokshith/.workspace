// The sticky LOIN header: heavy liquid glass, and a bottom edge that flows and
// waves into the page as you scroll.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LockDoodle } from "@/components/ChalkIcons";
import { AccountMenu } from "@/components/AccountMenu";
import { FlowWave } from "@/components/FlowWave";
import { haptic } from "@/lib/haptics";

export function AppHeader() {
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setScroll(Math.min(1, window.scrollY / 220));
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      {/* Spacer keeps page content clear of the fixed bar (plus the status bar). */}
      <div className="h-[calc(56px+env(safe-area-inset-top))]" aria-hidden />
      <header className="fixed inset-x-0 top-0 z-[100]">
      <div
        className="liquid-glass liquid-glass-strong relative !rounded-none"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          // Frosted, but solid enough that the page behind stays out of the way.
          backgroundColor: "rgba(8,8,8,0.86)",
          backdropFilter: `blur(${26 + scroll * 18}px) saturate(${180 + scroll * 40}%)`,
          boxShadow: `0 ${8 + scroll * 14}px ${28 + scroll * 34}px rgba(0,0,0,${0.45 + scroll * 0.3}),
                      inset 0 1px 0 rgba(255,255,255,0.35)`,
          borderBottom: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 pb-1.5 pt-1">
          <Link
            to="/"
            onClick={() => haptic("select")}
            className="press flex items-center gap-2 rounded-2xl px-1 py-1"
          >
            <LockDoodle size={30} className="text-chalk anim-sway" />
            <div>
              <div className="font-sketch text-xl tracking-widest chalk-text">LOIN</div>
              <div className="-mt-1 font-hand text-xs text-chalk-faint">lock in.</div>
            </div>
          </Link>
          <AccountMenu />
        </div>
      </div>
      <FlowWave intensity={scroll} />
      </header>
    </>
  );
}
