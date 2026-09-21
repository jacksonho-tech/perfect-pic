import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-bold">
            <span className="text-gradient-warm">HYPE</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Platonic social company and DJs for nights out in Hong Kong. 18+ only, public venues
            only.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">Explore</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/companions">Companions</Link>
            </li>
            <li>
              <Link to="/djs">Book a DJ</Link>
            </li>
            <li>
              <Link to="/faq">FAQ</Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">Legal</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/terms">Terms</Link>
            </li>
            <li>
              <Link to="/privacy">Privacy</Link>
            </li>
            <li>
              <Link to="/safety">Safety</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Hype. Social companionship only. No sexual services.
      </div>
    </footer>
  );
}
