// The profile page: name, email, picture — plus the two ways out of LOIN.
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { DefaultAvatar } from "@/components/DefaultAvatar";
import { EyeToggle } from "@/components/EyeToggle";
import { ChalkFilters, ChalkButton, ChalkCard, DustParticles, Fireflies, GlassOrbs, Scribble } from "@/components/ChalkFX";
import { deleteAccount } from "@/lib/account.functions";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "loin" },
      { name: "description", content: "manage your loin name, picture and account." },
      { property: "og:title", content: "your profile · loin" },
      { property: "og:description", content: "manage your loin name, picture and account." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

function ProfilePage() {
  const { user, profile, avatarSrc, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setName(profile?.name ?? ""), [profile?.name]);

  async function saveName() {
    if (!user) return;
    setBusy(true);
    setNote(null);
    haptic("select");
    try {
      const cleanName = name.trim();
      if (!cleanName) throw new Error("Your name cannot be empty.");
      const { error: saveError } = await supabase.from("profiles").upsert({ id: user.id, name: cleanName });
      if (saveError) throw saveError;
      await refreshProfile();
      setNote("Name updated.");
    } catch (saveError) {
      setNote(saveError instanceof Error ? saveError.message : "Could not save your name.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file: File | null) {
    if (!file || !user) return;
    setNote(null);
    if (!file.type.startsWith("image/")) {
      setNote("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNote("Choose an image smaller than 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: saveError } = await supabase.from("profiles").upsert({ id: user.id, avatar_url: path });
      if (saveError) throw saveError;
      await refreshProfile();
      setNote("Picture updated.");
    } catch (uploadError) {
      setNote(uploadError instanceof Error ? uploadError.message : "Could not update your picture.");
    } finally {
      setBusy(false);
    }
  }

  async function reallyDelete() {
    setError(null);
    setBusy(true);
    try {
      const res = await deleteAccount({ data: { password: password || undefined } });
      if (!res.ok) {
        setError(res.error ?? "Could not delete the account.");
        return;
      }
      await signOut();
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden chalk-texture">
      <ChalkFilters />
      <DustParticles />
      <Fireflies count={12} />
      <GlassOrbs count={4} />
      <AppHeader />

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-7 sm:px-6 sm:py-10">
        <h1 className="font-sketch text-4xl leading-tight chalk-text chalk-glow">your profile</h1>
        <Scribble className="mt-2 w-48 text-chalk/60" />

        <div className="liquid-glass mt-6 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="press h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-chalk/40 chalk-glow-box"
              aria-label="Change your picture"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <DefaultAvatar size={80} seed={user?.id ?? ""} />
              )}
            </button>
            <div className="min-w-0">
              <div className="truncate font-sketch text-xl chalk-text">{profile?.name || "unnamed"}</div>
              <div className="truncate font-hand text-sm text-chalk-dim">{user?.email}</div>
              <div className="mt-1 font-hand text-sm text-chalk-faint">tap the picture to change it</div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => uploadAvatar(e.target.files?.[0] ?? null)}
            />
          </div>

          <label className="mt-7 block">
            <span className="font-hand text-xs uppercase tracking-[0.3em] text-chalk-faint">your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border-b-2 border-chalk/25 bg-transparent pb-1 font-sketch text-2xl text-chalk focus:border-chalk/70 focus:outline-none"
            />
          </label>

          {note && <p className="mt-4 font-hand text-base text-chalk-dim">{note}</p>}

          <ChalkButton className="press mt-5 w-full" disabled={busy} onClick={saveName}>
            {busy ? "working…" : "save changes"}
          </ChalkButton>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 font-hand text-base text-chalk-dim">
          <Link to="/privacy" className="press underline underline-offset-4 hover:text-chalk">privacy policy</Link>
          <span className="text-chalk/30">·</span>
          <Link to="/terms" className="press underline underline-offset-4 hover:text-chalk">terms &amp; conditions</Link>
        </div>

        <ChalkCard className="mt-8">
          <div className="font-sketch text-2xl chalk-text">leaving the board</div>
          <p className="mt-2 font-hand text-lg text-chalk-dim">
            Logging out keeps everything. Deleting erases every promise you've made — permanently.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <ChalkButton
              variant="ghost"
              className="press"
              onClick={async () => {
                haptic("select");
                await signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              log out
            </ChalkButton>
            <ChalkButton variant="ghost" className="press" onClick={() => setConfirming(true)}>
              delete account
            </ChalkButton>
          </div>

          {confirming && (
            <div className="mt-6 border-t border-chalk/15 pt-5 anim-step-in">
              <div className="font-sketch text-xl chalk-text">Are you sure?</div>
              <p className="mt-1 font-hand text-base text-chalk-dim">
                This cannot be undone. Enter your password to confirm (leave blank if you only ever
                signed in with Google).
              </p>
              <div className="mt-3 flex items-end gap-2 border-b-2 border-chalk/25 focus-within:border-chalk/70">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  className="w-full bg-transparent pb-1 font-sketch text-xl text-chalk placeholder:text-chalk-faint/60 focus:outline-none"
                />
                <EyeToggle
                  shown={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  className="mb-1"
                />
              </div>
              {error && <p className="mt-3 font-hand text-base text-chalk">{error}</p>}
              <div className="mt-4 flex gap-3">
                <ChalkButton className="press" disabled={busy} onClick={reallyDelete}>
                  {busy ? "erasing…" : "yes, delete everything"}
                </ChalkButton>
                <ChalkButton variant="ghost" className="press" onClick={() => setConfirming(false)}>
                  keep my account
                </ChalkButton>
              </div>
            </div>
          )}
        </ChalkCard>

        <div className="h-20" />
      </div>
    </div>
  );
}
