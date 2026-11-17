import "server-only";
import { createHash, randomInt } from "node:crypto";
import { config } from "./config";

export interface SmsProvider {
  send(to: string, text: string): Promise<void>;
}

/** Fournisseur par défaut : journalise le SMS. À remplacer par un fournisseur réel. */
const consoleProvider: SmsProvider = {
  async send(to, text) {
    console.info(`[sms] -> ${to} : ${text}`);
  },
};

export const sms: SmsProvider = consoleProvider;

export function generateOtp(): string {
  return config.otp.demoMode ? config.otp.demoCode : String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}
