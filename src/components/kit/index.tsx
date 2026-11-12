"use client";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, PlusCircle, Search, X } from "lucide-react";
import { DateRangePicker } from "@/components/DatePicker";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, isoDate, Paginated } from "@/lib/api";
import { Select } from "@/components/Select";

export const BRAND = "var(--color-brand-600)";

export function PageHead({ title, children, tutorial = true, crumbs }: { title: string; children?: React.ReactNode; tutorial?: boolean; crumbs?: [string, string?][] }) {
  return (
    <div className="space-y-3">
      {crumbs && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-slate-200/60 px-3 py-1.5 text-sm">
          {crumbs.map(([label, href], i) => (
            <span key={label} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={14} className="text-slate-400" />}
              {href ? <Link href={href} className="font-medium text-brand-600">{label}</Link> : <span className="text-slate-600">{label}</span>}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[34px] font-bold text-slate-800">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {children}
          {tutorial && <Link href="/tutorial" className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-brand-600">Tutorial</Link>}
        </div>
      </div>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`surface ${className}`}>{children}</section>;
}

const TINT = { blue: "bg-blue-100 text-blue-600", violet: "bg-violet-100 text-violet-600", orange: "bg-orange-100 text-orange-500", pink: "bg-pink-100 text-pink-500", green: "bg-emerald-100 text-emerald-600", sky: "bg-sky-100 text-sky-600" };
export function CardTitle({ icon: Icon, title, tint = "blue", right }: { icon: LucideIcon; title: string; tint?: keyof typeof TINT; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${TINT[tint]}`}><Icon size={16} /></span>
      <h2 className="flex-1 text-[17px] font-semibold text-slate-800">{title}</h2>
      {right}
    </div>
  );
}

export function PrimaryBtn({ children, onClick, icon = true, type = "button", disabled }: { children: React.ReactNode; onClick?: () => void; icon?: boolean; type?: "button" | "submit"; disabled?: boolean }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-[#343bb0] disabled:opacity-50">
      {icon && <PlusCircle size={17} />}{children}
    </button>
  );
}
export function OutlineBtn({ children, onClick, type = "button" }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return <button type={type} onClick={onClick} className="flex h-10 items-center gap-2 rounded-lg border border-brand-600 bg-white px-5 text-sm font-semibold text-brand-600 hover:bg-brand-50">{children}</button>;
}

export function SearchBox({ value, onChange, placeholder = "Cari" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-[280px]">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-600" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Clipboard-with-warning empty state like the reference. */
export function EmptyState({ text, sub, variant = "doc" }: { text: string; sub?: string; variant?: "doc" | "money" | "coupon" | "box" | "card" | "chart" }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
        <circle cx="60" cy="60" r="58" fill="#dbe7fb" />
        {variant === "coupon" ? (
          <><rect x="30" y="44" width="58" height="34" rx="6" fill="var(--color-brand-600)" transform="rotate(-15 60 60)" /><rect x="36" y="48" width="56" height="32" rx="6" fill="#4f5bd6" /><rect x="56" y="58" width="16" height="12" rx="2" fill="#f6c25b" /></>
        ) : variant === "card" ? (
          <><rect x="30" y="38" width="44" height="34" rx="5" fill="#fff" /><rect x="50" y="56" width="44" height="28" rx="5" fill="#4f5bd6" /><rect x="50" y="62" width="44" height="5" fill="var(--color-brand-600)" /><text x="70" y="50" fontSize="16" fill="#e05656" fontWeight="700">?</text></>
        ) : variant === "chart" ? (
          <><rect x="34" y="34" width="52" height="44" rx="6" fill="#4f5bd6" /><rect x="42" y="58" width="6" height="12" fill="#f6c25b" /><rect x="52" y="50" width="6" height="20" fill="#46c2b7" /><rect x="62" y="44" width="6" height="26" fill="#fff" /><rect x="74" y="28" width="16" height="16" rx="3" fill="#e05656" /><text x="82" y="40" fontSize="11" fill="#fff" textAnchor="middle" fontWeight="700">?</text></>
        ) : (
          <><rect x="38" y="28" width="46" height="60" rx="6" fill="#fff" stroke="#c7d6f5" />
            <rect x="46" y="38" width="20" height="4" rx="2" fill="#f7a072" /><rect x="46" y="48" width="30" height="3" rx="1.5" fill="#f7a072" /><rect x="46" y="56" width="26" height="3" rx="1.5" fill="#f7a072" /><rect x="46" y="64" width="30" height="3" rx="1.5" fill="#c7d6f5" />
            {variant === "money" && <text x="72" y="44" fontSize="10" fill="var(--color-brand-600)" fontWeight="700">Rp</text>}
            <circle cx={variant === "box" ? 80 : 40} cy="80" r="10" fill={variant === "box" ? "#e05656" : "#f6a31b"} />
            <text x={variant === "box" ? 80 : 40} y="84" fontSize="12" fill="#fff" textAnchor="middle" fontWeight="700">{variant === "box" ? "×" : variant === "money" ? "?" : "!"}</text></>
        )}
      </svg>
      <p className="font-semibold text-slate-800">{text}</p>
      {sub && <p className="max-w-md text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

/** Page numbers with gaps: 1 … 4 5 6 … 12 */
function pageList(page: number, last: number): (number | "…")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const set = new Set([1, last, page - 1, page, page + 1].filter((n) => n >= 1 && n <= last));
  const sorted = [...set].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i && n - sorted[i - 1] > 1 ? ["…" as const, n] : [n]));
}

export const PER_PAGE = 10;

/**
 * Table footer pagination: "Menampilkan 1–10 dari 37", page numbers and rows per page.
 * Always shown (even on a single page) so the list size and page size stay visible.
 */
export function Pager({ page, last, onPage, perPage, onPerPage, total }: { page: number; last: number; onPage: (p: number) => void; perPage?: number; onPerPage?: (n: number) => void; total?: number }) {
  const lastPage = Math.max(1, last);
  const from = total && perPage ? (page - 1) * perPage + 1 : null;
  const to = total && perPage ? Math.min(total, page * perPage) : null;
  const btn = "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>{total === undefined ? `Halaman ${page} dari ${lastPage}` : total === 0 ? "Tidak ada data" : <>Menampilkan <b className="text-slate-700">{from}–{to}</b> dari <b className="text-slate-700">{total}</b></>}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${btn} text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent`} aria-label="Sebelumnya"><ChevronLeft size={16} /></button>
        {pageList(page, lastPage).map((n, i) => n === "…"
          ? <span key={`g${i}`} className="px-1 text-slate-400">…</span>
          : <button key={n} onClick={() => onPage(n)} className={`${btn} ${n === page ? "bg-navy font-semibold text-white" : "text-slate-600 hover:bg-slate-100"}`}>{n}</button>)}
        <button disabled={page >= lastPage} onClick={() => onPage(page + 1)} className={`${btn} text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent`} aria-label="Berikutnya"><ChevronRight size={16} /></button>
      </div>
      {onPerPage ? (
        <label className="flex items-center gap-2">Per halaman
          <Select className="h-8 w-20 rounded-lg px-2" value={String(perPage ?? PER_PAGE)} onChange={(e) => { onPerPage(Number(e.target.value)); onPage(1); }}>{[10, 50, 500, 1000].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
        </label>
      ) : <span className="hidden sm:block" />}
    </div>
  );
}

const fmtShort = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
export function useRange(days = 6) {
  return useState({ from: isoDate(new Date(Date.now() - days * 864e5)), to: isoDate(new Date()) });
}
export function RangeButton({ value, onChange }: { value: { from: string; to: string }; onChange: (v: { from: string; to: string }) => void }) {
  return <DateRangePicker value={value} onChange={onChange} />;
}

export function Dialog({ title, icon: Icon, onClose, children, width = "max-w-lg" }: { title: string; icon?: LucideIcon; onClose: () => void; children: React.ReactNode; width?: string }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-24" onClick={onClose}>
      <div className={`w-full ${width} rounded-xl bg-white shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          {Icon && <Icon size={20} className="text-slate-700" />}
          <h3 className="flex-1 text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Tutup"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function DialogActions({ onCancel, saving, label = "Simpan", cancel = "Batal" }: { onCancel: () => void; saving?: boolean; label?: string; cancel?: string }) {
  return (
    <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button type="button" onClick={onCancel} className="h-10 min-w-28 rounded-lg border border-brand-600 px-5 text-sm font-semibold text-brand-600">{cancel}</button>
      <button disabled={saving} className="h-10 min-w-28 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "…" : label}</button>
    </div>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-brand-600" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-slate-700">{children}</label>;
}

/** Scoped CRUD list against /api/r/{type}. */
export function useResource<T = any>(type: string, params: Record<string, string> = {}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);
  const [data, setData] = useState<Paginated<T> | null>(null);
  const key = JSON.stringify(params);
  const load = useCallback(() => {
    api<Paginated<T>>(`/r/${type}?${new URLSearchParams({ ...params, page: String(page), per_page: String(perPage) })}`).then(setData);
  }, [type, key, page, perPage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  const create = async (body: unknown) => { const r = await api(`/r/${type}`, { method: "POST", json: body }); load(); return r; };
  const update = async (id: number, body: unknown) => { const r = await api(`/r/${type}/${id}`, { method: "PUT", json: body }); load(); return r; };
  const remove = async (id: number) => { await api(`/r/${type}/${id}`, { method: "DELETE" }); load(); };
  return { data, rows: data?.data ?? [], page, setPage, perPage, setPerPage, load, create, update, remove };
}

export const fmtDateLong = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

/** Smooth area line chart (SVG) used by analytics pages. */
export function AreaChart({ data, height = 260, color = "#3b82f6", rotate }: { data: { label: string; value: number }[]; height?: number; color?: string; rotate?: boolean }) {
  const w = 1000, h = height, pad = { l: 40, r: 10, t: 10, b: rotate ? 46 : 28 };
  const max = Math.max(4, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 4) * 4;
  const x = (i: number) => pad.l + (data.length < 2 ? 0 : (i * (w - pad.l - pad.r)) / (data.length - 1));
  const y = (v: number) => pad.t + (1 - v / nice) * (h - pad.t - pad.b);
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const path = pts.reduce((acc, [px, py], i) => {
    if (!i) return `M${px},${py}`;
    const [qx, qy] = pts[i - 1];
    const cx = (qx + px) / 2;
    return `${acc} C${cx},${qy} ${cx},${py} ${px},${py}`;
  }, "");
  const id = `g${color.replace("#", "")}`;
  const step = Math.max(1, Math.ceil(data.length / 7));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (nice / 4) * i;
        return <g key={i}><line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="#eef0f5" /><text x={pad.l - 8} y={y(v) + 4} fontSize="12" textAnchor="end" fill="#475569">{Math.round(v)}</text></g>;
      })}
      {data.length > 1 && <path d={`${path} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${id})`} />}
      {data.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth="2.5" />}
      {data.map((d, i) => i % step === 0 && (
        <text key={i} x={x(i)} y={h - (rotate ? 6 : 8)} fontSize="12" fill="#334155" textAnchor={rotate ? "end" : "middle"} transform={rotate ? `rotate(-35 ${x(i)} ${h - 6})` : undefined}>
          {new Date(d.label).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
        </text>
      ))}
    </svg>
  );
}
