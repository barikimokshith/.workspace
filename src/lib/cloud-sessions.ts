// Session persistence. Signed-in users get their ledger stored in Lovable Cloud
// so it follows the account across devices; localStorage stays as the offline
// mirror so the app never blocks on the network.
import { supabase } from "@/integrations/supabase/client";
import { loadSessions, saveSession, type LockSession } from "@/lib/session-store";

export async function pushSession(userId: string, s: LockSession) {
  saveSession(s);
  try {
    await supabase.from("focus_sessions").insert({
      user_id: userId,
      goal: s.goal,
      started_at: new Date(s.startedAt).toISOString(),
      ended_at: new Date(s.endedAt).toISOString(),
      duration_ms: s.durationMs,
      target_ms: s.targetMs,
      unlocked_by: s.unlockedBy,
      paid_amount: s.paidAmount ?? null,
    });
  } catch {
    /* offline — the local mirror already has it */
  }
}

export async function fetchSessions(userId: string): Promise<LockSession[]> {
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("id, goal, started_at, ended_at, duration_ms, target_ms, unlocked_by, paid_amount")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(200);

  if (error || !data) return loadSessions();

  return data.map((r) => ({
    id: r.id,
    goal: r.goal,
    startedAt: new Date(r.started_at).getTime(),
    endedAt: new Date(r.ended_at).getTime(),
    durationMs: Number(r.duration_ms),
    targetMs: Number(r.target_ms),
    unlockedBy: r.unlocked_by as LockSession["unlockedBy"],
    paidAmount: r.paid_amount == null ? undefined : Number(r.paid_amount),
  }));
}

export interface BoardStats {
  today: number;
  total: number;
  completed: number;
  streak: number;
  /** sessions finished honestly — the clock ran out or the work was proven */
  kept: number;
  /** sessions bought out of — the escape was paid for */
  broken: number;
}

export function computeStats(sessions: LockSession[]): BoardStats {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const total = sessions.reduce((sum, s) => sum + s.durationMs, 0);
  const today = sessions
    .filter((s) => s.startedAt >= dayStart.getTime())
    .reduce((sum, s) => sum + s.durationMs, 0);
  const kept = sessions.filter((s) => s.unlockedBy !== "pay").length;
  const broken = sessions.filter((s) => s.unlockedBy === "pay").length;
  const completed = kept;


  // Streak: consecutive days (ending today or yesterday) with at least one session.
  const days = new Set(sessions.map((s) => new Date(s.startedAt).toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { today, total, completed, streak, kept, broken };
}
