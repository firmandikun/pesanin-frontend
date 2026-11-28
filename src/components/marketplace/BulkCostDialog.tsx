"use client";
import { Calculator, Download, Percent, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/kit";
import { api, ApiError, rupiah } from "@/lib/api";

type Group = { key: string; listings: number; shops: string[]; price: number; image: string | null; example: string; cost_price: number | null; mixed: boolean; sold_30d?: number };

/** Minimal CSV reader for a sheet saved from Excel/Google Sheets: `;`, `,` or tab separated, quoted cells allowed. */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const first = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (q) { if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && clean[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** "Rp 12.500", "12500", "12,500.00" → 12500; blank → "". */
function toRupiah(v: string): string {
  const t = v.replace(/rp/i, "").trim();
  if (!t) return "";
  const n = /[.,]\d{1,2}$/.test(t) ? Number(t.replace(/[.,](\d{1,2})$/, "").replace(/[^\d]/g, "")) : Number(t.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? String(n) : "";
}

/**
 * Bulk HPP entry for Shopee listings, grouped by unique SKU or unique product name (+ variation).
 * One value fills every listing that shares the key, across all connected shops.
 */
export function BulkCostDialog({ onClose, onSaved, onlyEmptyFirst = false }: { onClose: () => void; onSaved: (msg: string) => void; onlyEmptyFirst?: boolean }) {
  const [by, setBy] = useState<"sku" | "name">("sku");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [noKey, setNoKey] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [pct, setPct] = useState("40");
  const [onlyEmpty, setOnlyEmpty] = useState(onlyEmptyFirst);
  const [csvNote, setCsvNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setGroups(null);
    api<{ groups: Group[]; without_key: number }>(`/marketplace/listing-costs?by=${by}`).then((d) => {
      // Best sellers first: their HPP moves laba bersih the most.
      setGroups([...d.groups].sort((a, b) => (b.sold_30d ?? 0) - (a.sold_30d ?? 0) || a.key.localeCompare(b.key)));
      setNoKey(d.without_key);
      setValues(Object.fromEntries(d.groups.map((g) => [g.key, g.cost_price ? String(g.cost_price) : ""])));
    });
  }, [by]);

  const shown = useMemo(() => (groups ?? []).filter((g) => !onlyEmpty || !g.cost_price), [groups, onlyEmpty]);
  const changed = (groups ?? []).filter((g) => (values[g.key] ?? "") !== (g.cost_price ? String(g.cost_price) : ""));

  /** Quick estimate: HPP = x% of the selling price, only for rows still empty. */
  const fillPercent = () => {
    const p = Number(pct) / 100;
    setValues((v) => ({ ...v, ...Object.fromEntries(shown.filter((g) => !v[g.key]).map((g) => [g.key, String(Math.round(g.price * p))])) }));
  };

  /** Spreadsheet round trip: download every group with its current HPP, fill the last column, upload it back. */
  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = [by === "sku" ? "SKU" : "Nama produk", "Contoh produk", "Harga jual", "Terjual 30 hari", "HPP per unit"];
    const lines = [head, ...(groups ?? []).map((g) => [g.key, g.example, g.price, g.sold_30d ?? 0, values[g.key] ?? ""])].map((r) => r.map(esc).join(";"));
    const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `hpp-${by === "sku" ? "per-sku" : "per-nama"}.csv` });
    a.click(); URL.revokeObjectURL(url);
  };
  const importCsv = async (file: File) => {
    setCsvNote(""); setErr("");
    const rows = parseCsv(await file.text());
    const known = new Set((groups ?? []).map((g) => g.key));
    const next: Record<string, string> = {};
    let unknown = 0;
    for (const r of rows.slice(1)) {
      const key = (r[0] ?? "").trim();
      const hpp = toRupiah(r[r.length - 1] ?? "");
      if (!key || !hpp) continue;
      if (known.has(key)) next[key] = hpp; else unknown++;
    }
    const n = Object.keys(next).length;
    if (!n) { setErr(`Tidak ada HPP yang terbaca. Pastikan kolom pertama berisi ${by === "sku" ? "SKU" : "nama produk"} dan kolom terakhir berisi HPP.`); return; }
    setValues((v) => ({ ...v, ...next }));
    setOnlyEmpty(false);
    setCsvNote(`${n} HPP terbaca dari file${unknown ? `, ${unknown} baris dilewati karena ${by === "sku" ? "SKU" : "nama"}-nya tidak ditemukan` : ""}. Periksa lalu klik Simpan HPP.`);
  };

  async function save() {
    setSaving(true); setErr("");
    try {
      const r = await api("/marketplace/listing-costs", { method: "POST", json: { by, items: changed.map((g) => ({ key: g.key, cost_price: values[g.key] ? Number(values[g.key]) : null })) } });
      onSaved(`HPP disimpan untuk ${r.updated} listing (${changed.length} ${by === "sku" ? "SKU" : "nama produk"}).`);
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal menyimpan HPP"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog title="Input HPP massal" icon={Calculator} onClose={onClose} width="max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">Kelompokkan berdasarkan</span>
        {(["sku", "name"] as const).map((k) => (
          <button key={k} onClick={() => setBy(k)} className={`h-9 rounded-lg px-3.5 text-sm font-semibold transition ${by === k ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {k === "sku" ? "SKU unik" : "Nama produk unik"}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-sm text-slate-600"><input type="checkbox" className="accent-brand-600" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} />Hanya yang HPP-nya kosong</label>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {by === "sku" ? "Satu nilai HPP berlaku untuk semua listing dengan SKU yang sama, di semua toko." : "Satu nilai HPP berlaku untuk semua listing dengan nama produk dan variasi yang sama, di semua toko."}
        {by === "sku" && noKey > 0 && <> {noKey} listing tanpa SKU tidak muncul di sini; pakai mode Nama produk unik.</>}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
        <span className="text-slate-600">Banyak produk? Isi di Excel:</span>
        <button onClick={exportCsv} disabled={!groups?.length} className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-navy hover:bg-slate-100 disabled:opacity-50"><Download size={13} />Unduh daftar (CSV)</button>
        <button onClick={() => fileRef.current?.click()} disabled={!groups?.length} className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-navy hover:bg-slate-100 disabled:opacity-50"><Upload size={13} />Unggah CSV terisi</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
        <span className="text-xs text-slate-500">Isi kolom terakhir (HPP per unit), simpan sebagai CSV, lalu unggah.</span>
      </div>
      {csvNote && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{csvNote}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
        <Percent size={15} className="text-slate-500" />
        <span className="text-slate-600">Isi yang kosong dengan</span>
        <input type="number" min={1} max={100} className="input h-8 w-20 px-2" value={pct} onChange={(e) => setPct(e.target.value)} />
        <span className="text-slate-600">% dari harga jual</span>
        <button onClick={fillPercent} className="h-8 rounded-lg bg-white px-3 text-xs font-semibold text-navy hover:bg-slate-100">Terapkan</button>
      </div>

      <div className="mt-3 max-h-[46vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="py-2 pr-3 font-semibold">{by === "sku" ? "SKU" : "Nama produk"}</th><th className="py-2 pr-3 font-semibold">Terjual 30 hr</th><th className="py-2 pr-3 font-semibold">Listing</th><th className="py-2 pr-3 font-semibold">Harga jual</th><th className="py-2 pr-3 font-semibold">HPP / unit</th><th className="py-2 font-semibold">Margin</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((g) => {
              const v = Number(values[g.key] || 0);
              const margin = v ? Math.round(((g.price - v) / g.price) * 100) : null;
              return (
                <tr key={g.key}>
                  <td className="py-2.5 pr-3">
                    <p className={`font-medium text-navy ${by === "sku" ? "font-mono" : ""}`}>{g.key}</p>
                    {by === "sku" && <p className="max-w-[260px] truncate text-xs text-slate-400">{g.example}</p>}
                    {g.mixed && <p className="text-xs text-amber-600">HPP saat ini berbeda-beda; nilai baru akan menyamakan semuanya</p>}
                  </td>
                  <td className={`py-2.5 pr-3 ${g.sold_30d ? "font-semibold text-navy" : "text-slate-300"}`}>{g.sold_30d ?? 0}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{g.listings}<span className="block text-xs text-slate-400">{g.shops.length} toko</span></td>
                  <td className="py-2.5 pr-3 text-slate-600">{rupiah(g.price)}</td>
                  <td className="py-2.5 pr-3">
                    <span className="relative inline-block"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                      <input type="number" min={0} className="input h-9 w-36 pl-7 pr-2" value={values[g.key] ?? ""} placeholder="0" onChange={(e) => setValues({ ...values, [g.key]: e.target.value })} /></span>
                  </td>
                  <td className={`py-2.5 text-sm font-semibold ${margin === null ? "text-slate-300" : margin < 15 ? "text-orange-600" : "text-emerald-600"}`}>{margin === null ? "-" : `${margin}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {groups && shown.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Tidak ada data untuk ditampilkan.</p>}
        {!groups && <p className="py-10 text-center text-sm text-slate-400">Memuat…</p>}
      </div>

      {err && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-600">{err}</p>}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-sm text-slate-500">{changed.length} perubahan</span>
        <span className="flex gap-2">
          <button onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-600">Batal</button>
          <button onClick={save} disabled={!changed.length || saving} className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Menyimpan…" : "Simpan HPP"}</button>
        </span>
      </div>
    </Dialog>
  );
}
