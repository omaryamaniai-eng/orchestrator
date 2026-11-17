"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CARROSSERIES, DISTANCES, PLACES, RECHARGE, USAGES, type Carrosserie, type Need } from "@/lib/domain/catalog";
import { EST_DUREE, EST_RATES, estimateBudget, fmt, groupDigits, num } from "@/lib/domain/finance";
import type { NeedFormBlock } from "@/lib/domain/types";
import { useAssistant } from "../store";
import { Chips, Field, SumCard, Tile } from "../ui";

export function NeedForm({ block, messageId }: { block: NeedFormBlock; messageId: string }) {
  const { act, busy } = useAssistant();
  const ref = { messageId, blockId: block.id };

  if (block.submitted) {
    const n = block.need;
    return (
      <SumCard
        title="Votre besoin"
        label="Modifier"
        disabled={busy}
        onEdit={() => act({ type: "reopen", ref })}
        items={[
          ["Usage principal", n.usage],
          ["Distance par jour", n.distance],
          ["Places", n.places],
          ["Carrosserie", n.carros.join(", ")],
          ["Budget maximum", `${groupDigits(n.budget)} MAD${n.estUsed ? " (estimé)" : ""}`],
          ["Recharge à domicile", n.recharge],
        ]}
      />
    );
  }
  return <NeedFormEditor key={block.id} block={block} onSubmit={(need) => act({ type: "need_submit", ref, need })} busy={busy} />;
}

