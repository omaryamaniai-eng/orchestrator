import { BaseRetriever, type BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import { KNOWLEDGE, type KnowledgeDoc } from "./knowledge";

export interface PassageMetadata {
  docId: string;
  title: string;
  sub: string;
  section: string;
  score: number;
  [key: string]: unknown;
}

const STOP = new Set(
  (
    "a au aux avec ce ces cet cette dans de des du elle en et est etre il ils je la le les leur lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous y c d j l m n s t quel quelle quels quelles quoi comment est-ce entre plus moins tres sont ont fait faire peut peux veux voudrais the of and"
  ).split(" "),
);

/** Synonymes et acronymes courants, pour rapprocher la requête du vocabulaire documentaire. */
const EXPAND: Record<string, string[]> = {
  erev: ["reev", "prolongateur"],
  reev: ["prolongateur"],
  phev: ["hybride", "rechargeable"],
  hev: ["hybride"],
  bev: ["electrique", "batterie"],
  borne: ["recharge"],
  charger: ["recharge"],
  rechargee: ["recharge"],
  loa: ["location", "option", "achat"],
  credit: ["financement"],
  range: ["autonomie"],
};

export function tokenize(text: string): string[] {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
  return base;
}

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ment")) w = w.slice(0, -4);
  if (w.length > 3 && (w.endsWith("s") || w.endsWith("x"))) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

function expand(tokens: string[]): string[] {
  const out = [...tokens];
  for (const t of tokens) for (const x of EXPAND[t] ?? []) out.push(...tokenize(x));
  return out;
}

interface Passage {
  doc: KnowledgeDoc;
  section: string;
  text: string;
  tf: Map<string, number>;
  len: number;
}

export interface Bm25RetrieverInput extends BaseRetrieverInput {
  k?: number;
  /** Score minimal pour qu'un passage soit retenu. */
  minScore?: number;
  docs?: KnowledgeDoc[];
}

/**
 * Retriever LangChain en mémoire, score BM25 sur les sections de la base documentaire.
 * Aucun service d'embedding externe n'est requis ; il peut être remplacé par un
 * VectorStore LangChain sans changer la chaîne RAG.
 */
export class Bm25Retriever extends BaseRetriever<PassageMetadata> {
  lc_namespace = ["assistant_ve", "retrievers"];
  k: number;
  minScore: number;
  private passages: Passage[];
  private df = new Map<string, number>();
  private avgLen: number;

  constructor(fields: Bm25RetrieverInput = {}) {
    super(fields);
    this.k = fields.k ?? 3;
    this.minScore = fields.minScore ?? 0.5;
    const docs = fields.docs ?? KNOWLEDGE;
    this.passages = docs.flatMap((doc) =>
      doc.sections.map((s) => {
        const toks = tokenize(`${doc.title} ${s.title} ${s.title} ${s.text}`);
        const tf = new Map<string, number>();
        for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
        return { doc, section: s.title, text: s.text, tf, len: toks.length };
      }),
    );
    for (const p of this.passages) for (const t of p.tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    this.avgLen = this.passages.reduce((a, p) => a + p.len, 0) / Math.max(1, this.passages.length);
  }

  get size(): number {
    return this.passages.length;
  }

  score(query: string): { p: Passage; score: number }[] {
    const q = [...new Set(expand(tokenize(query)))];
    const N = this.passages.length;
    const k1 = 1.4;
    const b = 0.75;
    return this.passages
      .map((p) => {
        let score = 0;
        for (const t of q) {
          const f = p.tf.get(t);
          if (!f) continue;
          const n = this.df.get(t) ?? 0;
          const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
          score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * p.len) / this.avgLen)));
        }
        return { p, score };
      })
      .filter((x) => x.score >= this.minScore)
      .sort((a, b2) => b2.score - a.score);
  }

  async _getRelevantDocuments(query: string): Promise<Document<PassageMetadata>[]> {
    return this.score(query).slice(0, this.k).map(
      ({ p, score }) =>
        new Document<PassageMetadata>({
          pageContent: p.text,
          metadata: { docId: p.doc.id, title: p.doc.title, sub: p.doc.sub, section: p.section, score },
        }),
    );
  }
}
