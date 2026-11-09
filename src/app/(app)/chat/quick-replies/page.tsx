"use client";
import { Pencil, Plus, Tag, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { Dialog, DialogActions, EmptyState, FieldLabel, PageHead, Panel, PrimaryBtn, SearchBox } from "@/components/kit";
import { api, ApiError } from "@/lib/api";
import { ChatLabel, LABEL_COLORS, labelDot, QuickReply } from "@/lib/inbox";

/** Quick replies ("/shortcut" in the chat composer) and the label list used on chats and customers. */
export default function QuickReplies() {
  const [tab, setTab] = useState<"replies" | "labels">("replies");
  return (
    <div className="space-y-5">
      <PageHead title="Balasan Cepat & Label" tutorial={false} crumbs={[["Chat", "/chat"], ["Balasan Cepat & Label"]]} />
      <div className="flex gap-2">
        {([["replies", "Balasan cepat", Zap], ["labels", "Label", Tag]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${tab === id ? "bg-navy text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}><Icon size={15} />{label}</button>
        ))}
      </div>
      {tab === "replies" ? <Replies /> : <Labels />}
    </div>
  );
}

function Replies() {
  const [rows, setRows] = useState<QuickReply[] | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<QuickReply> | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api<{ data: QuickReply[] }>("/quick-replies").then((r) => setRows(r.data)), []);
  useEffect(() => { load(); }, [load]);
  const shown = useMemo(() => (rows ?? []).filter((r) => !q || `${r.shortcut} ${r.category ?? ""} ${r.body}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  const save = async () => {
    if (!edit) return;
    setSaving(true); setErr("");
    try {
      const body = { shortcut: edit.shortcut, category: edit.category || null, body: edit.body };
      await api(edit.id ? `/quick-replies/${edit.id}` : "/quick-replies", { method: edit.id ? "PUT" : "POST", json: body });
      setEdit(null); load();
    } catch (e) { setErr(e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Gagal menyimpan"); } finally { setSaving(false); }
  };
  const remove = async (r: QuickReply) => { if (await askConfirm(`Hapus balasan cepat /${r.shortcut}?`)) { await api(`/quick-replies/${r.id}`, { method: "DELETE" }); load(); } };

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <SearchBox value={q} onChange={setQ} placeholder="Cari pintasan atau isi" />
        <p className="text-xs text-slate-500">Di kolom chat, ketik <b className="text-brand-600">/pintasan</b> lalu Enter. Tulis <b>{"{nama}"}</b> untuk nama pembeli.</p>
        <div className="ml-auto"><PrimaryBtn onClick={() => { setErr(""); setEdit({ shortcut: "", category: "", body: "" }); }}>Tambah Balasan</PrimaryBtn></div>
      </div>
      {!rows ? <p className="p-8 text-center text-sm text-slate-400">Memuat…</p> : !shown.length ? <EmptyState text={rows.length ? "Tidak ada yang cocok" : "Belum ada balasan cepat"} sub="Simpan jawaban yang sering dipakai, misalnya nomor rekening, cara order, atau info ongkir." /> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500"><th className="px-4 py-3 font-medium">Pintasan</th><th className="px-4 py-3 font-medium">Kategori</th><th className="px-4 py-3 font-medium">Isi balasan</th><th /></tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 align-top">
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-600">/{r.shortcut}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{r.category || "–"}</td>
              <td className="max-w-xl px-4 py-3 text-slate-700"><p className="line-clamp-2 whitespace-pre-wrap">{r.body}</p></td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button onClick={() => { setErr(""); setEdit(r); }} className="rounded p-1.5 text-slate-400 hover:text-navy" aria-label="Ubah"><Pencil size={15} /></button>
                <button onClick={() => remove(r)} className="rounded p-1.5 text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={15} /></button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {edit && (
        <Dialog title={edit.id ? "Ubah Balasan Cepat" : "Tambah Balasan Cepat"} icon={Zap} onClose={() => setEdit(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><FieldLabel>Pintasan</FieldLabel>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">/</span>
                  <input className="input pl-6" required maxLength={40} placeholder="rekening" value={edit.shortcut ?? ""} onChange={(e) => setEdit({ ...edit, shortcut: e.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase() })} /></div></div>
              <div><FieldLabel>Kategori (opsional)</FieldLabel><input className="input" maxLength={60} placeholder="Pembayaran" value={edit.category ?? ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} /></div>
            </div>
            <div><FieldLabel>Isi balasan</FieldLabel><textarea className="input min-h-32 py-2" required maxLength={2000} placeholder={"Halo kak {nama}, pembayaran bisa ke BCA 123456 a.n. Toko Kita ya 🙏"} value={edit.body ?? ""} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></div>
            {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
            <DialogActions onCancel={() => setEdit(null)} saving={saving} />
          </form>
        </Dialog>
      )}
    </Panel>
  );
}

function Labels() {
  const [rows, setRows] = useState<ChatLabel[] | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("blue");
  const [err, setErr] = useState("");
  const load = useCallback(() => api<{ data: ChatLabel[] }>("/chat-labels").then((r) => setRows(r.data)), []);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    if (!name.trim()) return;
    setErr("");
    try { await api("/chat-labels", { method: "POST", json: { name: name.trim(), color } }); setName(""); load(); }
    catch (e) { setErr(e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Gagal menyimpan"); }
  };
  const recolor = async (l: ChatLabel, c: string) => { setRows((r) => r && r.map((x) => (x.id === l.id ? { ...x, color: c } : x))); await api(`/chat-labels/${l.id}`, { method: "PUT", json: { color: c } }); };
  const remove = async (l: ChatLabel) => { if (await askConfirm(`Hapus label "${l.name}"? Label ini juga dilepas dari semua chat dan pelanggan.`)) { await api(`/chat-labels/${l.id}`, { method: "DELETE" }); load(); } };

  const Swatches = ({ value, onPick }: { value: string; onPick: (c: string) => void }) => (
    <div className="flex gap-1">{LABEL_COLORS.map((c) => <button key={c} type="button" onClick={() => onPick(c)} aria-label={c} className={`h-5 w-5 rounded-full ${labelDot(c)} ${value === c ? "ring-2 ring-navy ring-offset-1" : ""}`} />)}</div>
  );

  return (
    <Panel>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex flex-wrap items-center gap-3 p-4">
        <input className="input h-10 w-64" maxLength={40} placeholder="Nama label baru, mis. VIP" value={name} onChange={(e) => setName(e.target.value)} />
        <Swatches value={color} onPick={setColor} />
        <button disabled={!name.trim()} className="flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15} />Tambah</button>
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </form>
      {!rows ? <p className="p-8 text-center text-sm text-slate-400">Memuat…</p> : !rows.length ? <EmptyState text="Belum ada label" sub="Label membantu mengelompokkan chat dan pelanggan, mis. Calon pembeli, Komplain, Reseller." /> : (
        <ul className="divide-y divide-slate-50 border-t border-slate-100">
          {rows.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className={`h-3 w-3 rounded-full ${labelDot(l.color)}`} /><b className="min-w-40 text-sm text-slate-700">{l.name}</b>
              <Swatches value={l.color} onPick={(c) => recolor(l, c)} />
              <button onClick={() => remove(l)} className="ml-auto rounded p-1.5 text-slate-400 hover:text-rose-600" aria-label="Hapus label"><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
