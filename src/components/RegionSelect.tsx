"use client";
import { ChevronDown, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, Region } from "@/lib/api";

/** Searchable "Kota / Kecamatan" picker, like the original checkout. */
export function RegionSelect({ value, label, onChange, placeholder = "Masukkan Kota / Kecamatan", seller }: {
  value?: number | null; label?: string | null; onChange: (r: Region) => void; placeholder?: string;
  /** Product slug on the public checkout, so the search uses that shop's Biteship (all kecamatan). */
  seller?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [list, setList] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.length < 3) return setList([]);
    setLoading(true);
    const t = setTimeout(() => api<Region[]>(`/public/regions?q=${encodeURIComponent(q)}${seller ? `&seller=${encodeURIComponent(seller)}` : ""}`).then(setList).finally(() => setLoading(false)), 250);
    return () => clearTimeout(t);
  }, [q, seller]);

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="input flex items-center justify-between gap-2 text-left">
        <MapPin size={16} className="shrink-0 text-slate-400" />
        <span className={`flex-1 truncate ${value ? "" : "text-slate-400"}`}>{value ? label : placeholder}</span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
      {open && (
        <div className="card absolute z-20 mt-1 w-full p-2 shadow-lg">
          <input autoFocus className="input" placeholder="Ketik kecamatan, kota, atau kode pos (min. 3 huruf)" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="mt-1 max-h-56 overflow-y-auto text-sm">
            {loading && <p className="p-2 text-slate-400">Mencari…</p>}
            {!loading && q.length >= 3 && !list.length && <p className="p-2 text-slate-400">Tidak ditemukan.</p>}
            {list.map((r) => (
              <button type="button" key={r.id} onClick={() => { onChange(r); setOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-brand-50">
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
