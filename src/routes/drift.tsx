import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo";
import { drift, driftAction, formatINR } from "@/lib/risk";
import { setDecision, useDecisions } from "@/lib/decisions";
import { canApprove } from "@/lib/request-workflow";

export const Route = createFileRoute("/drift")({
  head: () => ({
    meta: [
      { title: "Price drift · Approval Risk Radar" },
      { name: "description", content: "Requests where the vendor price rose above the approved amount." },
      { property: "og:title", content: "Price drift · Approval Risk Radar" },
      { property: "og:description", content: "Requests where the vendor price rose above the approved amount." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Drift,
});

function Drift() {
  const decisions = useDecisions();
  const demo = useDemo();
  const { requests } = demo;
  const rows = requests.map((r) => ({ r, d: drift(r) })).filter((x) => x.d.inr > 0).sort((a, b) => b.d.pct - a.d.pct);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Price drift</h1>
        <p className="text-sm text-muted-foreground">Latest vendor price is higher than the approved amount. Up to 10% can be quickly re-approved.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {rows.map(({ r, d }) => {
          const action = driftAction(d.pct);
          const done = decisions[r.id];
          return (
            <div key={r.id} className="rounded-md border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link to="/request/$id" params={{ id: r.id }} className="font-medium hover:underline">{r.item}</Link>
                  <div className="font-mono text-xs text-muted-foreground">{r.id} · {r.department}</div>
                </div>
                <span className={`rounded px-2 py-0.5 font-mono text-xs font-medium ${action === "quick" ? "bg-warning text-warning-foreground" : "bg-destructive/10 text-destructive"}`}>+{d.pct.toFixed(1)}%</span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <Cell label="Approved" value={formatINR(r.approvedAmount)} />
                <Cell label="Latest vendor price" value={formatINR(r.latestVendorPrice)} />
                <Cell label="Difference" value={`+${formatINR(d.inr)}`} strong />
              </dl>
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <span className="text-xs text-muted-foreground">{!canApprove(r) ? r.status ?? "Re-quote needed" : done ?? (action === "quick" ? "Within 10% threshold" : "Exceeds 10% threshold")}</span>
                <Button size="sm" variant={action === "quick" ? "default" : "outline"} disabled={!canApprove(r) || !!done}
                  onClick={() => {
                    if (!canApprove(r)) return;
                    const label = action === "quick" ? `Difference of ${formatINR(d.inr)} re-approved` : "Sent back for full approval";
                    setDecision(r.id, label);
                    demo.recordHistory(r.id, label);
                    toast.success(`${r.id}: ${label}`);
                  }}>
                  {action === "quick" ? "Quick re-approve the difference" : "Send back for full approval"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {!rows.length && <p className="text-sm text-muted-foreground">No requests with price increases.</p>}
    </div>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded bg-muted/60 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-mono ${strong ? "font-semibold text-destructive" : ""}`}>{value}</dd>
    </div>
  );
}
