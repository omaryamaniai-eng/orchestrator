"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CRENEAUX, fmt, normTel, telFmt } from "@/lib/domain/finance";
import type { ConfirmationBlock, ContactFormBlock, ContactInput, OtpBlock } from "@/lib/domain/types";
import { useAssistant } from "../store";
import { Chips, SumCard, Tile } from "../ui";

export function ContactForm({ block, messageId }: { block: ContactFormBlock; messageId: string }) {
  const { act, busy } = useAssistant();
  const ref = { messageId, blockId: block.id };
  if (block.submitted && block.digits) {
    return (
      <SumCard
        title="Vos coordonnées"
        label="Modifier le numéro"
        disabled={busy}
        onEdit={() => act({ type: "reopen", ref })}
        items={[
          ["Prénom", block.contact.prenom],
          ["Téléphone", telFmt(block.digits)],
          ["Créneau de rappel", block.contact.creneau],
        ]}
      />
    );
  }
  return <ContactEditor key={block.id} block={block} onSubmit={(contact) => act({ type: "contact_submit", ref, contact })} />;
}

function ContactEditor({ block, onSubmit }: { block: ContactFormBlock; onSubmit: (c: ContactInput) => void }) {
  const { openPanel, cguAccepted, busy } = useAssistant();
  const [c, setC] = useState<ContactInput>(() => ({ ...block.contact, consent: false }));
  const [errors, setErrors] = useState<{ prenom?: string; tel?: string }>({});
  const accepted = cguAccepted[block.id];

  useEffect(() => {
    if (accepted) setC((x) => ({ ...x, consent: true }));
  }, [accepted]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!c.consent) return;
    const errs = {
      prenom: c.prenom.trim() ? undefined : "Indiquez votre prénom.",
      tel: normTel(c.tel) ? undefined : "Numéro invalide : 9 chiffres commençant par 6 ou 7.",
    };
    setErrors(errs);
    if (!errs.prenom && !errs.tel) onSubmit({ ...c, prenom: c.prenom.trim() });
  };

  const telId = `tel-${block.id}`;
  const okId = `ok-${block.id}`;
  return (
    <form className="card form" noValidate onSubmit={submit}>
      <div className="ch">
        <h3>Vos coordonnées</h3>
      </div>
      <div className="cb grid2">
        <label className="lbl">
          Prénom
          <input
            className={"inp" + (errors.prenom ? " bad" : "")}
            autoComplete="given-name"
            placeholder="Votre prénom"
            value={c.prenom}
            onChange={(e) => {
              setErrors((x) => ({ ...x, prenom: undefined }));
              setC((x) => ({ ...x, prenom: e.target.value }));
            }}
          />
          {errors.prenom && <span className="err">{errors.prenom}</span>}
        </label>
        <div className="lbl">
          <label htmlFor={telId}>Numéro de téléphone</label>
          <span style={{ display: "flex", gap: 6 }}>
            <select className="inp" aria-label="Indicatif" style={{ width: 84, flexShrink: 0 }}>
              <option>+212</option>
            </select>
            <input
              className={"inp" + (errors.tel ? " bad" : "")}
              id={telId}
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="6 12 34 56 78"
              value={c.tel}
              onChange={(e) => {
                setErrors((x) => ({ ...x, tel: undefined }));
                setC((x) => ({ ...x, tel: e.target.value }));
              }}
            />
          </span>
          {errors.tel && <span className="err">{errors.tel}</span>}
        </div>
        <fieldset className="full">
          <legend>Créneau de rappel</legend>
          <Chips options={CRENEAUX} value={c.creneau as (typeof CRENEAUX)[number]} onChange={(v) => setC((x) => ({ ...x, creneau: v }))} />
        </fieldset>
        <div className="full" style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#334155" }}>
          <input
            type="checkbox"
            id={okId}
            checked={c.consent}
            onChange={(e) => setC((x) => ({ ...x, consent: e.target.checked }))}
            style={{ width: 16, height: 16, margin: "2px 0 0", accentColor: "#2563eb", flexShrink: 0 }}
          />
          <span>
            <label htmlFor={okId} style={{ cursor: "pointer" }}>
              J&apos;accepte d&apos;être contacté au sujet de cette offre.
            </label>{" "}
            <button type="button" className="lnk" onClick={() => openPanel({ kind: "cgu", blockId: block.id })}>
              Voir les conditions
            </button>
          </span>
        </div>
      </div>
      <div className="cf">
        <button type="submit" className="btn" disabled={!c.consent || busy}>
          Envoyer le code
        </button>
      </div>
    </form>
  );
}

