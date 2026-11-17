import type { Need } from "./catalog";
import type { EligInput, EligResult, SimParams, Simulation } from "./finance";

/* ---------------- sources documentaires ---------------- */

export interface Source {
  n: number;
  docId: string;
  title: string;
  sub: string;
  section: string;
  excerpt: string;
}

/* ---------------- suggestions ---------------- */

export type Suggestion =
  | { label: string; kind?: "message" }
  | { label: string; kind: "command"; command: "reset" | "open_sims" };

/* ---------------- blocs d'un message ---------------- */

interface B<K extends string> {
  id: string;
  kind: K;
}

export type TextBlock = B<"text"> & { text: string };
export type ReasoningBlock = B<"reasoning"> & { status: "running" | "done"; title: string; steps: string[] };
export type NeedFormBlock = B<"needForm"> & { need: Need; submitted: boolean; prefilled?: string[]; results: string[] };
export type VehiclesBlock = B<"vehicles"> & {
  within: string[];
  above: string[];
  versions: Record<string, number>;
  budget: number;
  usage: string;
};
export type NoMatchBlock = B<"noMatch"> & { formRef: BlockRef };
export type ChosenBlock = B<"chosen"> & { vehicleId: string; versionIndex: number };
export type SimFormBlock = B<"simForm"> & { params: SimParams; submitted: boolean; results: string[] };
export type SimResultBlock = B<"simResult"> & { sim: Simulation };
export type CompareBlock = B<"compare"> & { params: SimParams; durations: number[]; current: number };
export type EligFormBlock = B<"eligForm"> & { data: EligInput; submitted: boolean; results: string[] };
export type EligResultBlock = B<"eligResult"> & { result: EligResult };
export type ContactFormBlock = B<"contactForm"> & {
  contact: ContactInput;
  submitted: boolean;
  digits?: string;
  results: string[];
};
export type OtpBlock = B<"otp"> & {
  digits: string;
  creneau: string;
  status: "pending" | "verified";
  error?: string;
  locked?: boolean;
  /** Renseigné uniquement en mode démonstration (aucun SMS envoyé). */
  demoCode?: string;
  resendAvailableAt: string;
  formRef: BlockRef;
};
export type ConfirmationBlock = B<"confirmation"> & { request: OfferRequest };
export type CompareTableBlock = B<"compareTable"> & { title: string; columns: [string, string]; rows: [string, string, string][] };
export type SourcesBlock = B<"sources"> & { sources: Source[] };
export type SuggestionsBlock = B<"suggestions"> & { items: Suggestion[] };
export type NoteBlock = B<"note"> & { text: string };
export type ErrorBlock = B<"error"> & { text: string };

export type Block =
  | TextBlock
  | ReasoningBlock
  | NeedFormBlock
  | VehiclesBlock
  | NoMatchBlock
  | ChosenBlock
  | SimFormBlock
  | SimResultBlock
  | CompareBlock
  | EligFormBlock
  | EligResultBlock
  | ContactFormBlock
  | OtpBlock
  | ConfirmationBlock
  | CompareTableBlock
  | SourcesBlock
  | SuggestionsBlock
  | NoteBlock
  | ErrorBlock;

export type BlockKind = Block["kind"];

export interface BlockRef {
  messageId: string;
  blockId: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  createdAt: string;
  status: "streaming" | "done" | "error";
  blocks: Block[];
  /** Noms des pièces jointes (messages utilisateur). */
  files?: string[];
}

/* ---------------- contact & demande d'offre ---------------- */

export interface ContactInput {
  prenom: string;
  tel: string;
  creneau: string;
  consent: boolean;
}

export interface OfferRequest {
  ref: string;
  at: string;
  vehicleId: string | null;
  versionIndex: number | null;
  vlabel: string | null;
  vprice: number | null;
  sim: Simulation | null;
  elig: { lvl: EligResult["lvl"]; label: string; cap: number } | null;
  contact: { prenom: string; digits: string; creneau: string };
  day: string;
}

/* ---------------- conversation ---------------- */

/** Partie de l'état de conversation exposée au client. */
export interface PublicState {
  chosen: { vehicleId: string; versionIndex: number } | null;
  request: OfferRequest | null;
  lastSimId: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ConversationView extends ConversationSummary {
  messages: ChatMessage[];
  state: PublicState;
}

/* ---------------- protocole client / serveur ---------------- */

export interface Attachment {
  name: string;
  /** Contenu texte des petits fichiers texte, pour donner du contexte au modèle. */
  text?: string;
}

export type ChatAction =
  | { type: "need_submit"; ref: BlockRef; need: Need }
  | { type: "reopen"; ref: BlockRef }
  | { type: "choose_vehicle"; vehicleId: string; versionIndex: number }
  | { type: "sim_submit"; ref: BlockRef; params: SimParams }
  | { type: "sim_duration"; duree: number }
  | { type: "elig_submit"; ref: BlockRef; data: EligInput }
  | { type: "contact_submit"; ref: BlockRef; contact: ContactInput }
  | { type: "otp_verify"; ref: BlockRef; code: string }
  | { type: "otp_resend"; ref: BlockRef };

export type ChatInput =
  | {
      type: "message";
      text: string;
      clientMessageId?: string;
      files?: Attachment[];
      /** Fixe le véhicule choisi avant de traiter le message (ex. "Simuler" depuis une fiche). */
      setChosen?: { vehicleId: string; versionIndex: number };
    }
  | { type: "action"; action: ChatAction };

export interface ChatRequestBody {
  conversationId?: string | null;
  input: ChatInput;
}

export type ChatEvent =
  | { t: "conversation"; id: string; title: string }
  | { t: "message"; message: ChatMessage }
  | { t: "delta"; messageId: string; blockId: string; text: string }
  | { t: "remove"; messageIds: string[] }
  | { t: "state"; state: PublicState }
  | { t: "toast"; text: string }
  | { t: "simulations"; simulations: Simulation[] }
  | { t: "error"; text: string }
  | { t: "done" };

export type { Need, EligInput, EligResult, SimParams, Simulation };
