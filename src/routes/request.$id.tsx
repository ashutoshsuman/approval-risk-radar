import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getRequest } from "@/lib/requests";
import { assessRisk, driftAction, formatINR } from "@/lib/risk";
import { setDecision, useDecisions } from "@/lib/decisions";
import { generateBrief } from "@/lib/brief.functions";
import { ReasonChip } from "@/components/ReasonChip";

export const Route = createFileRoute("/request/$id")({
  loader: ({ params }) => {
    const r = getRequest(params.id);
    if (!r) throw notFound();
    return { request: r };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.request.id} brief · Approval Risk Radar` : "Request · Approval Risk Radar";
    const d = loaderData ? `Approver brief for ${loaderData.request.item}.` : "Approver brief.";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] };
  },
  component: Brief,
});

const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Brief() {
  const { request: r } = Route.useLoaderData();
  const risk = assessRisk(r);
  const decision = useDecisions()[r.id];
  const fn = useServerFn(generateBrief);
  const summary = useQuery({ queryKey: ["brief", r.id], queryFn: () => fn({ data: { id: r.id } }), staleTime: Infinity, retry: false });
  const [dialog, setDialog] = useState<null | "ask" | "delegate">(null);
  const [text, setText] = useState("");

  const fallback = `${r.department} is requesting ${r.item.toLowerCase()}. ${r.justification}`;
  const consequences: string[] = [];
  if (risk.quoteFlag) consequences.push(`The quote expires on ${fmtDate(r.quoteValidUntil)} (${risk.quoteDays} days). After that the vendor can re-price.`);
  if (risk.renewalFlag) consequences.push(`The current service lapses on ${fmtDate(r.renewalDate!)} (${risk.renewalDays} days), interrupting access for ${r.department}.`);
  if (risk.inr > 0) consequences.push(`The vendor price is already ${formatINR(risk.inr)} (${risk.pct.toFixed(1)}%) above the approved amount — ${driftAction(risk.pct) === "quick" ? "within the quick re-approval limit" : "needs full re-approval"}.`);
  if (!consequences.length) consequences.push("No immediate deadline or price change. Waiting adds delay but no direct cost.");

  const act = (label: string) => { setDecision(r.id, label); toast.success(`${r.id}: ${label}`); };

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Risk queue</Link>
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="font-mono text-xs text-muted-foreground">{r.id} · {r.stage} · pending {r.daysPending} days</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{r.item}</h1>
          <div className="mt-2 flex flex-wrap gap-1">{risk.reasons.map((t) => <ReasonChip key={t} text={t} />)}</div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => { setText(""); setDialog("ask"); }} disabled={!!decision}>Ask a question</Button>
          <Button variant="outline" onClick={() => { setText(""); setDialog("delegate"); }} disabled={!!decision}>Delegate</Button>
          <Button onClick={() => act("Approved")} disabled={!!decision}>Approve</Button>
        </div>
      </div>
      {decision && <div className="rounded-md border bg-success px-4 py-2 text-sm text-success-foreground">{decision}</div>}

      <div className="grid grid-cols-3 gap-4">
        <section className="col-span-2 space-y-4 rounded-md border bg-card p-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What & why</h2>
          {summary.isPending ? (
            <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-2/3" /></div>
          ) : (
            <p className="leading-relaxed">{summary.data?.text ?? fallback}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {summary.data?.text ? "Summary written by AI. All figures below come from the request data." : summary.data?.error ? `${summary.data.error} Showing the requester's justification.` : !summary.isPending ? "Showing the requester's justification." : ""}
          </p>
          <h2 className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">What happens if it waits</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">{consequences.map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
        <section className="space-y-3 rounded-md border bg-card p-6 text-sm">
          <Row label="Amount" value={formatINR(r.amount)} mono />
          <Row label="Approved amount" value={formatINR(r.approvedAmount)} mono />
          <Row label="Latest vendor price" value={formatINR(r.latestVendorPrice)} mono />
          <Row label="Money at risk" value={formatINR(risk.moneyAtRisk)} mono />
          <Row label="Quote valid until" value={`${fmtDate(r.quoteValidUntil)} · ${risk.quoteDays}d`} />
          {r.renewalDate && <Row label="Renewal date" value={`${fmtDate(r.renewalDate)} · ${risk.renewalDays}d`} />}
          <Row label="Requester" value={`${r.requester}, ${r.department}`} />
          <Row label="Approver" value={`${r.approver.name}, ${r.approver.role}`} />
        </section>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog === "ask" ? `Ask ${r.requester} a question` : "Delegate this approval"}</DialogTitle></DialogHeader>
          {dialog === "ask"
            ? <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Can we start with fewer seats?" />
            : <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Colleague's name" />}
          <DialogFooter>
            <Button disabled={!text.trim()} onClick={() => { act(dialog === "ask" ? `Question sent to ${r.requester}` : `Delegated to ${text.trim()}`); setDialog(null); }}>
              {dialog === "ask" ? "Send question" : "Delegate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