function NeedFormEditor({ block, onSubmit, busy }: { block: NeedFormBlock; onSubmit: (n: Need) => void; busy: boolean }) {
  const { toast } = useAssistant();
  const [n, setN] = useState<Need>(() => ({ ...block.need, carros: [...block.need.carros] }));
  const [carErr, setCarErr] = useState(false);
  const [budErr, setBudErr] = useState(false);
  const [estOpen, setEstOpen] = useState(false);
  const [est, setEst] = useState({ estRev: n.estRev ?? "", estAut: "", estDet: n.estDet ?? "", estApp: n.estApp ?? "", estTaux: n.estTaux || "5 %" });

  const set = <K extends keyof Need>(k: K, v: Need[K]) => setN((x) => ({ ...x, [k]: v }));
  const estimate = useMemo(() => estimateBudget(est), [est]);
  const estErr = (v: string) => (v !== "" && isNaN(num(v)) ? "Indiquez un montant en chiffres." : null);

  const toggleCarro = (c: Carrosserie) => {
    setCarErr(false);
    setN((x) => ({ ...x, carros: x.carros.includes(c) ? x.carros.filter((y) => y !== c) : [...x.carros, c] }));
  };

  const applyEstimate = () => {
    if (!estimate || estimate.none) return;
    setN((x) => ({
      ...x,
      budget: String(Math.floor(estimate.B / 1000) * 1000),
      estUsed: true,
      estTaux: est.estTaux,
      estApp: est.estApp,
      estRev: est.estRev,
      estDet: est.estDet,
    }));
    setBudErr(false);
    setEstOpen(false);
    toast("Budget estimé reporté dans le formulaire.");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const digits = n.budget.replace(/[\s.,]/g, "");
    const okCar = n.carros.length > 0;
    const okBud = !!digits && !/\D/.test(digits);
    setCarErr(!okCar);
    setBudErr(!okBud);
    if (okCar && okBud) onSubmit({ ...n, budget: digits });
  };

  return (
    <form className="card form" noValidate onSubmit={submit}>
      <div className="ch">
        <h3>Votre besoin</h3>
        {!!block.prefilled?.length && <span className="note">Prérempli depuis votre message</span>}
      </div>
      <div className="cb grid2">
        <fieldset className="full">
          <legend>Usage principal</legend>
          <Chips options={USAGES} value={n.usage} onChange={(v) => set("usage", v)} label="Usage principal" />
        </fieldset>
        <fieldset className="full">
          <legend>
            Carrosserie <span style={{ fontWeight: 400, color: "#64748b" }}>plusieurs choix possibles</span>
          </legend>
          <Chips options={CARROSSERIES} value={n.carros} onChange={toggleCarro} label="Carrosserie" />
          {carErr && <span className="err">Choisissez au moins une carrosserie.</span>}
        </fieldset>
        <label className="lbl">
          Distance par jour
          <select className="inp" value={n.distance} onChange={(e) => set("distance", e.target.value as Need["distance"])}>
            {DISTANCES.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="lbl">
          Nombre de places
          <select className="inp" value={n.places} onChange={(e) => set("places", e.target.value as Need["places"])}>
            {PLACES.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <div className="lbl">
          <label htmlFor={`bud-${block.id}`}>Budget maximum</label>
          <input
            className={"inp" + (budErr ? " bad" : "")}
            id={`bud-${block.id}`}
            inputMode="numeric"
            placeholder="Montant en MAD"
            value={n.budget}
            onChange={(e) => {
              setBudErr(false);
              setN((x) => ({ ...x, budget: e.target.value, estUsed: false }));
            }}
          />
          {budErr && <span className="err">Indiquez un montant en chiffres, ou estimez votre budget.</span>}
          {n.estUsed && (
            <span className="note">
              Estimé sur {EST_DUREE} mois à {n.estTaux}
              {n.estApp ? ", apport compris" : ""}.
            </span>
          )}
          {!estOpen && (
            <button type="button" className="lnk" style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 400 }} onClick={() => setEstOpen(true)}>
              Je ne connais pas mon budget
            </button>
          )}
        </div>
        <fieldset>
          <legend>Recharge à domicile</legend>
          <Chips options={RECHARGE} value={n.recharge} onChange={(v) => set("recharge", v)} label="Recharge à domicile" />
        </fieldset>

        {estOpen && (
          <div className="full est" role="region" aria-label="Estimer mon budget">
            <div className="est-h">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <b>Estimer mon budget</b>
                <span className="note">Montant empruntable sur {EST_DUREE} mois, à partir de vos revenus et de vos crédits en cours.</span>
              </div>
              <button type="button" className="lnk" onClick={() => setEstOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="grid2">
              <Field name="estRev" label="Revenus mensuels nets" value={est.estRev} placeholder="Montant en MAD" error={estErr(est.estRev)} onChange={(v) => setEst((x) => ({ ...x, estRev: v }))} />
              <Field name="estAut" label="Autres revenus" hint="facultatif" value={est.estAut} placeholder="Montant en MAD" error={estErr(est.estAut)} onChange={(v) => setEst((x) => ({ ...x, estAut: v }))} />
              <Field name="estDet" label="Mensualités de crédits en cours" value={est.estDet} placeholder="Montant en MAD, vide si aucune" error={estErr(est.estDet)} onChange={(v) => setEst((x) => ({ ...x, estDet: v }))} />
              <Field name="estApp" label="Apport disponible" hint="facultatif" value={est.estApp} placeholder="Montant en MAD" error={estErr(est.estApp)} onChange={(v) => setEst((x) => ({ ...x, estApp: v }))} />
              <fieldset className="full">
                <legend>Taux d&apos;intérêt retenu</legend>
                <Chips options={EST_RATES} value={est.estTaux as (typeof EST_RATES)[number]} onChange={(v) => setEst((x) => ({ ...x, estTaux: v }))} />
              </fieldset>
            </div>
            <div className="est-res" aria-live="polite">
              {!estimate ? (
                <span className="note" style={{ gridColumn: "1/-1" }}>
                  Indiquez vos revenus mensuels nets pour voir l&apos;estimation.
                </span>
              ) : estimate.none ? (
                <span className="err" style={{ gridColumn: "1/-1", margin: 0 }}>
                  Vos crédits en cours ne laissent pas de capacité de remboursement.
                </span>
              ) : (
                <>
                  <Tile a="Mensualité maximale" b={`${fmt(estimate.M)} / mois`} />
                  <Tile a={`Montant empruntable sur ${EST_DUREE} mois`} b={fmt(estimate.C)} />
                  <Tile main a={`Budget estimé${estimate.AP ? " avec apport" : ""}`} b={fmt(Math.floor(estimate.B / 1000) * 1000)} />
                </>
              )}
            </div>
            <div className="est-f">
              <span className="note">Règle de démonstration : mensualité limitée à 40 % des revenus, moins les crédits en cours.</span>
              <button type="button" className="btn" disabled={!estimate || !!estimate.none} onClick={applyEstimate}>
                Utiliser ce budget
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="cf">
        <button type="submit" className="btn" disabled={busy}>
          Valider
        </button>
      </div>
    </form>
  );
}
