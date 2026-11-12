# Approval Risk Radar — plan

Desktop web app, mock data only, no login. Neutral B2B style (slate/stone neutrals, one muted teal accent, IBM Plex Sans + Plex Mono for numbers). No real brand names.

## Data
8 mock purchase requests in a single module: id, item, requester, department, amount (INR), approver name + role, stage, days pending, quote valid-until, optional renewal date, approved amount, latest vendor price, plus a short "justification" line. Dates set relative to today so flags always show.

## Risk logic (pure code, unit-tested)
- Price drift = max(0, latest price − approved amount).
- Quote flag if quote expires within 7 days; renewal flag if renewal lapses within 14 days.
- Money at risk = drift + full amount when quote/renewal flagged (so expiring items rank high); sorted descending.
- Reason text built in code, e.g. "Quote expires in 3 days", "Vendor price +₹18,000 (6.2%)".
- Drift rule: ≤10% → "Quick re-approve the difference", else "Send back for full approval".

## Screens (separate routes, shared top nav)
1. **Risk queue** (`/`): table — ID, item, department, approver, stage, days pending, amount, money at risk, reason chips. Row click opens the brief.
2. **Approver brief** (`/request/$id`): one screen — what's being bought, why, amount, quote validity, what happens if it waits, actions Approve / Ask a question / Delegate (mock: toast + status change in local state; Ask/Delegate open small dialogs).
3. **Price drift** (`/drift`): cards for drifting requests showing approved vs latest, diff in ₹ and %, and the right action button.

## LLM summary
- Server function calls Lovable AI (default model) with the request data, asking for 2–3 sentences of prose only, with explicit instruction to never state numbers.
- Output is sanitised: any digits stripped/rejected, falls back to a code-built template. All figures in the brief render from data, never from the model text.
- Requires enabling Lovable Cloud for the AI key. Loading skeleton + error message shown on failure.

## Technical details
- TanStack routes: index.tsx, request.$id.tsx, drift.tsx; head() per route.
- `src/lib/risk.ts` + vitest tests for flags, drift %, threshold and sorting.
- `src/server/brief.functions.ts` with createServerFn, AI SDK via gateway, streamed then collected server-side.
- INR formatted with `Intl.NumberFormat('en-IN')`.
