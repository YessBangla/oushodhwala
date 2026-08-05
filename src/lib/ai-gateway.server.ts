import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/**
 * Lovable AI Gateway provider — সার্ভার-সাইড only।
 * `supportsStructuredOutputs` না দিলে গেটওয়ে json_object মোডে যায় এবং
 * স্কিমা-ভিত্তিক আউটপুট (Output.object) প্রায়ই AI_NoObjectGeneratedError দেয়।
 * ডিবাগ প্যানেলের জন্য গেটওয়ের run id ও শেষ HTTP স্ট্যাটাস ধরে রাখা হয়।
 */
export function createLovableAiGatewayProvider(lovableApiKey: string) {
  let runId: string | undefined;
  let status = 0;

  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: true,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await fetch(input as never, init);
      status = res.status;
      runId = res.headers.get(RUN_ID_HEADER)?.trim() || runId;
      return res;
    },
  } as Parameters<typeof createOpenAICompatible>[0]);

  return Object.assign(provider, {
    getRunId: () => runId ?? "",
    getStatus: () => status,
  });
}
