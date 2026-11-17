"use client";

import { useState, type FormEvent } from "react";
import { byId, priceAt, vehicleLabel } from "@/lib/domain/catalog";
import {
  ANCIENNETES,
  DUREES,
  FINANCING_TYPES,
  LEVELS,
  LOA,
  SITUATIONS,
  compute,
  fmt,
  num,
  optNum,
  pct,
  validateEligStep1,
  validateEligStep2,
  validateSim,
  type EligInput,
  type FieldErrors,
  type SimParams,
  type Simulation,
} from "@/lib/domain/finance";
import type { CompareBlock, EligFormBlock, EligResultBlock, SimFormBlock, SimResultBlock } from "@/lib/domain/types";
import { Icon, Photo } from "../graphics";
import { useAssistant } from "../store";
import { Chips, Field, SelectField, SumCard, Tile, useCopy } from "../ui";

/* ---------------- simulation : formulaire ---------------- */

function goFind(send: (t: string) => void, toast: (t: string) => void) {
  const vps = document.querySelectorAll(".viewport");
  if (vps.length) {
    vps[vps.length - 1].scrollIntoView({ behavior: "smooth", block: "center" });
    toast("Cliquez sur un modèle pour le choisir.");
  } else send("Trouver ma voiture électrique");
}

export function SimForm({ block, messageId }: { block: SimFormBlock; messageId: string }) {
  const { act, busy } = useAssistant();
  const ref = { messageId, blockId: block.id };
  if (block.submitted) {
    const p = block.params;
    const items: [string, string][] = [
      ["Véhicule", p.vlabel ?? "Non choisi"],
      ["Financement", p.type],
      ["Prix", fmt(num(p.prix))],
      ["Apport", fmt(optNum(p.apport))],
      ["Durée", `${p.duree} mois`],
    ];
    if (p.type === LOA) items.push(["Option d'achat", fmt(num(p.option))]);
    return <SumCard title="Paramètres de simulation" items={items} label="Modifier les paramètres" disabled={busy} onEdit={() => act({ type: "reopen", ref })} />;
  }
  return <SimFormEditor key={block.id} block={block} onSubmit={(params) => act({ type: "sim_submit", ref, params })} />;
}

