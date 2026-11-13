import { describe, expect, it } from "vitest";
import { dateFromToday, requests, scenarioRequests } from "./requests";
import { assessRisk, driftAction, riskQueue } from "./risk";

const now = new Date(2026, 10, 13);
function scenario(id: Parameters<typeof scenarioRequests>[0]) {
  const request = scenarioRequests(id, now)[0];
  if (!request) throw new Error("Missing scenario");
  return { request, risk: assessRisk(request, now) };
}

describe("demo scenarios", () => {
  it("tomorrow has no price change and 10% estimated risk", () => {
    const { risk } = scenario("tomorrow");
    expect([risk.quoteDays, risk.confirmed, risk.estimated, risk.moneyAtRisk]).toEqual([1, 0, 10000, 10000]);
  });
  it("15% needs full re-approval", () => {
    const { risk } = scenario("rise15");
    expect([risk.inr, risk.pct, driftAction(risk.pct)]).toEqual([15000, 15, "full"]);
  });
  it("5% permits quick re-approval", () => {
    const { risk } = scenario("rise5");
    expect([risk.inr, risk.pct, driftAction(risk.pct)]).toEqual([5000, 5, "quick"]);
  });
  it("no risk has 30 days and unchanged price", () => {
    const { risk } = scenario("none");
    expect([risk.quoteDays, risk.confirmed, risk.estimated, risk.moneyAtRisk]).toEqual([30, 0, 0, 0]);
  });
  it("exactly 10% is quick re-approval", () => {
    const { risk } = scenario("boundary");
    expect([risk.pct, risk.confirmed, driftAction(risk.pct)]).toEqual([10, 10000, "quick"]);
  });
  it("price dropped has zero extra cost", () => {
    const { request, risk } = scenario("dropped");
    expect(request.latestVendorPrice).toBe(90000);
    expect([risk.dropped, risk.confirmed, risk.moneyAtRisk]).toEqual([true, 0, 0]);
  });
  it("expired quote has negative days and expired group", () => {
    const { risk } = scenario("expired");
    expect([risk.quoteDays, risk.group, risk.estimated]).toEqual([-1, "expired", 10000]);
  });
  it("all cases sort expired, tomorrow, price increases, then rest", () => {
    const rows = scenarioRequests("all", now);
    expect(rows).toHaveLength(7);
    expect(riskQueue(rows, now).map((row) => row.request.id)).toEqual([
      "PR-1047", "PR-1041", "PR-1042", "PR-1045", "PR-1043", "PR-1044", "PR-1046",
    ]);
  });
  it("edited amounts and days recalculate through code without mutating defaults", () => {
    const { request } = scenario("none");
    const risk = assessRisk({ ...request, approvedAmount: 200000, latestVendorPrice: 210000,
      quoteValidUntil: dateFromToday(7, now) }, now);
    expect([risk.confirmed, risk.estimated, risk.moneyAtRisk, risk.quoteDays, risk.group]).toEqual([10000, 21000, 31000, 7, "quote"]);
    expect(requests[0]?.approvedAmount).toBe(432000);
  });
  it("relative dates use local calendar days across month boundaries", () => {
    expect(dateFromToday(1, new Date(2026, 10, 30))).toBe("2026-12-01");
    expect(dateFromToday(-1, new Date(2026, 10, 1))).toBe("2026-10-31");
  });
});