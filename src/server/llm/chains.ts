import "server-only";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import type { BaseMessage } from "@langchain/core/messages";
import type { Document } from "@langchain/core/documents";
import { getChatModel } from "./model";
import { catalogContext } from "@/lib/domain/catalog";
import { DEBT_RATIO, DEFAULT_RATE } from "@/lib/domain/finance";
import type { PassageMetadata } from "../rag/retriever";

const STYLE = `Règles de style :
- Réponds en français, de façon directe et affirmative, en 2 à 5 phrases sauf si l'utilisateur demande plus de détails.
- N'utilise jamais d'emoji ni de termes hyperboliques.
- N'invente jamais de chiffre, statistique, autonomie, puissance ou prix : utilise uniquement les données fournies. Les valeurs entre crochets comme [Valeur] sont des données non encore disponibles ; dis-le simplement si on te les demande.
- Pas de listes à puces sauf si l'utilisateur les demande ; pas de titres markdown.`;

/* ---------------- chaîne conversationnelle ---------------- */

const GENERAL_SYSTEM = `Tu es "Assistant VE", l'assistant d'un distributeur automobile qui aide les particuliers à choisir une voiture électrique, à simuler son financement, à vérifier leur éligibilité et à demander une offre.

L'interface propose des parcours guidés que tu peux recommander en citant leur nom exact :
- "Trouver ma voiture électrique" : formulaire de besoin puis recommandations de modèles.
- "Simuler le crédit" : crédit classique ou location avec option d'achat, taux de démonstration ${DEFAULT_RATE} %.
- "Vérifier mon éligibilité" : estimation fondée sur un endettement maximal de ${Math.round(DEBT_RATIO * 100)} % des revenus (règle de démonstration).
- "Recevoir l'offre" : rappel par un conseiller et envoi des offres par SMS.

Catalogue de démonstration (prix en MAD) :
{catalog}

État de la conversation :
{state}

{attachments}

${STYLE}`;

const generalPrompt = ChatPromptTemplate.fromMessages([
  ["system", GENERAL_SYSTEM],
  new MessagesPlaceholder("history"),
  ["human", "{input}"],
]);

export interface GeneralInput {
  input: string;
  history: BaseMessage[];
  state: string;
  attachments: string;
}

export function streamGeneralAnswer(args: GeneralInput, signal?: AbortSignal): Promise<AsyncIterable<string>> {
  const chain = RunnableSequence.from([generalPrompt, getChatModel({ streaming: true }), new StringOutputParser()]);
  return chain.stream(
    {
      input: args.input,
      history: args.history,
      catalog: catalogContext(),
      state: args.state || "(rien de particulier)",
      attachments: args.attachments ? `Pièces jointes fournies par l'utilisateur :\n${args.attachments}` : "",
    },
    { signal },
  );
}

/* ---------------- chaîne RAG ---------------- */

const RAG_SYSTEM = `Tu es "Assistant VE". Tu réponds à la question de l'utilisateur uniquement à partir des passages numérotés de la base documentaire ci-dessous.

Passages :
{context}

Consignes :
- Appuie chaque affirmation sur un passage et ajoute sa référence juste après la phrase, au format [1], [2] ou [3]. N'utilise que les numéros fournis.
- Si les passages ne permettent pas de répondre, dis-le en une phrase et propose de reformuler.
${STYLE}`;

const ragPrompt = ChatPromptTemplate.fromMessages([
  ["system", RAG_SYSTEM],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
]);

export function formatPassages(docs: Document<PassageMetadata>[]): string {
  return docs
    .map((d, i) => `[${i + 1}] ${d.metadata.title} — ${d.metadata.section}\n${d.pageContent}`)
    .join("\n\n");
}

export function streamRagAnswer(
  args: { question: string; docs: Document<PassageMetadata>[]; history: BaseMessage[] },
  signal?: AbortSignal,
): Promise<AsyncIterable<string>> {
  const chain = RunnableSequence.from([ragPrompt, getChatModel({ streaming: true, temperature: 0.1 }), new StringOutputParser()]);
  return chain.stream({ question: args.question, context: formatPassages(args.docs), history: args.history }, { signal });
}

/**
 * Réponse extractive utilisée lorsque le modèle n'est pas configuré ou indisponible :
 * première phrase de chaque passage retenu, avec sa citation.
 */
export function extractiveAnswer(docs: Document<PassageMetadata>[]): string {
  return docs
    .map((d, i) => {
      const sentences = d.pageContent.match(/[^.!?]+[.!?]+/g) ?? [d.pageContent];
      return sentences.slice(0, 2).map((x) => x.trim()).join(" ") + ` [${i + 1}]`;
    })
    .join(" ");
}
