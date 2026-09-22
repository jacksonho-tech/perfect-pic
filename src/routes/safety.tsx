import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/site/ContentPage";
import { SAFETY_FALLBACK } from "@/lib/legal";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety — Hype" },
      {
        name: "description",
        content: "Safety tips for Hype bookings: public venues, tell a friend, leave if uncomfortable.",
      },
      { property: "og:title", content: "Safety — Hype" },
      { property: "og:description", content: "Safety tips and our promise to everyone booking." },
    ],
  }),
  component: () => (
    <ContentPage
      title="Safety"
      settingKey="safety_text"
      intro="Read this before your first night out with us."
      fallback={SAFETY_FALLBACK}
    />
  ),
});
