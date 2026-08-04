import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Lovable AI Gateway provider — সার্ভার-সাইড only।
 * `supportsStructuredOutputs` না দিলে গেটওয়ে json_object মোডে যায় এবং
 * স্কিমা-ভিত্তিক আউটপুট (Output.object) প্রায়ই AI_NoObjectGeneratedError দেয়।
 */
export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: true,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  } as Parameters<typeof createOpenAICompatible>[0]);
}
