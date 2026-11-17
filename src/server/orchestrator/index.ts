import "server-only";
import { z } from "zod";
import { TurnContext, newId } from "./context";
import * as F from "./flows";
import { routeMessage } from "../llm/router";
import { emptyState, publicState, store, type Conversation } from "../store/store";
import type { CurrentUser } from "../auth";
import type { ChatEvent } from "@/lib/domain/types";

const Ref = z.object({ messageId: z.string().max(64), blockId: z.string().max(64) });
const Loose = z.record(z.string(), z.unknown());

const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("need_submit"), ref: Ref, need: Loose }),
  z.object({ type: z.literal("reopen"), ref: Ref }),
  z.object({ type: z.literal("choose_vehicle"), vehicleId: z.string().max(16), versionIndex: z.number().int() }),
  z.object({ type: z.literal("sim_submit"), ref: Ref, params: Loose }),
  z.object({ type: z.literal("sim_duration"), duree: z.number().int() }),
  z.object({ type: z.literal("elig_submit"), ref: Ref, data: Loose }),
  z.object({ type: z.literal("contact_submit"), ref: Ref, contact: Loose }),
  z.object({ type: z.literal("otp_verify"), ref: Ref, code: z.string().max(12) }),
  z.object({ type: z.literal("otp_resend"), ref: Ref }),
]);

export const ChatRequestSchema = z.object({
  conversationId: z.string().max(64).nullish(),
  input: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("message"),
      text: z.string().max(4000),
      clientMessageId: z.string().max(64).optional(),
      files: z
        .array(z.object({ name: z.string().max(200), text: z.string().max(20000).optional() }))
        .max(5)
        .optional(),
      setChosen: z.object({ vehicleId: z.string().max(16), versionIndex: z.number().int() }).optional(),
    }),
    z.object({ type: z.literal("action"), action: ActionSchema }),
  ]),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

function title(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 38 ? t.slice(0, 36) + "…" : t;
}

/** Traite un tour : message libre (routé par le modèle) ou action d'interface. */
export async function handleTurn(req: ChatRequest, user: CurrentUser, emit: (e: ChatEvent) => void, signal?: AbortSignal) {
  let conv: Conversation | null = req.conversationId ? await store.getConversation(user.id, req.conversationId) : null;
  if (!conv) {
    const now = new Date().toISOString();
    conv = { id: newId("c"), userId: user.id, title: "Nouvelle conversation", createdAt: now, updatedAt: now, messages: [], state: emptyState() };
  }
  const ctx = new TurnContext(conv, user, emit, signal);
  const input = req.input;

  if (input.type === "message" && conv.messages.length === 0) {
    conv.title = title(input.text || "Pièce jointe envoyée");
  }
  emit({ t: "conversation", id: conv.id, title: conv.title });

  try {
    if (input.type === "message") {
      const text = input.text.trim() || "Pièce jointe envoyée";
      const files = input.files ?? [];
      if (input.setChosen) F.setChosenSilently(ctx, input.setChosen.vehicleId, input.setChosen.versionIndex);
      ctx.addUser(text, files.map((f) => f.name), input.clientMessageId);
      const attachments = files
        .filter((f) => f.text)
        .map((f) => `--- ${f.name} ---\n${f.text!.slice(0, 8000)}`)
        .join("\n\n");

      const route = await routeMessage(text, ctx.history().slice(0, -1));
      switch (route.intent) {
        case "recommend":
          await F.recommendFlow(ctx, route.need);
          break;
        case "rag":
          await F.ragFlow(ctx, text);
          break;
        case "simulate":
          await F.simulateFlow(ctx);
          break;
        case "compare":
          await F.compareFlow(ctx);
          break;
        case "eligibility":
          await F.eligibilityFlow(ctx);
          break;
        case "contact":
          await F.contactFlow(ctx);
          break;
        case "viewer3d":
          await F.viewer3dFlow(ctx);
          break;
        default:
          await F.generalFlow(ctx, text, attachments);
      }
    } else {
      const a = input.action;
      switch (a.type) {
        case "need_submit":
          await F.needSubmit(ctx, a.ref, a.need as never);
          break;
        case "reopen":
          await F.reopen(ctx, a.ref);
          break;
        case "choose_vehicle":
          await F.chooseVehicle(ctx, a.vehicleId, a.versionIndex);
          break;
        case "sim_submit":
          await F.simSubmit(ctx, a.ref, a.params as never);
          break;
        case "sim_duration":
          await F.simDuration(ctx, a.duree);
          break;
        case "elig_submit":
          await F.eligSubmit(ctx, a.ref, a.data as never);
          break;
        case "contact_submit":
          await F.contactSubmit(ctx, a.ref, a.contact as never);
          break;
        case "otp_verify":
          await F.otpVerify(ctx, a.ref, a.code);
          break;
        case "otp_resend":
          await F.otpResend(ctx, a.ref);
          break;
      }
    }
  } catch (err) {
    if (err instanceof F.FlowError) emit({ t: "error", text: err.message });
    else {
      console.error("[orchestrator]", err);
      // Clôture propre des messages restés en cours de génération.
      for (const m of conv.messages)
        if (m.status === "streaming") {
          m.blocks.push({ id: newId("b"), kind: "error", text: "La réponse a été interrompue. Réessayez dans un instant." });
          m.status = "error";
          emit({ t: "message", message: structuredClone(m) });
        }
      emit({ t: "error", text: "Une erreur est survenue pendant le traitement de votre demande." });
    }
  } finally {
    for (const m of conv.messages) if (m.status === "streaming") m.status = "done";
    if (conv.messages.length) await store.saveConversation(conv);
    emit({ t: "state", state: publicState(conv.state) });
    emit({ t: "done" });
  }
}
