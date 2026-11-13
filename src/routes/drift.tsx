import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo";
import { drift, driftAction, formatINR, formatDriftPercent, QUICK_REAPPROVE_LIMIT } from "@/lib/risk";
import { approvalLabel, approvalMessage, canApprove, canSubmitApproval } from "@/lib/request-workflow";

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
  const demo = useDemo();
  const { requests } = demo;
  const rows = requests.map((r) => ({ r, d: drift(r) })).filter((x) => x.d.inr > 0).sort((a, b) => b.d.pct - a.d.pct);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Price drift</h1>
        <p className="text-sm text-muted-foreground">Latest vendor price is higher than the approved amount. Up to {QUICK_REAPPROVE_LIMIT}% can be quickly re-approved.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(({ r, d }) => {
          const action = driftAction(d.pct);
          return (
            <div key={r.id} className="rounded-md border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link to="/request/$id" params={{ id: r.id }} className="font-medium hover:underline">{r.item}</Link>
                  <div className="font-mono text-xs text-muted-foreground">{r.id} · {r.department}</div>
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 font-mono text-xs font-medium ${action === "quick" ? "bg-warning text-warning-foreground" : "bg-destructive/10 text-destructive"}`}>+{formatDriftPercent(d.pct)}</span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <Cell label="Approved" value={formatINR(r.approvedAmount)} />
                <Cell label="Latest vendor price" value={formatINR(r.latestVendorPrice)} />
                <Cell label="Difference" value={`+${formatINR(d.inr)}`} strong />
              </dl>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <span className="text-xs text-muted-foreground">{r.status ?? (!canSubmitApproval(r) ? "Re-quote needed" : action === "quick" ? `Within ${QUICK_REAPPROVE_LIMIT}% threshold` : `Price rose more than ${QUICK_REAPPROVE_LIMIT}%; needs full re-approval at the new amount`)}</span>
                {action === "full" && <Button size="sm" variant="outline" disabled>Approve</Button>}
                <Button size="sm" className="h-auto min-h-8 whitespace-normal text-left" disabled={action === "quick" ? !canApprove(r) : !canSubmitApproval(r)}
                  onClick={() => {
                    if (action === "quick" ? !canApprove(r) : !canSubmitApproval(r)) return;
                    const label = action === "quick" ? approvalMessage(r) : `Sent for full re-approval at ${formatINR(r.latestVendorPrice)}`;
                    if (action === "quick") demo.approveRequest(r.id);
                    else demo.sendForFullApproval(r.id);
                    toast.success(`${r.id}: ${label}`);
                  }}>
                  {action === "quick" ? approvalLabel(r) : "Send for full re-approval"}
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
