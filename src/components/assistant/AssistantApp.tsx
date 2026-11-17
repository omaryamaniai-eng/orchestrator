"use client";

import { useEffect, useRef, useState } from "react";
import type { Attachment } from "@/lib/domain/types";
import { Icon } from "./graphics";
import { MessageList } from "./Messages";
import { SidePanel, panelHidesMain } from "./Panel";
import { AssistantProvider, useAssistant } from "./store";

const TEXT_EXT = /\.(txt|md|csv|json|tsv|log)$/i;
const MAX_TEXT = 100_000;

async function readAttachment(f: File): Promise<Attachment> {
  if ((f.type.startsWith("text/") || TEXT_EXT.test(f.name) || f.type === "application/json") && f.size <= MAX_TEXT) {
    try {
      return { name: f.name, text: await f.text() };
    } catch {
      /* lecture impossible : nom seul */
    }
  }
  return { name: f.name };
}

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function Composer({ big }: { big: boolean }) {
  const { send, busy, toast } = useAssistant();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [listening, setListening] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const rec = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(160, el.scrollHeight) + "px";
  }, [text]);

  useEffect(() => {
    ta.current?.focus();
  }, [big]);

  const canSend = (!!text.trim() || files.length > 0) && !busy;

  const submit = async () => {
    if (!canSend) return;
    const atts = await Promise.all(files.map(readAttachment));
    send(text, { files: atts.length ? atts : undefined });
    setText("");
    setFiles([]);
  };

  const toggleMic = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return toast("La dictée n'est pas prise en charge par ce navigateur.");
    const r = new Ctor();
    r.lang = "fr-FR";
    r.interimResults = true;
    r.continuous = false;
    const base = text ? text.replace(/\s*$/, " ") : "";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setText(base + t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => {
      setListening(false);
      toast("La dictée n'a pas pu démarrer.");
    };
    rec.current = r;
    setListening(true);
    r.start();
  };

  return (
    <div className={"composer" + (big ? " big" : "")}>
      {files.length > 0 && (
        <div className="attach">
          {files.map((f, i) => (
            <span className="att" key={f.name + i}>
              <Icon n="file" s={12} />
              {f.name}
              <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => setFiles((x) => x.filter((_, k) => k !== i))}>
                <Icon n="close" s={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="crow">
        <button type="button" className="ib" aria-label="Ajouter un fichier" onClick={() => fileIn.current?.click()}>
          <Icon n="plus" />
        </button>
        <input
          ref={fileIn}
          type="file"
          className="sr"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            setFiles((x) => [...x, ...list].slice(0, 5));
            e.target.value = "";
          }}
        />
        <textarea
          ref={ta}
          rows={1}
          aria-label="Votre message"
          placeholder={big ? "Quelle voiture électrique recherchez-vous ?" : "Écrire un message"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <button type="button" className={"ib" + (listening ? " mic-on" : "")} aria-label={listening ? "Arrêter la dictée" : "Dicter"} aria-pressed={listening} onClick={toggleMic}>
          <Icon n={listening ? "stop" : "mic"} />
        </button>
        <button type="button" className="send" aria-label="Envoyer" disabled={!canSend} onClick={() => void submit()}>
          <Icon n="send" w={2} />
        </button>
      </div>
    </div>
  );
}

function Sidebar() {
  const { user, conv, conversations, reset, openConversation, deleteConversation, llm } = useAssistant();
  const initials = user ? (user.firstName[0] ?? "") + (user.lastName[0] ?? "") : "";
  const list = conversations.filter((c) => c.id !== conv.id);
  return (
    <aside className="side" aria-label="Conversations">
      <div className="brand">
        <span className="logo">
          <Icon n="bolt" s={14} w={2} />
        </span>
        Assistant VE
      </div>
      <button type="button" className="newchat" onClick={reset}>
        <Icon n="plus" s={14} w={2.2} />
        Nouvelle conversation
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
        <span className="rec-title">Récents</span>
        <div className="recents">
          {conv.id && conv.title && (
            <div className="recent-row">
              <button type="button" className="recent on" aria-current="true">
                {conv.title}
              </button>
            </div>
          )}
          {list.map((c) => (
            <div className="recent-row" key={c.id}>
              <button type="button" className="recent" title={c.title} onClick={() => void openConversation(c.id)}>
                {c.title}
              </button>
              <button type="button" className="del" aria-label={`Supprimer ${c.title}`} title="Supprimer" onClick={() => void deleteConversation(c.id)}>
                <Icon n="close" s={12} />
              </button>
            </div>
          ))}
          {!conv.id && !list.length && <span className="note" style={{ padding: "4px 10px" }}>Aucune conversation</span>}
        </div>
      </div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {llm && (
          <span className={"llm-status" + (llm.configured ? "" : " off")} title={llm.configured ? `Modèle : ${llm.model}` : "Clé OpenRouter absente : routage par règles et réponses extractives"}>
            <i />
            {llm.configured ? llm.model : "Modèle non configuré"}
          </span>
        )}
        <div className="profile" style={{ marginTop: 0 }}>
          <span className="avatar">{initials.replace(/[[\]]/g, "") || "PN"}</span>
          {user ? `${user.firstName} ${user.lastName}` : ""}
        </div>
      </div>
    </aside>
  );
}

function Shell() {
  const { conv, panel, expanded, openPanel, user, toastText } = useAssistant();
  const started = conv.messages.length > 0;
  const hidden = panelHidesMain(panel, expanded);
  return (
    <div className="app">
      <Sidebar />
      <section className={"main" + (hidden ? " hidden" : "")}>
        <header className="top">
          <span className="top-title">{conv.title ?? "Nouvelle conversation"}</span>
          <div className="quick">
            <button type="button" className={"ib" + (panel?.kind === "fav" ? " on" : "")} aria-label="Mes véhicules favoris" title="Mes véhicules favoris" onClick={() => openPanel({ kind: "fav" })}>
              <Icon n="heart" />
            </button>
            <button type="button" className={"ib" + (panel?.kind === "sim" ? " on" : "")} aria-label="Mes simulations" title="Mes simulations" onClick={() => openPanel({ kind: "sim" })}>
              <Icon n="calc" />
            </button>
          </div>
        </header>
        {started ? (
          <>
            <MessageList />
            <div className="composer-wrap">
              <Composer big={false} />
            </div>
          </>
        ) : (
          <div className="welcome">
            <h1>
              Bonjour <span>{user?.firstName ?? ""}</span>, trouvons votre voiture électrique
            </h1>
            <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <Composer big />
            </div>
          </div>
        )}
      </section>
      <SidePanel />
      <div className={"toast" + (toastText ? " show" : "")} role="status" aria-live="polite">
        {toastText}
      </div>
    </div>
  );
}

export default function AssistantApp() {
  return (
    <AssistantProvider>
      <Shell />
    </AssistantProvider>
  );
}
