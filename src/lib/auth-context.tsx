// Auth + profile state for the whole app. Client-only so it works identically in
// the browser and inside the Capacitor WebView.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setSessionStoreUserId } from "@/lib/session-store";

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  avatarSrc: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  loading: true,
  session: null,
  user: null,
  profile: null,
  avatarSrc: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(Ctx);
}

async function resolveAvatar(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", uid)
      .maybeSingle();
    if (data) {
      setProfile(data as Profile);
      setAvatarSrc(await resolveAvatar(data.avatar_url));
    } else {
      setProfile({ id: uid, name: "", avatar_url: null });
      setAvatarSrc(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    // Check for developer account in localStorage first
    const devAccount = localStorage.getItem("loin.dev.account");
    const devUserId = localStorage.getItem("loin.dev.user_id");

    if (devAccount && devUserId) {
      console.log("[Auth] Developer account detected:", devAccount);

      // Create mock session for developer account
      const mockUser: User = {
        id: devUserId,
        email: `${devAccount}@loin.local`,
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { isDev: true },
      };

      const mockSession: Session = {
        access_token: `mock-token-${devUserId}`,
        refresh_token: `mock-refresh-${devUserId}`,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: mockUser,
      };

      setSessionStoreUserId(devUserId);
      setSession(mockSession);
      setProfile({
        id: devUserId,
        name: devAccount === "loindeveloper01" ? "Developer 01" : "Developer 02",
        avatar_url: null,
      });
      setAvatarSrc(null);
      setLoading(false);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!alive) return;
      setSession(s);
      setSessionStoreUserId(s?.user.id ?? null);
      if (event === "SIGNED_OUT" || !s) {
        setProfile(null);
        setAvatarSrc(null);
        return;
      }
      // Never await inside the callback — defer the profile read.
      setTimeout(() => {
        if (alive) void loadProfile(s.user.id);
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setSessionStoreUserId(data.session?.user.id ?? null);
      if (data.session) {
        // Store user ID for data separation
        localStorage.setItem("loin.user_id", data.session.user.id);
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSessionStoreUserId(null);
    setSession(null);
    setProfile(null);
    setAvatarSrc(null);
    // Clear developer account flags and user ID
    localStorage.removeItem("loin.dev.account");
    localStorage.removeItem("loin.dev.user_id");
    localStorage.removeItem("loin.user_id");
  }, []);

  return (
    <Ctx.Provider
      value={{
        loading,
        session,
        user: session?.user ?? null,
        profile,
        avatarSrc,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
