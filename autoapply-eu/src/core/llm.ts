import { getSecret } from "@/lib/settings";
import { logger } from "@/lib/logger";

export interface LlmConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export async function getLlmConfig(): Promise<LlmConfig | null> {
  let apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    try {
      apiKey = await getSecret("LLM_API_KEY");
    } catch {
      apiKey = undefined;
    }
  }
  if (!apiKey) return null;
  return {
    baseUrl: (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    apiKey,
  };
}

export async function chatJson<T = unknown>(cfg: LlmConfig, system: string, user: string): Promise<T> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    logger.warn({ status: res.status }, "LLM request failed");
    throw new Error(`LLM request failed with HTTP ${res.status}`);
  }
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned no content");
  return JSON.parse(content) as T;
}
