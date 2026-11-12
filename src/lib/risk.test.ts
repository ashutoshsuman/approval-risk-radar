import { describe, expect, it } from "vitest";
import { assessRisk, driftAction, riskQueue } from "./risk";
import type { PurchaseRequest } from "./requests";

const now = new Date(2026, 10, 12);
const base: PurchaseRequest = {
  id: "X", item: "x", justification: "", requester: "", department: "", amount: 100000,
  approver: { name: "", role: "" }, stage: "", daysPending: 1,
  quoteValidUntil: "2026-12-30", approvedAmount: 100000, latestVendorPrice: 100000,
};

describe("risk rules", () => {
  it("drift is the price difference above approved", () => {
    const r = assessRisk({ ...base, latestVendorPrice: 106000 }, now);
    expect(r.inr).toBe(6000);
    expect(r.pct).toBeCloseTo(6);
    expect(r.moneyAtRisk).toBe(6000);
  });
  it("no drift when price is lower", () => {
    expect(assessRisk({ ...base, latestVendorPrice: 90000 }, now).inr).toBe(0);
  });
  it("flags quote expiring within 7 days, not 8", () => {
    expect(assessRisk({ ...base, quoteValidUntil: "2026-11-19" }, now).quoteFlag).toBe(true);
    expect(assessRisk({ ...base, quoteValidUntil: "2026-11-20" }, now).quoteFlag).toBe(false);
    expect(assessRisk({ ...base, quoteValidUntil: "2026-11-15" }, now).reasons).toContain("Quote expires in 3 days");
  });
  it("flags renewal within 14 days, not 15", () => {
    expect(assessRisk({ ...base, renewalDate: "2026-11-26" }, now).renewalFlag).toBe(true);
    expect(assessRisk({ ...base, renewalDate: "2026-11-27" }, now).renewalFlag).toBe(false);
  });
  it("10% drift is quick re-approve, above is full approval", () => {
    expect(driftAction(10)).toBe("quick");
    expect(driftAction(10.1)).toBe("full");
  });
  it("sorts by money at risk descending", () => {
    const q = riskQueue([
      { ...base, id: "A", latestVendorPrice: 101000 },
      { ...base, id: "B", latestVendorPrice: 120000 },
    ], now);
    expect(q.map((x) => x.request.id)).toEqual(["B", "A"]);
  });
});
