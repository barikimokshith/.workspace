import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY_POLICY } from "@/lib/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "loin" },
      {
        name: "description",
        content:
          "How LOIN collects, uses and protects your account, goals, proof submissions and focus session data.",
      },
      { property: "og:title", content: "privacy policy · loin" },
      { property: "og:description", content: "your discipline is yours. your privacy is too." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <LegalPage doc={PRIVACY_POLICY} />,
});
