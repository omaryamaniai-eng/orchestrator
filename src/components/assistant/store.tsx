"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, postTurn } from "./api";
import type {
  Attachment,
  ChatAction,
  ChatEvent,
  ChatMessage,
  ConversationSummary,
  PublicState,
  Simulation,
  Source,
} from "@/lib/domain/types";

export type Panel =
  | { kind: "fiche"; id: string }
  | { kind: "viewer"; id: string }
  | { kind: "src"; source: Source; key: string }
  | { kind: "fav" }
  | { kind: "sim" }
  | { kind: "recap" }
  | { kind: "cgu"; blockId: string }
  | null;

interface ConvState {
  id: string | null;
  title: string | null;
  messages: ChatMessage[];
  state: PublicState;
}

const EMPTY_STATE: PublicState = { chosen: null, request: null, lastSimId: null };
const emptyConv = (): ConvState => ({ id: null, title: null, messages: [], state: EMPTY_STATE });

interface Ctx {
  user: { firstName: string; lastName: string } | null;
  llm: { model: string; configured: boolean } | null;
  conv: ConvState;
  conversations: ConversationSummary[];
  busy: boolean;
  favorites: string[];
  simulations: Simulation[];
  versions: Record<string, number>;
  panel: Panel;
  expanded: boolean;
  toastText: string | null;
  cguAccepted: Record<string, boolean>;
  send: (text: string, opts?: { files?: Attachment[]; setChosen?: { vehicleId: string; versionIndex: number } }) => void;
  act: (action: ChatAction) => void;
  reset: () => void;
  openConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  openPanel: (p: Exclude<Panel, null>) => void;
  closePanel: () => void;
  setExpanded: (on: boolean) => void;
  toggleFavorite: (id: string) => void;
  toggleSaveSim: (sim: Simulation) => void;
  removeSim: (id: string) => void;
  setVersion: (id: string, i: number) => void;
  toast: (t: string) => void;
  acceptCgu: (blockId: string) => void;
  versionOf: (id: string) => number;
}

const AssistantContext = createContext<Ctx | null>(null);

export function useAssistant(): Ctx {
  const c = useContext(AssistantContext);
  if (!c) throw new Error("useAssistant doit être utilisé dans AssistantProvider");
  return c;
}

function applyEvent(conv: ConvState, e: ChatEvent): ConvState {
  switch (e.t) {
    case "conversation":
      return { ...conv, id: e.id, title: e.title };
    case "message": {
      const i = conv.messages.findIndex((m) => m.id === e.message.id);
      const messages = [...conv.messages];
      if (i >= 0) messages[i] = e.message;
      else messages.push(e.message);
      return { ...conv, messages };
    }
    case "delta":
      return {
        ...conv,
        messages: conv.messages.map((m) =>
          m.id !== e.messageId
            ? m
            : { ...m, blocks: m.blocks.map((b) => (b.id === e.blockId && b.kind === "text" ? { ...b, text: b.text + e.text } : b)) },
        ),
      };
    case "remove": {
      const ids = new Set(e.messageIds);
      return { ...conv, messages: conv.messages.filter((m) => !ids.has(m.id)) };
    }
    case "state":
      return { ...conv, state: e.state };
    default:
      return conv;
  }
}

