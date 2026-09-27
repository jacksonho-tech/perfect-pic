import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/generate-bio")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          displayName?: string;
          tags?: string[];
          languages?: string[];
          genres?: string[];
        } | null;

        if (!body?.displayName || typeof body.displayName !== "string") {
          return json({ error: "Missing name" }, 400);
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ error: "AI is not configured" }, 500);

        const clean = (arr?: string[]) =>
          (arr ?? [])
            .filter((s) => typeof s === "string")
            .map((s) => s.slice(0, 40))
            .slice(0, 10)
            .join(", ");

        const prompt = [
          `Write a short profile bio (60-90 words) for "${body.displayName.slice(0, 60)}",`,
          "a social companion on a Hong Kong nightlife booking platform.",
          "Strictly platonic company for bars, parties and DJ sets: never romantic, sexual or suggestive.",
          "Warm, classy, confident tone. First person. No emojis, no hashtags.",
          "Do not encourage heavy drinking.",
          clean(body.tags) && `Personality tags: ${clean(body.tags)}.`,
          clean(body.languages) && `Languages: ${clean(body.languages)}.`,
          clean(body.genres) && `Music genres: ${clean(body.genres)}.`,
        ]
          .filter(Boolean)
          .join(" ");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            reasoning_effort: "low",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (res.status === 429) return json({ error: "Too many requests, try again shortly" }, 429);
        if (!res.ok) return json({ error: "The writer is unavailable right now" }, 502);

        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const bio = data.choices?.[0]?.message?.content?.trim();
        if (!bio) return json({ error: "No draft was produced" }, 502);
        return json({ bio });
      },
    },
  },
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
