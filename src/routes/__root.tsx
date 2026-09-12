import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth-context";
import { ChalkFilters, DustParticles, Fireflies } from "../components/ChalkFX";
import { SplashGate } from "../components/SplashScreen";
import { NativeShell } from "../components/NativeShell";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 chalk-texture">
      <ChalkFilters />
      <DustParticles />
      <Fireflies count={12} />
      <div className="liquid-glass relative z-10 max-w-lg px-8 py-12 text-center anim-step-in">
        <div className="mx-auto mb-6 w-56 text-chalk/60">
          <BrokenChain />
        </div>
        <h1 className="font-sketch text-7xl chalk-text chalk-glow">404</h1>
        <h2 className="mt-4 font-sketch text-2xl chalk-text">
          your chains broke and you wandered off too far.
        </h2>
        <p className="mt-3 font-hand text-lg text-chalk-dim">
          There's nothing to focus on out here. Not even a distraction. Just chalk dust.
        </p>
        <Link
          to="/"
          className="press liquid-glass-pill mt-8 inline-flex items-center gap-2 px-6 py-3 font-sketch text-xl text-chalk chalk-glow"
        >
          drag me back
        </Link>
      </div>
    </div>
  );
}

/** Snapped chalk chain — two dangling ends and a broken link between them. */
function BrokenChain() {
  return (
    <svg viewBox="0 0 220 40" className="w-full anim-sway" aria-hidden filter="url(#chalk-stroke)">
      <g fill="none" stroke="currentColor" strokeWidth="2.2">
        {[0, 1, 2, 3].map((i) => (
          <ellipse key={`l${i}`} cx={14 + i * 20} cy={20} rx={9} ry={i % 2 ? 4 : 6.5} />
        ))}
        <path d="M96 14 L 104 20 L 96 26" strokeLinecap="round" />
        <path d="M124 14 L 116 20 L 124 26" strokeLinecap="round" />
        {[0, 1, 2, 3].map((i) => (
          <ellipse key={`r${i}`} cx={140 + i * 20} cy={20} rx={9} ry={i % 2 ? 4 : 6.5} />
        ))}
      </g>
    </svg>
  );
}


function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  // Suppress harmless Capacitor plugin initialization errors and attempt auto-recovery
  if (error.message?.includes('triggerEvent')) {
    console.warn('Suppressed harmless Capacitor plugin initialization error - attempting auto-recovery');
    // Attempt to recover by resetting the error boundary
    setTimeout(() => {
      reset();
    }, 100);
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1a1a1a" },
      { title: "loin" },
      { name: "description", content: "a chalkboard focus companion. chain the phone, prove the work, or pay to escape." },
      { property: "og:title", content: "loin — lock in. focus deeply." },
      { property: "og:description", content: "chain the phone. prove the work. or pay to escape." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/loin-icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NativeShell />
        <SplashGate>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </SplashGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
