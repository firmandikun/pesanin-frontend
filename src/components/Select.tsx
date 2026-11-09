"use client";
import { Check, ChevronDown, Search } from "lucide-react";
import { Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactElement, ReactNode } from "react";

export type SelectOption = { value: string; label: ReactNode; text: string; disabled?: boolean; group?: string };
type ChangeEvent = { target: { value: string; name?: string } };

type Props = {
  value?: string | number | null;
  defaultValue?: string | number;
  onChange?: (e: ChangeEvent) => void;
  children?: ReactNode;
  options?: SelectOption[];
  className?: string;
  disabled?: boolean;
  name?: string;
  title?: string;
  placeholder?: string;
  searchable?: boolean;
  tone?: "light" | "dark";
  "aria-label"?: string;
};

const textOf = (n: ReactNode): string =>
  typeof n === "string" || typeof n === "number" ? String(n)
    : Array.isArray(n) ? n.map(textOf).join("")
    : isValidElement(n) ? textOf((n.props as { children?: ReactNode }).children) : "";

/** Reads <option> / <optgroup> children (including mapped arrays) into a flat option list. */
function parse(children: ReactNode, group?: string): SelectOption[] {
  const out: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean; label?: string }>;
    if (el.type === "optgroup") out.push(...parse(el.props.children, el.props.label));
    else if (el.type === "option") {
      const text = textOf(el.props.children);
      out.push({ value: String(el.props.value ?? text), label: el.props.children, text, disabled: el.props.disabled, group });
    } else out.push(...parse(el.props.children, group));
  });
  return out;
}

/**
 * Drop-in replacement for the native <select>: same <option>/<optgroup> children and
 * onChange(e => e.target.value) signature, rendered as a styled listbox.
 */
export function Select({ value, defaultValue, onChange, children, options, className = "", disabled, name, title, placeholder, searchable, tone = "light", ...rest }: Props) {
  const opts = useMemo(() => options ?? parse(children), [options, children]);
  const [inner, setInner] = useState(String(defaultValue ?? ""));
  const current = value === undefined ? inner : String(value ?? "");
  const selected = opts.find((o) => o.value === current);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; bottom: number; width: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const canSearch = searchable ?? opts.length > 8;
  const shown = q ? opts.filter((o) => o.text.toLowerCase().includes(q.toLowerCase())) : opts;
  const dark = tone === "dark";

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !menu.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    setActive(Math.max(0, shown.findIndex((o) => o.value === current)));
    return () => document.removeEventListener("mousedown", close);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // The menu lives in a portal with fixed positioning, so modals/tables with overflow can't clip it.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = root.current?.getBoundingClientRect();
      if (!r) return;
      setUp(window.innerHeight - r.bottom < 280 && r.top > 280);
      setPos({ left: r.left, top: r.bottom, bottom: window.innerHeight - r.top, width: r.width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);

  useEffect(() => { list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  const pick = (o: SelectOption) => {
    if (o.disabled) return;
    if (value === undefined) setInner(o.value);
    onChange?.({ target: { value: o.value, name } });
    setOpen(false);
    setQ("");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter") { e.preventDefault(); if (shown[active]) pick(shown[active]); }
  };

  // Keep the caller's box styling (input, h-10, borders, widths); add layout + chevron.
  const box = className.includes("input") || /\bborder\b|\bh-\d/.test(className) ? className : `input ${className}`;
  const isPlaceholder = !selected || selected.value === "";
  let lastGroup: string | undefined;

  return (
    <div ref={root} className={`relative ${/\bw-|\bmax-w|\bflex-1|\bmin-w/.test(className) ? "" : "w-full"} ${className.match(/\b(w-\S+|max-w-\S+|flex-1|min-w-\S+|shrink-0)\b/g)?.join(" ") ?? ""}`} onKeyDown={onKey}>
      <button
        type="button" title={title} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-label={rest["aria-label"]}
        onClick={() => setOpen(!open)}
        className={`${box} flex !w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${open ? (dark ? "" : "border-brand-500 ring-4 ring-brand-100") : ""}`}
      >
        <span className={`truncate ${isPlaceholder ? (dark ? "text-slate-400" : "text-slate-400") : ""}`}>{selected?.label ?? placeholder ?? ""}</span>
        <ChevronDown size={16} className={`shrink-0 transition ${open ? "rotate-180" : ""} ${dark ? "text-slate-300" : "text-slate-400"}`} />
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      {open && pos && createPortal(
        <div ref={menu} onKeyDown={onKey} style={{ position: "fixed", left: pos.left, minWidth: pos.width, maxWidth: `calc(100vw - ${pos.left + 8}px)`, ...(up ? { bottom: pos.bottom + 6 } : { top: pos.top + 6 }) }}
          className={`z-[100] overflow-hidden rounded-xl border shadow-xl ${dark ? "border-[#3a3a41] bg-[#26262b] text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}>
          {canSearch && (
            <div className={`border-b p-2 ${dark ? "border-[#3a3a41]" : "border-slate-100"}`}>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input autoFocus className={`h-8 w-full rounded-lg pl-8 pr-2 text-sm outline-none ${dark ? "bg-[#1c1c1f]" : "bg-slate-50"}`} placeholder="Cari…" value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} />
              </div>
            </div>
          )}
          <ul ref={list} id={id} role="listbox" className="max-h-64 overflow-y-auto p-1 text-sm">
            {shown.map((o, i) => {
              const header = o.group && o.group !== lastGroup ? o.group : null;
              lastGroup = o.group;
              const on = o.value === current;
              return (
                <li key={`${o.group ?? ""}${o.value}`}>
                  {header && <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{header}</div>}
                  <button
                    type="button" role="option" aria-selected={on} data-i={i} disabled={o.disabled}
                    onMouseEnter={() => setActive(i)} onClick={() => pick(o)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left disabled:opacity-40 ${i === active ? (dark ? "bg-[#33333a]" : "bg-slate-50") : ""} ${on ? (dark ? "text-white" : "font-medium text-brand-700") : ""}`}
                  >
                    <span className={`flex-1 ${o.value === "" ? "text-slate-400" : ""}`}>{o.label}</span>
                    {on && o.value !== "" && <Check size={15} className={dark ? "text-[#8b93f0]" : "text-brand-600"} />}
                  </button>
                </li>
              );
            })}
            {!shown.length && <li className="px-3 py-4 text-center text-slate-400">Tidak ditemukan</li>}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
