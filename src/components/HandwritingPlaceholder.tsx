// Handwritten, ever-changing placeholder. Types a commitment out like chalk on a
// board, holds long enough to read, then wipes and writes the next one.
import { useEffect, useRef, useState } from "react";
import { GOAL_EXAMPLES } from "@/lib/goal-placeholders";

const TYPE_MS = 26;
const HOLD_MS = 2600;
const WIPE_MS = 12;

export function HandwritingPlaceholder({ className = "" }: { className?: string }) {
  const [text, setText] = useState("");
  const idx = useRef(Math.floor(Math.random() * GOAL_EXAMPLES.length));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const full = () => GOAL_EXAMPLES[idx.current % GOAL_EXAMPLES.length];

    function schedule(fn: () => void, ms: number) {
      timer.current = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    }

    function type(i: number) {
      const line = full();
      if (i > line.length) {
        schedule(() => wipe(line.length), HOLD_MS);
        return;
      }
      setText(line.slice(0, i));
      schedule(() => type(i + 1), TYPE_MS);
    }

    function wipe(i: number) {
      if (i <= 0) {
        idx.current += 1;
        schedule(() => type(1), 260);
        return;
      }
      setText(full().slice(0, i - 1));
      schedule(() => wipe(i - 1), WIPE_MS);
    }

    type(1);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <span className={className} aria-hidden>
      {text}
      <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] bg-chalk/50 anim-breathe" />
    </span>
  );
}
