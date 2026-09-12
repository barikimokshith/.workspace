import { registerPlugin } from "@capacitor/core";

// Thin bridge to Capacitor. Everything is read off the runtime `window.Capacitor`
// global so the web build never needs native-only behavior.

/* eslint-disable @typescript-eslint/no-explicit-any */

function cap(): any {
  return typeof window !== "undefined" ? (window as any).Capacitor : undefined;
}

export type LoinHttpPlugin = {
  request(options: {
    url: string;
    method: string;
    headers: Record<string, string>;
    data?: string;
  }): Promise<{
    status: number;
    url: string;
    data: string;
    headers: Record<string, string>;
  }>;
};

export const loinHttp = registerPlugin<LoinHttpPlugin>("LoinHttp");

export type LoinAppPlugin = {
  addListener(event: "backButton" | "appUrlOpen", listener: (data: { url: string }) => void): Promise<{ remove: () => void }>;
  exitApp(): Promise<void>;
  getLockState(): Promise<{ active: boolean; deviceOwner: boolean; sessionId: string; goal: string; startedAt: number; endAt: number; hasTimer: boolean; whitelist: string[] }>;
  getInstalledApps(): Promise<{ apps: Array<{ packageName: string; appName: string; icon: string; launchable: boolean }> }>;
  startLockSession(options: { sessionId: string; goal: string; startedAt: number; endAt: number; hasTimer: boolean; whitelist: string[] }): Promise<void>;
  stopLockSession(): Promise<void>;
  launchWhitelistedApp(options: { packageName: string }): Promise<void>;
};

export const loinApp = registerPlugin<LoinAppPlugin>("LoinApp");

export function isNative(): boolean {
  try {
    return Boolean(cap()?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function plugin<T = any>(name: string): T | undefined {
  return cap()?.Plugins?.[name];
}

/** Deep link the Google flow comes back through (matches the Android manifest). */
export const NATIVE_REDIRECT = "app.loin.focus://auth/callback";

/**
 * Published https page Google is allowed to redirect to. It forwards straight
 * into NATIVE_REDIRECT, so no custom scheme has to sit on Supabase's allow-list.
 */
export const OAUTH_BRIDGE = "https://loin.lovable.app/oauth-callback";

/** Status bar: draw behind it (so CSS safe-area insets are real) with light icons. */
export async function initStatusBar() {
  const sb = plugin("StatusBar");
  if (!sb) return;
  try {
    await sb.setOverlaysWebView({ overlay: true });
    await sb.setStyle({ style: "DARK" }); // dark background -> light icons
    await sb.setBackgroundColor?.({ color: "#00000000" });
  } catch {
    /* status bar styling is cosmetic — never block startup */
  }
}
