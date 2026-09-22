import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/site/ContentPage";
import { PRIVACY_FALLBACK } from "@/lib/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Hype" },
      { name: "description", content: "How Hype handles your data and ID documents." },
      { property: "og:title", content: "Privacy — Hype" },
      { property: "og:description", content: "How Hype handles your data and ID documents." },
    ],
  }),
  component: () => (
    <ContentPage title="Privacy" settingKey="privacy_text" fallback={PRIVACY_FALLBACK} />
  ),
});
