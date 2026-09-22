import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/site/ContentPage";
import { FAQ_FALLBACK } from "@/lib/legal";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Hype" },
      { name: "description", content: "Common questions about booking companions and DJs on Hype." },
      { property: "og:title", content: "FAQ — Hype" },
      { property: "og:description", content: "Common questions about booking on Hype." },
    ],
  }),
  component: () => <ContentPage title="FAQ" settingKey="faq_text" fallback={FAQ_FALLBACK} />,
});