function SimFormEditor({ block, onSubmit }: { block: SimFormBlock; onSubmit: (p: SimParams) => void }) {
  const { send, toast, busy, conv, versionOf } = useAssistant();
  const [p, setP] = useState<SimParams>(() => structuredClone(block.params));
  const [errors, setErrors] = useState<FieldErrors>({});
  const v = byId(p.vehicleId);
  const loa = p.type === LOA;
  const chosen = conv.state.chosen;
  const chosenDiffers = chosen && (chosen.vehicleId !== p.vehicleId || chosen.versionIndex !== p.versionIndex);

  const set = <K extends keyof SimParams>(k: K, val: SimParams[K]) => {
    setErrors((e) => ({ ...e, [k]: "" }));
    setP((x) => ({ ...x, [k]: val }));
  };

  const applyChosen = () => {
    if (!chosen) return;
    const cv = byId(chosen.vehicleId);
    if (!cv) return;
    const vi = versionOf(cv.id);
    setP((x) => ({ ...x, vehicleId: cv.id, versionIndex: vi, prix: String(priceAt(cv, vi)), vlabel: vehicleLabel(cv, vi), option: "" }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateSim(p);
    setErrors(errs);
    if (!Object.keys(errs).length) onSubmit(p);
  };

  return (
    <form className="card form" noValidate onSubmit={submit}>
      <div className="ch">
        <h3>Simulation de financement</h3>
      </div>
      <div className="cb grid2">
        {v ? (
          <div className="full vline">
            <Photo w={72} h={46} cw={60} color={v.color} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
              <b style={{ fontSize: 14 }}>{p.vlabel}</b>
              <span style={{ fontSize: 12, color: "#475569" }}>
                {v.type} · {v.places} places · {fmt(num(p.prix))}
              </span>
            </div>
            <button type="button" className="bo blue" onClick={() => goFind(send, toast)}>
              Changer de véhicule
            </button>
          </div>
        ) : (
          <div className="full vline">
            <span style={{ fontSize: 13, color: "#475569", flexGrow: 1 }}>Aucun véhicule choisi</span>
            <button type="button" className="bo blue" onClick={() => goFind(send, toast)}>
              Choisir un véhicule
            </button>
          </div>
        )}
        {chosenDiffers && (
          <div className="full note">
            Vous avez choisi un autre véhicule depuis.{" "}
            <button type="button" className="lnk" onClick={applyChosen}>
              Utiliser le véhicule choisi
            </button>
          </div>
        )}
        <fieldset className="full">
          <legend>Type de financement</legend>
          <Chips options={FINANCING_TYPES} value={p.type} onChange={(t) => set("type", t)} />
        </fieldset>
        {v ? (
          <Field name="prix" label="Prix du véhicule" hint="repris du véhicule choisi" value={fmt(num(p.prix))} readOnly error={errors.prix} />
        ) : (
          <Field name="prix" label="Prix du véhicule" value={p.prix} placeholder="Montant en MAD" error={errors.prix} onChange={(x) => set("prix", x)} />
        )}
        <Field name="apport" label="Apport" value={p.apport} placeholder="Montant en MAD, vide si aucun" error={errors.apport} onChange={(x) => set("apport", x)} />
        <fieldset className="full">
          <legend>Durée</legend>
          <Chips options={DUREES.map((d) => `${d} mois`)} value={`${p.duree} mois`} onChange={(d) => set("duree", parseInt(d, 10))} />
        </fieldset>
        {loa && <Field name="option" label="Option d'achat finale" value={p.option} placeholder="Montant en MAD" error={errors.option} onChange={(x) => set("option", x)} />}
      </div>
      <div className="cf">
        <button type="submit" className="btn" disabled={busy}>
          Calculer
        </button>
      </div>
    </form>
  );
}

/* ---------------- simulation : résultat ---------------- */

export function simText(sim: Simulation): string {
  const c = sim.c;
  return [
    `Simulation ${sim.params.type}${sim.params.vlabel ? ` · ${sim.params.vlabel}` : ""}`,
    `Mensualité : ${fmt(c.m)} sur ${c.n} mois`,
    `Montant financé : ${fmt(c.F)}`,
    `Taux annuel : ${pct(c.T)}`,
    `Coût total du crédit : ${fmt(c.cost)}`,
  ].join("\n");
}

export function SimResult({ block }: { block: SimResultBlock }) {
  const { simulations, toggleSaveSim } = useAssistant();
  const copy = useCopy();
  const sim = block.sim;
  const c = sim.c;
  const saved = simulations.some((s) => s.id === sim.id);
  return (
    <section className="card" id={`card-${sim.id}`} aria-label="Résultat de la simulation">
      <div className="ch">
        <h3>Simulation · {sim.params.type}</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="bo" onClick={(e) => copy(simText(sim), e.currentTarget)}>
            Copier
          </button>
          <button type="button" className="bo blue" aria-pressed={saved} onClick={() => toggleSaveSim(sim)}>
            {saved ? "Enregistrée" : "Enregistrer"}
          </button>
        </div>
      </div>
      <div className="cb resgrid">
        <div className="bigm">
          <span>Mensualité</span>
          <b>{fmt(c.m)}</b>
          <span>par mois pendant {c.n} mois</span>
        </div>
        <Tile a="Montant financé" b={fmt(c.F)} />
        <Tile a="Taux annuel" b={pct(c.T)} />
        <Tile a="Coût total du crédit" b={fmt(c.cost)} />
        <Tile a={c.loa ? "Option d'achat finale" : "Montant total dû"} b={fmt(c.loa ? c.O : c.total)} />
      </div>
      <div className="note" style={{ padding: "0 16px 12px" }}>
        Simulation indicative, hors assurance.
      </div>
    </section>
  );
}

export function CompareView({ block }: { block: CompareBlock }) {
  const { act, busy } = useAssistant();
  const [pick, setPick] = useState(Math.max(0, block.durations.indexOf(block.current)));
  const cs = block.durations.map((n) => compute(block.params, n));
  return (
    <section className="card" aria-label="Comparaison des durées">
      <div className="ch">
        <h3>Comparaison · apport de {fmt(optNum(block.params.apport))}</h3>
      </div>
      <div className="cb cmp3">
        {cs.map((c, i) => {
          const on = i === pick;
          return (
            <div key={c.n} className={"col" + (on ? " on" : "")}>
              <b>{c.n} mois</b>
              <div className="kv">
                <span>Mensualité</span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{fmt(c.m)}</span>
              </div>
              <div className="kv">
                <span>Coût total du crédit</span>
                <span style={{ fontWeight: 600 }}>{fmt(c.cost)}</span>
              </div>
              <div className="kv">
                <span>Taux annuel</span>
                <span style={{ fontWeight: 600 }}>{pct(c.T)}</span>
              </div>
              <button type="button" className={on ? "btn" : "bo blue"} aria-pressed={on} onClick={() => setPick(i)}>
                {on ? "Choisie" : "Choisir"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="cf">
        <button type="button" className="btn" disabled={busy} onClick={() => act({ type: "sim_duration", duree: block.durations[pick] })}>
          Simuler sur {block.durations[pick]} mois
        </button>
      </div>
    </section>
  );
}

/* ---------------- éligibilité ---------------- */

export function EligForm({ block, messageId }: { block: EligFormBlock; messageId: string }) {
  const { act, busy } = useAssistant();
  const ref = { messageId, blockId: block.id };
  if (block.submitted) {
    const e = block.data;
    return (
      <SumCard
        title="Votre situation"
        label="Modifier ma situation"
        disabled={busy}
        onEdit={() => act({ type: "reopen", ref })}
        items={[
          ["Situation", e.situation],
          ["Ancienneté", e.anciennete],
          ["Revenus nets", fmt(num(e.revenus))],
          ["Autres revenus", e.autres === "" ? "Aucun" : fmt(num(e.autres))],
          ["Charges de logement", fmt(num(e.loyer))],
          ["Crédits en cours", e.credits === "Oui" ? `${fmt(num(e.mens))} / mois` : "Non"],
        ]}
      />
    );
  }
  return <EligEditor key={block.id} block={block} onSubmit={(data) => act({ type: "elig_submit", ref, data })} />;
}

function EligEditor({ block, onSubmit }: { block: EligFormBlock; onSubmit: (e: EligInput) => void }) {
  const { busy } = useAssistant();
  const [e, setE] = useState<EligInput>(() => ({ ...block.data }));
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof EligInput>(k: K, v: EligInput[K]) => {
    setErrors((x) => ({ ...x, [k]: "" }));
    setE((x) => ({ ...x, [k]: v }));
  };
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (step === 1) {
      const errs = validateEligStep1(e);
      setErrors(errs);
      if (!Object.keys(errs).length) setStep(2);
      return;
    }
    const errs = validateEligStep2(e);
    setErrors(errs);
    if (!Object.keys(errs).length) onSubmit(e);
  };
  const steps = ["Situation professionnelle", "Charges"];
  return (
    <form className="card form" noValidate onSubmit={submit}>
      <div className="ch">
        <h3>Votre situation</h3>
        <ol className="steps">
          {steps.map((l, i) => {
            const n = i + 1;
            const done = n < step;
            const cur = n === step;
            return (
              <li key={l} className={"st" + (cur ? " cur" : "") + (done ? " done" : "")} aria-current={cur ? "step" : undefined}>
                <span>{done ? <Icon n="check" s={11} w={3} /> : n}</span>
                {l}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="cb grid2">
        {step === 1 ? (
          <>
            <SelectField label="Situation professionnelle" options={SITUATIONS} value={e.situation as (typeof SITUATIONS)[number]} onChange={(v) => set("situation", v)} />
            <SelectField label="Ancienneté" options={ANCIENNETES} value={e.anciennete as (typeof ANCIENNETES)[number]} onChange={(v) => set("anciennete", v)} />
            <Field name="revenus" label="Revenus mensuels nets" value={e.revenus} placeholder="Montant en MAD" error={errors.revenus} onChange={(v) => set("revenus", v)} />
            <Field name="autres" label="Autres revenus" hint="facultatif" value={e.autres} placeholder="Montant en MAD" error={errors.autres} onChange={(v) => set("autres", v)} />
          </>
        ) : (
          <>
            <Field name="loyer" label="Loyer ou charges de logement" value={e.loyer} placeholder="Montant en MAD, 0 si aucun" error={errors.loyer} onChange={(v) => set("loyer", v)} />
            <fieldset>
              <legend>Crédits en cours</legend>
              <Chips options={["Oui", "Non"] as const} value={e.credits} onChange={(v) => set("credits", v)} />
            </fieldset>
            {e.credits === "Oui" && <Field name="mens" label="Mensualités en cours" value={e.mens} placeholder="Montant en MAD" error={errors.mens} onChange={(v) => set("mens", v)} />}
          </>
        )}
      </div>
      <div className="cf" style={{ justifyContent: "space-between" }}>
        <span className="note">Étape {step} sur 2</span>
        <div style={{ display: "flex", gap: 8 }}>
          {step === 2 && (
            <button type="button" className="bo big" onClick={() => setStep(1)}>
              Précédent
            </button>
          )}
          <button type="submit" className="btn" disabled={busy && step === 2}>
            {step === 1 ? "Suivant" : "Valider"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function LevelBadge({ lvl }: { lvl: keyof typeof LEVELS }) {
  const L = LEVELS[lvl];
  return (
    <span className="lvl" style={{ background: L.bg, color: L.fg }}>
      <Icon n={L.icon} s={12} w={2.6} />
      {L.label}
    </span>
  );
}

export function EligResultView({ block }: { block: EligResultBlock }) {
  const r = block.result;
  return (
    <section className="card" aria-label="Résultat d'éligibilité">
      <div className="ch">
        <h3>Éligibilité au financement</h3>
      </div>
      <div className="cb" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <LevelBadge lvl={r.lvl} />
          <span>{r.line}</span>
        </div>
        <div className="grid3">
          <Tile a="Mensualité supportable" b={`${fmt(r.cap)} / mois`} />
          <Tile a="Mensualité simulée" b={r.monthly !== null ? `${fmt(r.monthly)} / mois` : "Aucune simulation"} />
          <Tile a="Reste à vivre estimé" b={`${fmt(r.reste)} / mois`} />
        </div>
        <span className="note">
          Indication non contractuelle. Règle de démonstration : endettement maximal de 40 % des revenus, à remplacer par la règle de l&apos;organisme de financement.
        </span>
      </div>
    </section>
  );
}
