// LocalStorage-backed session store. Keeps LOIN offline-first and Capacitor-ready.
export type UnlockMethod = "timer" | "proof" | "pay" | "emergency";

export type SessionState = 
  | "setup"      // User is configuring the session
  | "ready"      // Ready to start
  | "active"     // Session is currently locked
  | "paused"     // Session is paused (if supported)
  | "proof_pending" // User needs to submit proof
  | "proof_success" // Proof was accepted
  | "proof_failure" // Proof was rejected
  | "timer_expired" // Timer ran out
  | "completed"  // Session completed successfully
  | "emergency"  // Emergency getaway was used
  | "penalty"    // Penalty was applied
  | "cancelled"  // Session was cancelled
  | "recovered"; // Session was recovered after restart

export interface LockSession {
  id: string;
  goal: string;
  startedAt: number;
  endedAt?: number;
  durationMs: number;
  targetMs: number;
  unlockedBy: UnlockMethod;
  paidAmount?: number;
  state: SessionState;
  hasTimer: boolean;
  whitelist: string[];
  proofSubmitted?: boolean;
  proofVerdict?: boolean;
}

export interface ActiveSession {
  id: string;
  goal: string;
  startedAt: number;
  endAt: number;
  hasTimer: boolean;
  whitelist: string[];
  state: SessionState;
}

// Helper to get user-specific key prefix
function getUserPrefix(): string {
  if (typeof window === "undefined") return "";
  const userId = localStorage.getItem("loin.user_id") || "anonymous";
  return `loin.${userId}.`;
}

/** Called only after Supabase resolves the authenticated identity. */
export function setSessionStoreUserId(userId: string | null) {
  if (typeof window === "undefined") return;
  if (userId) localStorage.setItem("loin.user_id", userId);
  else localStorage.removeItem("loin.user_id");
}

function getKey(base: string): string {
  return getUserPrefix() + base;
}

export function loadSessions(): LockSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(getKey("sessions.v1")) ?? "[]");
  } catch {
    return [];
  }
}

export function saveSession(s: LockSession) {
  const all = loadSessions();
  all.unshift(s);
  localStorage.setItem(getKey("sessions.v1"), JSON.stringify(all.slice(0, 200)));
  bumpStreak();
}

export function loadActiveSession(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getKey("active.v1"));
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Validate session hasn't expired
    if (session.hasTimer && session.endAt && Date.now() > session.endAt) {
      clearActiveSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getKey("active.v1"), JSON.stringify(session));
}

export function clearActiveSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getKey("active.v1"));
}

export function updateActiveSessionState(state: SessionState) {
  const session = loadActiveSession();
  if (session) {
    session.state = state;
    saveActiveSession(session);
  }
}

export function totalLockedMs(): number {
  return loadSessions().reduce((sum, s) => sum + s.durationMs, 0);
}

export function todayLockedMs(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return loadSessions()
    .filter((s) => s.startedAt >= start.getTime())
    .reduce((sum, s) => sum + s.durationMs, 0);
}

export function completedCount(): number {
  return loadSessions().filter((s) => s.unlockedBy !== "pay").length;
}

function bumpStreak() {
  const today = new Date().toDateString();
  const raw = localStorage.getItem(getKey("streak.v1"));
  const state = raw ? JSON.parse(raw) : { last: "", count: 0 };
  if (state.last === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  state.count = state.last === yesterday ? state.count + 1 : 1;
  state.last = today;
  localStorage.setItem(getKey("streak.v1"), JSON.stringify(state));
}

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(getKey("streak.v1"));
  if (!raw) return 0;
  try {
    return JSON.parse(raw).count ?? 0;
  } catch {
    return 0;
  }
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
