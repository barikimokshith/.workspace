import type { LockSession } from "@/lib/session-store";

export const ESCAPE_BASE_INR = 100;

export function timeFactorFor(targetMs: number): number {
  const minutes = targetMs / 60_000;
  if (minutes < 30) return 1;
  if (minutes < 60) return 1.5;
  if (minutes < 120) return 1.75;
  if (minutes < 240) return 2;
  if (minutes < 480) return 3;
  return 5;
}

export function remainingTimeFactorFor(remainingMs: number, originalMs: number): number {
  if (!Number.isFinite(originalMs) || originalMs <= 0) return 0.5;
  const remainingRatio = Math.max(0, Math.min(1, remainingMs / originalMs));
  if (remainingRatio >= 0.75) return 1.5;
  if (remainingRatio >= 0.5) return 1.25;
  if (remainingRatio >= 0.25) return 1;
  if (remainingRatio >= 0.1) return 0.75;
  return 0.5;
}

export function consecutiveEscapes(sessions: LockSession[]): number {
  let count = 0;
  for (const session of [...sessions].sort((a, b) => b.startedAt - a.startedAt)) {
    if (session.unlockedBy !== "pay") break;
    count += 1;
  }
  return count;
}

export function escapePrice(
  originalMs: number,
  remainingMs: number,
  difficulty: number,
  previousSessions: LockSession[],
): number {
  const numericDifficulty = Number(difficulty);
  const safeDifficulty = Number.isFinite(numericDifficulty)
    ? Math.max(1, Math.min(5, numericDifficulty))
    : 1;
  const base =
    ESCAPE_BASE_INR * Math.pow(1.5, Math.floor(consecutiveEscapes(previousSessions) / 3));
  return Math.round(
    base *
      timeFactorFor(originalMs) *
      safeDifficulty *
      remainingTimeFactorFor(remainingMs, originalMs),
  );
}
