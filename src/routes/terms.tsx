import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { TERMS } from "@/lib/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "loin" },
      {
        name: "description",
        content:
          "The terms that govern LOIN focus sessions, AI verification, Pay to Escape, Android permissions and account use.",
      },
      { property: "og:title", content: "terms & conditions · loin" },
      { property: "og:description", content: "every session is a promise. every promise is yours to keep." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <LegalPage doc={TERMS} />,
});
