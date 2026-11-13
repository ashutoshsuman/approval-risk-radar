import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { requests as defaults, scenarioRequests, type PurchaseRequest, type ScenarioId } from "./requests";
import { riskQueue } from "./risk";
import { clearDecision, resetDecisions } from "./decisions";
import { approveRequest, sendForFullApproval, cancelRequest, requestRequote, simulateNewQuote } from "./request-workflow";

type DemoState = {
  requests: PurchaseRequest[];
  enabled: boolean;
  scenario: ScenarioId | "default";
  setEnabled: (enabled: boolean) => void;
  selectScenario: (id: ScenarioId) => void;
  updateRequest: (id: string, patch: Partial<Pick<PurchaseRequest, "approvedAmount" | "latestVendorPrice" | "quoteValidUntil">>) => void;
  reset: () => void;
  resetSteps: () => void;
  requestRequote: (id: string) => void;
  cancelRequest: (id: string) => void;
  simulateNewQuote: (id: string, price: number) => void;
  recordHistory: (id: string, label: string) => void;
  approveRequest: (id: string) => void;
  sendForFullApproval: (id: string) => void;
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
    approveRequest: (id) => setRequests((rows) => rows.map((r) => r.id === id ? approveRequest(r) : r)),
    sendForFullApproval: (id) => setRequests((rows) => rows.map((r) => r.id === id ? sendForFullApproval(r) : r)),
    requestRequote: (id) => setRequests((rows) => rows.map((r) => r.id === id ? requestRequote(r) : r)),
    cancelRequest: (id) => setRequests((rows) => rows.map((r) => r.id === id ? cancelRequest(r) : r)),
    simulateNewQuote: (id, price) => {
      if (!enabled || !requests.some((r) => r.id === id && r.status === "Awaiting re-quote") || !Number.isFinite(price) || price < 0) return;
      clearDecision(id);
      setRequests((rows) => rows.map((r) => r.id === id ? simulateNewQuote(r, price) : r));
    },
    recordHistory: (id, label) => setRequests((rows) => rows.map((r) => r.id === id ? { ...r, approvalHistory: [...(r.approvalHistory ?? []), label] } : r)),
    selectScenario: (id) => {
      setRequests(scenarioRequests(id)); setScenario(id); setEnabled(true); resetDecisions();
    },
    updateRequest: (id, patch) => {
      if (!enabled) return;
      setRequests((rows) => rows.map((r) => r.id === id ? { ...r, ...patch } : r));
      resetDecisions();
    }, reset,
    resetSteps: () => {
      setRequests((rows) => rows.map((r) => {
        const o = defaults.find((d) => d.id === r.id);
        return o ? { ...r, stage: o.stage, approver: o.approver, status: undefined, approvedAt: undefined, approvalHistory: undefined, resumeStage: undefined } : r;
      }));
      resetDecisions();
    },
  }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("DemoProvider is required");
  return value;
}