/** Versions par défaut proposées dans les recommandations, puis version du véhicule choisi. */
function versionsFrom(messages: ChatMessage[], state: PublicState): Record<string, number> {
  const v: Record<string, number> = {};
  for (const m of messages) for (const b of m.blocks) if (b.kind === "vehicles") Object.assign(v, b.versions);
  if (state.chosen) v[state.chosen.vehicleId] = state.chosen.versionIndex;
  return v;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Ctx["user"]>(null);
  const [llm, setLlm] = useState<Ctx["llm"]>(null);
  const [conv, setConv] = useState<ConvState>(emptyConv);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [panel, setPanel] = useState<Panel>(null);
  const [expanded, setExpanded] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [cguAccepted, setCguAccepted] = useState<Record<string, boolean>>({});

  const convRef = useRef(conv);
  convRef.current = conv;
  const queue = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const seenVehicleBlocks = useRef(new Set<string>());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((t: string) => {
    setToastText(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(null), 2600);
  }, []);

  const refreshConversations = useCallback(() => {
    api.conversations().then((r) => setConversations(r.conversations), () => undefined);
  }, []);

  useEffect(() => {
    api.me().then(setUser, () => setUser({ firstName: "[Prénom]", lastName: "[Nom]" }));
    api.health().then((h) => setLlm(h.llm), () => undefined);
    api.favorites().then((r) => setFavorites(r.favorites), () => undefined);
    api.simulations().then((r) => setSimulations(r.simulations), () => undefined);
    refreshConversations();
  }, [refreshConversations]);

  const onEvent = useCallback(
    (gen: number, e: ChatEvent) => {
      if (gen !== generation.current) return; // conversation quittée entre-temps
      if (e.t === "toast") return toast(e.text);
      if (e.t === "error") return toast(e.text);
      if (e.t === "simulations") return setSimulations(e.simulations);
      if (e.t === "message") {
        for (const b of e.message.blocks)
          if (b.kind === "vehicles" && !seenVehicleBlocks.current.has(b.id)) {
            seenVehicleBlocks.current.add(b.id);
            setVersions((v) => ({ ...v, ...b.versions }));
          }
      }
      if (e.t === "done") return;
      setConv((c) => applyEvent(c, e));
    },
    [toast],
  );

  /** Les tours sont sérialisés : une action attend la fin du tour précédent. */
  const enqueue = useCallback(
    (body: Parameters<typeof postTurn>[0] | (() => Parameters<typeof postTurn>[0]), optimistic?: ChatMessage) => {
      const gen = generation.current;
      if (optimistic) setConv((c) => ({ ...c, messages: [...c.messages, optimistic] }));
      queue.current = queue.current.then(async () => {
        if (gen !== generation.current) return;
        setBusy(true);
        const payload = typeof body === "function" ? body() : body;
        try {
          await postTurn({ ...payload, conversationId: convRef.current.id }, (e) => onEvent(gen, e));
        } catch (err) {
          console.error(err);
          if (gen === generation.current) toast("Connexion au serveur impossible. Réessayez.");
        } finally {
          if (gen === generation.current) {
            setBusy(false);
            refreshConversations();
          }
        }
      });
    },
    [onEvent, refreshConversations, toast],
  );

  const send: Ctx["send"] = useCallback(
    (text, opts = {}) => {
      const t = text.trim() || (opts.files?.length ? "Pièce jointe envoyée" : "");
      if (!t) return;
      const id = "m_c" + Math.random().toString(36).slice(2, 12);
      const optimistic: ChatMessage = {
        id,
        role: "user",
        createdAt: new Date().toISOString(),
        status: "done",
        blocks: [{ id: id + "_t", kind: "text", text: t }],
        files: opts.files?.map((f) => f.name),
      };
      if (opts.setChosen) setVersions((v) => ({ ...v, [opts.setChosen!.vehicleId]: opts.setChosen!.versionIndex }));
      enqueue({ input: { type: "message", text: t, clientMessageId: id, files: opts.files, setChosen: opts.setChosen } }, optimistic);
    },
    [enqueue],
  );

  const act: Ctx["act"] = useCallback((action) => enqueue({ input: { type: "action", action } }), [enqueue]);

  const closePanel = useCallback(() => {
    setPanel(null);
    setExpanded(false);
  }, []);

  const reset = useCallback(() => {
    generation.current++;
    queue.current = Promise.resolve();
    seenVehicleBlocks.current = new Set();
    setBusy(false);
    setConv(emptyConv());
    setVersions({});
    closePanel();
    refreshConversations();
  }, [closePanel, refreshConversations]);

  const openConversation = useCallback(
    async (id: string) => {
      if (id === convRef.current.id) return;
      const view = await api.conversation(id).catch(() => null);
      if (!view) return toast("Impossible de charger cette conversation.");
      generation.current++;
      queue.current = Promise.resolve();
      setBusy(false);
      seenVehicleBlocks.current = new Set(view.messages.flatMap((m) => m.blocks.filter((b) => b.kind === "vehicles").map((b) => b.id)));
      setVersions(versionsFrom(view.messages, view.state));
      setConv({ id: view.id, title: view.title, messages: view.messages, state: view.state });
      closePanel();
    },
    [closePanel, toast],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await api.deleteConversation(id).catch(() => null);
      if (convRef.current.id === id) reset();
      else refreshConversations();
      toast("Conversation supprimée.");
    },
    [refreshConversations, reset, toast],
  );

  const panelRef = useRef(panel);
  panelRef.current = panel;
  const openPanel = useCallback((p: Exclude<Panel, null>) => {
    const cur = panelRef.current;
    setExpanded(false);
    // Les raccourcis Favoris / Simulations fonctionnent en bascule.
    setPanel(cur && cur.kind === p.kind && (p.kind === "fav" || p.kind === "sim") ? null : p);
  }, []);

  const toggleFavorite = useCallback(
    (id: string) => {
      const on = !favorites.includes(id);
      setFavorites((f) => (on ? [...f, id] : f.filter((x) => x !== id)));
      toast(on ? "Ajouté à vos favoris." : "Retiré de vos favoris.");
      api.setFavorite(id, on).then(
        (r) => setFavorites(r.favorites),
        () => toast("Le favori n'a pas pu être enregistré."),
      );
    },
    [favorites, toast],
  );

  const toggleSaveSim = useCallback(
    (sim: Simulation) => {
      const saved = simulations.some((s) => s.id === sim.id);
      setSimulations((list) => (saved ? list.filter((s) => s.id !== sim.id) : [sim, ...list]));
      toast(saved ? "Simulation retirée de Mes simulations." : "Simulation enregistrée dans Mes simulations.");
      (saved ? api.deleteSimulation(sim.id) : api.saveSimulation(sim)).then(
        (r) => setSimulations(r.simulations),
        () => toast("La simulation n'a pas pu être enregistrée."),
      );
    },
    [simulations, toast],
  );

  const removeSim = useCallback(
    (id: string) => {
      setSimulations((list) => list.filter((s) => s.id !== id));
      toast("Simulation supprimée.");
      api.deleteSimulation(id).then((r) => setSimulations(r.simulations), () => undefined);
    },
    [toast],
  );

  const setVersion = useCallback((id: string, i: number) => setVersions((v) => ({ ...v, [id]: i })), []);
  const versionOf = useCallback((id: string) => versions[id] ?? 0, [versions]);
  const acceptCgu = useCallback((blockId: string) => setCguAccepted((c) => ({ ...c, [blockId]: true })), []);

  const value = useMemo<Ctx>(
    () => ({
      user,
      llm,
      conv,
      conversations,
      busy,
      favorites,
      simulations,
      versions,
      panel,
      expanded,
      toastText,
      cguAccepted,
      send,
      act,
      reset,
      openConversation,
      deleteConversation,
      openPanel,
      closePanel,
      setExpanded,
      toggleFavorite,
      toggleSaveSim,
      removeSim,
      setVersion,
      toast,
      acceptCgu,
      versionOf,
    }),
    [
      user,
      llm,
      conv,
      conversations,
      busy,
      favorites,
      simulations,
      versions,
      panel,
      expanded,
      toastText,
      cguAccepted,
      send,
      act,
      reset,
      openConversation,
      deleteConversation,
      openPanel,
      closePanel,
      toggleFavorite,
      toggleSaveSim,
      removeSim,
      setVersion,
      toast,
      acceptCgu,
      versionOf,
    ],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
