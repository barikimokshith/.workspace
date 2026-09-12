// Nothing in LOIN is visible without an account. This gate holds the door.
import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { LockAnimation } from "@/components/SplashScreen";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LockAnimation />
      </div>
    );
  }

  return <>{children}</>;
}
