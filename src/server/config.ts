import "server-only";
import path from "node:path";

/** Configuration serveur lue depuis les variables d'environnement. */
export const config = {
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    model: process.env.OPENROUTER_MODEL ?? "google/gemma-4-26b-a4b-it",
    temperature: Number(process.env.OPENROUTER_TEMPERATURE ?? 0.3),
    maxTokens: Number(process.env.OPENROUTER_MAX_TOKENS ?? 1024),
    timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS ?? 45000),
    appUrl: process.env.APP_URL ?? "http://localhost:3000",
    appName: process.env.APP_NAME ?? "Assistant VE",
  },
  dataDir:
    process.env.DATA_DIR ?? (process.env.VERCEL ? "/tmp/assistant-ve" : path.join(process.cwd(), ".data")),
  otp: {
    /** Sans fournisseur SMS configuré, le code de démonstration est affiché dans l'interface. */
    demoMode: (process.env.OTP_DEMO_MODE ?? "true") !== "false",
    demoCode: process.env.OTP_DEMO_CODE ?? "123456",
    ttlMs: 10 * 60 * 1000,
    resendDelayMs: 30 * 1000,
    maxTries: 3,
  },
  demoUser: {
    id: process.env.DEMO_USER_ID ?? "demo-user",
    firstName: process.env.DEMO_USER_FIRSTNAME ?? "[Prénom]",
    lastName: process.env.DEMO_USER_LASTNAME ?? "[Nom]",
  },
};

export function isLlmConfigured(): boolean {
  return config.openrouter.apiKey.length > 0;
}
