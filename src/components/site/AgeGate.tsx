import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "hype-age-confirmed";

export function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4 backdrop-blur">
      <div className="surface-panel glow-shadow w-full max-w-md p-8 text-center">
        <h2 className="font-display text-2xl font-bold">You must be 18 or older</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Hype offers platonic social company and DJ bookings at public venues. No sexual services,
          ever. Please confirm your age to continue.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            onClick={() => {
              window.localStorage.setItem(KEY, "yes");
              setShow(false);
            }}
          >
            I am 18 or older
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign("https://www.google.com")}>
            Leave this site
          </Button>
        </div>
      </div>
    </div>
  );
}
