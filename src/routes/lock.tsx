import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  LockDoodle,
  ArrowDoodle,
} from "@/components/ChalkIcons";
import {
  formatClock,
  formatDuration,
  type LockSession,
  type UnlockMethod,
  type SessionState,
  loadActiveSession,
  saveActiveSession,
  clearActiveSession,
  updateActiveSessionState,
} from "@/lib/session-store";
import { fetchSessions, pushSession } from "@/lib/cloud-sessions";
import { escapePrice } from "@/lib/escape-pricing";
import { WHITELIST_APPS } from "@/lib/whitelist-apps";
import { HandwritingPlaceholder } from "@/components/HandwritingPlaceholder";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { judgeGoal, type GoalVerdict } from "@/lib/goal.functions";
import { verifyProof, type ProofVerdict } from "@/lib/proof.functions";
import {
  recordEmergencyEscape,
  getAccountPenalty,
  getLocalPenalty,
  getLocalPenaltyDetails,
  setLocalPenalty,
  clearLocalPenalty,
  resolvePenalty,
  checkActivePenalty,
} from "@/lib/penalty.functions";
import { PenaltyPaymentModal } from "@/components/PenaltyPaymentModal";
import { haptic } from "@/lib/haptics";
import { isNative, loinApp } from "@/lib/native";
import { playSound, preloadSound } from "@/lib/sfx";
import { newId } from "@/lib/ids";

