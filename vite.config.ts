// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Post-build: invoke the compiled server bundle in-process to render each route to
// static HTML, then write it into .output/public/. Capacitor's WebView loads these
// files directly with zero server runtime, and TanStack Router hydrates on top so
// every animation, route, and interaction keeps working. Lovable's dev/preview and
// publish pipeline are unaffected — this only runs during production builds.
const ROUTES = [
  "/",
  "/lock",
  "/auth",
  "/profile",
  "/privacy",
  "/terms",
  "/oauth-callback",
];

function prerenderRoutesForCapacitor() {
  return {
    name: "loin:prerender-routes-for-capacitor",
    apply: "build" as const,
    closeBundle: {
      order: "post" as const,
      async handler() {
        const serverEntry = resolve(process.cwd(), ".output/server/index.mjs");
        const clientDir = resolve(process.cwd(), ".output/public");
        if (!existsSync(serverEntry) || !existsSync(clientDir)) return;

        const mod = await import(pathToFileURL(serverEntry).toString());
        const server = (mod.default ?? mod) as {
          fetch: (req: Request, env: unknown, ctx: unknown) => Promise<Response>;
        };
        // Cloudflare-preset augmentReq expects an env + a waitUntil-bearing ctx.
        const env = { ASSETS: null };
        const ctx = { context: { waitUntil: () => {} }, waitUntil: () => {} };

        for (const path of ROUTES) {
          try {
            const res = await server.fetch(new Request(`http://localhost${path}`), env, ctx);
            if (!res.ok) {
              console.warn(`[loin prerender] ${path} → ${res.status}, skipping`);
              continue;
            }
            // TanStack's dehydrated route IDs contain NUL separators. A raw
            // U+0000 inside an inline script is replaced by HTML parsers on
            // older WebViews, corrupting $_TSR bootstrap data and causing the
            // production-only "Invariant failed" hydration crash. Preserve it
            // as a JavaScript escape instead of emitting the raw byte.
            const html = (await res.text()).replace(/\u0000/g, "\\u0000");
            const outFile =
              path === "/"
                ? resolve(clientDir, "index.html")
                : resolve(clientDir, `${path.slice(1)}/index.html`);
            mkdirSync(resolve(outFile, ".."), { recursive: true });
            writeFileSync(outFile, html);
            console.log(`[loin prerender] wrote ${outFile.replace(process.cwd() + "/", "")}`);
          } catch (err) {
            console.warn(`[loin prerender] ${path} failed:`, (err as Error).message);
          }
        }

        // Capacitor refuses to sync without this file, so fail loudly at build
        // time rather than later during `npx cap sync android`.
        if (!existsSync(resolve(clientDir, "index.html"))) {
          throw new Error(
            "[loin prerender] .output/public/index.html was not produced — Capacitor sync would fail.",
          );
        }

        // Capacitor is a static client, while TanStack server functions require
        // the deployed Lovable server. Keep the existing server-function
        // architecture, but only rewrite the generated client RPC base.
        const assetDir = resolve(clientDir, "assets");
        const serverFnOrigin = "https://lockinloin.lovable.app/_serverFn/";
        for (const file of readdirSync(assetDir)) {
          if (!file.endsWith(".js")) continue;
          const assetFile = resolve(assetDir, file);
          const source = readFileSync(assetFile, "utf8");
          const rewritten = source.replace(/\/_serverFn\//g, serverFnOrigin);
          if (rewritten !== source) writeFileSync(assetFile, rewritten);
        }
      },
    },
  };
}

export default defineConfig({

  vite: {

    build: {

      // Poco's WebView reported Chromium 81. es2018 avoids emitting optional
      // chaining/nullish coalescing and other newer syntax into its production
      // bundle. Runtime fallbacks live in src/start.ts and src/lib/ids.ts.
      target: "es2018",
      esbuild: {
        define: { global: "globalThis" },
        supported: {
          bigint: false,
        },
      },

    },

    plugins: [prerenderRoutesForCapacitor()],

  },

});
