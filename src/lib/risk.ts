import type { PurchaseRequest } from "./requests";

const DAY = 86_400_000;
export const QUOTE_WINDOW_DAYS = 7;
export const RENEWAL_WINDOW_DAYS = 14;
export const QUICK_REAPPROVE_LIMIT = 10;
/** Assumed vendor re-price if a quote lapses (fraction of latest vendor price). */
export const REPRICE_ASSUMPTION = 0.1;

export function daysUntil(iso: string, now: Date = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - start) / DAY);
}

export function drift(r: Pick<PurchaseRequest, "approvedAmount" | "latestVendorPrice">) {
  const inr = Math.max(0, r.latestVendorPrice - r.approvedAmount);
  const pct = r.approvedAmount > 0 ? (inr / r.approvedAmount) * 100 : inr > 0 ? Infinity : 0;
  return { inr, pct, dropped: r.latestVendorPrice < r.approvedAmount };
}

export function driftAction(pct: number): "quick" | "full" {
  return pct <= QUICK_REAPPROVE_LIMIT ? "quick" : "full";
}

export function formatDriftPercent(pct: number) {
  if (!Number.isFinite(pct)) return "No approved baseline";
  let digits = Math.abs(pct - QUICK_REAPPROVE_LIMIT) < 0.1 ? 2 : 1;
  while (pct > QUICK_REAPPROVE_LIMIT && Number(pct.toFixed(digits)) <= QUICK_REAPPROVE_LIMIT && digits < 15) digits++;
  return `${pct.toFixed(digits)}%`;
}

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const plural = (n: number) => `${n} day${Math.abs(n) === 1 ? "" : "s"}`;

export type RiskGroup = "expired" | "quote" | "price" | "other";
export const GROUP_LABEL: Record<RiskGroup, string> = {
  expired: "Quote expired",
  quote: "Quote expiring",
  price: "Price above approved",
  other: "No urgent risk",
};

export function assessRisk(r: PurchaseRequest, now: Date = new Date()) {
  const d = drift(r);
  const quoteDays = daysUntil(r.quoteValidUntil, now);
  const renewalDays = r.renewalDate ? daysUntil(r.renewalDate, now) : null;
  const quoteExpired = quoteDays < 0;
  const quoteFlag = quoteDays <= QUOTE_WINDOW_DAYS;
  const renewalFlag = renewalDays !== null && renewalDays <= RENEWAL_WINDOW_DAYS;
  const reasons: string[] = [];
  if (quoteExpired) reasons.push("Quote expired, re-quote needed");
  else if (quoteFlag) reasons.push(`Quote expires in ${plural(quoteDays)}`);
  if (renewalFlag && renewalDays !== null) reasons.push(renewalDays < 0 ? "Renewal lapsed" : `Renewal lapses in ${plural(renewalDays)}`);
  if (d.inr > 0) reasons.push(`Vendor price +${formatINR(d.inr)} (${formatDriftPercent(d.pct)})`);
  if (d.dropped) reasons.push("Price dropped");
  const confirmed = d.inr;
  const estimated = quoteFlag ? Math.round(r.latestVendorPrice * REPRICE_ASSUMPTION) : 0;
  const group: RiskGroup = quoteExpired ? "expired" : quoteFlag ? "quote" : d.inr > 0 ? "price" : "other";
  return { ...d, quoteDays, renewalDays, quoteExpired, quoteFlag, renewalFlag, reasons, confirmed, estimated, moneyAtRisk: quoteExpired ? null : confirmed + estimated, group };
}

const ORDER: RiskGroup[] = ["expired", "quote", "price", "other"];

export function riskQueue(list: PurchaseRequest[], now: Date = new Date()) {
  return list
    .map((r) => ({ request: r, risk: assessRisk(r, now) }))
    .sort((a, b) => {
      const g = ORDER.indexOf(a.risk.group) - ORDER.indexOf(b.risk.group);
      if (g) return g;
      if (a.risk.group === "expired" || a.risk.group === "quote") return a.risk.quoteDays - b.risk.quoteDays;
      if (a.risk.group === "price") return b.risk.confirmed - a.risk.confirmed;
      return 0;
    });
}
