import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChalkFilters,
  ChalkButton,
  ChalkCard,
  DustParticles,
  Fireflies,
  GlassOrbs,
  Scribble,
} from "@/components/ChalkFX";
import {
  ClockDoodle,
  CameraDoodle,
  CoinDoodle,
  FlameDoodle,
  ChartDoodle,
  LockDoodle,
  ArrowDoodle,
} from "@/components/ChalkIcons";
import { formatDuration, type LockSession } from "@/lib/session-store";
import { fetchSessions, computeStats } from "@/lib/cloud-sessions";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { PenaltyPaymentModal } from "@/components/PenaltyPaymentModal";
import { checkActivePenalty, clearLocalPenalty, resolvePenalty } from "@/lib/penalty.functions";
import { haptic } from "@/lib/haptics";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "loin" },
      {
        name: "description",
        content:
          "LOIN is a chalkboard focus companion. Lock your phone into a session, and only unlock it with time, proof, or payment.",
      },
      { property: "og:title", content: "loin — lock in. focus deeply." },
      { property: "og:description", content: "lock your phone. prove your work. or pay to escape." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <RequireAuth>
      <Board />
    </RequireAuth>
  );
}

function Board() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [today, setToday] = useState(0);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [kept, setKept] = useState(0);
  const [broken, setBroken] = useState(0);
  const [recent, setRecent] = useState<LockSession[]>([]);
  const [mounted, setMounted] = useState(false);
  const [penaltyCheck, setPenaltyCheck] = useState<{
    active: boolean;
    amount: number;
    escapeAmount?: number;
  } | null>(null);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);

  useEffect(() => {
    let alive = true;
    void checkActivePenalty(user?.id, user?.user_metadata?.isDev === true).then((p) => {
      if (!alive) return;
      if (p.active && p.amount > 0) {
        setPenaltyCheck(p);
      } else {
        setPenaltyCheck(null);
      }
    });
    return () => {
      alive = false;
    };
  }, [user]);

  async function handleLockInClick() {
    haptic("commit");
    const p = await checkActivePenalty(user?.id, user?.user_metadata?.isDev === true);
    if (p.active && p.amount > 0) {
      setPenaltyCheck(p);
      setShowPenaltyModal(true);
      return;
    }
    navigate({ to: "/lock" });
  }

  useEffect(() => {
    let alive = true;
    setMounted(true);
    if (!user) return;
    fetchSessions(user.id).then((sessions) => {
      if (!alive) return;
      const s = computeStats(sessions);
      setToday(s.today);
      setTotal(s.total);
      setCount(s.completed);
      setStreak(s.streak);
      setKept(s.kept);
      setBroken(s.broken);
      setRecent(sessions.slice(0, 5));
    });
    return () => {
      alive = false;
    };
  }, [user]);

  return (
    <div className="relative min-h-screen overflow-x-hidden chalk-texture">
      <ChalkFilters />
      <DustParticles />
      <Fireflies count={16} />
      <GlassOrbs />

      <AppHeader />

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-6 md:pb-20 md:pt-12">
        <div className="anim-scribble max-w-2xl">
          <div className="font-hand text-base leading-relaxed text-chalk-dim">The phone obeys. So do you.</div>
          <h1 className="mt-2 font-sketch text-5xl leading-[0.98] chalk-text chalk-glow md:text-7xl">
            lock in.<br />
            <span className="inline-block">stay in.</span>
          </h1>
          <div className="mt-4 max-w-md text-chalk-dim">
            <Scribble className="text-chalk/60" />
          </div>
          <p className="mt-4 max-w-md font-hand text-base leading-relaxed text-chalk-dim">
            Set a goal. Chain the phone. There are only three ways out — outlast the clock,
            <em className="text-chalk"> prove the work</em>, or pay to escape.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#how" onClick={() => haptic("select")}>
              <ChalkButton variant="ghost" className="press">
                see how <ArrowDoodle size={18} />
              </ChalkButton>
            </a>
          </div>

          {mounted && streak > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 font-hand text-base text-chalk">
              <FlameDoodle size={20} className="anim-flicker text-chalk" />
              {streak} day streak
            </div>
          )}
        </div>
      </section>



      {/* STATS */}
      <section id="stats" className="relative z-10 mx-auto max-w-6xl px-4 pb-10 md:px-6 md:pb-20">
        <SectionTitle icon={<ChartDoodle size={36} className="text-chalk" />}>your board</SectionTitle>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard label="today" value={mounted ? formatDuration(today) : "—"} sub="locked in" />
          <StatCard label="all time" value={mounted ? formatDuration(total) : "—"} sub="reclaimed" />
          <StatCard label="sessions" value={mounted ? String(count) : "—"} sub="completed" />
          <StatCard
            label="streak"
            value={mounted ? String(streak) : "—"}
            sub="days in a row"
            icon={<FlameDoodle size={24} className="text-chalk anim-flicker" />}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <StatCard
            label="promises kept"
            value={mounted ? String(kept) : "—"}
            sub={kept === 0 ? "the first one starts today" : "you outlasted or you proved it"}
            icon={<LockDoodle size={24} className="text-chalk" />}
          />
          <StatCard
            label="promises broken"
            value={mounted ? String(broken) : "—"}
            sub={broken === 0 ? "your word is still unbroken" : "you paid your way out"}
            icon={<CoinDoodle size={24} className="text-chalk" />}
          />
        </div>
      </section>


      {/* HOW */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl px-4 pb-10 md:px-6 md:pb-20">
        <SectionTitle icon={<LockDoodle size={36} className="text-chalk" />}>three ways out</SectionTitle>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          <UnlockCard
            n="i"
            title="outlast the clock"
            body="Set a timer. Phone stays chained until it hits zero. No shortcuts."
            icon={<ClockDoodle className="text-chalk anim-wobble" />}
          />
          <UnlockCard
            n="ii"
            title="prove the work"
            body="Snap a photo or record a voice note of what you finished. Only proof unlocks the door."
            icon={<CameraDoodle className="text-chalk anim-wobble" />}
          />
          <UnlockCard
            n="iii"
            title="pay to escape"
            body="Weak moment? The exit is priced. Every escape costs you — literally."
            icon={<CoinDoodle className="text-chalk anim-wobble" />}
          />
        </div>
      </section>

      {/* THE LEDGER — always on the board, even when it's empty */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-10 md:px-6 md:pb-20">
        <SectionTitle icon={<ClockDoodle size={36} className="text-chalk" />}>the ledger</SectionTitle>
        <div className="mt-6 space-y-3">
          {!mounted || recent.length === 0 ? (
            <ChalkCard className="anim-flicker text-center">
              <div className="font-sketch text-2xl chalk-text chalk-glow">No promises kept yet.</div>
              <div className="mt-1 font-hand text-lg text-chalk-dim">The first one starts today.</div>
            </ChalkCard>
          ) : (
            recent.map((s) => (
              <ChalkCard key={s.id} className="lift flex items-center justify-between">
                <div>
                  <div className="font-sketch text-xl chalk-text">{s.goal || "untitled session"}</div>
                  <div className="font-hand text-sm text-chalk-faint">
                    {new Date(s.startedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-sketch text-2xl chalk-text chalk-glow">{formatDuration(s.durationMs)}</div>
                  <div className="font-hand text-xs text-chalk-faint">unlocked by {label(s.unlockedBy)}</div>
                </div>
              </ChalkCard>
            ))
          )}
        </div>
      </section>


      {/* NATIVE CTA */}
      <section id="native" className="relative z-10 mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
        <ChalkCard className="chalk-glow-box">
          <div>
            <div className="font-hand text-lg text-chalk-dim">next chapter</div>
            <h3 className="mt-1 font-sketch text-4xl chalk-text chalk-glow">chain the whole phone.</h3>
            <p className="mt-3 max-w-lg font-hand text-lg text-chalk-dim">
              Once enabled, LOIN chains the whole phone and leaves it useless — no WhatsApp,
              no TikTok, no scrolling out. You'll have no other option than to lock in.
            </p>
          </div>
        </ChalkCard>

      </section>

      <footer className="relative z-10 mx-auto max-w-6xl border-t border-chalk/15 px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="font-hand text-chalk-faint text-center md:text-left">
            © {new Date().getFullYear()} LOIN. All rights reserved.
            <span className="mx-2 text-chalk/30">·</span>
            scribbled with intent.
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/barikimokshith"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LOIN on Instagram"
              onClick={() => haptic("select")}
              className="press inline-flex items-center gap-2 border-2 border-chalk/40 px-4 py-2 font-hand text-chalk hover:border-chalk hover:bg-chalk hover:text-background transition"
              style={{ filter: "url(#roughen)" }}
            >

              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
              instagram
            </a>
            <a
              href="https://wa.me/919663907484"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with LOIN support on WhatsApp"
              onClick={() => haptic("select")}
              className="press inline-flex items-center gap-2 border-2 border-chalk/40 px-4 py-2 font-hand text-chalk hover:border-chalk hover:bg-chalk hover:text-background transition"
              style={{ filter: "url(#roughen)" }}
            >

              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              support
            </a>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-4 font-hand text-sm text-chalk-dim">
          <Link to="/privacy" className="press underline underline-offset-4 hover:text-chalk">
            privacy policy
          </Link>
          <span className="text-chalk/30">·</span>
          <Link to="/terms" className="press underline underline-offset-4 hover:text-chalk">
            terms &amp; conditions
          </Link>
        </div>
        <div className="mt-4 text-center font-hand text-xs text-chalk-faint">
          v0.1 · chalkboard edition
        </div>
        <div className="h-28" />
      </footer>

      {/* FIXED LOCK IN — always within reach, never scrolls away */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleLockInClick}
          className="pointer-events-auto press liquid-glass-pill chalk-glow-box group inline-flex min-h-12 items-center gap-2 px-7 py-3 font-sketch text-lg tracking-[0.14em] text-chalk transition-transform hover:-translate-y-0.5 active:scale-[0.97] sm:px-9 cursor-pointer"
        >
          <LockDoodle size={21} className="text-chalk transition-transform group-hover:-rotate-6" />
          LOCK IN
        </button>
      </div>

      {showPenaltyModal && penaltyCheck?.active && (
        <PenaltyPaymentModal
          amount={penaltyCheck.amount}
          escapeAmount={penaltyCheck.escapeAmount}
          onCancel={() => setShowPenaltyModal(false)}
          onPay={async () => {
            clearLocalPenalty(user?.id);
            const isDeveloper = user?.user_metadata?.isDev === true;
            if (user && !isDeveloper) {
              try {
                await resolvePenalty();
              } catch (error) {
                console.warn("[Home] Failed to resolve server penalty:", error);
              }
            }
            setPenaltyCheck(null);
            setShowPenaltyModal(false);
            navigate({ to: "/lock" });
          }}
        />
      )}
    </div>



  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-end gap-4">
      <div className="anim-flicker">{icon}</div>
      <div>
        <h2 className="font-sketch text-3xl leading-tight chalk-text chalk-glow md:text-5xl">{children}</h2>
        <Scribble className="text-chalk/50 w-40" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon?: React.ReactNode;
}) {
  return (
    <ChalkCard className="anim-flicker">
      <div className="flex items-center justify-between">
        <div className="font-hand text-sm uppercase tracking-widest text-chalk-faint">{label}</div>
        {icon}
      </div>
      <div className="mt-1.5 font-sketch text-3xl leading-tight chalk-text chalk-glow">{value}</div>
      <div className="mt-1 font-hand text-sm text-chalk-dim">{sub}</div>
    </ChalkCard>
  );
}

function UnlockCard({
  n,
  title,
  body,
  icon,
}: {
  n: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <ChalkCard className="group relative overflow-hidden transition-transform hover:-translate-y-1">
      <div className="absolute right-4 top-2 font-sketch text-6xl text-chalk/10">{n}</div>
      <div className="relative flex flex-col gap-4">
        <div>{icon}</div>
        <h3 className="font-sketch text-xl leading-tight chalk-text chalk-glow">{title}</h3>
        <p className="font-hand text-base leading-relaxed text-chalk-dim">{body}</p>
      </div>
    </ChalkCard>
  );
}

function label(m: string) {
  return m === "timer" ? "the clock" : m === "proof" ? "proof" : "payment";
}
