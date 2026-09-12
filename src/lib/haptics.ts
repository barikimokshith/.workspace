// Tiny native-feeling haptics. Uses the Web Vibration API, which Capacitor's
// Android WebView supports out of the box — no plugin required. Silent no-op on
// desktop and iOS Safari.

type Pattern = "select" | "commit" | "lock" | "complete";

const PATTERNS: Record<Pattern, number | number[]> = {
  /** very light — choosing a card / toggling an app */
  select: 8,
  /** light-to-medium — pressing LOCK ME IN */
  commit: [14, 40, 22],
  /** light — the lock closing */
  lock: 18,
  /** gentle — the session completing */
  complete: [12, 70, 16, 60, 24],
};

export function haptic(pattern: Pattern = "select") {
  if (typeof navigator === "undefined") return;
  const vibrate = navigator.vibrate?.bind(navigator);
  if (!vibrate) return;
  try {
    vibrate(PATTERNS[pattern]);
  } catch {
    /* some WebViews reject vibrate without a gesture — never break the flow */
  }
}
