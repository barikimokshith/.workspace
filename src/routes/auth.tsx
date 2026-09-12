// The door. Nothing inside LOIN is visible until a member walks through it.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  ChalkFilters,
  ChalkButton,
  DustParticles,
  Fireflies,
  GlassOrbs,
  Scribble,
} from "@/components/ChalkFX";
import { DefaultAvatar } from "@/components/DefaultAvatar";
import { LockDoodle } from "@/components/ChalkIcons";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "loin" },
      {
        name: "description",
        content:
          "Create your LOIN account to start locking in. Your sessions, streaks and ledger follow the account everywhere.",
      },
      { property: "og:title", content: "loin" },
      { property: "og:description", content: "sign the board. then lock in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signup" | "login" | "otp";

/** Whole years between a YYYY-MM-DD birthdate and today. */
function yearsSince(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NaN;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signup");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [birthdate, setBirthdate] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devId, setDevId] = useState("");

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  function pickAvatar(f: File | null) {
    setAvatarFile(f);
    setAvatarPreview(f ? URL.createObjectURL(f) : null);
  }

  async function finishProfile(userId: string) {
    let avatarPath: string | null = null;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile);
      if (!upErr) avatarPath = path;
    }
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      name: name.trim(),
      ...(birthdate ? { birthdate } : {}),
      ...(avatarPath ? { avatar_url: avatarPath } : {}),
    });
    if (profileError) throw profileError;
  }

  async function sendOtp() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      let formattedPhone = phone.trim();

      if (!formattedPhone) throw new Error("Enter your phone number first.");

      // Auto-format Indian phone numbers if user doesn't include country code
      if (!formattedPhone.startsWith("+")) {
        // If it starts with 91, add + prefix
        if (formattedPhone.startsWith("91")) {
          formattedPhone = "+" + formattedPhone;
        } else {
          // Assume Indian number, add +91
          formattedPhone = "+91" + formattedPhone;
        }
      }

      // Remove spaces, dashes, and parentheses
      formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, "");

      // Basic phone validation - should be 10-15 digits with country code
      if (!/^\+\d{10,15}$/.test(formattedPhone)) {
        throw new Error("Enter a valid phone number with country code (e.g., +91 9876543210).");
      }

      const { error: e } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (e) {
        // If the error is about SMS provider not being configured, give helpful guidance
        if (e.message?.includes("SMS provider") || e.message?.includes("service provider")) {
          throw new Error(
            "SMS service is not configured. Please configure an SMS provider in your Supabase project settings.",
          );
        }
        throw e;
      }

      setPendingPhone(formattedPhone);
      setMode("otp");
      setNotice(`We sent a code to ${formattedPhone}. Enter it below to continue.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong sending the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const formattedPhone = (pendingPhone || phone).trim();
      const formattedOtp = otp.trim();

      if (!formattedPhone) throw new Error("Phone number is missing.");
      if (!formattedOtp) throw new Error("Enter the code we sent you.");

      const { data, error: e } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: formattedOtp,
        type: "sms",
      });

      if (e) throw e;

      if (data.session && data.user) {
        // For new users, check if profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (!profile) {
          // New user - create profile
          await finishProfile(data.user.id);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Write your name on the board first.");
        if (!birthdate) throw new Error("Add your date of birth.");
        const age = yearsSince(birthdate);
        if (!Number.isFinite(age)) throw new Error("That date of birth doesn't look right.");
        if (age < 13)
          throw new Error(
            "You need to be at least 13 to use LOIN. Come back when the board is yours to sign.",
          );

        // Store signup data and move to phone verification
        try {
          localStorage.setItem("loin.pending.name", name.trim());
          localStorage.setItem("loin.pending.birthdate", birthdate);
        } catch {
          /* private mode — we'll handle this in profile completion */
        }

        await sendOtp();
      } else {
        // Login mode - just send OTP
        await sendOtp();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    const target = (pendingPhone || phone).trim();
    if (!target) {
      setError("Enter your phone number first.");
      return;
    }
    setError(null);
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithOtp({
      phone: target,
    });
    setBusy(false);
    if (e) setError(e.message);
    else setNotice(`Sent a new code to ${target}. It can take a minute.`);
  }

  async function handleDevLogin() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const formattedDevId = devId.trim();

      console.log("Developer login attempt with ID:", formattedDevId);

      if (!formattedDevId) throw new Error("Enter developer ID.");
      if (formattedDevId !== "loindeveloper01" && formattedDevId !== "loindeveloper02") {
        throw new Error("Invalid developer ID.");
      }

      // Create mock user object for developer accounts
      const mockUserId = formattedDevId === "loindeveloper01" ? "dev-user-01" : "dev-user-02";

      const mockUser = {
        id: mockUserId,
        email: `${formattedDevId}@loin.local`,
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create mock session
      const mockSession = {
        access_token: `mock-token-${mockUserId}`,
        refresh_token: `mock-refresh-${mockUserId}`,
        user: mockUser,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
      };

      // Store developer flag in localStorage FIRST
      localStorage.setItem("loin.dev.account", formattedDevId);
      localStorage.setItem("loin.dev.user_id", mockUserId);
      localStorage.setItem("loin.user_id", mockUserId);

      // Set the mock session in Supabase auth
      await supabase.auth.setSession({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
      });

      console.log("Developer login successful:", mockUserId);

      setNotice(`Developer account logged in successfully.`);
      setShowDevLogin(false);

      // Force a full page reload to trigger auth context to detect the new session
      window.location.reload();
    } catch (e) {
      console.error("Developer login failed:", e);
      setError(e instanceof Error ? e.message : "Developer login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden chalk-texture">
      <ChalkFilters />
      <DustParticles />
      <Fireflies count={14} />
      <GlassOrbs count={5} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 pb-10 pt-[calc(3rem+env(safe-area-inset-top))] sm:px-6 sm:pb-14">
        <div className="flex items-center gap-3 anim-flicker">
          <LockDoodle size={38} className="text-chalk anim-sway" />
          <div>
            <div className="font-sketch text-2xl tracking-widest chalk-text">LOIN</div>
            <div className="-mt-1 font-hand text-xs text-chalk-faint">lock in.</div>
          </div>
        </div>

        <h1 className="mt-6 font-sketch text-4xl leading-tight chalk-text chalk-glow md:text-6xl">
          {mode === "otp" ? (
            <>
              enter the code.
              <br />
              then lock in.
            </>
          ) : mode === "signup" ? (
            <>
              sign the board.
              <br />
              then lock in.
            </>
          ) : (
            <>
              welcome back.
              <br />
              pick up the chalk.
            </>
          )}
        </h1>
        <Scribble className="mt-2 w-52 text-chalk/50" />
        <p className="mt-3 font-hand text-base leading-relaxed text-chalk-dim">
          {mode === "otp"
            ? "Check your messages for the code we sent."
            : mode === "signup"
              ? "An account keeps every promise you make — sessions, streaks and the ledger follow you."
              : "Your board is exactly where you left it."}
        </p>

        <div className="liquid-glass mt-6 p-4 anim-step-in sm:p-6">
          {mode === "signup" && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="press h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-chalk/40 chalk-glow-box"
                aria-label="Choose a profile picture"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <DefaultAvatar size={64} seed={name || phone} />
                )}
              </button>
              <div className="font-hand text-sm text-chalk-faint">
                picture is optional — leave it and you'll get one of our chalk-dust gradients.
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {mode === "signup" && <Field label="your name" value={name} onChange={setName} />}

          {mode === "signup" && (
            <Field label="date of birth" value={birthdate} onChange={setBirthdate} type="date" />
          )}

          {mode !== "otp" && (
            <Field
              label="phone number"
              value={phone}
              onChange={setPhone}
              type="tel"
              placeholder="+91 98765 43210"
            />
          )}

          {mode === "otp" && (
            <Field
              label="verification code"
              value={otp}
              onChange={setOtp}
              type="text"
              placeholder="123456"
              maxLength={6}
            />
          )}

          {error && <p className="mt-4 font-hand text-base text-chalk">{error}</p>}
          {notice && <p className="mt-4 font-hand text-base text-chalk-dim">{notice}</p>}

          {mode === "otp" && (
            <button
              onClick={resendOtp}
              disabled={busy}
              className="press mt-3 font-hand text-sm text-chalk-faint underline underline-offset-4 hover:text-chalk"
            >
              resend code
            </button>
          )}

          <ChalkButton
            className="press mt-5 w-full"
            disabled={busy}
            onClick={mode === "otp" ? verifyOtp : submit}
          >
            {busy
              ? "drawing the chains…"
              : mode === "otp"
                ? "verify and continue"
                : mode === "signup"
                  ? "send verification code"
                  : "send code"}
          </ChalkButton>

          {!showDevLogin && (
            <button
              onClick={() => setShowDevLogin(true)}
              className="press mt-3 font-hand text-xs text-chalk-faint underline underline-offset-4 hover:text-chalk"
            >
              developer login
            </button>
          )}

          {showDevLogin && (
            <div className="mt-4 border-2 border-chalk/40 p-4 anim-step-in">
              <h4 className="font-sketch text-lg chalk-text mb-2">Developer Login</h4>
              <Field
                label="developer id"
                value={devId}
                onChange={setDevId}
                type="text"
                placeholder=""
              />
              <div className="mt-3 flex gap-2">
                <ChalkButton className="press flex-1" disabled={busy} onClick={handleDevLogin}>
                  {busy ? "logging in…" : "log in"}
                </ChalkButton>
                <ChalkButton
                  variant="ghost"
                  className="press"
                  disabled={busy}
                  onClick={() => setShowDevLogin(false)}
                >
                  cancel
                </ChalkButton>
              </div>
            </div>
          )}

          {mode === "otp" && (
            <button
              onClick={() => {
                setMode("signup");
                setPendingPhone(null);
                setOtp("");
                setError(null);
              }}
              className="press mt-4 w-full font-hand text-base text-chalk-faint underline underline-offset-4 hover:text-chalk"
            >
              back to sign up
            </button>
          )}

          {mode !== "otp" && (
            <button
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError(null);
              }}
              className="press mt-6 w-full font-hand text-base text-chalk-faint underline underline-offset-4 hover:text-chalk"
            >
              {mode === "signup"
                ? "already have an account? log in"
                : "new here? create an account"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="mt-5 block">
      <span className="font-hand text-xs uppercase tracking-[0.3em] text-chalk-faint">{label}</span>
      <div className="mt-1 flex items-end gap-2 border-b-2 border-chalk/25 transition focus-within:border-chalk/70">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full bg-transparent pb-1 font-sketch text-2xl text-chalk focus:outline-none placeholder:text-chalk/30"
        />
      </div>
    </label>
  );
}
