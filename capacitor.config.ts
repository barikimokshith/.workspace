import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.loin.focus",
  appName: "loin",
  // `npm run build` writes the prerendered, hydrating app here.
  webDir: ".output/public",
  android: {
    backgroundColor: "#000000",
  },
  server: {
    // Keep the WebView on bundled assets; the generated server-function client
    // is pointed at the deployed TanStack server during the production build.
    androidScheme: "https",
    cleartext: false,
  },
  // Suppress Capacitor internal errors on Android
  loggingBehavior: "production",
};

export default config;
