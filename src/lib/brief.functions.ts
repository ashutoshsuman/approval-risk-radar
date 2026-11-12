import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "./requests";

export const generateBrief = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const r = getRequest(data.id);
    if (!r) return { text: null, error: "Request not found" };
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { text: null, error: "AI is not configured" };
    const [{ createOpenAI }, { streamText }, { createLovableAiGatewayRunIdFetch }] = await Promise.all([
      import("@ai-sdk/openai"),
      import("ai"),
      import("./ai/run-id.server"),
    ]);
    const runId = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runId.fetch,
    });
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system:
          "You write approver briefs for a procurement tool. Write 2-3 plain sentences explaining what is being bought and why it matters to the business. NEVER include any numbers, digits, amounts, percentages, dates or durations — those are shown separately. No markdown.",
        messages: [
          { role: "user", content: `Item: ${r.item}\nDepartment: ${r.department}\nRequester: ${r.requester}\nJustification: ${r.justification}` },
        ],
        providerOptions: {
          openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
        },
      });
      const text = (await result.text).trim();
      // Numbers must never come from the model: reject any output containing digits.
      if (!text || /\d/.test(text)) return { text: null, error: null };
      return { text, error: null };
    } catch (e) {
      console.error("brief generation failed", e);
      const status = (e as { statusCode?: number }).statusCode;
      return { text: null, error: status === 402 ? "AI credits are exhausted." : status === 429 ? "AI is busy, try again shortly." : "Summary unavailable right now." };
    }
  });
