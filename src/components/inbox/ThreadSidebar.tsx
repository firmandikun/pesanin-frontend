"use client";
import { Link2, Loader2, Mail, Phone, Search, ShoppingBag, StickyNote, Trash2, Unlink, UserPlus, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { api, ApiError, Paginated, rupiah } from "@/lib/api";
import { ChatLabel, Customer, keyQuery, labelTone, Note, ORDER_STATUS, showPhone, ThreadKey } from "@/lib/inbox";

type ThreadRes = { notes: Note[]; customer: Customer | null; suggest: Customer | null };
const dateShort = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" });

/** Right-hand panel of a conversation: who the buyer is (customer + their orders) and internal notes. */
export function ThreadSidebar({ thread, phone, labels, onClose, onCustomer }: { thread: ThreadKey; phone?: string; labels: ChatLabel[]; onClose: () => void; onCustomer?: (id: number | null) => void }) {
  const [data, setData] = useState<ThreadRes | null>(null);
  const [err, setErr] = useState("");
  const qs = keyQuery(thread);
  const load = useCallback(() => {
    setData(null); setErr("");
    api<ThreadRes>(`/chat/thread?${qs}${phone ? `&phone=${encodeURIComponent(phone)}` : ""}`).then(setData).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat"));
  }, [qs, phone]);
  useEffect(load, [load]);

  const link = async (body: object) => {
    try {
      const r = await api<{ customer: Customer | null }>("/chat/thread/customer", { method: "POST", json: { ...thread, ...body } });
      setData((d) => d && { ...d, customer: r.customer, suggest: null });
      onCustomer?.(r.customer?.id ?? null);
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal menyimpan"); }
  };

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-100 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <UserRound size={16} className="text-slate-500" /><b className="flex-1 text-sm text-navy">Profil pelanggan</b>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Tutup panel"><X size={16} /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {err && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{err}</p>}
        {!data ? <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Memuat…</p> : (
          <>
            {data.customer ? <CustomerCard c={data.customer} labels={labels} onUnlink={() => link({ customer_id: null })} />
              : <LinkCustomer name={thread.name ?? ""} phone={phone} suggest={data.suggest} onLink={link} />}
            <Notes thread={thread} notes={data.notes} onChange={(notes) => setData((d) => d && { ...d, notes })} />
          </>
        )}
      </div>
    </aside>
  );
}

function CustomerCard({ c, labels, onUnlink }: { c: Customer; labels: ChatLabel[]; onUnlink: () => void }) {
  return (
    <section className="space-y-3">
      <div>
        <div className="flex items-start gap-2">
          <Link href={`/customers?id=${c.id}`} className="flex-1 font-semibold text-navy hover:text-brand-600">{c.name}</Link>
          <button onClick={onUnlink} title="Lepas pelanggan dari chat ini" className="text-slate-400 hover:text-rose-600"><Unlink size={14} /></button>
        </div>
        {c.phone && <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Phone size={12} />{showPhone(c.phone)}</p>}
        {c.email && <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><Mail size={12} />{c.email}</p>}
        {c.labels.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.labels.map((l) => <span key={l} className={`rounded px-1.5 py-px text-[11px] font-semibold ${labelTone(labels, l)}`}>{l}</span>)}</div>}
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-2"><div className="text-[11px] text-slate-500">Pesanan</div><b className="text-sm text-navy">{c.orders_count}</b></div>
        <div className="rounded-lg bg-slate-50 p-2"><div className="text-[11px] text-slate-500">Total belanja</div><b className="text-sm text-navy">{rupiah(c.spent)}</b></div>
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><ShoppingBag size={13} />Pesanan terakhir</p>
        {!c.orders?.length ? <p className="text-xs text-slate-400">{c.phone ? "Belum ada pesanan dengan nomor ini." : "Tambahkan nomor HP agar pesanan pelanggan ini terlihat."}</p> : (
          <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-100">
            {c.orders.map((o) => (
              <li key={o.id}><Link href={`/orders?search=${encodeURIComponent(o.code)}`} className="flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-slate-50">
                <span className="flex-1"><b className="block text-slate-700">{o.code}</b><span className="text-slate-400">{dateShort(o.created_at)} · {ORDER_STATUS[o.status] ?? o.status}</span></span>
                <b className="text-slate-700">{rupiah(o.total)}</b>
              </Link></li>
            ))}
          </ul>
        )}
        {c.phone && c.orders_count > 0 && <Link href={`/orders?search=${encodeURIComponent(showPhone(c.phone).replace(/-/g, ""))}`} className="mt-1.5 block text-xs font-semibold text-brand-600">Lihat semua pesanan</Link>}
      </div>
    </section>
  );
}

