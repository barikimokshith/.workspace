import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ProofVerdict {
  approved: boolean;
  confidence: number;
  reason: string;
}

const ProofInput = z.object({ goal: z.string().trim().min(1).max(1_000), image: z.string().startsWith("data:image/").max(4_000_000) });

function parseProofVerdict(content: string): ProofVerdict {
  const candidate = content.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  try {
    return z.object({ approved: z.boolean(), confidence: z.number().min(0).max(1), reason: z.string().trim().min(1).max(500) }).parse(JSON.parse(candidate));
  } catch {
    return { approved: false, confidence: 0, reason: "The proof check returned an unreadable result. Try a clearer photo." };
  }
}

/** Trusted proof decision. A selected image alone never unlocks a native session. */
export const verifyProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => ProofInput.parse(raw))
  .handler(async ({ data }): Promise<ProofVerdict> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Proof verification is not configured. Please try again later.");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: 'Return ONLY one JSON object: {"approved":boolean,"confidence":number,"reason":string}. Assess whether the photo visibly proves the stated goal is completed. Reject unrelated, blank, staged, partial, or ambiguous proof. Be strict and keep the reason short.' },
          { role: "user", content: [{ type: "text", text: `Committed goal: ${data.goal}` }, { type: "image_url", image_url: { url: data.image } }] },
        ],
      }),
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error("Too many proof checks right now. Please try again shortly.");
      if (response.status === 402) throw new Error("Proof verification credits are unavailable right now.");
      throw new Error("The proof could not be verified right now. Please try again.");
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return parseProofVerdict(payload.choices?.[0]?.message?.content ?? "");
  });
