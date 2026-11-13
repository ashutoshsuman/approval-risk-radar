import { describe, expect, it } from "vitest";
import { scenarioRequests } from "./requests";
import { approveRequest, canApprove, canSubmitApproval, cancelRequest, requestRequote, sendForFullApproval, simulateNewQuote } from "./request-workflow";
import { assessRisk, driftAction, drift, formatDriftPercent, QUICK_REAPPROVE_LIMIT, riskQueue } from "./risk";

const now = new Date(2026, 10, 13);
const expired = scenarioRequests("expired", now)[0];
if (!expired) throw new Error("Missing expired fixture");
const request = expired;

describe("expired quote workflow", () => {
  it("blocks approval before today but permits quotes valid today", () => {
    expect(canApprove(request, now)).toBe(false);
    expect(canApprove({ ...request, quoteValidUntil: "2026-11-13" }, now)).toBe(true);
  });
  it("re-quote sets awaiting status and retains approval history", () => {
    const next = requestRequote({ ...request, approvalHistory: ["Previously approved"] }, now);
    expect(next.status).toBe("Awaiting re-quote");
    expect(next.approvalHistory?.[0]).toBe("Previously approved");
    expect(canApprove(next, now)).toBe(false);
  });
  it("cancelled requests cannot approve or accept replacement quotes", () => {
    const next = cancelRequest(requestRequote(request, now));
    expect(next.status).toBe("Cancelled");
    expect(canApprove(next, now)).toBe(false);
    expect(simulateNewQuote(next, 105000, now)).toBe(next);
  });
  it("expired money at risk is unknown and stays at top", () => {
    expect(assessRisk(request, now).moneyAtRisk).toBeNull();
    expect(riskQueue([...scenarioRequests("rise15", now), request], now)[0]?.request.id).toBe(request.id);
  });
  it("replacement quote is valid 14 days and retains history", () => {
    const next = simulateNewQuote(requestRequote(request, now), 105000, now);
    expect([next.status, next.latestVendorPrice, next.quoteValidUntil]).toEqual(["Pending approval", 105000, "2026-11-27"]);
    expect(assessRisk(next, now).quoteDays).toBe(14);
    expect(next.approvalHistory).toHaveLength(2);
    expect(canApprove(next, now)).toBe(true);
  });
  it("replacement price within 10 percent uses quick re-approval", () => {
    const next = simulateNewQuote(requestRequote(request, now), 110000, now);
    expect(driftAction(assessRisk(next, now).pct)).toBe("quick");
  });
  it("replacement price above 10 percent needs full approval", () => {
    const next = simulateNewQuote(requestRequote(request, now), 115000, now);
    expect(driftAction(assessRisk(next, now).pct)).toBe("full");
  });
  it("does not simulate new quotes for requests not awaiting or invalid prices", () => {
    expect(simulateNewQuote(request, 105000, now)).toBe(request);
    const awaiting = requestRequote(request, now);
    expect(simulateNewQuote(awaiting, -1, now)).toBe(awaiting);
  });
});

describe("price-based approval", () => {
  const valid = { ...request, quoteValidUntil: "2026-12-13", approvedAmount: 100000 };
  it("uses a single 10 percent tolerance", () => {
    expect(QUICK_REAPPROVE_LIMIT).toBe(10);
  });
  it("cannot approve or escalate expired quotes", () => {
    expect(approveRequest(request, now)).toBe(request);
    expect(sendForFullApproval({ ...request, latestVendorPrice: 115000 }, now).status).toBe(request.status);
  });
  const finalStep = { ...valid, stage: "Procurement", approver: valid.approvers.Procurement };
  it.each([100000, 90000])("records equal or lower latest price %i at the final step", (latestVendorPrice) => {
    const next = approveRequest({ ...finalStep, latestVendorPrice }, now);
    expect(next.approvedAt).toBe(latestVendorPrice);
    expect(next.approvedAmount).toBe(100000);
    expect(next.status).toBe("Ready for PO");
  });
  it("approves the full latest amount at exactly 10 percent and moves to the next step", () => {
    const next = approveRequest({ ...valid, stage: "Department head", latestVendorPrice: 110000 }, now);
    expect(next.stage).toBe("Finance");
    expect(next.approver.name).toBe("Meera Shah");
    expect(next.approvalHistory?.at(-1)).toBe(`Approved by ${valid.approvers["Department head"].name} at ₹1,10,000, moved to Finance`);
  });
  it("walks the chain Department head → Finance → Procurement → Ready for PO", () => {
    let next = { ...valid, stage: "Department head" };
    const stages = [];
    for (let i = 0; i < 3; i++) { next = approveRequest(next, now); stages.push(next.stage); }
    expect(stages).toEqual(["Finance", "Procurement", "Ready for PO"]);
    expect(next.status).toBe("Ready for PO");
  });
  it("re-quote parks the step and a new quote resumes it", () => {
    const awaiting = requestRequote({ ...request, stage: "Finance" }, now);
    expect(awaiting.stage).toBe("Procurement: awaiting re-quote");
    expect(simulateNewQuote(awaiting, 100000, now).stage).toBe("Finance");
  });
  it("blocks 10.01 percent and records full re-approval at latest amount", () => {
    const input = { ...valid, stage: "Finance", latestVendorPrice: 110010 };
    expect(canApprove(input, now)).toBe(false);
    expect(approveRequest(input, now)).toBe(input);
    const next = sendForFullApproval(input, now);
    expect(next.status).toBe("Sent for full re-approval at ₹1,10,010");
    expect(next.approvedAt).toBeUndefined();
    expect([next.stage, next.approvedAmount]).toEqual(["Department head", 110010]);
    expect(canApprove(next, now)).toBe(true);
  });
  it("makes approval terminal and retains its amount", () => {
    const next = approveRequest({ ...finalStep, latestVendorPrice: 105000 }, now);
    expect(canApprove(next, now)).toBe(false);
    expect(approveRequest(next, now)).toBe(next);
    expect(next.approvedAt).toBe(105000);
  });
  it("calculates exact percentage independent of display rounding", () => {
    expect(drift({ ...valid, latestVendorPrice: 110010 }).pct).toBeCloseTo(10.01, 10);
    expect(formatDriftPercent(10)).toBe("10.00%");
    expect(formatDriftPercent(10.01)).toBe("10.01%");
    expect(driftAction(10.00001)).toBe("full");
    expect(Number(formatDriftPercent(10.00001).slice(0, -1))).toBeGreaterThan(10);
  });
  it("requires full approval for a positive price with no approved baseline", () => {
    expect(canApprove({ ...valid, approvedAmount: 0, latestVendorPrice: 1 }, now)).toBe(false);
  });
});