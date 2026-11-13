import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requests } from "@/lib/requests";
import { formatINR, riskQueue } from "@/lib/risk";
import { useDecisions } from "@/lib/decisions";
import { ReasonChip } from "@/components/ReasonChip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Risk queue · Approval Risk Radar" },
      { name: "description", content: "Pending purchase requests ranked by money at risk." },
      { property: "og:title", content: "Risk queue · Approval Risk Radar" },
      { property: "og:description", content: "Pending purchase requests ranked by money at risk." },
    ],
  }),
  component: RiskQueue,
});

function RiskQueue() {
  const navigate = useNavigate();
  const decisions = useDecisions();
  const queue = riskQueue(requests);
  const total = queue.reduce((s, q) => s + q.risk.moneyAtRisk, 0);
  const flagged = queue.filter((q) => q.risk.moneyAtRisk > 0).length;

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[26rem] flex-col gap-6">
      <div className="flex shrink-0 items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risk queue</h1>
          <p className="text-sm text-muted-foreground">Pending requests sorted by money at risk. Click a row for the approver brief.</p>
        </div>
        <div className="flex gap-3">
          <Stat label="Money at risk" value={formatINR(total)} />
          <Stat label="Requests at risk" value={`${flagged} of ${queue.length}`} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {["Request", "Department", "Approver", "Stage", "Pending", "Amount", "Money at risk", "Why"].map((h, i) => (
                <th key={h} className={`sticky top-0 bg-muted px-4 py-3 font-medium ${i === 0 ? "left-0 z-30 border-r" : "z-10"} ${i === 4 || i === 5 || i === 6 ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {queue.map(({ request: r, risk }) => (
              <tr key={r.id} onClick={() => navigate({ to: "/request/$id", params: { id: r.id } })}
                className="group cursor-pointer border-t hover:bg-accent/50">
                <td className="sticky left-0 z-10 border-r bg-card">
                  <div className="px-4 py-3 group-hover:bg-accent/50">
                    <div className="font-medium">{r.item}</div>
                    <div className="font-mono text-xs text-muted-foreground">{r.id} · {r.requester}{decisions[r.id] ? ` · ${decisions[r.id]}` : ""}</div>
                  </div>
                </td>
                <td className="px-4 py-3">{r.department}</td>
                <td className="px-4 py-3"><div>{r.approver.name}</div><div className="text-xs text-muted-foreground">{r.approver.role}</div></td>
                <td className="px-4 py-3">{r.stage}</td>
                <td className="px-4 py-3 text-right font-mono">{r.daysPending}d</td>
                <td className="px-4 py-3 text-right font-mono">{formatINR(r.amount)}</td>
                <td className={`px-4 py-3 text-right font-mono font-medium ${risk.moneyAtRisk ? "text-destructive" : "text-muted-foreground"}`}>{formatINR(risk.moneyAtRisk)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {risk.reasons.length ? risk.reasons.map((t) => <ReasonChip key={t} text={t} />) : <span className="text-xs text-muted-foreground">No risk detected</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">Money at risk = vendor price above the approved amount, plus the full amount when the quote expires within 7 days or a renewal lapses within 14 days.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card px-4 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-lg font-medium">{value}</div>
    </div>
  );
}
