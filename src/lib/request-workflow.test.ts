import { describe, expect, it } from "vitest";
import { scenarioRequests } from "./requests";
import { canApprove, cancelRequest, requestRequote, simulateNewQuote } from "./request-workflow";
import { assessRisk, driftAction, riskQueue } from "./risk";

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