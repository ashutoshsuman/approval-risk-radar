import { dateFromToday, type ApprovalStep, type PurchaseRequest } from "./requests";

/** Approval chain shown on the request page. */
export const APPROVAL_STEPS = ["Requested", "Department head", "Finance", "Procurement: Ready for PO"] as const;
export const READY_FOR_PO = "Ready for PO";
export const AWAITING_REQUOTE_STEP = "Procurement: awaiting re-quote";
const NEXT_STEP: Record<ApprovalStep, ApprovalStep | typeof READY_FOR_PO> = { "Department head": "Finance", Finance: "Procurement", Procurement: READY_FOR_PO };

/** Index of the current step in APPROVAL_STEPS (length = all done). */
export function stepIndex(stage: string) {
  if (stage === READY_FOR_PO) return APPROVAL_STEPS.length;
  if (stage === "Department head") return 1;
  if (stage === "Finance") return 2;
  return 3;
}

export function approvalMessage(request: PurchaseRequest) {
  const next = NEXT_STEP[request.stage as ApprovalStep] ?? READY_FOR_PO;
  return `Approved by ${request.approver.name} at ${formatINR(request.latestVendorPrice)}, moved to ${next}`;
}
import { daysUntil, drift, driftAction, formatINR } from "./risk";

export function canApprove(request: PurchaseRequest, now = new Date()) {
  return canSubmitApproval(request, now) && driftAction(drift(request).pct) === "quick";
}

export function canSubmitApproval(request: PurchaseRequest, now = new Date()) {
  return daysUntil(request.quoteValidUntil, now) >= 0 && request.status !== "Awaiting re-quote" && request.status !== "Cancelled" && request.approvedAt === undefined && request.stage in NEXT_STEP;
}

export function approvalLabel(request: PurchaseRequest) {
  const difference = drift(request).inr;
  return `Approve ${formatINR(request.latestVendorPrice)}${difference > 0 ? ` (incl. +${formatINR(difference)})` : ""}`;
}

export function approveRequest(request: PurchaseRequest, now = new Date()): PurchaseRequest {
  if (!canApprove(request, now)) return request;
  const next = NEXT_STEP[request.stage as ApprovalStep];
  const message = approvalMessage(request);
  const approvalHistory = [...(request.approvalHistory ?? []), message];
  if (next === READY_FOR_PO) return { ...request, stage: READY_FOR_PO, status: READY_FOR_PO, approvedAt: request.latestVendorPrice, approvalHistory };
  return { ...request, stage: next, approver: request.approvers[next], status: message as `Approved by ${string}`, approvalHistory };
}

export function sendForFullApproval(request: PurchaseRequest, now = new Date()): PurchaseRequest {
  if (!canSubmitApproval(request, now) || driftAction(drift(request).pct) !== "full") return request;
  const status = `Sent for full re-approval at ${formatINR(request.latestVendorPrice)}` as const;
  return { ...request, status, stage: "Department head", approver: request.approvers["Department head"], approvedAmount: request.latestVendorPrice,
    approvalHistory: [...(request.approvalHistory ?? []), `${status}; chain restarted at Department head`] };
}

export function requestRequote(request: PurchaseRequest, now = new Date()): PurchaseRequest {
  if (daysUntil(request.quoteValidUntil, now) >= 0 || request.status === "Cancelled" || request.status === "Awaiting re-quote") return request;
  return { ...request, status: "Awaiting re-quote", stage: AWAITING_REQUOTE_STEP, resumeStage: request.resumeStage ?? request.stage, approvalHistory: [...(request.approvalHistory ?? []), "Sent back to procurement for an updated vendor quote. Approval history is kept."] };
}

export function cancelRequest(request: PurchaseRequest): PurchaseRequest {
  if (request.status === "Cancelled") return request;
  return { ...request, status: "Cancelled", approvalHistory: [...(request.approvalHistory ?? []), "Request cancelled"] };
}

export function simulateNewQuote(request: PurchaseRequest, price: number, now = new Date()): PurchaseRequest {
  if (request.status !== "Awaiting re-quote" || !Number.isFinite(price) || price < 0) return request;
  return { ...request, latestVendorPrice: price, quoteValidUntil: dateFromToday(14, now), status: "Pending approval", hasReplacementQuote: true, stage: request.resumeStage ?? "Department head", resumeStage: undefined,
    approvalHistory: [...(request.approvalHistory ?? []), "Updated vendor quote received"] };
}