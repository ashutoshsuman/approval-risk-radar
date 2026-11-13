import { Link } from "@tanstack/react-router";
import { DemoControls } from "./DemoControls";

const nav = [
  { to: "/", label: "Risk queue" },
  { to: "/drift", label: "Price drift" },
] as const;

export function AppHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-3 px-8 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded bg-primary text-xs font-semibold text-primary-foreground">AR</span>
          <span className="font-semibold tracking-tight">Approval Risk Radar</span>
          <span className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Concept · mock data</span>
        </div>
        <nav className="flex gap-1 text-sm">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
              className="rounded px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-muted text-foreground font-medium" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <DemoControls />
      </div>
    </header>
  );
}