export const Route = createFileRoute("/lock")({
  head: () => ({
    meta: [
      { title: "loin" },
      {
        name: "description",
        content:
          "The commitment ritual. Choose the length, name the work, keep only what you need, then lock in.",
      },
      { property: "og:title", content: "lock in · loin" },
      { property: "og:description", content: "make the promise. then keep it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LockPage,
});

type Phase = "duration" | "goal" | "whitelist" | "review" | "sealing" | "locked" | "unlocked";
type AllowedApp = { id: string; name: string; note: string; icon?: string };

const DURATIONS = [
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 },
];

const QUIET_LINES = [
  "Stay in.",
  "Keep your word.",
  "One task. Nothing else.",
  "You chose this.",
  "The door stays shut.",
];

function LockPage() {
  return (
    <RequireAuth>
      <LockRitual />
    </RequireAuth>
  );
}

/** Shared, calm background — same board as the main page. No chains. */
function Board({ children, fixed = false }: { children: React.ReactNode; fixed?: boolean }) {
  return (
    <div
      className={`relative chalk-texture ${
        fixed ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-background" : "min-h-screen"
      }`}
    >
      <ChalkFilters />
      <DustParticles />
      <Fireflies count={14} />
      <GlassOrbs count={5} />
      {children}
    </div>
  );
}

function LockRitual() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("duration");

  // commitment state
  const [minutes, setMinutes] = useState(60);
  /** the clock is on by default — but a session can run open-ended */
  const [useTimer, setUseTimer] = useState(true);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("60");
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours">("minutes");
  const [goal, setGoal] = useState("");

  // goal judging
  const [judging, setJudging] = useState(false);
  const [verdict, setVerdict] = useState<GoalVerdict | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [difficultyFactor, setDifficultyFactor] = useState(1);
  const [priorSessions, setPriorSessions] = useState<LockSession[]>([]);

  const [kept, setKept] = useState<string[]>([]);
  const [availableApps, setAvailableApps] = useState<AllowedApp[]>(WHITELIST_APPS);

  // session state
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [proof, setProof] = useState<string | null>(null);
  const [showEscape, setShowEscape] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [unlockMethod, setUnlockMethod] = useState<UnlockMethod>("timer");
  const [paid, setPaid] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [nativeLockError, setNativeLockError] = useState<string | null>(null);
  const [penaltyCheck, setPenaltyCheck] = useState<{
    active: boolean;
    amount: number;
    escapeAmount?: number;
  } | null>(null);
  const [showPenaltyPayment, setShowPenaltyPayment] = useState(false);
  const penaltyAmountRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const targetMs = useTimer ? minutes * 60 * 1000 : 0;
  const elapsed = phase === "locked" ? now - startedAt : 0;
  const remaining = Math.max(0, targetMs - elapsed);
  const progress = Math.min(1, targetMs > 0 ? elapsed / targetMs : 0);

  useEffect(() => {
    let alive = true;
    void checkActivePenalty(user?.id, user?.user_metadata?.isDev === true).then((p) => {
      if (!alive) return;
      if (p.active && p.amount > 0) {
        penaltyAmountRef.current = p.amount;
        setPenaltyCheck(p);
        setShowPenaltyPayment(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    // Check for recovered session on mount
    const recovered = loadActiveSession();
    if (recovered) {
      setGoal(recovered.goal);
      setStartedAt(recovered.startedAt);
      setNow(Date.now());
      setKept(recovered.whitelist);
      setUseTimer(recovered.hasTimer);
      setMinutes(
        recovered.hasTimer
          ? Math.max(1, Math.round((recovered.endAt - recovered.startedAt) / 60000))
          : 0,
      );
      setPhase("locked");
      updateActiveSessionState("recovered");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetchSessions(user.id)
      .then(setPriorSessions)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!isNative()) return;
    // Only fetch native lock state if we don't have a recovered session
    const recovered = loadActiveSession();
    if (recovered) return;

    void loinApp.getLockState().then((state) => {
      console.log("Native lock state on mount:", state);
      if (!state.active) return;
      setGoal(state.goal);
      setKept(state.whitelist);
      setStartedAt(state.startedAt);
      setNow(Date.now());
      setMinutes(
        state.hasTimer ? Math.max(1, Math.round((state.endAt - state.startedAt) / 60000)) : 0,
      );
      setUseTimer(state.hasTimer);
      setPhase("locked");
    });
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    void loinApp
      .getInstalledApps()
      .then(({ apps }) => {
        console.log("Discovered installed apps:", apps.length);
        setAvailableApps(
          apps.map((app) => ({ id: app.packageName, name: app.appName, note: "", icon: app.icon })),
        );
      })
      .catch((error) => {
        console.error("Failed to get installed apps:", error);
      });
  }, []);

  useEffect(() => {
    preloadSound("lock-click");
    preloadSound("session-complete");
  }, []);

  useEffect(() => {
    if (phase !== "locked") return;
    const id = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);

      // Check if timer expired (only for timer sessions)
      if (useTimer && targetMs > 0) {
        const elapsed = currentNow - startedAt;
        if (elapsed >= targetMs) {
          updateActiveSessionState("timer_expired");
          finish("timer");
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [phase, useTimer, targetMs, startedAt]);

  useEffect(() => {
    if (phase !== "locked") return;
    const id = setInterval(() => setLineIndex((i) => (i + 1) % QUIET_LINES.length), 14000);
    return () => clearInterval(id);
  }, [phase]);

  function applyCustom(raw: string, unit: "minutes" | "hours") {
    setCustomValue(raw);
    setCustomUnit(unit);
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    const mins = unit === "hours" ? Math.round(n * 60) : Math.round(n);
    setMinutes(Math.min(1440, Math.max(1, mins)));
  }

  async function checkGoalWithAI() {
    const text = goal.trim();
    if (!text) return;
    setJudging(true);
    setGoalError(null);
    setVerdict(null);
    try {
      const v = await judgeGoal({ data: { goal: text, durationMs: targetMs } });
      setVerdict(v);
      // Older deployed validators may not yet include this field. Keep the
      // escape sheet usable during that rollout; the server-side validator
      // supplies the AI-calculated value once its matching deployment is live.
      const reportedDifficulty = Number(v.difficultyFactor);
      setDifficultyFactor(
        Number.isFinite(reportedDifficulty) && reportedDifficulty >= 1 && reportedDifficulty <= 5
          ? reportedDifficulty
          : 1,
      );
      if (v.ok) setPhase("whitelist");
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setGoalError(
        /forbidden|403/i.test(message)
          ? "The secure goal check could not connect. Please retry once."
          : message || "Could not check that goal.",
      );
    } finally {
      setJudging(false);
    }
  }

  async function seal(skipPenaltyCheck = false) {
    if (!skipPenaltyCheck) {
      const penalty = await checkActivePenalty(user?.id, user?.user_metadata?.isDev === true);
      if (penalty.active && penalty.amount > 0) {
        penaltyAmountRef.current = penalty.amount;
        setPenaltyCheck(penalty);
        setShowPenaltyPayment(true);
        return;
      }
      setPenaltyCheck(null);
    }

    setPhase("sealing");
    haptic("commit");
    playSound("lock-click");
    setTimeout(() => haptic("lock"), 700);

    // Start lock immediately without delay
    const t = Date.now();
    const sessionId = newId();
    const endAt = useTimer ? t + targetMs : 0;

    // Save active session for recovery
    saveActiveSession({
      id: sessionId,
      goal: goal.trim(),
      startedAt: t,
      endAt,
      hasTimer: useTimer,
      whitelist: kept,
      state: "active" as SessionState,
    });

    console.log("isNative():", isNative());
    console.log("loinApp available:", typeof loinApp !== "undefined");

    if (isNative()) {
      try {
        console.log("Starting native lock session with:", {
          sessionId,
          goal: goal.trim(),
          startedAt: t,
          endAt,
          hasTimer: useTimer,
          whitelist: kept,
        });
        await loinApp.startLockSession({
          sessionId,
          goal: goal.trim(),
          startedAt: t,
          endAt,
          hasTimer: useTimer,
          whitelist: kept,
        });
        console.log("Native lock session started successfully");
      } catch (error) {
        console.error("Native lock session failed:", error);
        setNativeLockError(error instanceof Error ? error.message : "Native lock could not start.");
        setPhase("review");
        clearActiveSession();
        return;
      }
    } else {
      console.warn("Not running in native environment - lock features disabled");
    }

    setStartedAt(t);
    setNow(t);
    setPhase("locked");
    updateActiveSessionState("active");
    if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  async function finish(m: UnlockMethod, amount?: number) {
    const endedAt = Date.now();
    const baseEscapeAmount =
      amount ?? escapePrice(targetMs, remaining, difficultyFactor, priorSessions);
    const escapeAmount = baseEscapeAmount;
    const penaltyAmount = escapeAmount * 2;
    if (m === "pay") setPaid(escapeAmount);
    if (m === "emergency") setPaid(penaltyAmount);
    setUnlockMethod(m);

    // Handle emergency getaway with immediate local persistence and server sync
    if (m === "emergency") {
      setLocalPenalty(penaltyAmount, user?.id, escapeAmount);
      setPenaltyCheck({ active: true, amount: penaltyAmount, escapeAmount });
      setShowPenaltyPayment(false);

      const isDeveloper = user?.user_metadata?.isDev === true;
      if (user && !isDeveloper) {
        void recordEmergencyEscape({
          data: {
            sessionId: newId(),
            goal: goal.trim(),
            escapeAmount,
          },
        }).catch((err) => {
          console.warn("[Lock] Background emergency record failed:", err);
        });
      }

      updateActiveSessionState("emergency");
    }

    const record = {
      id: newId(),
      goal: goal.trim(),
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      targetMs,
      unlockedBy: m,
      paidAmount: m === "pay" ? escapeAmount : m === "emergency" ? penaltyAmount : undefined,
      state: m === "emergency" ? "emergency" : ("completed" as SessionState),
      hasTimer: useTimer,
      whitelist: kept,
    };
    if (user) void pushSession(user.id, record);
    setPriorSessions((sessions) => [record, ...sessions]);

    // Clear active session
    clearActiveSession();

    if (isNative()) {
      console.log("Stopping native lock session");
      void loinApp.stopLockSession();
    }
    playSound("session-complete");
    haptic("complete");
    setPhase("unlocked");
    if (typeof document !== "undefined" && document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function reset() {
    setPhase("duration");
    setGoal("");
    setVerdict(null);
    setGoalError(null);
    setProof(null);
    setShowProof(false);
    setShowEscape(false);
    setShowEmergency(false);
    setKept([]);
    setUseTimer(true);
    setDifficultyFactor(1);
  }

  function onProofFile(f: File | null) {
    if (!f) {
      setProof(null);
      updateActiveSessionState("active");
      return;
    }
    updateActiveSessionState("proof_pending");
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result);
      const image = new Image();
      image.onload = () => {
        const maxEdge = 1280;
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          setProof(source);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setProof(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => setProof(source);
      image.src = source;
    };
    reader.readAsDataURL(f);
  }

  // ================= SEALING =================
  if (phase === "sealing") {
    return (
      <Board fixed>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center anim-seal">
          <LockDoodle size={96} className="text-chalk chalk-glow" />
          <p className="mt-6 font-sketch text-2xl chalk-text chalk-glow">the promise is sealed.</p>
          <p className="mt-2 font-hand text-lg text-chalk-faint anim-breathe">
            {useTimer
              ? `${formatDuration(targetMs)} · no way around it`
              : "open-ended · prove it or pay"}
          </p>
        </div>
      </Board>
    );
  }

  // ================= LOCKED (active session) =================
  if (phase === "locked") {
    return (
      <Board fixed>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <RingTimer
            progress={useTimer ? progress : 0}
            label={formatClock(useTimer ? remaining : elapsed)}
            caption={useTimer ? `${Math.round(progress * 100)}% done` : "locked in · no clock"}
          />

          <p className="mt-8 font-hand text-lg text-chalk-faint anim-breathe">
            {QUIET_LINES[lineIndex]}
          </p>

          {goal && (
            <p className="mt-5 max-w-lg font-hand text-base leading-relaxed text-chalk-dim">
              {goal}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ChalkButton variant="ghost" className="press" onClick={() => setShowProof(true)}>
              <CameraDoodle size={20} className="text-chalk" /> prove the work
            </ChalkButton>
            <ChalkButton variant="ghost" className="press" onClick={() => setShowEscape(true)}>
              <CoinDoodle size={20} className="text-chalk" /> pay to escape
            </ChalkButton>
            <ChalkButton
              variant="ghost"
              className="press text-chalk/60 hover:text-chalk"
              onClick={() => setShowEmergency(true)}
            >
              emergency getaway
            </ChalkButton>
          </div>
          {isNative() && kept.length > 0 && (
            <div className="mt-6 flex max-w-md flex-wrap justify-center gap-2">
              {availableApps
                .filter((app) => kept.includes(app.id))
                .map((app) => (
                  <ChalkButton
                    key={app.id}
                    variant="ghost"
                    className="press"
                    onClick={() => {
                      console.log("Launching whitelisted app:", app.id, app.name);
                      void loinApp.launchWhitelistedApp({ packageName: app.id });
                    }}
                  >
                    {app.name}
                  </ChalkButton>
                ))}
            </div>
          )}
        </div>

        {showEscape && (
          <EscapeModal
            remainingMs={remaining}
            targetMs={targetMs}
            difficultyFactor={difficultyFactor}
            priorSessions={priorSessions}
            onCancel={() => setShowEscape(false)}
            onPay={(amount) => {
              setPaid(amount);
              finish("pay", amount);
            }}
          />
        )}
        {showEmergency && (
          <EmergencyModal
            onCancel={() => setShowEmergency(false)}
            onConfirm={() => {
              finish("emergency");
              setShowEmergency(false);
            }}
          />
        )}
        {showProof && (
          <ProofModal
            proof={proof}
            goal={goal}
            fileRef={fileRef}
            onFile={onProofFile}
            onCancel={() => {
              setShowProof(false);
              setProof(null);
            }}
            onConfirm={() => finish("proof")}
          />
        )}
      </Board>
    );
  }

  // ================= UNLOCKED =================
  if (phase === "unlocked") {
    const held = Date.now() - startedAt;
    return (
      <Board>
        <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center anim-step-in">
          <LockDoodle size={84} className="text-chalk chalk-glow" />
          <h1 className="mt-6 font-sketch text-4xl leading-tight chalk-text chalk-glow md:text-6xl">
            {unlockMethod === "timer"
              ? "You kept your word."
              : unlockMethod === "proof"
                ? "Commitment fulfilled."
                : unlockMethod === "emergency"
                  ? "Emergency exit recorded."
                  : "You paid your way out."}
          </h1>
          <p className="mt-3 max-w-md font-hand text-base leading-relaxed text-chalk-dim">
            {unlockMethod === "timer"
              ? `${formatDuration(held)} reclaimed. Another promise kept.`
              : unlockMethod === "proof"
                ? `Proof delivered. ${formatDuration(held)} reclaimed.`
                : unlockMethod === "emergency"
                  ? `₹${paid} emergency penalty due. Pay twice your escape fee before starting another session.`
                  : `₹${paid} lighter. The exit was always there.`}
          </p>

          <div className="mt-8 font-sketch text-2xl chalk-text tabular-nums">
            {formatClock(held)}
          </div>
          <div className="font-hand text-sm text-chalk-faint">time locked in</div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ChalkButton onClick={() => navigate({ to: "/" })} className="press">
              back to the board <ArrowDoodle size={18} className="text-chalk" />
            </ChalkButton>
            <ChalkButton
              variant="ghost"
              onClick={async () => {
                const penalty = await checkActivePenalty(user?.id, user?.user_metadata?.isDev === true);
                if (penalty.active && penalty.amount > 0) {
                  penaltyAmountRef.current = penalty.amount;
                  setPenaltyCheck(penalty);
                  setShowPenaltyPayment(true);
                  return;
                }
                reset();
              }}
              className="press"
            >
              <ClockDoodle size={20} className="text-chalk" /> lock in again
            </ChalkButton>
          </div>
        </div>
        {showPenaltyPayment && penaltyCheck?.active && (
          <PenaltyPaymentModal
            amount={penaltyCheck.amount}
            escapeAmount={penaltyCheck.escapeAmount}
            onCancel={() => setShowPenaltyPayment(false)}
            onPay={async () => {
              clearLocalPenalty(user?.id);
              const isDeveloper = user?.user_metadata?.isDev === true;
              if (user && !isDeveloper) {
                try {
                  await resolvePenalty();
                } catch (error) {
                  console.warn("[Lock] Failed to resolve server penalty:", error);
                }
              }
              penaltyAmountRef.current = 0;
              setPenaltyCheck(null);
              setShowPenaltyPayment(false);
              reset();
            }}
          />
        )}
      </Board>
    );
  }

  // ================= RITUAL (3 steps) =================
  const stepNumber = { duration: 1, goal: 2, whitelist: 3, review: 3 }[phase];

  return (
    <Board>
      {showPenaltyPayment && penaltyCheck?.active && (
        <PenaltyPaymentModal
          amount={penaltyCheck.amount}
          escapeAmount={penaltyCheck.escapeAmount}
          onCancel={() => {
            setShowPenaltyPayment(false);
            navigate({ to: "/" });
          }}
          onPay={async () => {
            clearLocalPenalty(user?.id);
            const isDeveloper = user?.user_metadata?.isDev === true;
            if (user && !isDeveloper) {
              try {
                await resolvePenalty();
              } catch (error) {
                console.warn("[Lock] Failed to resolve server penalty:", error);
              }
            }
            penaltyAmountRef.current = 0;
            setPenaltyCheck(null);
            setShowPenaltyPayment(false);
            if (phase === "review") {
              await seal(true);
            }
          }}
        />
      )}
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-7 sm:px-6 sm:py-10">
        <Link
          to="/"
          className="press inline-flex items-center gap-2 font-hand text-chalk-dim hover:text-chalk"
        >
          <ArrowDoodle size={18} className="rotate-180" /> leave
        </Link>

        <div className="mt-8">
          <div className="flex items-center gap-3">
            <LockDoodle size={40} className="text-chalk" />
            <h1 className="font-sketch text-4xl leading-tight chalk-text chalk-glow md:text-6xl">
              Lock In
            </h1>
          </div>
          <Scribble className="mt-2 w-44 text-chalk/50" />
          <div className="mt-4 flex items-center gap-2 font-hand text-sm uppercase tracking-[0.25em] text-chalk-faint">
            step {stepNumber} of 3
            <span className="flex gap-1">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1 w-6 ${n <= stepNumber ? "bg-chalk" : "bg-chalk/20"}`}
                />
              ))}
            </span>
          </div>
        </div>

        {/* STEP 1a — duration */}
        {phase === "duration" && (
          <div className="mt-7 anim-step-in">
            <h2 className="font-sketch text-2xl leading-tight chalk-text">
              How long will you lock in for?
            </h2>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {([true, false] as const).map((on) => (
                <button
                  key={String(on)}
                  onClick={() => {
                    setUseTimer(on);
                    haptic("select");
                  }}
                  className={`press liquid-glass-pill px-5 py-2 font-hand text-base ${
                    useTimer === on ? "text-chalk chalk-glow-box" : "text-chalk-faint"
                  }`}
                >
                  {on ? "with a clock" : "no clock"}
                </button>
              ))}
            </div>
            <p className="mt-2 font-hand text-sm text-chalk-dim">
              {useTimer
                ? "The clock counts down and sets you free when it runs out."
                : "No countdown. The only way out is proving the work — or paying."}
            </p>
            {!useTimer && (
              <ChalkCard className="mt-4 border border-chalk/30">
                <p className="font-hand text-sm leading-relaxed text-chalk-dim">
                  no timer means there is no automatic end time. the lock continues until the goal
                  is completed or an approved recovery path is used.
                </p>
              </ChalkCard>
            )}

            <div
              className={`mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 ${
                useTimer ? "" : "pointer-events-none opacity-35"
              }`}
            >
              {DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  onClick={() => {
                    setMinutes(d.minutes);
                    setCustomOpen(false);
                  }}
                  className={`lift press liquid-glass min-h-16 px-3 py-4 font-sketch text-xl ${
                    minutes === d.minutes && !customOpen
                      ? "chalk-glow-box text-chalk"
                      : "text-chalk-dim"
                  }`}
                >
                  {d.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setCustomOpen(true);
                  applyCustom(customValue, customUnit);
                }}
                className={`lift press liquid-glass min-h-16 px-3 py-4 font-sketch text-xl ${
                  customOpen ? "chalk-glow-box text-chalk" : "text-chalk-dim"
                }`}
              >
                Custom
              </button>
            </div>

            {useTimer && customOpen && (
              <ChalkCard className="mt-4 anim-step-in">
                <label className="font-hand text-xs uppercase tracking-[0.3em] text-chalk-faint">
                  how long exactly?
                </label>
                <div className="mt-3 flex items-center gap-4">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={customValue}
                    onChange={(e) => applyCustom(e.target.value, customUnit)}
                    placeholder="90"
                    className="w-32 border-b-2 border-chalk/25 bg-transparent pb-1 font-sketch text-4xl text-chalk placeholder:text-chalk-faint/50 focus:border-chalk/70 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    {(["minutes", "hours"] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => applyCustom(customValue, u)}
                        className={`press liquid-glass-pill px-4 py-1.5 font-hand text-sm ${
                          customUnit === u ? "text-chalk chalk-glow-box" : "text-chalk-faint"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-3 font-hand text-sm text-chalk-dim">
                  that's {formatDuration(minutes * 60 * 1000)} locked in.
                </p>
              </ChalkCard>
            )}

            <div className="mt-10 flex justify-end">
              <ChalkButton
                className="press"
                onClick={() => {
                  haptic("select");
                  setPhase("goal");
                }}
              >
                continue <ArrowDoodle size={18} className="text-chalk" />
              </ChalkButton>
            </div>
          </div>
        )}

        {/* STEP 2 — goal, judged by AI */}
        {phase === "goal" && (
          <div className="mt-7 anim-step-in">
            <h2 className="font-sketch text-2xl leading-tight chalk-text">
              What will you accomplish?
            </h2>
            <p className="mt-2 font-hand text-base leading-relaxed text-chalk-faint">
              {useTimer ? `${formatDuration(targetMs)} locked in.` : "No clock."} Name the work you
              can prove.
            </p>

            <ChalkCard className="mt-6">
              <div className="relative">
                {!goal && (
                  <div className="pointer-events-none absolute inset-0 font-sketch text-xl leading-relaxed text-chalk-faint/70">
                    <HandwritingPlaceholder />
                  </div>
                )}
                <textarea
                  value={goal}
                  onChange={(e) => {
                    setGoal(e.target.value);
                    setVerdict(null);
                    setGoalError(null);
                  }}
                  rows={4}
                  className="relative w-full resize-none bg-transparent font-sketch text-xl leading-relaxed text-chalk focus:outline-none"
                />
              </div>
            </ChalkCard>

            {judging && (
              <p className="mt-5 font-hand text-lg text-chalk-dim anim-breathe">
                reading your promise…
              </p>
            )}

            {verdict && !verdict.ok && (
              <ChalkCard className="mt-6 anim-step-in">
                <div className="font-hand text-sm uppercase tracking-[0.25em] text-chalk-faint">
                  that won't hold
                </div>
                <p className="mt-2 font-hand text-lg text-chalk-dim">{verdict.reason}</p>
                {verdict.suggestion && (
                  <>
                    <p className="mt-4 font-sketch text-xl chalk-text">{verdict.suggestion}</p>
                    <div className="mt-4">
                      <ChalkButton
                        className="press"
                        onClick={() => {
                          if (verdict.suggestion) setGoal(verdict.suggestion);
                          setVerdict(null);
                        }}
                      >
                        use this
                      </ChalkButton>
                    </div>
                  </>
                )}
              </ChalkCard>
            )}

            {goalError && <p className="mt-5 font-hand text-base text-chalk">{goalError}</p>}

            <div className="mt-10 flex justify-between">
              <ChalkButton variant="ghost" className="press" onClick={() => setPhase("duration")}>
                back
              </ChalkButton>
              <ChalkButton
                className="press"
                disabled={!goal.trim() || judging}
                onClick={checkGoalWithAI}
              >
                {judging ? "checking…" : "continue"}{" "}
                <ArrowDoodle size={18} className="text-chalk" />
              </ChalkButton>
            </div>
          </div>
        )}

        {/* STEP 3 — whitelist */}
        {phase === "whitelist" && (
          <div className="mt-7 anim-step-in">
            <h2 className="font-sketch text-2xl leading-tight chalk-text">
              Which apps do you need to keep?
            </h2>
            <p className="mt-2 max-w-lg font-hand text-base leading-relaxed text-chalk-dim">
              Everything is locked by default. Keep only what you truly need — every door you leave
              open is a door you can walk through.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
              {availableApps.map((app) => {
                const on = kept.includes(app.id);
                return (
                  <button
                    key={app.id}
                    onClick={() =>
                      setKept((k) => (on ? k.filter((i) => i !== app.id) : [...k, app.id]))
                    }
                    className={`lift press liquid-glass px-4 py-4 text-left ${
                      on ? "chalk-glow-box" : "opacity-55"
                    }`}
                  >
                    <div className={`font-sketch text-lg ${on ? "text-chalk" : "text-chalk-dim"}`}>
                      {app.name}
                    </div>
                    <div className="font-hand text-xs text-chalk-faint">
                      {on ? app.note || "kept" : "locked"}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 font-hand text-sm text-chalk-faint">
              {kept.length} kept · everything else stays shut.
            </p>

            <div className="mt-10 flex justify-between">
              <ChalkButton variant="ghost" className="press" onClick={() => setPhase("goal")}>
                back
              </ChalkButton>
              <ChalkButton className="press" onClick={() => setPhase("review")}>
                continue <ArrowDoodle size={18} className="text-chalk" />
              </ChalkButton>
            </div>
          </div>
        )}

        {/* STEP 3 — final commitment */}
        {phase === "review" && (
          <div className="mt-10 anim-step-in">
            <h2 className="font-sketch text-3xl chalk-text">The terms.</h2>
            <ChalkCard className="mt-6">
              <Term label="duration" value={formatDuration(targetMs)} />
              <Term label="the work" value={goal.trim()} />
              <Term
                label="kept unlocked"
                value={
                  kept.length
                    ? availableApps
                        .filter((a) => kept.includes(a.id))
                        .map((a) => a.name)
                        .join(" · ")
                    : "nothing"
                }
                last
              />
            </ChalkCard>

            {nativeLockError && (
              <ChalkCard className="mt-4 border border-chalk/40">
                <p className="font-hand text-sm leading-relaxed text-chalk-dim">
                  {nativeLockError}
                </p>
              </ChalkCard>
            )}

            <div className="mt-12 flex flex-col items-center">
              <button
                onClick={() => seal()}
                className="press liquid-glass-pill chalk-glow-box min-h-14 w-full max-w-md px-6 py-4 font-sketch text-2xl tracking-[0.1em] chalk-text chalk-glow transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              >
                LOCK ME IN
              </button>
              <p className="mt-8 font-hand text-sm text-chalk-faint">
                Once sealed, the terms above are the only way out.
              </p>
              <button
                onClick={() => setPhase("whitelist")}
                className="press mt-4 font-hand text-sm text-chalk-faint underline underline-offset-4 hover:text-chalk-dim"
              >
                back
              </button>
            </div>
          </div>
        )}
      </div>
    </Board>
  );
}

/** The big chalk circle that slowly fills as the session burns down. */
function RingTimer({
  progress,
  label,
  caption,
}: {
  progress: number;
  label: string;
  caption: string;
}) {
  const R = 132;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="320"
        height="320"
        viewBox="0 0 320 320"
        className="chalk-glow -rotate-90"
        aria-hidden
      >
        <circle
          cx="160"
          cy="160"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="6"
          filter="url(#chalk-stroke)"
        />
        <circle
          cx="160"
          cy="160"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          filter="url(#chalk-stroke)"
          style={{ transition: "stroke-dashoffset 0.6s linear" }}
        />
      </svg>
      <div className="absolute inset-10 rounded-full liquid-glass anim-breathe" />
      <div className="absolute flex flex-col items-center">
        <div className="font-sketch text-5xl chalk-text chalk-glow tabular-nums md:text-7xl">
          {label}
        </div>
        <div className="mt-1 font-hand text-xs uppercase tracking-[0.35em] text-chalk-faint">
          {caption}
        </div>
      </div>
    </div>
  );
}

function Term({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`py-3 ${last ? "" : "border-b border-chalk/15"}`}>
      <div className="font-hand text-xs uppercase tracking-[0.3em] text-chalk-faint">{label}</div>
      <div className="mt-1 font-sketch text-lg leading-relaxed chalk-text">{value}</div>
    </div>
  );
}


function EscapeModal({
  remainingMs,
  targetMs,
  difficultyFactor,
  priorSessions,
  onCancel,
  onPay,
}: {
  remainingMs: number;
  targetMs: number;
  difficultyFactor: number;
  priorSessions: LockSession[];
  onCancel: () => void;
  onPay: (amount: number) => void;
}) {
  const price = escapePrice(targetMs, remainingMs, difficultyFactor, priorSessions);
  const [processing, setProcessing] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 chalk-texture backdrop-blur-sm">
      <ChalkCard className="mx-4 max-w-md anim-step-in">
        <h3 className="font-sketch text-3xl chalk-text chalk-glow">Buy your way out</h3>
        <p className="mt-3 font-hand text-lg text-chalk-dim">
          You made the promise. Breaking it costs. The ledger remembers either way.
        </p>
        <div className="mt-6 flex items-baseline gap-2">
          <span className="font-sketch text-5xl chalk-text">₹{price}</span>
          <span className="font-hand text-chalk-faint">to leave now</span>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <ChalkButton variant="ghost" className="press" onClick={onCancel} disabled={processing}>
            stay in
          </ChalkButton>
          <ChalkButton
            variant="danger"
            className="press"
            disabled={processing}
            onClick={() => {
              setProcessing(true);
              setTimeout(() => onPay(price), 900);
            }}
          >
            {processing ? "processing…" : `pay ₹${price}`}
          </ChalkButton>
        </div>
        <p className="mt-4 font-hand text-xs text-chalk-faint">demo: no real charge.</p>
      </ChalkCard>
    </div>
  );
}

function ProofModal({
  proof,
  goal,
  fileRef,
  onFile,
  onCancel,
  onConfirm,
}: {
  proof: string | null;
  goal: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File | null) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<ProofVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function judge() {
    if (!proof) return;
    setChecking(true);
    setError(null);
    setVerdict(null);
    try {
      const v = await verifyProof({ data: { goal, image: proof } });
      setVerdict(v);
      if (v.approved) {
        // Update session state before confirming
        const activeSession = loadActiveSession();
        if (activeSession) {
          updateActiveSessionState("proof_success");
        }
        setTimeout(onConfirm, 900);
      } else {
        const activeSession = loadActiveSession();
        if (activeSession) {
          updateActiveSessionState("proof_failure");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
      const activeSession = loadActiveSession();
      if (activeSession) {
        updateActiveSessionState("active"); // Reset to active on error
      }
    } finally {
      setChecking(false);
    }
  }

  function handleRetake() {
    onFile(null);
    setVerdict(null);
    setError(null);
    const activeSession = loadActiveSession();
    if (activeSession) {
      updateActiveSessionState("active");
    }
  }

  function handleCancel() {
    handleRetake();
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 chalk-texture backdrop-blur-sm">
      <ChalkCard className="mx-4 w-full max-w-md anim-step-in">
        <h3 className="font-sketch text-3xl chalk-text chalk-glow">Show the work</h3>
        <p className="mt-3 font-hand text-lg text-chalk-dim">
          The photo is checked against your promise. No match, no unlock.
        </p>

        <div className="mt-5">
          {proof ? (
            <div>
              <img
                src={proof}
                alt="proof of work"
                className="w-full border-2 border-chalk/40"
                style={{ filter: "grayscale(0.4) contrast(1.05)" }}
              />
              <button
                onClick={handleRetake}
                className="press mt-2 font-hand text-sm text-chalk-faint underline"
              >
                retake
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="press flex w-full flex-col items-center gap-3 border-2 border-dashed border-chalk/40 px-4 py-10 font-hand text-chalk-dim transition hover:border-chalk hover:text-chalk"
            >
              <CameraDoodle size={48} className="text-chalk" />
              capture proof
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {checking && (
          <p className="mt-5 font-hand text-lg text-chalk-dim anim-breathe">
            reading your proof against the promise…
          </p>
        )}

        {verdict && (
          <div className="mt-5 border-l-2 border-chalk/40 pl-4">
            <div className="font-hand text-xs uppercase tracking-[0.3em] text-chalk-faint">
              {verdict.approved ? "proof accepted" : "proof rejected"}
            </div>
            <p className="mt-1 font-sketch text-xl chalk-text">{verdict.reason}</p>
            <p className="mt-1 font-hand text-xs text-chalk-faint">
              confidence {Math.round(verdict.confidence * 100)}%
            </p>
          </div>
        )}

        {error && <p className="mt-5 font-hand text-base text-chalk">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <ChalkButton variant="ghost" className="press" onClick={handleCancel} disabled={checking}>
            cancel
          </ChalkButton>
          <ChalkButton
            className="press"
            onClick={judge}
            disabled={!proof || checking || Boolean(verdict && !verdict.approved)}
          >
            {checking
              ? "checking…"
              : verdict && !verdict.approved
                ? "upload different proof"
                : "submit proof"}{" "}
            <ArrowDoodle size={18} className="text-chalk" />
          </ChalkButton>
        </div>
      </ChalkCard>
    </div>
  );
}

function EmergencyModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 chalk-texture backdrop-blur-sm">
      <ChalkCard className="mx-4 w-full max-w-md anim-step-in">
        <h3 className="font-sketch text-3xl chalk-text chalk-glow">Emergency Getaway</h3>
        <p className="mt-3 font-hand text-lg text-chalk-dim">
          This is your emergency escape. It will terminate your LockIn session and activate a
          penalty on your account.
        </p>

        <ChalkCard className="mt-6 border border-chalk/40">
          <div className="font-hand text-sm uppercase tracking-[0.25em] text-chalk-faint">
            consequences
          </div>
          <ul className="mt-3 space-y-2 font-hand text-base text-chalk-dim">
            <li>• Your current LockIn session will end immediately</li>
            <li>• A 2× penalty will be applied to your account</li>
            <li>
              • You will not be able to start new LockIn sessions until the penalty is resolved
            </li>
            <li>• This escape will be recorded in your session history</li>
          </ul>
        </ChalkCard>

        {!confirming ? (
          <div className="mt-6 flex justify-end gap-3">
            <ChalkButton variant="ghost" className="press" onClick={onCancel}>
              cancel
            </ChalkButton>
            <ChalkButton variant="danger" className="press" onClick={() => setConfirming(true)}>
              i understand the consequences
            </ChalkButton>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="emergency-confirm"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-chalk/40"
              />
              <label htmlFor="emergency-confirm" className="font-hand text-base text-chalk-dim">
                I want to use my emergency getaway and accept the penalty
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <ChalkButton variant="ghost" className="press" onClick={onCancel}>
                cancel
              </ChalkButton>
              <ChalkButton
                variant="danger"
                className="press"
                disabled={!confirmed}
                onClick={onConfirm}
              >
                emergency getaway
              </ChalkButton>
            </div>
          </div>
        )}
      </ChalkCard>
    </div>
  );
}
