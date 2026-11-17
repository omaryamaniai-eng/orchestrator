"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BRAND, COLORS, TECH, byId, fullName, priceAt, versionName, type Vehicle } from "@/lib/domain/catalog";
import { fmt, hhmm, pct, telFmt } from "@/lib/domain/finance";
import type { OfferRequest } from "@/lib/domain/types";
import { Car, Icon, Interior, Photo, type IconName } from "./graphics";
import { useAssistant } from "./store";
import { FavButton, Tile, useCopy } from "./ui";
import { VersionSelect } from "./blocks/Vehicles";
import { LevelBadge } from "./blocks/Finance";

function Ctrl({ n, label, onClick }: { n: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" className="ib" aria-label={label} title={label} onClick={onClick}>
      <Icon n={n} />
    </button>
  );
}

function Head({ title, sub, children }: { title: ReactNode; sub: ReactNode; children: ReactNode }) {
  return (
    <div className="ph-h">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <h2>{title}</h2>
        <small>{sub}</small>
      </div>
      <div style={{ display: "flex" }}>{children}</div>
    </div>
  );
}

function SizeCtrls({ closeOnly }: { closeOnly?: boolean }) {
  const { expanded, setExpanded, closePanel } = useAssistant();
  return (
    <>
      {!closeOnly &&
        (expanded ? <Ctrl n="reduce" label="Réduire" onClick={() => setExpanded(false)} /> : <Ctrl n="expand" label="Agrandir en plein écran" onClick={() => setExpanded(true)} />)}
      <Ctrl n="close" label="Fermer" onClick={closePanel} />
    </>
  );
}

