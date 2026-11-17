import type { ChatEvent, ChatRequestBody, ConversationSummary, ConversationView, Simulation } from "@/lib/domain/types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Envoie un tour de conversation et lit le flux NDJSON d'événements. */
export async function postTurn(body: ChatRequestBody, onEvent: (e: ChatEvent) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Le serveur a répondu ${res.status}${detail ? ` : ${detail.slice(0, 200)}` : ""}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as ChatEvent);
    }
  }
  const rest = buf.trim();
  if (rest) onEvent(JSON.parse(rest) as ChatEvent);
}

export const api = {
  me: () => fetch("/api/me").then((r) => json<{ id: string; firstName: string; lastName: string }>(r)),
  health: () => fetch("/api/health").then((r) => json<{ llm: { model: string; configured: boolean } }>(r)),
  conversations: () => fetch("/api/conversations").then((r) => json<{ conversations: ConversationSummary[] }>(r)),
  conversation: (id: string) => fetch(`/api/conversations/${encodeURIComponent(id)}`).then((r) => json<ConversationView>(r)),
  deleteConversation: (id: string) => fetch(`/api/conversations/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) => json<{ ok: boolean }>(r)),
  favorites: () => fetch("/api/favorites").then((r) => json<{ favorites: string[] }>(r)),
  setFavorite: (vehicleId: string, on: boolean) =>
    fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicleId, on }) }).then((r) =>
      json<{ favorites: string[] }>(r),
    ),
  simulations: () => fetch("/api/simulations").then((r) => json<{ simulations: Simulation[] }>(r)),
  saveSimulation: (sim: Simulation) =>
    fetch("/api/simulations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sim) }).then((r) =>
      json<{ simulations: Simulation[] }>(r),
    ),
  deleteSimulation: (id: string) =>
    fetch(`/api/simulations?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) => json<{ simulations: Simulation[] }>(r)),
};
