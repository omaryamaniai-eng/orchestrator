"use client";

import type { ReactNode } from "react";
import { Icon } from "./graphics";
import { useAssistant } from "./store";

export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T | T[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = Array.isArray(value) ? value.includes(o) : value === o;
        return (
          <button key={o} type="button" className={"chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => onChange(o)}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  name,
  label,
  value,
  placeholder,
  hint,
  error,
  onChange,
  readOnly,
  inputMode = "decimal",
}: {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  inputMode?: "decimal" | "numeric" | "text" | "tel";
}) {
  return (
    <label className="lbl">
      <span>
        {label}
        {hint && <span className="hint"> {hint}</span>}
      </span>
      <input
        className={"inp" + (error ? " bad" : "")}
        name={name}
        inputMode={inputMode}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        readOnly={readOnly}
        style={readOnly ? { background: "#f8fafc", color: "#475569" } : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <span className="err">{error}</span>}
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <label className="lbl">
      {label}
      <select className="inp" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function Tile({ a, b, main }: { a: ReactNode; b: ReactNode; main?: boolean }) {
  return (
    <div className={"tile" + (main ? " main" : "")}>
      <span>{a}</span>
      <span>{b}</span>
    </div>
  );
}

export function SumCard({
  title,
  items,
  label,
  onEdit,
  disabled,
}: {
  title: string;
  items: [string, string][];
  label: string;
  onEdit: () => void;
  disabled?: boolean;
}) {
  return (
    <section className="card" aria-label={title}>
      <div className="sum-h">
        <span className="ok">
          <Icon n="check" s={12} w={3} />
        </span>
        <h3>{title}</h3>
        <button type="button" className="bo" onClick={onEdit} disabled={disabled}>
          {label}
        </button>
      </div>
      <div className="sum-g">
        {items.map(([k, v]) => (
          <div className="kv" key={k}>
            <span>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FavButton({ id }: { id: string }) {
  const { favorites, toggleFavorite } = useAssistant();
  const fav = favorites.includes(id);
  const label = fav ? "Retirer des favoris" : "Ajouter aux favoris";
  return (
    <button type="button" className={"sq" + (fav ? " fav" : "")} aria-pressed={fav} aria-label={label} title={label} onClick={() => toggleFavorite(id)}>
      <Icon n="heart" fill={fav ? "currentColor" : "none"} />
    </button>
  );
}

export function useCopy() {
  const { toast } = useAssistant();
  return async (text: string, el: HTMLButtonElement) => {
    const label = el.textContent;
    try {
      await navigator.clipboard.writeText(text);
      el.textContent = "Copié";
      setTimeout(() => (el.textContent = label), 1500);
    } catch {
      toast("Copie refusée par le navigateur.");
    }
  };
}
