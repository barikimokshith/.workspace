// LOIN's two signature sounds. Preloaded lazily, played at most once per call,
// and completely optional — a muted device never blocks anything.

const SOURCES = {
  "lock-click": "/sounds/lock-click.mp3",
  "session-complete": "/sounds/session-complete.mp3",
} as const;

export type SoundName = keyof typeof SOURCES;

const cache = new Map<SoundName, HTMLAudioElement>();

/** Warm the buffer so playback is instant and never blocks first paint. */
export function preloadSound(name: SoundName) {
  if (typeof window === "undefined" || cache.has(name)) return;
  try {
    const audio = new Audio(SOURCES[name]);
    audio.preload = "auto";
    audio.load();
    cache.set(name, audio);
  } catch {
    /* audio unavailable — the app works exactly the same without it */
  }
}

export function playSound(name: SoundName, volume = 0.65) {
  if (typeof window === "undefined") return;
  try {
    preloadSound(name);
    const base = cache.get(name);
    if (!base) return;
    // Clone so a rapid second call can never cut the first one off mid-tail.
    const node = base.cloneNode(true) as HTMLAudioElement;
    node.volume = volume;
    node.currentTime = 0;
    void node.play().catch(() => {});
  } catch {
    /* muted / blocked autoplay — intentionally silent */
  }
}
