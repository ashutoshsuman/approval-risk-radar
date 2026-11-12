import { useSyncExternalStore } from "react";

let state: Record<string, string> = {};
const subs = new Set<() => void>();
export function setDecision(id: string, label: string) {
  state = { ...state, [id]: label };
  subs.forEach((f) => f());
}
export function useDecisions() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
    () => state,
  );
}
