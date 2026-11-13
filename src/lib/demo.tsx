import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { requests as defaults, scenarioRequests, type PurchaseRequest, type ScenarioId } from "./requests";
import { riskQueue } from "./risk";
import { resetDecisions } from "./decisions";

type DemoState = {
  requests: PurchaseRequest[];
  enabled: boolean;
  scenario: ScenarioId | "default";
  setEnabled: (enabled: boolean) => void;
  selectScenario: (id: ScenarioId) => void;
  updateRequest: (id: string, patch: Partial<Pick<PurchaseRequest, "approvedAmount" | "latestVendorPrice" | "quoteValidUntil">>) => void;
  reset: () => void;
};
const DemoContext = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState(defaults);
  const [enabled, setEnabled] = useState(false);
  const [scenario, setScenario] = useState<DemoState["scenario"]>("default");
  useEffect(() => {
    console.table(riskQueue(requests).map(({ request, risk }, index) => ({
      id: request.id, approved: request.approvedAmount, latest: request.latestVendorPrice,
      "extra cost (confirmed)": risk.confirmed, "estimated risk": risk.estimated,
      "total money at risk": risk.moneyAtRisk, "days left": risk.quoteDays,
      group: risk.group, "sort position": index + 1,
    })));
  }, [requests]);
  const reset = () => {
    setRequests(defaults);
    setScenario("default");
    resetDecisions();
  };
  return <DemoContext.Provider value={{ requests, enabled, scenario, setEnabled,
    selectScenario: (id) => {
      setRequests(scenarioRequests(id)); setScenario(id); setEnabled(true); resetDecisions();
    },
    updateRequest: (id, patch) => {
      if (!enabled) return;
      setRequests((rows) => rows.map((r) => r.id === id ? { ...r, ...patch } : r));
      resetDecisions();
    }, reset,
  }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("DemoProvider is required");
  return value;
}