function LinkCustomer({ name, phone, suggest, onLink }: { name: string; phone?: string; suggest: Customer | null; onLink: (b: object) => void }) {
  const [mode, setMode] = useState<"" | "new" | "find">("");
  const [form, setForm] = useState({ name, phone: phone ?? "", email: "" });
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Customer[] | null>(null);
  useEffect(() => {
    if (mode !== "find") return;
    const t = setTimeout(() => api<Paginated<Customer>>(`/customers?per_page=8&q=${encodeURIComponent(q)}`).then((r) => setFound(r.data)), 250);
    return () => clearTimeout(t);
  }, [q, mode]);

  return (
    <section className="space-y-3">
      <p className="text-sm text-slate-500">Chat ini belum terhubung ke pelanggan. Hubungkan untuk melihat riwayat pesanannya.</p>
      {suggest && (
        <button onClick={() => onLink({ customer_id: suggest.id })} className="flex w-full items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-left text-xs text-emerald-800 ring-1 ring-emerald-100">
          <Link2 size={14} className="shrink-0" /><span>Nomor ini cocok dengan <b>{suggest.name}</b> ({suggest.orders_count} pesanan). Klik untuk menghubungkan.</span>
        </button>
      )}
      <div className="flex gap-2">
        <button onClick={() => setMode(mode === "new" ? "" : "new")} className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold ${mode === "new" ? "bg-navy text-white" : "bg-slate-100 text-slate-600"}`}><UserPlus size={13} />Buat baru</button>
        <button onClick={() => setMode(mode === "find" ? "" : "find")} className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold ${mode === "find" ? "bg-navy text-white" : "bg-slate-100 text-slate-600"}`}><Search size={13} />Pilih yang ada</button>
      </div>
      {mode === "new" && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (form.name.trim()) onLink({ customer: { name: form.name.trim(), phone: form.phone || null, email: form.email || null } }); }}>
          <input className="input h-9 text-sm" placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input h-9 text-sm" placeholder="No. HP / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input h-9 text-sm" type="email" placeholder="Email (opsional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <button className="h-9 w-full rounded-lg bg-brand-600 text-sm font-semibold text-white">Simpan & hubungkan</button>
        </form>
      )}
      {mode === "find" && (
        <div className="space-y-1.5">
          <input autoFocus className="input h-9 text-sm" placeholder="Cari nama atau no. HP" value={q} onChange={(e) => setQ(e.target.value)} />
          {found?.map((c) => (
            <button key={c.id} onClick={() => onLink({ customer_id: c.id })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">
              <span className="flex-1"><b className="block text-slate-700">{c.name}</b><span className="text-slate-400">{showPhone(c.phone) || "tanpa nomor"}</span></span><span className="text-slate-400">{c.orders_count} pesanan</span>
            </button>
          ))}
          {found && !found.length && <p className="py-2 text-center text-xs text-slate-400">Tidak ada pelanggan yang cocok.</p>}
        </div>
      )}
    </section>
  );
}

function Notes({ thread, notes, onChange }: { thread: ThreadKey; notes: Note[]; onChange: (n: Note[]) => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try { const r = await api<{ note: Note }>("/chat/thread/notes", { method: "POST", json: { ...thread, body: body.trim() } }); onChange([r.note, ...notes]); setBody(""); }
    finally { setBusy(false); }
  };
  const remove = async (n: Note) => {
    if (!(await askConfirm("Hapus catatan ini?"))) return;
    await api(`/chat/notes/${n.id}`, { method: "DELETE" }); onChange(notes.filter((x) => x.id !== n.id));
  };
  return (
    <section className="space-y-2 border-t border-slate-100 pt-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><StickyNote size={13} />Catatan internal <span className="font-normal text-slate-400">(tidak terlihat pembeli)</span></p>
      <textarea rows={2} className="input min-h-16 resize-none py-2 text-sm" placeholder="Tulis catatan untuk tim…" value={body} onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add(); } }} />
      <button onClick={add} disabled={!body.trim() || busy} className="h-8 w-full rounded-lg bg-amber-100 text-xs font-semibold text-amber-800 disabled:opacity-50">{busy ? "Menyimpan…" : "Tambah catatan"}</button>
      {notes.map((n) => (
        <div key={n.id} className="group rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
          <p className="whitespace-pre-wrap break-words">{n.body}</p>
          <p className="mt-1 flex items-center gap-2 text-[10px] text-amber-700/80">{n.author} · {new Date(n.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            <button onClick={() => remove(n)} className="ml-auto opacity-0 group-hover:opacity-100" aria-label="Hapus catatan"><Trash2 size={12} /></button></p>
        </div>
      ))}
    </section>
  );
}
