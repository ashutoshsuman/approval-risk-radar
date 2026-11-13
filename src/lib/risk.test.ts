import { describe, expect, it } from "vitest";
import { assessRisk, driftAction, plural, riskQueue } from "./risk";
import type { PurchaseRequest } from "./requests";

const now = new Date(2026, 10, 12);
const base: PurchaseRequest = {
  id: "X", item: "x", justification: "", requester: "", department: "", amount: 100000,
  approver: { name: "", role: "" }, stage: "", approvers: { "Department head": { name: "", role: "" }, Finance: { name: "", role: "" }, Procurement: { name: "", role: "" } }, daysPending: 1,
  quoteValidUntil: "2026-12-30", approvedAmount: 100000, latestVendorPrice: 100000,
};

describe("risk rules", () => {
  it("confirmed is price above approved, never the full amount", () => {
    const r = assessRisk({ ...base, latestVendorPrice: 106000 }, now);
    expect(r.confirmed).toBe(6000);
    expect(r.estimated).toBe(0);
    expect(r.moneyAtRisk).toBe(6000);
  });
  it("estimated is 10% of latest price when quote expires within 7 days", () => {
    const r = assessRisk({ ...base, latestVendorPrice: 110000, quoteValidUntil: "2026-11-15" }, now);
    expect(r.estimated).toBe(11000);
    expect(r.moneyAtRisk).toBe(21000);
    expect(assessRisk({ ...base, quoteValidUntil: "2026-11-20" }, now).estimated).toBe(0);
  });
  it("price drop shows ₹0 extra cost and 'Price dropped'", () => {
    const r = assessRisk({ ...base, latestVendorPrice: 90000 }, now);
    expect(r.confirmed).toBe(0);
    expect(r.reasons).toContain("Price dropped");
  });
  it("expired quote is flagged", () => {
    expect(assessRisk({ ...base, quoteValidUntil: "2026-11-11" }, now).reasons).toContain("Quote expired, re-quote needed");
  });
  it("renewal within 14 days is Service at risk in the urgent group, ordered by days left", () => {
    const r = assessRisk({ ...base, renewalDate: "2026-11-15" }, now);
    expect(r.reasons).toContain("Service at risk");
    expect([r.group, r.moneyAtRisk]).toEqual(["quote", 0]);
    const q = riskQueue([{ ...base, id: "quote5", quoteValidUntil: "2026-11-17" }, { ...base, id: "renew3", renewalDate: "2026-11-15" }], now);
    expect(q.map((x) => x.request.id)).toEqual(["renew3", "quote5"]);
  });
  it("pluralises days", () => {
    expect(plural(1)).toBe("1 day");
    expect(plural(3)).toBe("3 days");
  });
  it("10% drift is quick re-approve, above is full approval", () => {
    expect(driftAction(10)).toBe("quick");
    expect(driftAction(10.1)).toBe("full");
  });
  it("sorts expired, then quote by days, then price by extra cost, then rest", () => {
    const q = riskQueue([
      { ...base, id: "rest" },
      { ...base, id: "priceSmall", latestVendorPrice: 101000 },
      { ...base, id: "quote5", quoteValidUntil: "2026-11-17" },
      { ...base, id: "priceBig", latestVendorPrice: 150000 },
      { ...base, id: "quote1", quoteValidUntil: "2026-11-13" },
      { ...base, id: "expired", quoteValidUntil: "2026-11-10" },
    ], now);
    expect(q.map((x) => x.request.id)).toEqual(["expired", "quote1", "quote5", "priceBig", "priceSmall", "rest"]);
  });
});
