// Native-only behaviour: Android back gesture/button, OAuth deep links and the
// status bar. Renders nothing; it is a pure side-effect component.
import { useEffect, useState, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { initStatusBar, isNative, loinApp, plugin } from "@/lib/native";

export function NativeShell() {
  const router = useRouter();
  const [pluginsReady, setPluginsReady] = useState(false);
  const setupAttempted = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isNative()) {
      setReady(true);
      return;
    }
    
    // Check if Capacitor plugins are ready with proper error handling
    const checkPlugins = () => {
      try {
        const cap = (window as any).Capacitor;
        if (cap && cap.Plugins && cap.Plugins.LoinApp) {
          setPluginsReady(true);
          setReady(true);
        }
      } catch (e) {
        // Capacitor not ready yet - will retry
        console.debug('Capacitor bridge not ready yet, will retry');
      }
    };

    // Delay initial check to let Capacitor bridge fully initialize
    const initialDelay = setTimeout(() => {
      checkPlugins();
    }, 100); // Reduced from 500ms to 100ms for faster startup

    // Poll for plugin availability
    const interval = setInterval(checkPlugins, 50);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPluginsReady(true); // Continue even if plugins aren't detected
      setReady(true);
    }, 1000); // Reduced from 3000ms to 1000ms

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!isNative() || !pluginsReady || setupAttempted.current) return;
    setupAttempted.current = true;
    
    void initStatusBar();

    const Browser = plugin<{ close: () => Promise<void> }>("Browser");
    const handles: Array<{ remove: () => void }> = [];

    // Helper to add listener with better error handling
    const addListenerWithRetry = async (
      event: "backButton" | "appUrlOpen",
      listener: (data: any) => void,
      retries = 3,
      delay = 50
    ): Promise<{ remove: () => void } | null> => {
      for (let i = 0; i < retries; i++) {
        try {
          const handle = await loinApp.addListener(event, listener);
          return handle;
        } catch (error) {
          console.warn(`Attempt ${i + 1} to add ${event} listener failed:`, error);
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      console.error(`Failed to add ${event} listener after ${retries} attempts`);
      return null;
    };

    // Back gesture / hardware back: walk the history, only exit from the root.
    addListenerWithRetry("backButton", () => {
      const path = window.location.pathname;
      const atRoot = path === "/" || path === "" || path === "/index.html";
      if (!atRoot && router.history.canGoBack()) {
        router.history.back();
      } else if (!atRoot) {
        void router.navigate({ to: "/", replace: true });
      } else {
        void loinApp.exitApp();
      }
    }).then((h) => {
      if (h) handles.push(h);
    });

    // Google sign-in returns through the app's deep link instead of Chrome.
    addListenerWithRetry("appUrlOpen", async ({ url }) => {
      if (!url || !url.includes("auth/callback")) return;
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get("code");
        const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (hash.get("access_token")) {
          await supabase.auth.setSession({
            access_token: hash.get("access_token")!,
            refresh_token: hash.get("refresh_token") ?? "",
          });
        }
      } catch {
        /* a malformed callback just leaves the user on the sign-in screen */
      } finally {
        try {
          await Browser?.close();
        } catch {
          /* browser may already be gone */
        }
        void router.navigate({ to: "/", replace: true });
      }
    }).then((h) => {
      if (h) handles.push(h);
    });

    return () => handles.forEach((h) => h.remove());
  }, [router, pluginsReady]);

  // Don't render children until we're ready to prevent race conditions
  if (!ready) return null;

  return null;
}
