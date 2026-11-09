"use client";
import { ArrowRight, ArrowRightToLine, ClipboardList, Edit3, MessageCircle, PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogActions, FieldLabel, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { askConfirm } from "@/components/Dialogs";

type Tpl = { id: number; event: string; name: string; message: string; is_active: boolean; updated_at: string };

function Art() {
  return (
    <svg viewBox="0 0 200 110" className="h-28 w-48" aria-hidden>
      <rect x="0" y="0" width="200" height="110" rx="10" fill="#fde4e4" />
      <rect x="80" y="20" width="70" height="50" rx="5" fill="#e05510" /><rect x="86" y="26" width="58" height="38" rx="3" fill="#fff5ed" />
      <circle cx="140" cy="18" r="14" fill="#25d366" /><path d="M134 18a6 6 0 1 1 2.6 5l-3.4 1 1-3a6 6 0 0 1-.2-3z" fill="#fff" />
      <circle cx="58" cy="44" r="12" fill="#f2b9a0" /><path d="M46 40 q12-20 24 0 q-4-12-12-12 q-8 0-12 12z" fill="#7b4a2a" />
      <rect x="44" y="56" width="28" height="34" rx="10" fill="#e9837e" /><rect x="30" y="80" width="130" height="6" rx="3" fill="#fecdab" />
      <path d="M160 60 l20-8 -6 14z" fill="#e05510" />
    </svg>
  );
}

export default function FollowUp() {
  const [list, setList] = useState<Tpl[]>([]);
  const [vars, setVars] = useState<string[]>([]);
  const [tab, setTab] = useState<"physical" | "digital">("physical");
  const [def, setDef] = useState("cod");
  const [edit, setEdit] = useState<Partial<Tpl> | null>(null);
  const load = () => api("/followup-templates").then(setList);
  useEffect(() => { load(); api("/followup-variables").then(setVars); api("/user-settings").then((s) => s.followup?.default_method && setDef(s.followup.default_method)); }, []);
  const last = list.reduce((a, t) => (t.updated_at > a ? t.updated_at : a), "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-[34px] font-bold text-slate-800">Follow Up</h1>
        <Select className="h-10 w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option>Order</option></Select></div>
      <Panel className="flex flex-wrap items-center gap-5 p-4">
        <Art />
        <div className="flex-1"><div className="flex items-center gap-2 font-semibold text-slate-800">WhatsApp Notifications <span className="rounded bg-rose-500 px-1.5 text-[10px] text-white">Gratis</span></div>
          <p className="text-sm text-slate-600">Hubungkan WhatsApp-mu agar bisa otomatis mengirim pesan ke penerima dari saat pesanan masuk hingga pesanan selesai.</p></div>
        <Link href="/settings/integrations#whatsapp" className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Hubungkan WhatsApp<ArrowRight size={15} /></Link>
      </Panel>
      <Panel className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600"><ClipboardList size={18} /></span>
        <div className="flex-1"><div className="flex items-center gap-2 font-semibold text-slate-800">Atur template default untuk order tanpa metode pembayaran <span className="rounded bg-brand-600 px-1.5 text-[10px] text-white">Baru</span></div>
          <div className="text-xs text-slate-500">Sekarang kamu bisa atur template follow up untuk order masuk tanpa metode pembayaran</div></div>
        <Select className="h-10 w-36 rounded-lg border border-slate-200 px-3 text-sm" value={def} onChange={async (e) => { setDef(e.target.value); await api("/user-settings", { method: "PUT", json: { key: "followup", value: { default_method: e.target.value } } }); }}>
          <option value="cod">COD</option><option value="bank_transfer">Bank Transfer</option><option value="epayment">E-Payment</option></Select>
      </Panel>
      <Panel>
        <div className="m-3 grid grid-cols-2 rounded-lg bg-slate-50 p-1 text-sm">
          {(["physical", "digital"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-md py-2 ${tab === t ? "bg-white font-medium text-slate-800" : "text-slate-500"}`}>{t === "physical" ? "Produk Fisik" : "Produk Digital"}</button>)}
        </div>
        <div className="flex items-center gap-3 px-5 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"><ClipboardList size={17} /></span>
          <div className="flex-1"><div className="text-lg font-semibold text-slate-800">Default Text</div><div className="text-xs text-slate-500">Terakhir diperbarui: {last ? new Date(last).toLocaleString("id-ID") : "-"}</div></div>
          <button onClick={() => setEdit({ name: "", message: "" })} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"><PlusCircle size={16} />Add Template Text</button>
        </div>
        <div className="space-y-3 px-5 pb-5">
          {list.map((t, i) => (
            <div key={t.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-1 flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                <b className="flex-1 text-slate-800">{t.name}</b>
                {t.event.startsWith("custom_") && <button onClick={async () => { if (await askConfirm("Hapus template?")) { await api(`/followup-templates/${t.id}`, { method: "DELETE" }); load(); } }} className="text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={16} /></button>}
                <button onClick={() => setEdit(t)} className="flex items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1 text-sm font-medium text-brand-600"><Edit3 size={14} />Edit</button>
              </div>
              <p className="whitespace-pre-line pl-9 text-sm text-slate-600">{t.message}</p>
            </div>
          ))}
        </div>
      </Panel>
      {edit && <TemplateDialog value={edit} vars={vars} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function TemplateDialog({ value, vars, onClose, onSaved }: { value: Partial<Tpl>; vars: string[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: value.name ?? "", message: value.message ?? "" });
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (v: string) => { const pos = ref.current?.selectionStart ?? f.message.length; setF({ ...f, message: f.message.slice(0, pos) + `{{${v}}}` + f.message.slice(pos) }); };
  return (
    <Dialog title={value.id ? `Edit ${value.name}` : "Add Template Text"} icon={MessageCircle} onClose={onClose} width="max-w-2xl">
      <form onSubmit={async (e) => { e.preventDefault(); await api(value.id ? `/followup-templates/${value.id}` : "/followup-templates", { method: value.id ? "PUT" : "POST", json: { ...f, is_active: true } }); onSaved(); }} className="space-y-3">
        <div><FieldLabel>Nama Template</FieldLabel><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><FieldLabel>Pesan</FieldLabel><textarea ref={ref} className="textarea" rows={9} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
        <div className="flex flex-wrap gap-1.5">{vars.map((v) => <button type="button" key={v} onClick={() => insert(v)} className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 hover:bg-brand-50"><ArrowRightToLine size={11} />{`{{${v}}}`}</button>)}</div>
        <DialogActions onCancel={onClose} />
      </form>
    </Dialog>
  );
}
