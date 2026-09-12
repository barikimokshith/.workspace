// Account deletion. The password is re-checked server-side before anything is
// destroyed — and accounts that only ever signed in with Google are allowed
// through without one, because they never set a password to begin with.
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

    const { data: found, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (lookupError || !found?.user) return { ok: false, error: "Could not find that account." };

    const identities = found.user.identities ?? [];
    const hasPassword = identities.some((i) => i.provider === "email");
    const email = found.user.email;

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

    await supabaseAdmin.from("focus_sessions").delete().eq("user_id", userId);
    try {
      const { data: files } = await supabaseAdmin.storage.from("avatars").list(userId);
      if (files?.length) {
        await supabaseAdmin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {
      /* avatar cleanup is best-effort — never block the deletion */
    }


    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) return { ok: false, error: "Could not delete the account. Try again." };

    return { ok: true };
  });
