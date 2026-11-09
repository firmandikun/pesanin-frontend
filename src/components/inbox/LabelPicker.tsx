"use client";
import { Check, Plus, Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatLabel, labelDot } from "@/lib/inbox";

/** Popover to toggle labels on a chat or customer; typing a new name creates it. */
export function LabelPicker({ labels, value, onChange, compact, align = "right" }: { labels: ChatLabel[]; value: string[]; onChange: (next: string[]) => void; compact?: boolean; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const toggle = (name: string) => onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  const shown = labels.filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase()));
  const fresh = q.trim() && !labels.some((l) => l.name.toLowerCase() === q.trim().toLowerCase()) ? q.trim().slice(0, 40) : "";

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} title="Label" className={`flex items-center gap-1.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 ${compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm ring-1 ring-slate-200"}`}>
        <Tag size={14} />{compact ? (value.length ? "" : "Tambah label") : "Label"}{!compact && value.length > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-xs">{value.length}</span>}
      </button>
      {open && (
        <div className={`absolute ${align === "left" ? "left-0" : "right-0"} z-30 mt-1 w-60 rounded-xl bg-white p-2 shadow-xl ring-1 ring-slate-200`}>
          <input autoFocus className="input mb-1 h-8 text-sm" placeholder="Cari atau buat label" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && fresh) { e.preventDefault(); toggle(fresh); setQ(""); } }} />
          <div className="max-h-56 overflow-y-auto">
            {shown.map((l) => (
              <button key={l.id} type="button" onClick={() => toggle(l.name)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                <span className={`h-2.5 w-2.5 rounded-full ${labelDot(l.color)}`} /><span className="flex-1 truncate">{l.name}</span>{value.includes(l.name) && <Check size={14} className="text-brand-600" />}
              </button>
            ))}
            {fresh && <button type="button" onClick={() => { toggle(fresh); setQ(""); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-brand-600 hover:bg-slate-50"><Plus size={14} />Buat label “{fresh}”</button>}
            {!shown.length && !fresh && <p className="px-2 py-3 text-center text-xs text-slate-400">Ketik nama untuk membuat label.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
