"use client";
import { AlertTriangle, Bluetooth, CheckCircle2, Loader2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Panel, Toggle } from "@/components/kit";
import { getCachedPrintSettings } from "@/lib/printSettings";
import { directSupported, forgetAllPrinters, getDirectPrefs, grantedPorts, LABEL_MM, pickPrinter, printerName, printTest, setDirectPrefs, type DirectPrintPrefs } from "@/lib/thermal";

/**
 * Printer Bluetooth (cetak langsung): pick the paired label printer once, then "Cetak Label" sends the resi straight to it
 * (TSPL, 203 dpi, label size from the setting above) instead of opening a PDF. Settings are per device/browser.
 */
export function DirectPrinterCard() {
  const [supported, setSupported] = useState(true);
  const [ports, setPorts] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<DirectPrintPrefs>(getDirectPrefs());
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const paper = getCachedPrintSettings().paper_size;

  const refresh = () => grantedPorts().then((ps) => setPorts(ps.map(printerName))).catch(() => setPorts([]));
  useEffect(() => { setSupported(directSupported()); refresh(); }, []);
  const current = ports.length ? Math.min(prefs.port >= 0 ? prefs.port : ports.length - 1, ports.length - 1) : -1;
  const name = current >= 0 ? ports[current] : null;
  const update = (p: Partial<DirectPrintPrefs>) => { setDirectPrefs(p); setPrefs(getDirectPrefs()); };
  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key); setMsg(null);
    try { setMsg({ ok: true, text: await fn() }); } catch (e) {
      const m = (e as Error).message || "Gagal";
      // Show Chrome's own reason: it tells which port / why (busy, not connected, …).
      setMsg({ ok: false, text: /No port selected/i.test(m) ? "Tidak ada printer yang dipilih." : m });
    } finally { setBusy(""); }
  };

  return (
    <Panel className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Bluetooth size={20} /></span>
        <div className="flex-1">
          <b className="text-slate-800">Printer Bluetooth (cetak langsung)</b>
          <p className="text-sm text-slate-500">Untuk printer label thermal seperti <b>Xprinter XP-420B</b>. Tombol Cetak Label langsung mengirim resi ke printer tanpa membuka PDF / dialog print. Pengaturan ini berlaku di komputer & browser ini saja.</p>
        </div>
      </div>

      {!supported ? (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />Browser ini belum mendukung cetak langsung. Buka Pesanin di <b>Google Chrome</b> atau <b>Microsoft Edge</b> terbaru di Mac/Windows (Safari & Firefox belum bisa).</p>
      ) : (
        <>
          <ol className="list-decimal space-y-1 rounded-lg bg-slate-50 p-3 pl-7 text-xs text-slate-600">
            <li>Nyalakan printer, lalu pair lewat <b>Pengaturan Bluetooth</b> Mac/Windows (PIN biasanya <b>0000</b> atau <b>1234</b>).</li>
            <li>Klik <b>Hubungkan printer</b> dan pilih Xprinter dari daftar. Di Mac biasanya muncul dua: pilih yang bernama <b>cu.XP-420B</b> / port serial dulu; kalau gagal, coba yang lain lewat pilihan port.</li>
            <li>Klik <b>Cetak tes</b>, cek ukuran & warna, lalu aktifkan <b>Cetak langsung</b>.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            {ports.length <= 1 && <span className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${name ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><Printer size={15} />{name ?? "Belum ada printer"}</span>}
            {ports.length > 1 && (
              <select className="input h-9 w-72 text-sm" value={current} onChange={(e) => update({ port: Number(e.target.value) })}>
                {ports.map((n, i) => <option key={i} value={i}>{i + 1}. {n}</option>)}
              </select>
            )}
            <button onClick={() => run("pick", async () => {
              const p = await pickPrinter();
              const all = await grantedPorts();
              update({ port: Math.max(0, all.indexOf(p)) });
              await refresh();
              return `Printer dipilih: ${printerName(p)}. Coba Cetak tes.`;
            })} disabled={!!busy}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === "pick" && <Loader2 size={14} className="animate-spin" />}{name ? "Ganti printer" : "Hubungkan printer"}</button>
            <button onClick={() => run("test", async () => { await printTest(paper); return "Label tes dikirim ke printer."; })} disabled={!!busy || !name}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">{busy === "test" && <Loader2 size={14} className="animate-spin" />}Cetak tes</button>
            {ports.length > 0 && (
              <button onClick={() => run("reset", async () => { await forgetAllPrinters(); await refresh(); setPrefs(getDirectPrefs()); return "Daftar port dibersihkan. Silakan hubungkan ulang ke cu.XP-420B."; })} disabled={!!busy}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-500 hover:text-rose-600 disabled:opacity-50">Reset port</button>
            )}
          </div>
          {msg && <p className={`flex items-start gap-2 rounded-lg p-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}{msg.text}</p>}

          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            <label className="flex items-center justify-between gap-3 p-3 text-sm">
              <span><b className="block text-slate-800">Cetak langsung ke printer ini</b><span className="text-xs text-slate-500">Cetak Label di Pesanan & Pengiriman langsung keluar di printer (ukuran {LABEL_MM[paper] ? `${LABEL_MM[paper]![0]}×${LABEL_MM[paper]![1]} mm` : "A4 tidak didukung, pilih ukuran label di atas"}).</span></span>
              <Toggle checked={prefs.enabled && !!name && !!LABEL_MM[paper]} onChange={(v) => update({ enabled: v })} />
            </label>
            <label className="flex items-center justify-between gap-3 p-3 text-sm">
              <span><b className="block text-slate-800">Balik warna</b><span className="text-xs text-slate-500">Aktifkan kalau hasil cetak tes hitam di bagian yang seharusnya putih.</span></span>
              <Toggle checked={prefs.invert} onChange={(v) => update({ invert: v })} />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <span><b className="block text-slate-800">Kepekatan & jarak label</b><span className="text-xs text-slate-500">Naikkan kepekatan kalau tulisan/barcode pudar. Jarak antar label (gap) standar 2 mm.</span></span>
              <span className="flex items-center gap-2 text-xs text-slate-500">
                Pekat <select className="input h-8 w-16" value={prefs.density} onChange={(e) => update({ density: Number(e.target.value) })}>{[4, 6, 8, 10, 12, 15].map((d) => <option key={d}>{d}</option>)}</select>
                Gap <select className="input h-8 w-20" value={prefs.gap} onChange={(e) => update({ gap: Number(e.target.value) })}>{[0, 2, 3].map((g) => <option key={g} value={g}>{g} mm</option>)}</select>
              </span>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
