import Anthropic from "@anthropic-ai/sdk";

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
  throw new Error("AI_INTEGRATIONS_ANTHROPIC_BASE_URL must be set");
}
if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
  throw new Error("AI_INTEGRATIONS_ANTHROPIC_API_KEY must be set");
}

export const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

export const MODELS = {
  OPUS: "claude-opus-4-7",
  SONNET: "claude-sonnet-4-6",
  HAIKU: "claude-haiku-4-5",
} as const;

export async function callLLM(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1000,
): Promise<string> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

export function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
  return JSON.parse(cleaned) as T;
}