function Blk({ title, rows }: { title: string; rows: [string, ReactNode][] }) {
  return (
    <div className="blk">
      <h4>{title}</h4>
      <div className="g">
        {rows.map(([k, v]) => (
          <div className="kv" key={k}>
            <span>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- fiche véhicule ---------------- */

function useSimulate() {
  const { send, closePanel, versionOf } = useAssistant();
  return (id: string) => {
    closePanel();
    send("Simuler le crédit", { setChosen: { vehicleId: id, versionIndex: versionOf(id) } });
  };
}

function Fiche({ v }: { v: Vehicle }) {
  const { versionOf, conv, act, openPanel } = useAssistant();
  const simulate = useSimulate();
  const [thumb, setThumb] = useState(1);
  const [tab, setTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const vi = versionOf(v.id);
  const labels = ["Avant", "Profil", "Arrière", "Intérieur"];
  const sc = [0.45, 1, -0.45];
  const t = TECH[tab];
  const chosen = conv.state.chosen?.vehicleId === v.id && conv.state.chosen.versionIndex === vi;

  const focusTab = (k: number) => {
    setTab(k);
    requestAnimationFrame(() => tabRefs.current[k]?.focus());
  };

  return (
    <>
      <Head title={`${BRAND} ${v.name}`} sub={`${v.type} · ${v.places} places`}>
        <SizeCtrls />
      </Head>
      <div style={{ padding: "12px 18px 0", flexShrink: 0 }}>
        <label className="lbl" style={{ maxWidth: 320 }}>
          Version
          <VersionSelect v={v} variant="full" />
        </label>
      </div>
      <div className="ph-b">
        <div className="photo" style={{ height: 200 }}>
          <span className="tag">[Photo du véhicule : {labels[thumb]}]</span>
          {thumb === 3 ? (
            <Interior w={300} h={160} />
          ) : (
            <div style={{ transform: `scaleX(${sc[thumb]})`, transition: "transform .3s" }}>
              <Car w={300} fill={v.color} />
            </div>
          )}
        </div>
        <div className="thumbs">
          {labels.map((l, i) => (
            <button key={l} type="button" className={"thumb" + (i === thumb ? " on" : "")} aria-label={l} aria-pressed={i === thumb} onClick={() => setThumb(i)}>
              {i === 3 ? <Icon n="door" s={18} /> : <Car w={60} fill={v.color} />}
              {l}
            </button>
          ))}
        </div>
        <div className="grid3" style={{ gap: 8 }}>
          <Tile a="Autonomie" b="[Valeur] km" />
          <Tile a="Recharge rapide" b="[Durée]" />
          <Tile a="Prix" b={fmt(priceAt(v, vi))} />
        </div>
        <div className="tabs" role="tablist" aria-label="Fiche technique">
          {TECH.map((x, i) => {
            const on = i === tab;
            return (
              <button
                key={x.s}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                className={"tab" + (on ? " on" : "")}
                id={`tt-${i}`}
                aria-selected={on}
                aria-controls="tp-tech"
                tabIndex={on ? 0 : -1}
                title={x.t}
                onClick={() => setTab(i)}
                onKeyDown={(e) => {
                  const n = TECH.length;
                  const k = e.key === "ArrowRight" ? (tab + 1) % n : e.key === "ArrowLeft" ? (tab + n - 1) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
                  if (k !== null) {
                    e.preventDefault();
                    focusTab(k);
                  }
                }}
              >
                {x.s}
              </button>
            );
          })}
        </div>
        <div className="tabpanel" role="tabpanel" id="tp-tech" aria-labelledby={`tt-${tab}`} tabIndex={0}>
          <h4>{t.t}</h4>
          <span className="note">Version {versionName(v, vi)}</span>
          {t.rows ? (
            <div className="blk">
              <div className="g">
                {t.rows.map(([k, val]) => (
                  <div className="kv" key={k}>
                    <span>{k}</span>
                    <span>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Array.from({ length: t.pills ?? 0 }, (_, i) => (
                <span key={i} className="pill">
                  [{t.t} {i + 1}]
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="ph-f" style={{ flexWrap: "wrap" }}>
        <FavButton id={v.id} />
        <button type="button" className="bo blue big" onClick={() => openPanel({ kind: "viewer", id: v.id })}>
          <Icon n="cube" s={14} />
          Visualiser en 3D
        </button>
        {chosen ? (
          <button type="button" className="bo big" disabled>
            <Icon n="check" s={14} w={2.4} />
            Véhicule choisi
          </button>
        ) : (
          <button type="button" className="bo blue big" onClick={() => act({ type: "choose_vehicle", vehicleId: v.id, versionIndex: vi })}>
            Choisir ce véhicule
          </button>
        )}
        <button type="button" className="btn" onClick={() => simulate(v.id)}>
          Simuler le crédit
        </button>
      </div>
    </>
  );
}

/* ---------------- vue 3D ---------------- */

const VIEWS = ["Profil gauche", "3/4 avant", "Avant", "3/4 arrière", "Profil droit", "Arrière"];
const SCALES = [1, 0.82, 0.45, -0.82, -1, -0.45];

function Viewer({ v }: { v: Vehicle }) {
  const { openPanel, closePanel } = useAssistant();
  const simulate = useSimulate();
  const [mode, setMode] = useState(0);
  const [doors, setDoors] = useState(false);
  const [angle, setAngle] = useState(1);
  const [color, setColor] = useState(3);
  const [zoom, setZoom] = useState(1);
  const x0 = useRef<number | null>(null);
  const col = COLORS[color][1];
  const rotate = (d: number) => setAngle((a) => (a + d + 6) % 6);

  return (
    <>
      <Head title={`${BRAND} ${v.name} en 3D`} sub={`${v.type} · ${v.places} places`}>
        <Ctrl n="reduce" label="Réduire" onClick={() => openPanel({ kind: "fiche", id: v.id })} />
        <Ctrl n="close" label="Fermer" onClick={closePanel} />
      </Head>
      <div className="bar" style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="seg" role="group" aria-label="Vue">
            {["Extérieur", "Intérieur"].map((l, i) => (
              <button key={l} type="button" className={i === mode ? "on" : ""} aria-pressed={i === mode} onClick={() => setMode(i)}>
                {l}
              </button>
            ))}
          </div>
          <button type="button" className="bo big" disabled={mode === 1} onClick={() => setDoors(!doors)}>
            <Icon n="door" s={14} />
            {doors ? "Fermer les portes" : "Ouvrir les portes"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Ctrl n="zout" label="Dézoomer" onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))} />
          <Ctrl n="zin" label="Zoomer" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} />
        </div>
      </div>
      <div
        className="stage"
        onPointerDown={(e) => {
          if (mode !== 0) return;
          x0.current = e.clientX;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          if (x0.current === null) return;
          const dx = e.clientX - x0.current;
          x0.current = null;
          if (Math.abs(dx) > 30) rotate(dx > 0 ? -1 : 1);
        }}
      >
        {mode === 0 ? (
          <div className="carw" style={{ transform: `scale(${zoom}) scaleX(${SCALES[angle]})` }}>
            <Car
              w={560}
              fill={col}
              glass="#e2e8f0"
              extra={<path d="M96 42 L98 70 L58 62 L64 36 Z" fill={col} stroke="#64748b" strokeWidth="1.5" opacity={doors ? 1 : 0} />}
            />
          </div>
        ) : (
          <div style={{ transform: `scale(${zoom})` }}>
            <Interior />
          </div>
        )}
        <span style={{ position: "absolute", top: 14, left: 18, fontSize: 12, color: "#475569" }}>Glisser pour faire pivoter le véhicule</span>
        {mode === 0 && (
          <div className="rot">
            <button type="button" aria-label="Pivoter à gauche" onClick={() => rotate(-1)}>
              <Icon n="left" />
            </button>
            <span>Vue : {VIEWS[angle]}</span>
            <button type="button" aria-label="Pivoter à droite" onClick={() => rotate(1)}>
              <Icon n="right" />
            </button>
          </div>
        )}
      </div>
      <div className="bar" style={{ borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#475569" }}>
            Couleur : <strong style={{ color: "#0f172a" }}>{COLORS[color][0]}</strong>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {COLORS.map((c, i) => (
              <button key={c[0]} type="button" className={"sw" + (i === color ? " on" : "")} style={{ background: c[1] }} aria-label={c[0]} aria-pressed={i === color} onClick={() => setColor(i)} />
            ))}
          </div>
        </div>
        <button type="button" className="btn" onClick={() => simulate(v.id)}>
          Simuler le crédit
        </button>
      </div>
    </>
  );
}

/* ---------------- favoris ---------------- */

function Favorites() {
  const { favorites, versionOf, openPanel, closePanel, send } = useAssistant();
  const simulate = useSimulate();
  const list = favorites.map(byId).filter(Boolean) as Vehicle[];
  return (
    <>
      <Head title="Mes véhicules favoris" sub={list.length ? `${list.length} véhicule${list.length > 1 ? "s" : ""}` : "Aucun véhicule"}>
        <SizeCtrls />
      </Head>
      <div className="ph-b">
        {list.length ? (
          <>
            <span style={{ fontSize: 12, color: "#475569" }}>Les modèles marqués d&apos;un cœur, toutes conversations confondues.</span>
            {list.map((v) => (
              <article className="card favi" key={v.id}>
                <div className="row">
                  <Photo w={96} h={62} cw={80} color={v.color} />
                  <div>
                    <b>
                      {BRAND} {fullName(v, versionOf(v.id))}
                    </b>
                    <span>
                      {v.type} · [Valeur] km · {fmt(priceAt(v, versionOf(v.id)))}
                    </span>
                  </div>
                  <FavButton id={v.id} />
                </div>
                <div className="acts">
                  <button type="button" className="bo blue" onClick={() => openPanel({ kind: "fiche", id: v.id })}>
                    Voir la fiche
                  </button>
                  <button type="button" className="bo blue" onClick={() => openPanel({ kind: "viewer", id: v.id })}>
                    <Icon n="cube" s={14} />
                    3D
                  </button>
                  <button type="button" className="bo blue" onClick={() => simulate(v.id)}>
                    Simuler
                  </button>
                </div>
              </article>
            ))}
          </>
        ) : (
          <div className="empty" style={{ flexGrow: 1, justifyContent: "center" }}>
            <span className="ico">
              <Icon n="heart" s={18} />
            </span>
            <b>Aucun véhicule favori</b>
            <span>Ajoutez un modèle avec le cœur de sa carte.</span>
            <button
              type="button"
              className="btn"
              onClick={() => {
                closePanel();
                send("Trouver ma voiture électrique");
              }}
            >
              Trouver un véhicule
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- simulations enregistrées ---------------- */

function Simulations() {
  const { simulations, removeSim, closePanel, send, toast, conv, openPanel, expanded, setExpanded } = useAssistant();
  const n = simulations.length;
  const open = (id: string) => {
    const el = document.getElementById(`card-${id}`);
    if (!el) return toast("Cette simulation appartient à une autre conversation.");
    if (window.innerWidth <= 900) closePanel();
    if (expanded) setExpanded(false);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1400);
  };
  return (
    <>
      <Head title="Mes simulations" sub={n ? `${n} ${n > 1 ? "simulations enregistrées" : "simulation enregistrée"}` : "Aucune simulation"}>
        <SizeCtrls />
      </Head>
      <div className="ph-b">
        {n ? (
          simulations.map((sm) => (
            <article className="card favi" key={sm.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <b>{sm.params.vlabel ?? "Sans véhicule choisi"}</b>
                  <span>
                    {sm.params.type} · {sm.c.n} mois · {pct(sm.c.T)}
                  </span>
                </div>
                <button type="button" className="sq" aria-label="Supprimer la simulation" title="Supprimer" onClick={() => removeSim(sm.id)}>
                  <Icon n="close" s={14} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                <Tile a="Mensualité" b={fmt(sm.c.m)} />
                <Tile a="Coût total du crédit" b={fmt(sm.c.cost)} />
              </div>
              {sm.requested && <span className="reqb">Offre demandée · {sm.requested}</span>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  Enregistrée le {new Date(sm.at).toLocaleDateString("fr-FR")} à {hhmm(sm.at)}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="bo" onClick={() => open(sm.id)}>
                    Ouvrir
                  </button>
                  {sm.requested && conv.state.request?.ref === sm.requested && (
                    <button type="button" className="bo blue" onClick={() => openPanel({ kind: "recap" })}>
                      Voir la demande
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty" style={{ flexGrow: 1, justifyContent: "center" }}>
            <span className="ico">
              <Icon n="calc" s={18} />
            </span>
            <b>Aucune simulation enregistrée</b>
            <span>Calculez une simulation puis cliquez sur Enregistrer.</span>
            <button
              type="button"
              className="btn"
              onClick={() => {
                closePanel();
                send("Simuler le crédit");
              }}
            >
              Simuler un crédit
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- récapitulatif de la demande ---------------- */

export function recapText(q: OfferRequest): string {
  const L = [`Demande ${q.ref}`, `Véhicule : ${q.vlabel ?? "À définir"}`];
  if (q.sim)
    L.push(
      `Financement : ${q.sim.params.type} · ${q.sim.c.n} mois`,
      `Mensualité : ${fmt(q.sim.c.m)}`,
      `Taux annuel : ${pct(q.sim.c.T)}`,
      `Coût total du crédit : ${fmt(q.sim.c.cost)}`,
    );
  if (q.elig) L.push(`Éligibilité : ${q.elig.label}`);
  L.push(`Contact : ${q.contact.prenom} · ${telFmt(q.contact.digits)}`, `Rappel : ${q.day} · ${q.contact.creneau.toLowerCase()}`);
  return L.join("\n");
}

function Recap({ q }: { q: OfferRequest }) {
  const copy = useCopy();
  const rv = byId(q.vehicleId);
  const s = q.sim;
  return (
    <>
      <Head title="Récapitulatif de la demande" sub={`Référence ${q.ref} · envoyée à ${hhmm(q.at)}`}>
        <SizeCtrls />
      </Head>
      <div className="ph-b">
        {rv ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Photo w={120} h={76} cw={100} color={rv.color} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 15 }}>{q.vlabel}</b>
              <span style={{ fontSize: 12, color: "#475569" }}>
                {rv.type} · {rv.places} places · {fmt(q.vprice ?? priceAt(rv, q.versionIndex ?? 0))}
              </span>
            </div>
          </div>
        ) : (
          <span className="note">Aucun véhicule choisi : le conseiller vous aide à le définir.</span>
        )}
        {s ? (
          <Blk
            title="Financement"
            rows={[
              ["Type", s.params.type],
              ["Prix du véhicule", fmt(s.c.P)],
              ["Apport", fmt(s.c.A)],
              ["Durée", `${s.c.n} mois`],
              ["Mensualité", fmt(s.c.m)],
              ["Taux annuel", pct(s.c.T)],
              ["Coût total du crédit", fmt(s.c.cost)],
              [s.c.loa ? "Option d'achat finale" : "Montant total dû", fmt(s.c.loa ? s.c.O : s.c.total)],
            ]}
          />
        ) : (
          <Blk title="Financement" rows={[["Simulation", "Non réalisée"]]} />
        )}
        {q.elig ? (
          <div className="blk">
            <h4>Éligibilité</h4>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <LevelBadge lvl={q.elig.lvl} />
              <span style={{ fontSize: 13 }}>Mensualité supportable : {fmt(q.elig.cap)} / mois</span>
            </div>
          </div>
        ) : (
          <Blk title="Éligibilité" rows={[["Évaluation", "Non réalisée"]]} />
        )}
        <Blk
          title="Contact"
          rows={[
            ["Prénom", q.contact.prenom],
            ["Téléphone", telFmt(q.contact.digits)],
            ["Rappel", `${q.day} · ${q.contact.creneau.toLowerCase()}`],
            ["Référence", q.ref],
          ]}
        />
      </div>
      <div className="ph-f">
        <button type="button" className="bo blue big" onClick={(e) => copy(recapText(q), e.currentTarget)}>
          Copier le récapitulatif
        </button>
      </div>
    </>
  );
}

/* ---------------- conditions de contact ---------------- */

const CGU: [string, string][] = [
  ["Finalité", "[Texte à fournir : envoi des offres de financement par SMS et rappel par un conseiller.]"],
  ["Données utilisées", "[Texte à fournir : prénom, numéro de téléphone, créneau de rappel, véhicule, simulation et éligibilité.]"],
  ["Destinataires", "[Texte à fournir : organisme de financement et réseau de distribution.]"],
  ["Durée de conservation", "[Texte à fournir.]"],
  ["Vos droits", "[Texte à fournir : accès, rectification, opposition, et mention de la déclaration auprès de l'autorité de protection des données, à valider par le service juridique.]"],
];

function Cgu({ blockId }: { blockId: string }) {
  const { acceptCgu, closePanel } = useAssistant();
  return (
    <>
      <Head title="Conditions de contact" sub="Version [Version] · [Date]">
        <SizeCtrls closeOnly />
      </Head>
      <div className="ph-b legal">
        {CGU.map(([h, p]) => (
          <div key={h}>
            <h4>{h}</h4>
            <p>{p}</p>
          </div>
        ))}
      </div>
      <div className="ph-f">
        <button
          type="button"
          className="btn"
          onClick={() => {
            acceptCgu(blockId);
            closePanel();
          }}
        >
          J&apos;accepte
        </button>
      </div>
    </>
  );
}

/* ---------------- conteneur ---------------- */

export function SidePanel() {
  const { panel, expanded, closePanel, toast, conv } = useAssistant();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panel && ref.current?.contains(document.activeElement)) closePanel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel, closePanel]);

  if (!panel) return <aside className="panel" aria-label="Panneau latéral" />;

  let size = "w35";
  let body: ReactNode = null;
  if (panel.kind === "fiche") {
    const v = byId(panel.id);
    size = "w50";
    body = v ? <Fiche key={v.id} v={v} /> : null;
  } else if (panel.kind === "viewer") {
    const v = byId(panel.id);
    size = "full";
    body = v ? <Viewer key={v.id} v={v} /> : null;
  } else if (panel.kind === "src") {
    const d = panel.source;
    body = (
      <>
        <Head title={`[${d.n}] ${d.title}`} sub={d.sub}>
          <SizeCtrls />
        </Head>
        <div className="ph-b">
          <span className="small-title">Passage utilisé dans la réponse</span>
          <p className="excerpt">{d.excerpt}</p>
          <span style={{ fontSize: 12, color: "#64748b" }}>Section : {d.section}</span>
          <button type="button" className="bo blue big" style={{ alignSelf: "flex-start" }} onClick={() => toast("Le document complet s'ouvre dans la base documentaire.")}>
            <Icon n="doc" s={14} />
            Ouvrir le document
          </button>
        </div>
      </>
    );
  } else if (panel.kind === "fav") body = <Favorites />;
  else if (panel.kind === "sim") body = <Simulations />;
  else if (panel.kind === "recap") {
    size = "w50";
    body = conv.state.request ? <Recap q={conv.state.request} /> : null;
  } else if (panel.kind === "cgu") body = <Cgu blockId={panel.blockId} />;

  return (
    <aside ref={ref} className={"panel open " + (expanded ? "full" : size)} aria-label="Panneau latéral">
      {body}
    </aside>
  );
}

export function panelHidesMain(panel: ReturnType<typeof useAssistant>["panel"], expanded: boolean): boolean {
  return !!panel && (expanded || panel.kind === "viewer");
}
