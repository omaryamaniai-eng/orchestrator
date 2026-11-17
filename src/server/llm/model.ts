import "server-only";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "../config";

/**
 * Modèle de chat LangChain branché sur OpenRouter (API compatible OpenAI).
 * Le modèle par défaut est Gemma 26B ; il se change via OPENROUTER_MODEL.
 */
export function getChatModel(opts: { temperature?: number; maxTokens?: number; streaming?: boolean } = {}): ChatOpenAI {
  const o = config.openrouter;
  return new ChatOpenAI({
    model: o.model,
    apiKey: o.apiKey,
    temperature: opts.temperature ?? o.temperature,
    maxTokens: opts.maxTokens ?? o.maxTokens,
    streaming: opts.streaming ?? false,
    timeout: o.timeoutMs,
    maxRetries: 1,
    useResponsesApi: false,
    configuration: {
      baseURL: o.baseURL,
      defaultHeaders: {
        "HTTP-Referer": o.appUrl,
        "X-Title": o.appName,
      },
    },
  });
}
