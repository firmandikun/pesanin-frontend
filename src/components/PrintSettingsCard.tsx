"use client";
import { CheckCircle2, FileText, Loader2, Printer, Sliders } from "lucide-react";
import { useEffect, useState } from "react";
import { Panel, Toggle } from "@/components/kit";
import { api, ApiError } from "@/lib/api";
import { DEFAULT_PRINT_SETTINGS, getCachedPrintSettings, setCachedPrintSettings, type PaperSize, type PrintSettings } from "@/lib/printSettings";

export function PrintSettingsCard({ onSave }: { onSave?: (settings: PrintSettings) => void }) {
  const [s, setS] = useState<PrintSettings>(getCachedPrintSettings());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<Record<string, any>>("/user-settings")
      .then((res) => {
        const remote = res?.print_settings || res?.automation?.print_settings;
        if (remote) {
          const merged: PrintSettings = {
            paper_size: remote.paper_size || DEFAULT_PRINT_SETTINGS.paper_size,
            sku_font_size: Number(remote.sku_font_size) || DEFAULT_PRINT_SETTINGS.sku_font_size,
            show_table_border: remote.show_table_border !== false,
          };
          setS(merged);
          setCachedPrintSettings(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = async (next: PrintSettings) => {
    setS(next);
    setCachedPrintSettings(next);
    setSaving(true);
    setMsg(null);
    try {
      await api("/user-settings", {
        method: "PUT",
        json: { key: "print_settings", value: next },
      });
      setMsg({ ok: true, text: "Pengaturan cetak resi tersimpan." });
      onSave?.(next);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan pengaturan" });
    } finally {
      setSaving(false);
    }
  };

  const paperOptions: { id: PaperSize; title: string; desc: string; badge: string }[] = [
    {
      id: "100x150",
      title: "100 × 150 mm (A6 Thermal)",
      desc: "Standar resmi ekspedisi Shopee, J&T, SPX, SiCepat, dll.",
      badge: "Paling Populer",
    },
    {
      id: "100x100",
      title: "100 × 100 mm (Thermal Kotak)",
      desc: "Ukuran ringkas persegi untuk printer thermal 100mm.",
      badge: "Thermal Kotak",
    },
    {
      id: "a4",
      title: "A4 (Kertas HVS / Printer Biasa)",
      desc: "Untuk mencetak di kertas HVS menggunakan printer laser atau inkjet.",
      badge: "Kertas A4",
    },
  ];

  const fontSizes = [
    { size: 7, label: "7 pt", desc: "Kecil (Standar Shopee)" },
    { size: 8, label: "8 pt", desc: "Standar Rapi (Rekomendasi)" },
    { size: 9, label: "9 pt", desc: "Sedang Jelas" },
    { size: 10, label: "10 pt", desc: "Besar (Mudah Dibaca)" },
    { size: 11, label: "11 pt", desc: "Ekstra Besar" },
  ];

  return (
    <Panel className="space-y-6 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Printer size={20} />
        </span>
        <div className="flex-1">
          <b className="text-slate-800">Format & Ukuran Cetak Resi (Thermal / PDF)</b>
          <p className="text-sm text-slate-500">
            Atur ukuran kertas, ukuran teks SKU / Nama Produk, dan border tabel resi agar hasil cetak Shopee dan resi toko pas di kertas dan mudah dibaca oleh tim packing.
          </p>
        </div>
      </div>

      {msg && (
        <p className={`rounded-lg p-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {msg.text}
        </p>
      )}

      {/* Ukuran Kertas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <b className="text-sm text-slate-700">1. Ukuran Kertas Cetak</b>
          <span className="text-xs text-slate-400">Pilih jenis kertas yang digunakan di printernya</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {paperOptions.map((opt) => {
            const active = s.paper_size === opt.id;
            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => save({ ...s, paper_size: opt.id })}
                className={`relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                  active
                    ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-400/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className={`text-xs font-semibold ${active ? "text-brand-700" : "text-slate-600"}`}>
                    {opt.badge}
                  </span>
                  {active && <CheckCircle2 size={16} className="text-brand-600" />}
                </div>
                <b className={`mt-1 text-sm ${active ? "text-brand-900" : "text-slate-800"}`}>
                  {opt.title}
                </b>
                <p className="mt-1 text-xs text-slate-500">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ukuran Font SKU / Nama Produk */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <b className="text-sm text-slate-700">2. Ukuran Teks SKU / Nama Produk</b>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700">
            {s.sku_font_size} pt
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {fontSizes.map((f) => {
            const active = s.sku_font_size === f.size;
            return (
              <button
                type="button"
                key={f.size}
                onClick={() => save({ ...s, sku_font_size: f.size })}
                className={`flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 text-center transition-all ${
                  active
                    ? "border-brand-500 bg-brand-50/40 font-bold text-brand-700 ring-2 ring-brand-400/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="text-sm">{f.label}</span>
                <span className="text-[10px] text-slate-400">{f.desc.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Border Garis Tabel */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <b className="block text-sm text-slate-700">Garis Border Kotak & Sekat Tabel Resi</b>
            <span className="text-xs text-slate-500">
              Menambahkan border luar dan garis sekat vertikal antar kolom (#, SKU, Qty) agar pemisahan tiap produk terlihat tegas dan rapi.
            </span>
          </div>
          <Toggle
            checked={s.show_table_border}
            onChange={(v) => save({ ...s, show_table_border: v })}
          />
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pratinjau Hasil Cetak Tabel Resi
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Kertas: {s.paper_size.toUpperCase()} · Font: {s.sku_font_size}pt
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <p className="mb-2 text-center text-[10px] font-semibold text-slate-400">--- Bagian Tabel Resi Shopee / Pesanin ---</p>
          <div
            className={`w-full font-mono transition-all ${
              s.show_table_border ? "border border-black" : "border-b border-black"
            }`}
          >
            {/* Header */}
            <div
              className={`flex bg-slate-50 text-[10px] font-bold ${
                s.show_table_border ? "border-b border-black divide-x divide-black" : "border-b border-black"
              }`}
            >
              <div className="w-8 py-1 text-center">#</div>
              <div className="flex-1 px-2 py-1">SKU</div>
              <div className="w-12 py-1 text-center">Qty</div>
            </div>

            {/* Row 1 */}
            <div
              className={`flex items-center ${
                s.show_table_border
                  ? "border-b border-black divide-x divide-black"
                  : "border-b border-slate-200"
              }`}
            >
              <div className="w-8 py-1.5 text-center text-xs text-slate-700">1</div>
              <div
                className="flex-1 px-2 py-1.5 font-bold leading-tight text-slate-900"
                style={{ fontSize: `${s.sku_font_size}pt` }}
              >
                [YKT]-SAGE GREEN FP-L
              </div>
              <div className="w-12 py-1.5 text-center font-bold text-slate-900">1</div>
            </div>

            {/* Row 2 */}
            <div
              className={`flex items-center ${
                s.show_table_border ? "divide-x divide-black" : ""
              }`}
            >
              <div className="w-8 py-1.5 text-center text-xs text-slate-700">2</div>
              <div
                className="flex-1 px-2 py-1.5 font-bold leading-tight text-slate-900"
                style={{ fontSize: `${s.sku_font_size}pt` }}
              >
                [KOS]-KAOS POLOS HITAM-XL
              </div>
              <div className="w-12 py-1.5 text-center font-bold text-slate-900">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black font-bold">
                  2
                </span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-400">--- Batas Bawah Tabel ---</p>
        </div>
      </div>

      {saving && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 size={13} className="animate-spin" /> Menyimpan perubahan…
        </p>
      )}
    </Panel>
  );
}
