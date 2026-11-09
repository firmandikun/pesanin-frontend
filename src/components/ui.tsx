"use client";
import { Pager } from "@/components/kit";
import { ChevronLeft, ChevronRight, SearchX, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label?: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-0.5">
      <span>
        {label && <span className="block text-sm font-semibold text-slate-700">{label}</span>}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-brand-600" : "bg-slate-200"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function Section({ title, icon: Icon, children, action, desc }: { title: string; icon?: LucideIcon; children: React.ReactNode; action?: React.ReactNode; desc?: string }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon size={18} /></span>}
          <div>
            <h3 className="font-bold text-ink">{title}</h3>
            {desc && <p className="text-xs text-slate-500">{desc}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export function MoneyInput({ value, onChange, placeholder }: { value?: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">Rp</span>
      <input
        className="input pl-10"
        inputMode="numeric"
        placeholder={placeholder ?? "0"}
        value={value == null ? "" : Number(value).toLocaleString("id-ID")}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits === "" ? null : Number(digits));
        }}
      />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide, icon: Icon }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; icon?: LucideIcon }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full rounded-2xl bg-white shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="flex items-center gap-2 font-bold text-ink">{Icon && <Icon size={18} className="text-brand-600" />}{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const TONES = {
  brand: "bg-brand-50 text-brand-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600", sky: "bg-sky-50 text-sky-600", violet: "bg-violet-50 text-violet-600", slate: "bg-slate-100 text-slate-600",
};
export type Tone = keyof typeof TONES;

export function StatCard({ label, value, icon: Icon, tone = "brand", sub }: { label: string; value: React.ReactNode; icon: LucideIcon; tone?: Tone; sub?: React.ReactNode }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}><Icon size={20} /></span>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-slate-500">{label}</div>
        <div className="text-xl font-bold tracking-tight text-ink">{value}</div>
        {sub && <div className="text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

export function IconTile({ icon: Icon, tone = "brand", size = 40 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  return <span className={`flex shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`} style={{ width: size, height: size }}><Icon size={size * 0.45} /></span>;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; icon?: LucideIcon }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
      {items.map(({ value: v, label, icon: Icon }) => (
        <button key={v} onClick={() => onChange(v)} className={`flex items-center gap-2 rounded-lg px-4 py-1.5 transition ${value === v ? "bg-white text-ink" : "text-slate-500 hover:text-slate-700"}`}>
          {Icon && <Icon size={15} />}{label}
        </button>
      ))}
    </div>
  );
}

/** Kept for older pages; renders the shared Pager. */
export function Pagination({ page, last, onChange, total, perPage, onPerPage }: { page: number; last: number; onChange: (p: number) => void; total?: number; perPage?: number; onPerPage?: (n: number) => void }) {
  return <Pager page={page} last={last} onPage={onChange} total={total} perPage={perPage} onPerPage={onPerPage} />;
}

export function Empty({ text, icon: Icon = SearchX, action }: { text: string; icon?: LucideIcon; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon size={26} /></span>
      <p className="font-semibold text-slate-600">{text}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="page-title">{title}</h1>
        {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function BarChart({ data, valueKey, labelKey, format }: { data: any[]; valueKey: string; labelKey: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey])));
  return (
    <div className="flex h-52 items-end gap-1">
      {data.map((d) => (
        <div key={d[labelKey]} className="group relative flex h-full flex-1 flex-col justify-end">
          <div className="rounded-t-md bg-brand-500/80 transition group-hover:bg-brand-600" style={{ height: `${(Number(d[valueKey]) / max) * 100}%`, minHeight: 2 }} />
          <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-white group-hover:block">
            {d[labelKey]}: {format ? format(Number(d[valueKey])) : d[valueKey]}
          </div>
        </div>
      ))}
    </div>
  );
}
