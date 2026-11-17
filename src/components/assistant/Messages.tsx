"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { Block, ChatMessage, CompareTableBlock, ReasoningBlock, Source, SourcesBlock, SuggestionsBlock } from "@/lib/domain/types";
import { Icon } from "./graphics";
import { useAssistant } from "./store";
import { useCopy } from "./ui";
import { NeedForm } from "./blocks/NeedForm";
import { ChosenView, NoMatch, VehiclesView } from "./blocks/Vehicles";
import { CompareView, EligForm, EligResultView, SimForm, SimResult } from "./blocks/Finance";
import { ConfirmationView, ContactForm, OtpView } from "./blocks/Contact";

/* ---------------- texte avec citations ---------------- */

function inline(text: string, key: string): ReactNode[] {
  // Gras markdown minimal (**texte**), le reste est rendu tel quel.
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong> : <Fragment key={`${key}-${i}`}>{part}</Fragment>,
  );
}

function TextView({ text, sources, error }: { text: string; sources: Source[] | null; error?: boolean }) {
  const { openPanel } = useAssistant();
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className={"say" + (error ? " err-msg" : "")}>
      {parts.map((p, i) => {
        const m = /^\[(\d+)\]$/.exec(p);
        const src = m && sources?.find((s) => s.n === Number(m[1]));
        if (m && src)
          return (
            <sup key={i}>
              <button type="button" aria-label={`Ouvrir la source ${src.n}`} onClick={() => openPanel({ kind: "src", source: src, key: `${src.docId}-${src.n}` })}>
                [{src.n}]
              </button>
            </sup>
          );
        return <Fragment key={i}>{inline(p, String(i))}</Fragment>;
      })}
    </p>
  );
}

/* ---------------- recherche documentaire ---------------- */

