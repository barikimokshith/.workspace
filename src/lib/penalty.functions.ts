// Emergency penalty management. Server-side durable enforcement + offline-first local cache.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";

const EmergencyInput = z.object({
  sessionId: z.string(),
  goal: z.string(),
  escapeAmount: z.number(),
});

export interface PenaltyResult {
  ok: boolean;
  error?: string;
  penaltyAmount?: number;
  penaltyActive?: boolean;
}

const BASE_PENALTY_KEY = "penalty.v1";

function getCandidateKeys(userId?: string): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  const storedUid = localStorage.getItem("loin.user_id");
  for (const uid of [userId, storedUid]) {
    if (uid) keys.push(`loin.${uid}.${BASE_PENALTY_KEY}`);
  }
  keys.push(`loin.anonymous.${BASE_PENALTY_KEY}`);
  keys.push(`loin.${BASE_PENALTY_KEY}`);
  return keys;
}

export function getLocalPenaltyDetails(userId?: string): { amount: number; escapeAmount?: number } {
  if (typeof window === "undefined") return { amount: 0 };
  const keys = getCandidateKeys(userId);
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const amount = Number(data.amount);
      if (Number.isFinite(amount) && amount > 0) {
        const escapeAmount = Number(data.escapeAmount);
        return {
          amount,
          escapeAmount: Number.isFinite(escapeAmount) && escapeAmount > 0 ? escapeAmount : undefined,
        };
      }
    } catch {
      // Continue searching next key
    }
  }
  return { amount: 0 };
}

export function getLocalPenalty(userId?: string): number {
  return getLocalPenaltyDetails(userId).amount;
}

export function setLocalPenalty(amount: number, userId?: string, escapeAmount?: number): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({
    amount,
    escapeAmount: escapeAmount ?? Math.round(amount / 2),
    updated_at: new Date().toISOString(),
  });
  const keys = getCandidateKeys(userId);
  for (const key of keys) {
    localStorage.setItem(key, payload);
  }
}

export function clearLocalPenalty(userId?: string): void {
  if (typeof window === "undefined") return;
  const keys = getCandidateKeys(userId);
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

export async function checkActivePenalty(
  userId?: string,
  isDev?: boolean,
): Promise<{ active: boolean; amount: number; escapeAmount?: number }> {
  // 1. Fast local check (offline-first source of truth)
  const local = getLocalPenaltyDetails(userId);
  if (local.amount > 0) {
    return { active: true, amount: local.amount, escapeAmount: local.escapeAmount };
  }

  // Developer accounts rely on local storage only
  if (isDev || typeof window === "undefined") {
    return { active: false, amount: 0 };
  }

  // 2. Server check fallback
  try {
    const serverResult = await getAccountPenalty();
    if (serverResult.active && serverResult.amount > 0) {
      setLocalPenalty(serverResult.amount, userId);
      return {
        active: true,
        amount: serverResult.amount,
        escapeAmount: Math.round(serverResult.amount / 2),
      };
    }
  } catch (err) {
    console.warn("[Penalty] Could not check server penalty:", err);
  }

  return { active: false, amount: 0 };
}

export const recordEmergencyEscape = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => EmergencyInput.parse(raw))
  .handler(async ({ context, data }): Promise<PenaltyResult> => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const userId = context.userId;
    const isDev = context.claims?.isDev === true;

    // Calculate penalty: 2x the escape amount
    const penaltyAmount = data.escapeAmount * 2;

    // For developer accounts, return success - penalty is stored locally
    if (isDev) {
      return {
        ok: true,
        penaltyAmount,
        penaltyActive: true,
      };
    }

    try {
      // Apply or update account penalty
      const { data: existingPenalty } = await supabaseAdmin
        .from("account_penalties")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingPenalty) {
        await supabaseAdmin
          .from("account_penalties")
          .update({
            penalty_amount: penaltyAmount,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } else {
        await supabaseAdmin.from("account_penalties").insert({
          user_id: userId,
          penalty_amount: penaltyAmount,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      return {
        ok: true,
        penaltyAmount,
        penaltyActive: true,
      };
    } catch (error) {
      console.error("[Penalty] Server recording failed, using local penalty:", error);
      return {
        ok: true,
        penaltyAmount,
        penaltyActive: true,
        error: "Penalty saved locally only",
      };
    }
  });

export const getAccountPenalty = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ active: boolean; amount: number }> => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const userId = context.userId;
    const isDev = context.claims?.isDev === true;

    if (isDev) {
      return { active: false, amount: 0 };
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("account_penalties")
        .select("penalty_amount, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        return { active: false, amount: 0 };
      }

      const amount = Number(data.penalty_amount) || 0;
      return { active: Boolean(data.is_active) && amount > 0, amount };
    } catch {
      return { active: false, amount: 0 };
    }
  });

export const resolvePenalty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const userId = context.userId;
    const isDev = context.claims?.isDev === true;

    if (isDev) {
      return { ok: true };
    }

    try {
      const { error } = await supabaseAdmin
        .from("account_penalties")
        .update({ is_active: false, penalty_amount: 0, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) throw error;

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not resolve penalty",
      };
    }
  });
