import { dateFromToday, type PurchaseRequest } from "./requests";
import { daysUntil } from "./risk";

export function canApprove(request: PurchaseRequest, now = new Date()) {
  return daysUntil(request.quoteValidUntil, now) >= 0 && request.status !== "Awaiting re-quote" && request.status !== "Cancelled";
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