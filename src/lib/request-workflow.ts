import { dateFromToday, type PurchaseRequest } from "./requests";
import { daysUntil, drift, driftAction, formatINR } from "./risk";

export function canApprove(request: PurchaseRequest, now = new Date()) {
  return canSubmitApproval(request, now) && driftAction(drift(request).pct) === "quick";
}

export function canSubmitApproval(request: PurchaseRequest, now = new Date()) {
  return daysUntil(request.quoteValidUntil, now) >= 0 && request.status !== "Awaiting re-quote" && request.status !== "Cancelled" && request.approvedAt === undefined && !request.status?.startsWith("Sent for full re-approval");
}

export function approvalLabel(request: PurchaseRequest) {
  const difference = drift(request).inr;
  return `Approve ${formatINR(request.latestVendorPrice)}${difference > 0 ? ` (incl. +${formatINR(difference)})` : ""}`;
}

export function approveRequest(request: PurchaseRequest, now = new Date()): PurchaseRequest {
  if (!canApprove(request, now)) return request;
  const status = `Approved at ${formatINR(request.latestVendorPrice)}` as const;
  return { ...request, approvedAt: request.latestVendorPrice, status, approvalHistory: [...(request.approvalHistory ?? []), status] };
}

export function sendForFullApproval(request: PurchaseRequest, now = new Date()): PurchaseRequest {
  if (!canSubmitApproval(request, now) || driftAction(drift(request).pct) !== "full") return request;
  const status = `Sent for full re-approval at ${formatINR(request.latestVendorPrice)}` as const;
  return { ...request, status, approvalHistory: [...(request.approvalHistory ?? []), status] };
}

export function requestRequote(request: PurchaseRequest, now = new Date()): PurchaseRequest {
  if (daysUntil(request.quoteValidUntil, now) >= 0 || request.status === "Cancelled" || request.status === "Awaiting re-quote") return request;
  return { ...request, status: "Awaiting re-quote", approvalHistory: [...(request.approvalHistory ?? []), "Sent back to procurement for an updated vendor quote. Approval history is kept."] };
}

export function cancelRequest(request: PurchaseRequest): PurchaseRequest {
  if (request.status === "Cancelled") return request;
  return { ...request, status: "Cancelled", approvalHistory: [...(request.approvalHistory ?? []), "Request cancelled"] };
}

export function simulateNewQuote(request: PurchaseRequest, price: number, now = new Date()): PurchaseRequest {
  if (request.status !== "Awaiting re-quote" || !Number.isFinite(price) || price < 0) return request;
  return { ...request, latestVendorPrice: price, quoteValidUntil: dateFromToday(14, now), status: "Pending approval", hasReplacementQuote: true,
    approvalHistory: [...(request.approvalHistory ?? []), "Updated vendor quote received"] };
}