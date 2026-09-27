// Account deletion. Firebase identities are verified by a fresh phone OTP in
// the native client; web password accounts retain the existing password check.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ password: z.string().optional() });

export interface DeleteResult {
  ok: boolean;
  error?: string;
}

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => Input.parse(raw))
  .handler(async ({ context, data }): Promise<DeleteResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const isFirebase = context.claims.isFirebase === true;
    if (isFirebase) {
      const authTime = context.claims.auth_time;
      const now = Math.floor(Date.now() / 1000);
      if (typeof authTime !== "number" || now - authTime > 10 * 60 || authTime > now + 60) {
        return { ok: false, error: "Verify your phone number again before deleting your account." };
      }
    }

    let foundUser: { identities?: Array<{ provider?: string | null }> | null; email?: string | null } | null = null;
    if (!isFirebase) {
      const { data: found, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (lookupError || !found?.user) return { ok: false, error: "Could not find that account." };
      foundUser = found.user;
    }

    const identities = foundUser?.identities ?? [];
    const hasPassword = identities.some((i) => i.provider === "email");
    const email = foundUser?.email;

    if (hasPassword) {
      if (!data.password) return { ok: false, error: "Enter your password to confirm." };
      if (!email) return { ok: false, error: "This account has no email on file." };

      const { createClient } = await import("@supabase/supabase-js");
      const check = createClient(
        process.env["SUPABASE_URL"]!,
        process.env["SUPABASE_PUBLISHABLE_KEY"]!,
        { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
      );
      const { error: signInError } = await check.auth.signInWithPassword({
        email,
        password: data.password,
      });
      if (signInError) return { ok: false, error: "That password doesn't match. Nothing was deleted." };
    }

    // The Firebase identity has no auth.users row, so explicitly remove its
    // UUID-owned records. Web accounts also use this cleanup because Firebase
    // migration removed the old auth.users foreign keys.
    const ownedGroups = await supabaseAdmin
      .from("group_lockins")
      .select("id")
      .eq("creator_user_id", userId);
    if (ownedGroups.error) return { ok: false, error: "Could not remove account data. Nothing else was deleted." };
    const ownedGroupIds = (ownedGroups.data ?? []).map((group) => group.id);

    const cleanup: Array<PromiseLike<{ error: unknown }>> = [
      supabaseAdmin.from("group_lockin_participants").delete().eq("user_id", userId),
      supabaseAdmin.from("focus_sessions").delete().eq("user_id", userId),
      supabaseAdmin.from("lock_sessions").delete().eq("user_id", userId),
      supabaseAdmin.from("lock_schedules").delete().eq("user_id", userId),
      supabaseAdmin.from("monthly_usage").delete().eq("user_id", userId),
      supabaseAdmin.from("account_penalties").delete().eq("user_id", userId),
      supabaseAdmin.from("subscriptions").delete().eq("user_id", userId),
      supabaseAdmin.from("profiles").delete().eq("id", userId),
    ];
    if (ownedGroupIds.length) {
      cleanup.push(supabaseAdmin.from("group_lockins").delete().in("id", ownedGroupIds));
    }
    const cleanupResults = await Promise.all(cleanup);
    if (cleanupResults.some((result) => result.error)) {
      console.error("Account data cleanup failed", cleanupResults.map((result) => result.error).filter(Boolean));
      return { ok: false, error: "Could not remove all account data. Please try again." };
    }

    try {
      const { data: files } = await supabaseAdmin.storage.from("avatars").list(userId);
      if (files?.length) {
        await supabaseAdmin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {
      /* avatar cleanup is best-effort — never block the deletion */
    }


    if (!isFirebase) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) return { ok: false, error: "Could not delete the account. Try again." };
    }

    return { ok: true };
  });
