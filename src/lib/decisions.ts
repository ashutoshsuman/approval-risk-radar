import { useSyncExternalStore } from "react";

let state: Record<string, string> = {};
const subs = new Set<() => void>();
export function clearDecision(id: string) {
  const { [id]: removed, ...rest } = state;
  state = rest;
  subs.forEach((f) => f());
}
export function resetDecisions() {
  state = {};
  subs.forEach((f) => f());
}
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
