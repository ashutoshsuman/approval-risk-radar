import type { PurchaseRequest } from "./requests";

const DAY = 86_400_000;
export const QUOTE_WINDOW_DAYS = 7;
export const RENEWAL_WINDOW_DAYS = 14;
export const QUICK_REAPPROVE_MAX_PCT = 10;

export function daysUntil(iso: string, now: Date = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - start) / DAY);
}

export function drift(r: Pick<PurchaseRequest, "approvedAmount" | "latestVendorPrice">) {
  const inr = Math.max(0, r.latestVendorPrice - r.approvedAmount);
  const pct = r.approvedAmount > 0 ? (inr / r.approvedAmount) * 100 : 0;
  return { inr, pct };
}

export function driftAction(pct: number): "quick" | "full" {
  return pct <= QUICK_REAPPROVE_MAX_PCT ? "quick" : "full";
}

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const plural = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

export function assessRisk(r: PurchaseRequest, now: Date = new Date()) {
  const d = drift(r);
  const quoteDays = daysUntil(r.quoteValidUntil, now);
  const renewalDays = r.renewalDate ? daysUntil(r.renewalDate, now) : null;
  const quoteFlag = quoteDays <= QUOTE_WINDOW_DAYS;
  const renewalFlag = renewalDays !== null && renewalDays <= RENEWAL_WINDOW_DAYS;
  const reasons: string[] = [];
  if (quoteFlag) reasons.push(quoteDays < 0 ? "Quote expired" : `Quote expires in ${plural(quoteDays)}`);
  if (renewalFlag) reasons.push(renewalDays! < 0 ? "Renewal lapsed" : `Renewal lapses in ${plural(renewalDays!)}`);
  if (d.inr > 0) reasons.push(`Vendor price +${formatINR(d.inr)} (${d.pct.toFixed(1)}%)`);
  const moneyAtRisk = d.inr + (quoteFlag || renewalFlag ? r.amount : 0);
  return { ...d, quoteDays, renewalDays, quoteFlag, renewalFlag, reasons, moneyAtRisk };
}

export function riskQueue(list: PurchaseRequest[], now: Date = new Date()) {
  return list
    .map((r) => ({ request: r, risk: assessRisk(r, now) }))
    .sort((a, b) => b.risk.moneyAtRisk - a.risk.moneyAtRisk);
}
