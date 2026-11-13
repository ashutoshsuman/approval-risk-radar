<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Keep default requests and scenario definitions in one browser-safe data module; demo edits live in a root React provider so all screens share them without server state or persistence.
- Compute and log demo risk exclusively through the existing pure risk functions; scenario values and edits must never depend on AI output.
- Keep quote workflow transitions in browser-safe pure functions and request status/history in the demo provider; guard every approval surface so expired or cancelled requests cannot bypass re-quoting.
- Use shared pure approval transitions and exact drift checks on every approval surface; store the final approved price separately from the comparison baseline so status, history, and risk remain consistent.
- Keep the approval chain (steps, per-step approvers, next-step moves, re-quote parking) in the pure workflow module; requests in the final "Ready for PO" step are filtered out before riskQueue so risk rules stay unchanged.