export function OtpView({ block, messageId }: { block: OtpBlock; messageId: string }) {
  const { act, busy } = useAssistant();
  const ref = { messageId, blockId: block.id };
  if (block.status === "verified") {
    return (
      <SumCard
        title="Numéro vérifié"
        label="Modifier le numéro"
        disabled={busy}
        onEdit={() => act({ type: "reopen", ref: block.formRef })}
        items={[
          ["Téléphone", telFmt(block.digits)],
          ["Créneau de rappel", block.creneau],
        ]}
      />
    );
  }
  return <OtpEditor key={block.id + block.resendAvailableAt} block={block} refs={ref} />;
}

function OtpEditor({ block, refs }: { block: OtpBlock; refs: { messageId: string; blockId: string } }) {
  const { act, busy } = useAssistant();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [now, setNow] = useState(() => Date.now());
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const lastError = useRef(block.error);

  useEffect(() => {
    boxes.current[0]?.focus();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Code refusé : on vide les cases pour une nouvelle saisie.
  useEffect(() => {
    if (block.error && block.error !== lastError.current) {
      setDigits(["", "", "", "", "", ""]);
      boxes.current[0]?.focus();
    }
    lastError.current = block.error;
  }, [block.error]);

  const left = Math.max(0, Math.ceil((new Date(block.resendAvailableAt).getTime() - now) / 1000));
  const code = digits.join("");

  const setAt = (i: number, v: string) => setDigits((d) => d.map((x, k) => (k === i ? v : x)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length === 6 && !block.locked) act({ type: "otp_verify", ref: refs, code });
  };

  const gid = `otp-${block.id}`;
  return (
    <form className="card form" noValidate onSubmit={submit}>
      <div className="ch">
        <h3>Vérification du numéro</h3>
      </div>
      <div className="cb" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span id={gid} style={{ fontSize: 13, fontWeight: 500 }}>
          Code reçu par SMS
        </span>
        <div className="otp" role="group" aria-labelledby={gid}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              className={"inp" + (block.error ? " bad" : "")}
              inputMode="numeric"
              maxLength={1}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Chiffre ${i + 1}`}
              value={d}
              disabled={block.locked}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(-1);
                setAt(i, v);
                if (v && i < 5) boxes.current[i + 1]?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !d && i > 0) {
                  setAt(i - 1, "");
                  boxes.current[i - 1]?.focus();
                } else if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
                else if (e.key === "ArrowRight" && i < 5) boxes.current[i + 1]?.focus();
              }}
              onPaste={(e) => {
                const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                if (!t) return;
                e.preventDefault();
                setDigits((cur) => cur.map((x, k) => t[k] ?? x));
                boxes.current[Math.min(t.length, 5)]?.focus();
              }}
            />
          ))}
        </div>
        {block.error && <span className="err">{block.error}</span>}
        <div style={{ display: "flex", gap: 16, fontSize: 13, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="lnk" disabled={left > 0 || busy} onClick={() => act({ type: "otp_resend", ref: refs })}>
            {left > 0 ? `Renvoyer le code dans ${left} s` : "Renvoyer le code"}
          </button>
          <button type="button" className="lnk" disabled={busy} onClick={() => act({ type: "reopen", ref: block.formRef })}>
            Modifier le numéro
          </button>
        </div>
        {block.demoCode && (
          <span className="note">Mode démonstration : aucun SMS n&apos;est envoyé. Saisissez le code {block.demoCode}.</span>
        )}
      </div>
      <div className="cf">
        <button type="submit" className="btn" disabled={code.length < 6 || !!block.locked || busy}>
          Valider
        </button>
      </div>
    </form>
  );
}

export function ConfirmationView({ block }: { block: ConfirmationBlock }) {
  const { openPanel } = useAssistant();
  const q = block.request;
  return (
    <section className="card" aria-label="Demande d'offre envoyée">
      <div className="ch">
        <h3>Demande d&apos;offre envoyée</h3>
        <button type="button" className="bo blue" onClick={() => openPanel({ kind: "recap" })}>
          Ouvrir le récapitulatif
        </button>
      </div>
      <div className="cb grid3">
        <Tile a="Véhicule" b={q.vlabel ?? "À définir"} />
        <Tile a="Financement" b={q.sim ? `${q.sim.params.type} · ${q.sim.c.n} mois` : "À définir avec le conseiller"} />
        <Tile a="Mensualité" b={q.sim ? fmt(q.sim.c.m) : "Non simulée"} />
        <Tile a="Éligibilité" b={q.elig ? q.elig.label : "Non évaluée"} />
        <Tile a="Rappel" b={`${q.day} · ${q.contact.creneau.toLowerCase()}`} />
        <Tile a="Référence" b={q.ref} />
      </div>
    </section>
  );
}
