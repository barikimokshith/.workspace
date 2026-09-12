// Chalk-drawn eye / eye-off toggle. Purely visual: it never touches the value
// of the field it sits next to.
export function EyeToggle({
  shown,
  onToggle,
  className = "",
}: {
  shown: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      aria-pressed={shown}
      className={`press shrink-0 rounded-full p-1 text-chalk-faint transition hover:text-chalk ${className}`}
    >
      <svg viewBox="0 0 28 20" width="26" height="19" aria-hidden filter="url(#chalk-stroke)">
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M2 10c4-6 8-8 12-8s8 2 12 8c-4 6-8 8-12 8s-8-2-12-8z" />
          <circle cx="14" cy="10" r="3.4" />
          {!shown && <path d="M4 18 L24 2" strokeWidth="2" />}
        </g>
      </svg>
    </button>
  );
}
