import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "../config";
import type { ChatMessage, ConversationSummary, OfferRequest, PublicState } from "@/lib/domain/types";
import type { EligInput, EligResult, Simulation } from "@/lib/domain/finance";
import type { Need } from "@/lib/domain/catalog";
import type { BlockRef, ContactInput } from "@/lib/domain/types";

/** État complet d'une conversation, côté serveur. */
export interface ConversationState {
  chosen: { vehicleId: string; versionIndex: number } | null;
  chosenMessageId: string | null;
  lastNeed: Need | null;
  lastSim: Simulation | null;
  simFormRef: BlockRef | null;
  lastEligInput: EligInput | null;
  lastElig: EligResult | null;
  lastContact: ContactInput | null;
  otp: {
    codeHash: string;
    expiresAt: number;
    lastSentAt: number;
    tries: number;
    digits: string;
    prenom: string;
    creneau: string;
  } | null;
  request: OfferRequest | null;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  state: ConversationState;
}

interface UserData {
  favorites: string[];
  simulations: Simulation[];
  requests: OfferRequest[];
}

interface Db {
  version: 1;
  conversations: Record<string, Conversation>;
  users: Record<string, UserData>;
}

export function emptyState(): ConversationState {
  return {
    chosen: null,
    chosenMessageId: null,
    lastNeed: null,
    lastSim: null,
    simFormRef: null,
    lastEligInput: null,
    lastElig: null,
    lastContact: null,
    otp: null,
    request: null,
  };
}

export function publicState(s: ConversationState): PublicState {
  return { chosen: s.chosen, request: s.request, lastSimId: s.lastSim?.id ?? null };
}

/**
 * Persistance JSON sur disque, sérialisée par une file d'écriture.
 * Suffisant pour un déploiement mono-instance ; l'interface est prévue pour être
 * remplacée par une base de données (Postgres, libSQL...).
 */
class JsonStore {
  private db: Db | null = null;
  private loading: Promise<Db> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private file = path.join(config.dataDir, "db.json");

  private async load(): Promise<Db> {
    if (this.db) return this.db;
    if (!this.loading) {
      this.loading = (async () => {
        try {
          const raw = await fs.readFile(this.file, "utf8");
          this.db = JSON.parse(raw) as Db;
        } catch {
          this.db = { version: 1, conversations: {}, users: {} };
        }
        return this.db;
      })();
    }
    return this.loading;
  }

  private async persist(): Promise<void> {
    if (!this.db) return;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = this.file + "." + process.pid + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(this.db), "utf8");
    await fs.rename(tmp, this.file);
  }

  /** Exécute une mutation de façon exclusive puis écrit sur disque. */
  private write<T>(fn: (db: Db) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const db = await this.load();
      const r = fn(db);
      await this.persist();
      return r;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private user(db: Db, userId: string): UserData {
    return (db.users[userId] ??= { favorites: [], simulations: [], requests: [] });
  }

  /* ---------- conversations ---------- */

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const db = await this.load();
    return Object.values(db.conversations)
      .filter((c) => c.userId === userId && c.messages.length > 0)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt }));
  }

  async getConversation(userId: string, id: string): Promise<Conversation | null> {
    const db = await this.load();
    const c = db.conversations[id];
    return c && c.userId === userId ? structuredClone(c) : null;
  }

  async saveConversation(conv: Conversation): Promise<void> {
    await this.write((db) => {
      db.conversations[conv.id] = structuredClone({ ...conv, updatedAt: new Date().toISOString() });
    });
  }

  async deleteConversation(userId: string, id: string): Promise<boolean> {
    return this.write((db) => {
      const c = db.conversations[id];
      if (!c || c.userId !== userId) return false;
      delete db.conversations[id];
      return true;
    });
  }

  /* ---------- favoris ---------- */

  async getFavorites(userId: string): Promise<string[]> {
    const db = await this.load();
    return [...(db.users[userId]?.favorites ?? [])];
  }

  async setFavorite(userId: string, vehicleId: string, on: boolean): Promise<string[]> {
    return this.write((db) => {
      const u = this.user(db, userId);
      u.favorites = u.favorites.filter((x) => x !== vehicleId);
      if (on) u.favorites.push(vehicleId);
      return [...u.favorites];
    });
  }

  /* ---------- simulations enregistrées ---------- */

  async getSimulations(userId: string): Promise<Simulation[]> {
    const db = await this.load();
    return structuredClone(db.users[userId]?.simulations ?? []);
  }

  async saveSimulation(userId: string, sim: Simulation): Promise<Simulation[]> {
    return this.write((db) => {
      const u = this.user(db, userId);
      const i = u.simulations.findIndex((x) => x.id === sim.id);
      if (i >= 0) u.simulations[i] = structuredClone(sim);
      else u.simulations.unshift(structuredClone(sim));
      return structuredClone(u.simulations);
    });
  }

  async deleteSimulation(userId: string, simId: string): Promise<Simulation[]> {
    return this.write((db) => {
      const u = this.user(db, userId);
      u.simulations = u.simulations.filter((x) => x.id !== simId);
      return structuredClone(u.simulations);
    });
  }

  /* ---------- demandes d'offre ---------- */

  async addRequest(userId: string, req: OfferRequest): Promise<void> {
    await this.write((db) => {
      this.user(db, userId).requests.unshift(structuredClone(req));
    });
  }

  async getRequests(userId: string): Promise<OfferRequest[]> {
    const db = await this.load();
    return structuredClone(db.users[userId]?.requests ?? []);
  }
}

const globalForStore = globalThis as unknown as { __veStore?: JsonStore };
export const store = (globalForStore.__veStore ??= new JsonStore());
