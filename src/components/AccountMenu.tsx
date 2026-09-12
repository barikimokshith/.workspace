// Account control in the top-right corner: avatar, name, picture, sign out.
// The dropdown is portalled to <body> so no header stacking context (backdrop
// blur, transforms) can ever trap it behind the page.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DefaultAvatar } from "@/components/DefaultAvatar";
import { ChalkButton } from "@/components/ChalkFX";

export function AccountMenu() {
  const { user, profile, avatarSrc, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 76, right: 24 });
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setName(profile?.name ?? ""), [profile?.name]);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 12, right: Math.max(12, window.innerWidth - r.right) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) return null;

  async function saveName() {
    if (!user) return;
    setBusy(true);
    await supabase.from("profiles").update({ name: name.trim() }).eq("id", user.id);
    await refreshProfile();
    setBusy(false);
    setEditing(false);
  }

  async function uploadAvatar(file: File | null) {
    if (!file || !user) return;
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      await refreshProfile();
    }
    setBusy(false);
  }

  const label = profile?.name?.trim() || user.email || "member";

  const panel = (
    <div
      ref={panelRef}
      style={{ top: pos.top, right: pos.right }}
      className="fixed z-[9999] w-72 rounded-[18px] border border-chalk/25 bg-[#0b0b0b] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.85)] chalk-texture anim-step-in"
    >


          <div className="font-hand text-xs uppercase tracking-[0.3em] text-chalk-faint">signed in as</div>
          <div className="mt-1 truncate font-sketch text-xl chalk-text">{label}</div>

          {editing ? (
            <div className="mt-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="your name"
                className="w-full border-b border-chalk/30 bg-transparent pb-1 font-sketch text-lg text-chalk placeholder:text-chalk-faint/60 focus:outline-none"
              />
              <div className="mt-3 flex gap-2">
                <ChalkButton className="press !px-4 !py-2 !text-base" disabled={busy} onClick={saveName}>
                  save
                </ChalkButton>
                <ChalkButton
                  variant="ghost"
                  className="press !px-4 !py-2 !text-base"
                  onClick={() => setEditing(false)}
                >
                  cancel
                </ChalkButton>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-1">
              <MenuItem onClick={() => { setOpen(false); navigate({ to: "/profile" }); }}>profile</MenuItem>
              <MenuItem onClick={() => fileRef.current?.click()} disabled={busy}>
                {busy ? "working…" : "change picture"}
              </MenuItem>
              <MenuItem onClick={() => setEditing(true)}>change name</MenuItem>
              <MenuItem onClick={() => { setOpen(false); navigate({ to: "/privacy" }); }}>privacy policy</MenuItem>
              <MenuItem onClick={() => { setOpen(false); navigate({ to: "/terms" }); }}>terms and conditions</MenuItem>
              <MenuItem
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/auth", replace: true });
                }}
              >
                log out
              </MenuItem>
            </div>
          )}


          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => uploadAvatar(e.target.files?.[0] ?? null)}
          />
    </div>
  );

  return (
    <div ref={wrapRef} className="relative z-[100]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        className="press block h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-chalk/40 chalk-glow-box"
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt="" width={44} height={44} className="h-full w-full object-cover" />
        ) : (
          <DefaultAvatar size={44} seed={user.id} />
        )}
      </button>
      {open && typeof document !== "undefined" && createPortal(panel, document.body)}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="press block w-full border-b border-chalk/10 py-2 text-left font-hand text-lg text-chalk-dim hover:text-chalk disabled:opacity-40"
    >
      {children}
    </button>
  );
}
