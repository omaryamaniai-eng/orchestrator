import "server-only";
import { randomUUID } from "node:crypto";
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { Block, BlockRef, ChatEvent, ChatMessage } from "@/lib/domain/types";
import { byId, vehicleLabel } from "@/lib/domain/catalog";
import { fmt } from "@/lib/domain/finance";
import type { Conversation } from "../store/store";
import type { CurrentUser } from "../auth";

type Emit = (e: ChatEvent) => void;
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Contexte d'un tour de conversation : mutations de la conversation + émission d'événements. */
export class TurnContext {
  constructor(
    public conv: Conversation,
    public user: CurrentUser,
    private emitFn: Emit,
    public signal?: AbortSignal,
  ) {}

  emit(e: ChatEvent) {
    this.emitFn(e);
  }

  get state() {
    return this.conv.state;
  }

  private publish(msg: ChatMessage) {
    this.emit({ t: "message", message: structuredClone(msg) });
  }

  addUser(text: string, files: string[] = [], id?: string): ChatMessage {
    const msg: ChatMessage = {
      id: id && /^[\w-]{6,64}$/.test(id) ? id : newId("m"),
      role: "user",
      createdAt: new Date().toISOString(),
      status: "done",
      blocks: [{ id: newId("b"), kind: "text", text }],
      files: files.length ? files : undefined,
    };
    this.conv.messages.push(msg);
    this.publish(msg);
    return msg;
  }

  addAssistant(): ChatMessage {
    const msg: ChatMessage = {
      id: newId("m"),
      role: "assistant",
      createdAt: new Date().toISOString(),
      status: "streaming",
      blocks: [],
    };
    this.conv.messages.push(msg);
    this.publish(msg);
    return msg;
  }

  /** Ajoute un bloc (sans id) au message et le publie. Renvoie le bloc créé. */
  add<T extends Block = Block>(msg: ChatMessage, block: WithoutId<T>): T {
    const b = { id: newId("b"), ...block } as unknown as T;
    msg.blocks.push(b);
    this.publish(msg);
    return b;
  }

  update(msg: ChatMessage) {
    this.publish(msg);
  }

  finish(msg: ChatMessage, status: ChatMessage["status"] = "done") {
    msg.status = status;
    this.publish(msg);
  }

  /** Écrit un texte rédigé côté serveur, avec un rendu progressif. */
  async say(msg: ChatMessage, text: string): Promise<void> {
    const block = this.add<Extract<Block, { kind: "text" }>>(msg, { kind: "text", text: "" });
    const step = 18;
    for (let i = 0; i < text.length; i += step) {
      const chunk = text.slice(i, i + step);
      block.text += chunk;
      this.emit({ t: "delta", messageId: msg.id, blockId: block.id, text: chunk });
      await sleep(12);
    }
  }

  /** Diffuse un flux de jetons produit par le modèle. Renvoie le texte complet. */
  async stream(msg: ChatMessage, tokens: AsyncIterable<string>): Promise<string> {
    const block = this.add<Extract<Block, { kind: "text" }>>(msg, { kind: "text", text: "" });
    for await (const chunk of tokens) {
      if (!chunk) continue;
      block.text += chunk;
      this.emit({ t: "delta", messageId: msg.id, blockId: block.id, text: chunk });
    }
    block.text = block.text.trim();
    return block.text;
  }

  find(ref: BlockRef): { msg: ChatMessage; block: Block } | null {
    const msg = this.conv.messages.find((m) => m.id === ref.messageId);
    const block = msg?.blocks.find((b) => b.id === ref.blockId);
    return msg && block ? { msg, block } : null;
  }

  /** Supprime les messages de résultat rattachés à un formulaire. */
  dropResults(block: { results: string[] }) {
    if (!block.results.length) return;
    const ids = new Set(block.results);
    this.conv.messages = this.conv.messages.filter((m) => !ids.has(m.id));
    this.emit({ t: "remove", messageIds: [...ids] });
    block.results = [];
  }

  remove(ids: string[]) {
    const set = new Set(ids);
    this.conv.messages = this.conv.messages.filter((m) => !set.has(m.id));
    this.emit({ t: "remove", messageIds: ids });
  }

  toast(text: string) {
    this.emit({ t: "toast", text });
  }

  /** Historique converti en messages LangChain (texte + résumé des éléments d'interface). */
  history(limit = 12): BaseMessage[] {
    const out: BaseMessage[] = [];
    for (const m of this.conv.messages.slice(-limit)) {
      const text = m.blocks.map(describeBlock).filter(Boolean).join("\n").trim();
      if (!text) continue;
      out.push(m.role === "user" ? new HumanMessage(text) : new AIMessage(text));
    }
    return out;
  }
}

/** Représentation textuelle d'un bloc, pour donner le contexte au modèle. */
export function describeBlock(b: Block): string {
  switch (b.kind) {
    case "text":
      return b.text;
    case "vehicles": {
      const names = [...b.within, ...b.above]
        .map((id) => {
          const v = byId(id);
          return v ? vehicleLabel(v, b.versions[id] ?? 0) : null;
        })
        .filter(Boolean);
      return `[Modèles proposés : ${names.join(", ")}]`;
    }
    case "chosen": {
      const v = byId(b.vehicleId);
      return v ? `[Véhicule choisi : ${vehicleLabel(v, b.versionIndex)}]` : "";
    }
    case "simResult":
      return `[Simulation : ${b.sim.params.type}, ${fmt(b.sim.c.m)} par mois sur ${b.sim.c.n} mois]`;
    case "eligResult":
      return `[Éligibilité : ${b.result.label}, mensualité supportable ${fmt(b.result.cap)}]`;
    case "needForm":
      return b.submitted ? `[Besoin : ${b.need.usage}, ${b.need.carros.join("/")}, ${b.need.places} places, budget ${b.need.budget} MAD]` : "[Formulaire de besoin affiché]";
    case "simForm":
      return b.submitted ? "" : "[Formulaire de simulation affiché]";
    case "eligForm":
      return b.submitted ? "" : "[Formulaire d'éligibilité affiché]";
    case "contactForm":
      return b.submitted ? "" : "[Formulaire de contact affiché]";
    case "confirmation":
      return `[Demande d'offre envoyée, référence ${b.request.ref}]`;
    default:
      return "";
  }
}