function ReasoningView({ block }: { block: ReasoningBlock }) {
  const [open, setOpen] = useState(false);
  if (block.status === "running")
    return (
      <div className="reason">
        <button type="button" aria-expanded={false} disabled>
          <span className="spin" aria-hidden="true" />
          <span>{block.title}</span>
        </button>
      </div>
    );
  return (
    <div className="reason">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon n="search" s={14} />
        <span>{block.title}</span>
        <Icon n={open ? "up" : "down"} s={14} />
      </button>
      {open && (
        <ol>
          {block.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CompareTableView({ block }: { block: CompareTableBlock }) {
  const copy = useCopy();
  return (
    <section className="card" aria-label={block.title}>
      <div className="ch">
        <h3>{block.title}</h3>
        <button type="button" className="bo" onClick={(e) => copy(block.rows.map((r) => r.join(" | ")).join("\n"), e.currentTarget)}>
          Copier
        </button>
      </div>
      <div className="cmp-row h">
        <span />
        <span>{block.columns[0]}</span>
        <span>{block.columns[1]}</span>
      </div>
      {block.rows.map((r) => (
        <div className="cmp-row" key={r[0]}>
          <span>{r[0]}</span>
          <span>{r[1]}</span>
          <span>{r[2]}</span>
        </div>
      ))}
    </section>
  );
}

function SourcesView({ block }: { block: SourcesBlock }) {
  const { openPanel, panel } = useAssistant();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="small-title">Sources</span>
      <div className="srcs">
        {block.sources.map((s) => {
          const key = `${s.docId}-${s.n}`;
          return (
            <button
              key={key}
              type="button"
              className={"src" + (panel?.kind === "src" && panel.key === key ? " on" : "")}
              onClick={() => openPanel({ kind: "src", source: s, key })}
            >
              <i>{s.n}</i>
              <em title={`${s.title} · ${s.section}`}>{block.sources.some((o) => o !== s && o.title === s.title) ? `${s.title} · ${s.section}` : s.title}</em>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SuggestionsView({ block }: { block: SuggestionsBlock }) {
  const { send, reset, openPanel } = useAssistant();
  return (
    <div className="sugg">
      {block.items.map((it) => (
        <button
          key={it.label}
          type="button"
          className="sg"
          onClick={() => {
            if (it.kind === "command") {
              if (it.command === "reset") reset();
              else openPanel({ kind: "sim" });
            } else send(it.label);
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- messages ---------------- */

function BlockView({ block, msg }: { block: Block; msg: ChatMessage }) {
  switch (block.kind) {
    case "text": {
      const sources = (msg.blocks.find((b) => b.kind === "sources") as SourcesBlock | undefined)?.sources ?? null;
      return block.text ? <TextView text={block.text} sources={sources} /> : null;
    }
    case "reasoning":
      return <ReasoningView block={block} />;
    case "needForm":
      return <NeedForm block={block} messageId={msg.id} />;
    case "vehicles":
      return <VehiclesView block={block} />;
    case "noMatch":
      return <NoMatch block={block} />;
    case "chosen":
      return <ChosenView block={block} />;
    case "simForm":
      return <SimForm block={block} messageId={msg.id} />;
    case "simResult":
      return <SimResult block={block} />;
    case "compare":
      return <CompareView block={block} />;
    case "eligForm":
      return <EligForm block={block} messageId={msg.id} />;
    case "eligResult":
      return <EligResultView block={block} />;
    case "contactForm":
      return <ContactForm block={block} messageId={msg.id} />;
    case "otp":
      return <OtpView block={block} messageId={msg.id} />;
    case "confirmation":
      return <ConfirmationView block={block} />;
    case "compareTable":
      return <CompareTableView block={block} />;
    case "sources":
      return <SourcesView block={block} />;
    case "suggestions":
      return <SuggestionsView block={block} />;
    case "note":
      return <span className="note">{block.text}</span>;
    case "error":
      return <TextView text={block.text} sources={null} error />;
  }
}

function UserMessage({ msg }: { msg: ChatMessage }) {
  const text = msg.blocks.map((b) => (b.kind === "text" ? b.text : "")).join("");
  return (
    <div className="u">
      <p>
        {text}
        {msg.files?.map((f) => `\n[Fichier] ${f}`).join("")}
      </p>
    </div>
  );
}

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  const waiting = msg.status === "streaming" && !msg.blocks.some((b) => b.kind !== "text" || b.text);
  return (
    <div className="a">
      <span className="av">
        <Icon n="bolt" s={14} w={2} />
      </span>
      <div className="body">
        {waiting && (
          <div className="typing" aria-label="L'assistant écrit">
            <i />
            <i />
            <i />
          </div>
        )}
        {msg.blocks.map((b) => (
          <BlockView key={b.id} block={b} msg={msg} />
        ))}
      </div>
    </div>
  );
}

export function MessageList() {
  const { conv, busy } = useAssistant();
  const scroller = useRef<HTMLDivElement>(null);
  const msgs = conv.messages;
  const pendingReply = busy && msgs.length > 0 && msgs[msgs.length - 1].role === "user";

  // Défilement automatique tant que l'utilisateur est proche du bas.
  const signature = msgs.map((m) => m.id + ":" + m.blocks.length + ":" + (m.blocks.at(-1)?.kind === "text" ? (m.blocks.at(-1) as { text: string }).text.length : 0)).join("|");
  const prevCount = useRef(0);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    const grew = msgs.length > prevCount.current;
    prevCount.current = msgs.length;
    if (near || grew) requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
  }, [signature, msgs.length, pendingReply]);

  return (
    <div className="scroll" ref={scroller}>
      <div className="fil">
        {msgs.map((m) =>
          m.role === "user" ? <UserMessage key={m.id} msg={m} /> : <AssistantMessage key={m.id} msg={m} />,
        )}
        {pendingReply && (
          <div className="a">
            <span className="av">
              <Icon n="bolt" s={14} w={2} />
            </span>
            <div className="body">
              <div className="typing" aria-label="L'assistant écrit">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
