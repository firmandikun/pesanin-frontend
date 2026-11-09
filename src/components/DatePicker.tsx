"use client";
import { endOfMonth, format, isValid, parseISO, startOfMonth, subDays, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarDays, ChevronDown, Clock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";

export type Range = { from: string; to: string };
const iso = (d: Date) => format(d, "yyyy-MM-dd");
const parse = (s?: string | null) => { const d = s ? parseISO(s) : null; return d && isValid(d) ? d : undefined; };

/** Popover that closes on outside click / Escape and flips when near the viewport edge. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ up: false, right: false });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const r = ref.current?.getBoundingClientRect();
    if (r) setPlace({ up: innerHeight - r.bottom < 420 && r.top > 420, right: r.left + 640 > innerWidth });
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const panel = `absolute z-50 rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] ${place.up ? "bottom-full mb-2" : "top-full mt-2"} ${place.right ? "right-0" : "left-0"}`;
  return { open, setOpen, ref, panel };
}

const triggerCls = "flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100";

const PRESETS: [string, () => [Date, Date]][] = [
  ["Hari ini", () => [new Date(), new Date()]],
  ["Kemarin", () => [subDays(new Date(), 1), subDays(new Date(), 1)]],
  ["7 hari terakhir", () => [subDays(new Date(), 6), new Date()]],
  ["30 hari terakhir", () => [subDays(new Date(), 29), new Date()]],
  ["Bulan ini", () => [startOfMonth(new Date()), new Date()]],
  ["Bulan lalu", () => [startOfMonth(subMonths(new Date(), 1)), endOfMonth(subMonths(new Date(), 1))]],
  ["90 hari terakhir", () => [subDays(new Date(), 89), new Date()]],
  ["6 bulan terakhir", () => [subMonths(new Date(), 6), new Date()]],
];

export function DateRangePicker({ value, onChange, className = "" }: { value: Range; onChange: (v: Range) => void; className?: string }) {
  const pop = usePopover();
  const [draft, setDraft] = useState<DateRange | undefined>();
  useEffect(() => { if (pop.open) setDraft({ from: parse(value.from), to: parse(value.to) }); }, [pop.open]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = (d?: string) => (parse(d) ? format(parse(d)!, "dd MMM", { locale: localeId }) : "-");
  const apply = (r?: DateRange) => { if (r?.from) { onChange({ from: iso(r.from), to: iso(r.to ?? r.from) }); pop.setOpen(false); } };

  return (
    <div ref={pop.ref} className={`relative ${className}`}>
      <button type="button" onClick={() => pop.setOpen(!pop.open)} className={`${triggerCls} ${pop.open ? "border-brand-500 ring-4 ring-brand-100" : ""}`}>
        <CalendarDays size={16} className="text-slate-500" />
        <span className="whitespace-nowrap">{label(value.from)} - {label(value.to)}</span>
        <ChevronDown size={15} className={`text-slate-400 transition ${pop.open ? "rotate-180" : ""}`} />
      </button>
      {pop.open && (
        <div className={`${pop.panel} flex w-max animate-[fadeIn_.15s_ease-out] overflow-hidden`}>
          <ul className="hidden w-44 shrink-0 border-r border-slate-100 p-2 text-sm sm:block">
            {PRESETS.map(([l, fn]) => {
              const [f, t] = fn();
              const on = draft?.from && draft.to && iso(draft.from) === iso(f) && iso(draft.to) === iso(t);
              return (
                <li key={l}><button type="button" onClick={() => setDraft({ from: f, to: t })}
                  className={`w-full rounded-lg px-3 py-2 text-left transition ${on ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}>{l}</button></li>
              );
            })}
          </ul>
          <div className="p-3">
            <DayPicker mode="range" locale={localeId} numberOfMonths={2} selected={draft} onSelect={setDraft} defaultMonth={subMonths(parse(value.to) ?? new Date(), 1)} disabled={{ after: new Date() }} className="fk-dp" />
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
              <span className="text-slate-500">{draft?.from ? `${format(draft.from, "d MMM yyyy", { locale: localeId })} – ${draft.to ? format(draft.to, "d MMM yyyy", { locale: localeId }) : "…"}` : "Pilih tanggal awal"}</span>
              <span className="flex gap-2">
                <button type="button" onClick={() => pop.setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-1.5 font-medium text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="button" disabled={!draft?.from} onClick={() => apply(draft)} className="rounded-lg bg-brand-600 px-4 py-1.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">Terapkan</button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DatePicker({ value, onChange, placeholder = "Pilih tanggal", minDate, maxDate, className = "", clearable }: {
  value?: string | null; onChange: (v: string) => void; placeholder?: string; minDate?: Date; maxDate?: Date; className?: string; clearable?: boolean;
}) {
  const pop = usePopover();
  const d = parse(value);
  return (
    <div ref={pop.ref} className={`relative ${className}`}>
      <button type="button" onClick={() => pop.setOpen(!pop.open)} className={`${triggerCls} w-full justify-between ${pop.open ? "border-brand-500 ring-4 ring-brand-100" : ""}`}>
        <span className="flex items-center gap-2"><CalendarDays size={16} className="text-slate-500" /><span className={d ? "" : "text-slate-400"}>{d ? format(d, "EEEE, d MMM yyyy", { locale: localeId }) : placeholder}</span></span>
        {clearable && d ? <X size={15} className="text-slate-400 hover:text-slate-700" onClick={(e) => { e.stopPropagation(); onChange(""); }} /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>
      {pop.open && (
        <div className={`${pop.panel} p-3`}>
          <DayPicker mode="single" locale={localeId} selected={d} defaultMonth={d ?? new Date()} onSelect={(x) => { if (x) { onChange(iso(x)); pop.setOpen(false); } }}
            disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]} className="fk-dp" />
          <div className="flex justify-between border-t border-slate-100 pt-2 text-sm">
            <button type="button" className="font-medium text-brand-600" onClick={() => { onChange(iso(new Date())); pop.setOpen(false); }}>Hari ini</button>
            <button type="button" className="text-slate-500" onClick={() => pop.setOpen(false)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Date + time (value "YYYY-MM-DDTHH:mm"), e.g. countdown deadlines. */
export function DateTimePicker({ value, onChange, className = "" }: { value?: string | null; onChange: (v: string | null) => void; className?: string }) {
  const [date, time] = (value ?? "").split("T");
  return (
    <div className={`flex gap-2 ${className}`}>
      <DatePicker className="flex-1" value={date} minDate={new Date()} clearable onChange={(d) => onChange(d ? `${d}T${time || "23:59"}` : null)} />
      <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
        <Clock size={15} className="text-slate-500" />
        <input type="time" className="bg-transparent outline-none" value={time || "23:59"} onChange={(e) => onChange(`${date || iso(new Date())}T${e.target.value}`)} />
      </label>
    </div>
  );
}
