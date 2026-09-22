import { useSettings } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export function ContentPage({
  title,
  settingKey,
  intro,
  fallback,
}: {
  title: string;
  settingKey: string;
  intro?: string;
  fallback: string;
}) {
  const { data, isLoading } = useSettings();
  const text = data?.[settingKey] ?? fallback;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold md:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-sm text-muted-foreground">{intro}</p>}
      <div className="surface-panel mt-8 space-y-4 p-6 text-sm leading-relaxed text-muted-foreground">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          text.split("\n").map((line, i) =>
            line.trim() ? (
              <p key={i} className="whitespace-pre-wrap">
                {line}
              </p>
            ) : null,
          )
        )}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        The owner can edit this page text in the admin area.
      </p>
    </div>
  );
}
