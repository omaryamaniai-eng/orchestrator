"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND, byId, priceAt, versionName, vehicleLabel, type Vehicle } from "@/lib/domain/catalog";
import { fmt } from "@/lib/domain/finance";
import type { ChosenBlock, NoMatchBlock, VehiclesBlock } from "@/lib/domain/types";
import { Car, Icon, Photo } from "../graphics";
import { useAssistant } from "../store";
import { FavButton } from "../ui";

const CARD_W = 212;

export function VersionSelect({ v, variant = "card" }: { v: Vehicle; variant?: "card" | "full" }) {
  const { versionOf, setVersion, toast } = useAssistant();
  const vi = versionOf(v.id);
  return (
    <select
      className={"inp " + (variant === "card" ? "vsel" : "full")}
      aria-label={`Version du ${BRAND} ${v.name}`}
      value={vi}
      onChange={(e) => {
        const i = Number(e.target.value);
        setVersion(v.id, i);
        toast(`Version ${versionName(v, i)} : ${fmt(priceAt(v, i))}.`);
      }}
    >
      {v.versions.map((x, i) => (
        <option key={x.name} value={i}>
          {variant === "card" ? `Version ${x.name}` : `${x.name} · ${fmt(priceAt(v, i))}`}
        </option>
      ))}
    </select>
  );
}

function VehicleCard({ v, reco, budget }: { v: Vehicle; reco: boolean; budget: number }) {
  const { conv, versionOf, act, openPanel, panel } = useAssistant();
  const vi = versionOf(v.id);
  const price = priceAt(v, vi);
  const chosen = conv.state.chosen?.vehicleId === v.id;
  const over = budget && price > budget ? price - budget : 0;
  const sel = panel?.kind === "fiche" && panel.id === v.id;
  return (
    <article className={"card vc" + (chosen ? " chosen" : "") + (sel ? " sel" : "")}>
      <button
        type="button"
        className="pickarea"
        aria-pressed={chosen}
        title="Choisir ce véhicule"
        onClick={() => act({ type: "choose_vehicle", vehicleId: v.id, versionIndex: vi })}
      >
        <span className="ph">
          <span>
            {over ? (
              <span className="badge" style={{ background: "#ffedd5", color: "#9a3412" }} title="Au-dessus de votre budget">
                + {fmt(over)}
              </span>
            ) : reco ? (
              <span className="badge">Recommandé</span>
            ) : null}
          </span>
          <span className="chosenb" hidden={!chosen}>
            <Icon n="check" s={11} w={3} />
            Choisi
          </span>
          <span className="photo" style={{ width: "100%", height: 112 }}>
            <span className="tag">[Photo du véhicule]</span>
            <Car w={140} fill={v.color} />
          </span>
        </span>
        <span className="in">
          <span className="nm">
            <b>
              {BRAND} {v.name}
            </b>
            <span>
              {v.type} · {v.places} places
            </span>
          </span>
          <span className="two">
            <span>
              <span>Autonomie</span>
              <span>[Valeur] km</span>
            </span>
            <span>
              <span>Prix</span>
              <span>{fmt(price)}</span>
            </span>
          </span>
        </span>
      </button>
      <div className="in" style={{ paddingTop: 0 }}>
        <VersionSelect v={v} />
        <div className="act">
          <button type="button" className="bo" onClick={() => openPanel({ kind: "fiche", id: v.id })}>
            Voir la fiche
          </button>
          <button type="button" className="sq blue" aria-label="Visualiser en 3D" title="Visualiser en 3D" onClick={() => openPanel({ kind: "viewer", id: v.id })}>
            <Icon n="cube" />
          </button>
          <FavButton id={v.id} />
        </div>
      </div>
    </article>
  );
}

function Carousel({ ids, budget }: { ids: string[]; budget: number }) {
  const { versionOf } = useAssistant();
  const list = ids.map(byId).filter(Boolean) as Vehicle[];
  const vp = useRef<HTMLDivElement>(null);
  const [per, setPer] = useState(3);
  const [off, setOff] = useState(0);

  useEffect(() => {
    const el = vp.current;
    if (!el) return;
    const update = () => setPer(Math.max(1, Math.floor((el.clientWidth + 12) / CARD_W)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(0, list.length - per);
  const o = Math.min(off, max);
  const anyOver = budget > 0 && list.some((v) => priceAt(v, versionOf(v.id)) > budget);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="car-head">
        <strong>
          {list.length} modèle{list.length > 1 ? "s" : ""}
          {anyOver ? " affichés" : " dans votre budget"}
        </strong>
        <div className="car-nav" style={{ visibility: list.length > per ? "visible" : "hidden" }}>
          <span>
            {o + 1}–{Math.min(list.length, o + per)} sur {list.length}
          </span>
          <button type="button" className="sq" aria-label="Modèles précédents" disabled={o <= 0} onClick={() => setOff(Math.max(0, o - 1))}>
            <Icon n="left" />
          </button>
          <button type="button" className="sq" aria-label="Modèles suivants" disabled={o >= max} onClick={() => setOff(o + 1)}>
            <Icon n="right" />
          </button>
        </div>
      </div>
      <div className="viewport" ref={vp}>
        <div className="track" style={{ transform: `translateX(${-o * CARD_W}px)` }}>
          {list.map((v, i) => (
            <VehicleCard key={v.id} v={v} budget={budget} reco={i === 0 && !(budget && priceAt(v, versionOf(v.id)) > budget)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function VehiclesView({ block }: { block: VehiclesBlock }) {
  const [showAbove, setShowAbove] = useState(block.within.length === 0);
  const ids = showAbove ? [...block.within, ...block.above] : block.within;
  const n = block.above.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Carousel key={showAbove ? "all" : "within"} ids={ids} budget={block.budget} />
      {n > 0 && block.within.length > 0 && (
        <button type="button" className="bo blue big" style={{ alignSelf: "flex-start" }} aria-expanded={showAbove} onClick={() => setShowAbove(!showAbove)}>
          {showAbove ? "Masquer les modèles au-dessus du budget" : `Voir ${n === 1 ? "le modèle" : `les ${n} modèles`} au-dessus du budget`}
        </button>
      )}
    </div>
  );
}

export function NoMatch({ block }: { block: NoMatchBlock }) {
  const { act, busy } = useAssistant();
  return (
    <div className="card">
      <div className="empty">
        <span className="ico">
          <Icon n="search" s={18} />
        </span>
        <b>Aucun véhicule correspondant</b>
        <span>Élargissez la carrosserie ou le nombre de places.</span>
        <button type="button" className="btn" disabled={busy} onClick={() => act({ type: "reopen", ref: block.formRef })}>
          Ajuster mon besoin
        </button>
      </div>
    </div>
  );
}

export function ChosenView({ block }: { block: ChosenBlock }) {
  const { openPanel } = useAssistant();
  const v = byId(block.vehicleId);
  if (!v) return null;
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px 8px 8px", borderColor: "#93c5fd" }}>
      <Photo w={84} h={54} cw={70} color={v.color} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
        <b style={{ fontSize: 14 }}>{vehicleLabel(v, block.versionIndex)}</b>
        <span style={{ fontSize: 12, color: "#475569" }}>
          {v.type} · {v.places} places · {fmt(priceAt(v, block.versionIndex))}
        </span>
      </div>
      <button type="button" className="bo blue" onClick={() => openPanel({ kind: "fiche", id: v.id })}>
        Voir la fiche
      </button>
    </div>
  );
}
