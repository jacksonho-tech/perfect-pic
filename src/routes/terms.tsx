import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/site/ContentPage";
import { TERMS_FALLBACK } from "@/lib/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of use — Hype" },
      {
        name: "description",
        content:
          "Hype terms: 18+ only, platonic social companionship only, no sexual services, public venues only.",
      },
      { property: "og:title", content: "Terms of use — Hype" },
      { property: "og:description", content: "The rules for booking on Hype." },
    ],
  }),
  component: () => (
    <ContentPage
      title="Terms of use"
      settingKey="terms_text"
      intro="18+ only. Platonic social companionship only. Public venues only."
      fallback={TERMS_FALLBACK}
    />
  ),
});
