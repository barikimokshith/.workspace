import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface GoalVerdict {
  ok: boolean;
  reason: string;
  suggestion?: string;
  difficultyFactor: number;
}

const GoalInput = z.object({ goal: z.string().trim().min(1).max(1_000), durationMs: z.number().int().min(0).max(86_400_000) });

function parseGoalVerdict(content: string): GoalVerdict {
  const candidate = content.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  try {
    return z
      .object({ ok: z.boolean(), reason: z.string().trim().min(1).max(500), suggestion: z.string().trim().max(1_000).optional(), difficultyFactor: z.number().min(1).max(5) })
      .parse(JSON.parse(candidate));
  } catch {
    return { ok: false, reason: "The goal check returned an unreadable result. Please try again.", difficultyFactor: 1 };
  }
}

/** Trusted AI check: the API key and decision never enter the WebView bundle. */
export const judgeGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => GoalInput.parse(raw))
  .handler(async ({ data }): Promise<GoalVerdict> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Goal verification is not configured. Please try again later.");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: 'Return ONLY one JSON object: {"ok":boolean,"reason":string,"suggestion"?:string,"difficultyFactor":number}. Accept only a specific, meaningful focus goal with a clearly verifiable outcome. Reject gibberish, repeated text, emoji-only text, and vague intents such as "study", "focus", or "work hard". difficultyFactor must be 1 to 5 based on workload, complexity, effort, scope, specificity, and realism within the session duration. Do not inflate it. Keep reason short and address the user. Only provide a suggestion when a concrete rewrite can be inferred.' },
          { role: "user", content: `Goal: ${data.goal}\nSession duration: ${Math.round(data.durationMs / 60_000)} minutes` },
        ],
      }),
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error("Too many goal checks right now. Please try again shortly.");
      if (response.status === 402) throw new Error("Goal verification credits are unavailable right now.");
      throw new Error("The goal could not be verified right now. Please try again.");
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return parseGoalVerdict(payload.choices?.[0]?.message?.content ?? "");
  });
