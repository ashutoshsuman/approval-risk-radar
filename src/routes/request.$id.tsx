import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getRequest } from "@/lib/requests";
import { assessRisk, driftAction, formatINR, plural, REPRICE_ASSUMPTION } from "@/lib/risk";
import { setDecision, useDecisions } from "@/lib/decisions";
import { generateBrief } from "@/lib/brief.functions";
import { ReasonChip } from "@/components/ReasonChip";
import { useDemo } from "@/lib/demo";
import { DemoRequestEditor } from "@/components/DemoRequestEditor";
import { canApprove } from "@/lib/request-workflow";

export const Route = createFileRoute("/request/$id")({
  loader: ({ params }) => {
    const r = getRequest(params.id);
    if (!r) throw notFound();
    return { request: r };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.request.id} brief · Approval Risk Radar` : "Request · Approval Risk Radar";
    const d = loaderData ? `Approver brief for ${loaderData.request.item}.` : "Approver brief.";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  component: Brief,
});

const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Brief() {
  const { request: defaultRequest } = Route.useLoaderData();
  const demo = useDemo();
  const { requests } = demo;
  const r = requests.find((request) => request.id === defaultRequest.id) ?? defaultRequest;
  const risk = assessRisk(r);
  const decision = useDecisions()[r.id];
  const fn = useServerFn(generateBrief);
  const summary = useQuery({ queryKey: ["brief", r.id], queryFn: () => fn({ data: { id: r.id } }), staleTime: Infinity, retry: false });
  const [dialog, setDialog] = useState<null | "ask" | "delegate" | "cancel">(null);
  const [text, setText] = useState("");

  const fallback = `${r.department} is requesting ${r.item.toLowerCase()}. ${r.justification}`;
  const consequences: string[] = [];
  if (risk.quoteExpired) consequences.push(`The quote expired on ${fmtDate(r.quoteValidUntil)}. A new quote is needed before approval.`);
  else if (risk.quoteFlag) consequences.push(`The quote expires on ${fmtDate(r.quoteValidUntil)} (${plural(risk.quoteDays)}). After that the vendor can re-price.`);
  if (risk.renewalFlag && r.renewalDate && risk.renewalDays !== null) consequences.push(`The current service lapses on ${fmtDate(r.renewalDate)} (${plural(risk.renewalDays)}), interrupting access for ${r.department}.`);
  if (risk.inr > 0) consequences.push(`The vendor price is already ${formatINR(risk.inr)} (${risk.pct.toFixed(1)}%) above the approved amount — ${driftAction(risk.pct) === "quick" ? "within the quick re-approval limit" : "needs full re-approval"}.`);
  if (risk.dropped) consequences.push("The vendor price has dropped below the approved amount — no extra cost.");
  if (!consequences.length) consequences.push("No immediate deadline or price change. Waiting adds delay but no direct cost.");

  const cancelled = r.status === "Cancelled";
  const awaiting = r.status === "Awaiting re-quote";
  const approvalAllowed = canApprove(r);
  const act = (label: string) => { setDecision(r.id, label); demo.recordHistory(r.id, label); toast.success(`${r.id}: ${label}`); };

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Risk queue</Link>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="font-mono text-xs text-muted-foreground">{r.id} · {r.stage} · pending {plural(r.daysPending)}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{r.item}</h1>
          <div className="mt-2 flex flex-wrap gap-1">{risk.reasons.map((t) => <ReasonChip key={t} text={t} />)}</div>
        </div>
        <div className="flex w-full flex-wrap items-start gap-2 sm:w-auto sm:max-w-md">
          <Button variant="outline" onClick={() => { setText(""); setDialog("ask"); }} disabled={cancelled || (!risk.quoteExpired && !!decision)}>Ask a question</Button>
          <Button variant="outline" onClick={() => { setText(""); setDialog("delegate"); }} disabled={cancelled || (!risk.quoteExpired && !!decision)}>Delegate</Button>
          {risk.quoteExpired && <Button disabled={awaiting || cancelled} onClick={() => {
            demo.requestRequote(r.id);
            toast.success("Sent back to procurement for an updated vendor quote. Approval history is kept.");
          }}>Request re-quote</Button>}
          <div className="space-y-2">
            <Button variant={risk.quoteExpired ? "outline" : "default"} onClick={() => { if (canApprove(r)) act("Approved"); }} disabled={!approvalAllowed || (!!decision && !r.hasReplacementQuote)}>Approve</Button>
            {risk.quoteExpired && <p className="max-w-64 text-xs text-destructive">Can't approve an expired quote. Request a re-quote first.</p>}
          </div>
          {risk.quoteExpired && <Button variant="outline" disabled={cancelled} onClick={() => setDialog("cancel")}>Cancel request</Button>}
          {r.hasReplacementQuote && approvalAllowed && <Button disabled={!!decision && (decision === "Approved" || decision.includes("re-approved") || decision === "Sent for full approval")} onClick={() => {
            if (!canApprove(r)) return;
            act(driftAction(risk.pct) === "quick" ? `Difference of ${formatINR(risk.inr)} re-approved` : "Sent for full approval");
          }}>{driftAction(risk.pct) === "quick" ? "Quick re-approve the difference" : "Send for full approval"}</Button>}
        </div>
      </div>
      {r.status && <div role="status" className="border-y py-3 text-sm font-medium">{r.status}</div>}
      {awaiting && <p className="text-sm">Sent back to procurement for an updated vendor quote. Approval history is kept.</p>}
      {decision && <div className="rounded-md border bg-success px-4 py-2 text-sm text-success-foreground">{decision}</div>}
      <DemoRequestEditor request={r} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-4 rounded-md border bg-card p-6 lg:col-span-2">
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
          <Row label="Approved amount" value={formatINR(r.approvedAmount)} mono />
          <Row label="Latest vendor price" value={formatINR(r.latestVendorPrice)} mono />
          <div className="space-y-1 border-b pb-2">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Money at risk</span><span className="text-right font-mono font-medium">{risk.moneyAtRisk === null ? "Unknown until re-quote" : formatINR(risk.moneyAtRisk)}</span></div>
            {!risk.quoteExpired && <>
            <div className="flex justify-between gap-4 pl-3 text-xs text-muted-foreground"><span>confirmed{risk.dropped ? " (price dropped)" : ""}</span><span className="font-mono">{formatINR(risk.confirmed)}</span></div>
            <div className="flex justify-between gap-4 pl-3 text-xs text-muted-foreground"><span>estimated (assumes {Math.round(REPRICE_ASSUMPTION * 100)}% re-price if the quote lapses)</span><span className="font-mono">{formatINR(risk.estimated)}</span></div>
            </>}
          </div>
          <Row label="Quote valid until" value={risk.quoteExpired ? `${fmtDate(r.quoteValidUntil)} · expired` : `${fmtDate(r.quoteValidUntil)} · ${plural(risk.quoteDays)}`} />
          {r.renewalDate && risk.renewalDays !== null && <Row label="Renewal date" value={`${fmtDate(r.renewalDate)} · ${plural(risk.renewalDays)}`} />}
          <Row label="Requester" value={`${r.requester}, ${r.department}`} />
          <Row label="Approver" value={`${r.approver.name}, ${r.approver.role}`} />
        </section>
      </div>
      {!!r.approvalHistory?.length && <section className="space-y-2 border-t pt-4"><h2 className="text-sm font-medium">Approval history</h2><ul className="space-y-1 text-sm text-muted-foreground">{r.approvalHistory.map((entry, index) => <li key={index}>{entry}</li>)}</ul></section>}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog === "cancel" ? "Cancel this request?" : dialog === "ask" ? `Ask ${r.requester} a question` : "Delegate this approval"}</DialogTitle>{dialog === "cancel" && <DialogDescription>The request will be marked as cancelled. Approval history is kept.</DialogDescription>}</DialogHeader>
          {dialog === "cancel" ? null : dialog === "ask"
            ? <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Can we start with fewer seats?" />
            : <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Colleague's name" />}
          <DialogFooter>
            {dialog === "cancel" && <Button variant="outline" onClick={() => setDialog(null)}>Keep request</Button>}
            <Button variant={dialog === "cancel" ? "destructive" : "default"} disabled={dialog !== "cancel" && !text.trim()} onClick={() => {
              if (dialog === "cancel") { demo.cancelRequest(r.id); toast.success("Request cancelled. Approval history is kept."); }
              else act(dialog === "ask" ? `Question sent to ${r.requester}` : `Delegated to ${text.trim()}`);
              setDialog(null);
            }}>
              {dialog === "cancel" ? "Confirm cancellation" : dialog === "ask" ? "Send question" : "Delegate"}
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
