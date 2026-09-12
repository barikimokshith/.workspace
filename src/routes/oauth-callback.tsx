// Bridge page for Google sign-in on Android.
//
// Supabase only redirects to URLs on its allow-list, and a custom scheme like
// app.loin.focus:// isn't on it. So Google comes back here — a normal https
// page that IS allowed — and this page immediately hands the same code back to
// the installed app through its deep link, which closes Chrome and finishes the
// sign-in inside LOIN. On a plain browser it just completes the session here.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChalkFilters, DustParticles } from "@/components/ChalkFX";
import { LockDoodle } from "@/components/ChalkIcons";

export const Route = createFileRoute("/oauth-callback")({
  head: () => ({
    meta: [
      { title: "loin" },
      { name: "description", content: "finishing your loin sign-in and handing you back to the app." },
      { property: "og:title", content: "signing you in · loin" },
      { property: "og:description", content: "finishing your loin sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OAuthCallback,
});

const DEEP_LINK = "app.loin.focus://auth/callback";

function OAuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("handing you back to LOIN…");

  useEffect(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    const wantsApp = new URLSearchParams(search).get("native") === "1";

    if (wantsApp) {
      // Send Chrome straight into the app with the same code/tokens attached.
      window.location.href = `${DEEP_LINK}${search}${hash}`;
      setMessage("opening LOIN… you can close this tab.");
      return;
    }

    (async () => {
      try {
        const code = new URLSearchParams(search).get("code");
        if (code) await supabase.auth.exchangeCodeForSession(code);
      } catch {
        /* fall through — the auth page will ask again */
      }
      const { data } = await supabase.auth.getSession();
      void navigate({ to: data.session ? "/" : "/auth", replace: true });
    })();
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center chalk-texture">
      <ChalkFilters />
      <DustParticles />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <LockDoodle size={54} className="text-chalk" />
        <p className="font-hand text-lg text-chalk-dim">{message}</p>
      </div>
    </div>
  );
}
