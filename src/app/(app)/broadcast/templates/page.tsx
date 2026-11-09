"use client";
import { FileText, Info, Plus, RefreshCcw, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { WaBubble } from "@/components/inbox/WaBubble";
import { Dialog, DialogActions, EmptyState, FieldLabel, PageHead, Panel, PrimaryBtn } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError } from "@/lib/api";
import { CATEGORY, fillBody, TEMPLATE_STATUS, WaTemplate } from "@/lib/broadcast";

/** WhatsApp message templates (from Meta): list, create for review, delete. */
export default function Templates() {
  const [rows, setRows] = useState<WaTemplate[] | null>(null);
  const [err, setErr] = useState("");
  const [create, setCreate] = useState(false);
  const load = useCallback(() => {
    setErr("");
    api<{ data: WaTemplate[] }>("/whatsapp/templates").then((r) => setRows(r.data)).catch((e) => { setRows([]); setErr(e instanceof ApiError ? e.message : "Gagal memuat template"); });
  }, []);
  useEffect(() => { load(); }, [load]);
  const remove = async (t: WaTemplate) => {
    if (!(await askConfirm(`Hapus template "${t.name}" dari Meta? Semua bahasanya ikut terhapus dan namanya tidak bisa dipakai lagi selama 30 hari.`))) return;
    try { await api(`/whatsapp/templates/${t.name}`, { method: "DELETE" }); load(); } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal menghapus"); }
  };

  return (
    <div className="space-y-5">
      <PageHead title="Template WhatsApp" tutorial={false} crumbs={[["Chat", "/chat"], ["Broadcast", "/broadcast"], ["Template"]]}>
        <button onClick={load} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy"><RefreshCcw size={16} />Muat ulang</button>
        <PrimaryBtn onClick={() => setCreate(true)}>Buat Template</PrimaryBtn>
      </PageHead>
      <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-800"><Info size={16} className="mt-0.5 shrink-0" />
        <span>Pesan pertama ke pelanggan (dan pesan setelah lewat 24 jam) wajib memakai template yang disetujui Meta. Review biasanya beberapa menit, paling lama 24 jam. Template <b>Marketing</b> untuk promo, <b>Utilitas</b> untuk info pesanan.</span></p>
      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err} {err.includes("Integrasi") && <Link href="/settings/integrations#whatsapp" className="font-semibold underline">Buka Integrasi</Link>}</p>}
      <Panel>
        {!rows ? <p className="p-8 text-center text-sm text-slate-400">Memuat template dari Meta…</p> : !rows.length ? <EmptyState text="Belum ada template" sub="Buat template pertama, misalnya info promo atau konfirmasi pesanan." /> : (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((t) => {
              const [st, tone] = TEMPLATE_STATUS[t.status ?? ""] ?? [t.status ?? "–", "bg-slate-100 text-slate-600"];
              return (
                <div key={`${t.name}-${t.language}`} className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-slate-100">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1"><b className="block truncate text-sm text-navy">{t.name}</b>
                      <span className="text-xs text-slate-500">{CATEGORY[t.category ?? ""] ?? t.category} · {t.language}{t.variables > 0 && ` · ${t.variables} variabel`}</span></div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>{st}</span>
                  </div>
                  <WaBubble header={t.header} body={t.body} footer={t.footer} buttons={t.buttons} />
                  {t.rejected_reason && t.rejected_reason !== "NONE" && <p className="text-xs text-rose-600">Alasan ditolak: {t.rejected_reason}</p>}
                  {!t.supported && <p className="text-xs text-amber-700">Belum bisa dipakai broadcast: {t.unsupported_reason}</p>}
                  <button onClick={() => remove(t)} className="mt-auto flex items-center gap-1.5 self-end text-xs text-slate-400 hover:text-rose-600"><Trash2 size={13} />Hapus</button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      {create && <CreateTemplate onClose={() => setCreate(false)} onSaved={() => { setCreate(false); load(); }} />}
    </div>
  );
}

function CreateTemplate({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", category: "MARKETING", language: "id", header: "", body: "", footer: "" });
  const [examples, setExamples] = useState<string[]>([]);
  const [buttons, setButtons] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const count = new Set((f.body.match(/\{\{(\d+)\}\}/g) ?? [])).size;

  const addVar = () => {
    const el = bodyRef.current;
    const token = `{{${count + 1}}}`;
    const at = el?.selectionStart ?? f.body.length;
    setF({ ...f, body: f.body.slice(0, at) + token + f.body.slice(at) });
  };
  const save = async () => {
    setSaving(true); setErr("");
    try {
      await api("/whatsapp/templates", { method: "POST", json: { ...f, header: f.header || null, footer: f.footer || null, examples: examples.slice(0, count), buttons: buttons.filter(Boolean) } });
      onSaved();
    } catch (e) { setErr(e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Gagal mengirim template"); } finally { setSaving(false); }
  };

  return (
    <Dialog title="Buat Template WhatsApp" icon={FileText} onClose={onClose} width="max-w-3xl">
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-5 md:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div><FieldLabel>Nama template</FieldLabel>
            <input className="input font-mono" required maxLength={100} placeholder="promo_akhir_bulan" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_") })} />
            <p className="mt-1 text-xs text-slate-500">Huruf kecil, angka, dan garis bawah. Hanya terlihat olehmu.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Kategori</FieldLabel>
              <Select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="MARKETING">Marketing (promo)</option><option value="UTILITY">Utilitas (info pesanan)</option></Select></div>
            <div><FieldLabel>Bahasa</FieldLabel>
              <Select className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="id">Indonesia</option><option value="en">English</option></Select></div>
          </div>
          <div><FieldLabel>Judul (opsional)</FieldLabel><input className="input" maxLength={60} placeholder="Promo Spesial 🎉" value={f.header} onChange={(e) => setF({ ...f, header: e.target.value })} /></div>
          <div>
            <div className="mb-1.5 flex items-center justify-between"><span className="text-sm font-medium text-slate-700">Isi pesan</span>
              <button type="button" onClick={addVar} className="flex items-center gap-1 text-xs font-semibold text-brand-600"><Plus size={13} />Tambah variabel</button></div>
            <textarea ref={bodyRef} className="input min-h-32 py-2" required maxLength={1024} placeholder={"Halo {{1}}, ada diskon {{2}} khusus untukmu minggu ini!"} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
            <p className="mt-1 text-xs text-slate-500">{"{{1}}"}, {"{{2}}"} diisi saat broadcast, mis. nama pelanggan. Jangan taruh variabel di awal atau akhir pesan.</p>
          </div>
          {count > 0 && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-600">Contoh isi variabel (wajib untuk review Meta)</p>
              {Array.from({ length: count }, (_, i) => (
                <label key={i} className="flex items-center gap-2 text-sm"><span className="w-10 font-mono text-xs text-slate-500">{`{{${i + 1}}}`}</span>
                  <input className="input h-9 flex-1 bg-white" required placeholder={i === 0 ? "Rina" : "20%"} value={examples[i] ?? ""} onChange={(e) => { const n = [...examples]; n[i] = e.target.value; setExamples(n); }} /></label>
              ))}
            </div>
          )}
          <div><FieldLabel>Catatan kaki (opsional)</FieldLabel><input className="input" maxLength={60} placeholder="Balas STOP untuk berhenti" value={f.footer} onChange={(e) => setF({ ...f, footer: e.target.value })} /></div>
          <div>
            <div className="mb-1.5 flex items-center justify-between"><span className="text-sm font-medium text-slate-700">Tombol balas cepat (opsional)</span>
              {buttons.length < 3 && <button type="button" onClick={() => setButtons([...buttons, ""])} className="flex items-center gap-1 text-xs font-semibold text-brand-600"><Plus size={13} />Tambah tombol</button>}</div>
            {buttons.map((b, i) => (
              <div key={i} className="mb-2 flex gap-2"><input className="input h-9 flex-1" maxLength={25} placeholder="Mau pesan" value={b} onChange={(e) => { const n = [...buttons]; n[i] = e.target.value; setButtons(n); }} />
                <button type="button" onClick={() => setButtons(buttons.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600" aria-label="Hapus tombol"><X size={16} /></button></div>
            ))}
          </div>
          {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
        </div>
        <div className="space-y-2"><p className="text-sm font-medium text-slate-700">Pratinjau</p>
          <WaBubble header={f.header} body={fillBody(f.body, examples)} footer={f.footer} buttons={buttons} /></div>
        <div className="md:col-span-2"><DialogActions onCancel={onClose} saving={saving} label="Kirim untuk review" /></div>
      </form>
    </Dialog>
  );
}
