import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type * as z from "zod/v4";
import { env } from "../env";

/**
 * Austauschbare LLM-Abstraktion. Fachlogik kennt nur `LlmProvider` – weitere Anbieter
 * (z. B. EU-gehostete Modelle) können ergänzt werden, ohne RAG/Fallprüfung zu ändern.
 */
export type LlmUsage = { inputTokens: number; outputTokens: number };

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  generateStructured<S extends z.ZodType>(req: {
    system: string;
    user: string;
    schema: S;
    maxTokens?: number;
    effort?: "low" | "medium" | "high";
  }): Promise<{ data: z.infer<S>; usage: LlmUsage }>;
}

export class LlmRefusalError extends Error {}

class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 10 * 60 * 1000 });
  }

  async generateStructured<S extends z.ZodType>(req: {
    system: string;
    user: string;
    schema: S;
    maxTokens?: number;
    effort?: "low" | "medium" | "high";
  }) {
    const res = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: req.maxTokens ?? 16000,
      // Server-seitiger Fallback auf ein anderes Modell, falls eine Anfrage fälschlich abgelehnt wird.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: req.effort ?? "medium", format: betaZodOutputFormat(req.schema) },
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    });
    if (res.stop_reason === "refusal") throw new LlmRefusalError("Die KI hat die Anfrage abgelehnt.");
    if (res.stop_reason === "max_tokens") throw new Error("Die KI-Antwort wurde wegen Längenbegrenzung abgeschnitten.");
    if (res.parsed_output == null) throw new Error("Die KI-Antwort entsprach nicht dem erwarteten Format.");
    return {
      data: res.parsed_output as z.infer<S>,
      usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
    };
  }
}

let testOverride: LlmProvider | null | undefined;
/** Nur für Tests: deterministischer Provider. */
export function __setLlmForTests(p: LlmProvider | null | undefined) {
  testOverride = p;
}

/** Liefert den konfigurierten Anbieter oder null (KI nicht konfiguriert). */
export function getLlm(): LlmProvider | null {
  if (testOverride !== undefined) return testOverride;
  const e = env();
  if (e.AI_PROVIDER === "anthropic" && e.ANTHROPIC_API_KEY) return new AnthropicProvider(e.ANTHROPIC_API_KEY, e.AI_MODEL);
  return null;
}
