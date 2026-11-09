"use client";
import { Mail, MessageCircle, Pencil, Phone, ShoppingBag, Trash2, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { LabelPicker } from "@/components/inbox/LabelPicker";
import { Dialog, DialogActions, EmptyState, FieldLabel, PageHead, Pager, Panel, PER_PAGE, PrimaryBtn, SearchBox, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, Paginated, rupiah } from "@/lib/api";
import { ChatLabel, Customer, labelTone, ORDER_STATUS, showPhone } from "@/lib/inbox";

const CH: Record<string, string> = { shopee: "Shopee", facebook: "Facebook", instagram: "Instagram", whatsapp: "WhatsApp", manual: "Manual" };
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "–");

export default function CustomersPage() {
  return <Suspense fallback={null}><Customers /></Suspense>;
}

/** Customer CRM: everyone who chatted or was added by hand, with their orders matched by phone. */
function Customers() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [label, setLabel] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);
  const [data, setData] = useState<Paginated<Customer> | null>(null);
  const [labels, setLabels] = useState<ChatLabel[]>([]);
  const [edit, setEdit] = useState<Partial<Customer> | null>(null);
  const detailId = sp.get("id");

  const load = useCallback(() => {
    api<Paginated<Customer>>(`/customers?${new URLSearchParams({ q, label, page: String(page), per_page: String(perPage) })}`).then(setData);
    api<{ data: ChatLabel[] }>("/chat-labels").then((r) => setLabels(r.data));
  }, [q, label, page, perPage]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => setPage(1), [q, label]);

  const remove = async (c: Customer) => {
    if (!(await askConfirm(`Hapus pelanggan ${c.name}? Chat dan pesanannya tetap ada, hanya profil pelanggannya yang dihapus.`))) return;
    await api(`/customers/${c.id}`, { method: "DELETE" }); load();
  };
  const openDetail = (id: number | null) => router.replace(id ? `/customers?id=${id}` : "/customers", { scroll: false });

  return (
    <div className="space-y-5">
      <PageHead title="Pelanggan" tutorial={false} crumbs={[["Chat", "/chat"], ["Pelanggan"]]} />
      <Panel>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchBox value={q} onChange={setQ} placeholder="Cari nama, no. HP, email" />
          {labels.length > 0 && (
            <Select className="input h-10 w-48" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Label">
              <option value="">Semua label</option>
              {labels.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
            </Select>
          )}
          <div className="ml-auto"><PrimaryBtn onClick={() => setEdit({ name: "", phone: "", email: "", labels: [], notes: "", opt_in: false })}>Tambah Pelanggan</PrimaryBtn></div>
        </div>
        {!data ? <p className="p-8 text-center text-sm text-slate-400">Memuat…</p> : !data.data.length ? (
          <EmptyState text={q || label ? "Tidak ada pelanggan yang cocok" : "Belum ada pelanggan"} sub="Pelanggan bertambah saat kamu menghubungkan chat ke profil pelanggan, atau tambahkan manual." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-y border-slate-100 text-left text-[13px] text-slate-500">
              {["Nama", "No. HP", "Label", "Pesanan", "Total belanja", "Pesanan terakhir", "Sumber", ""].map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{data.data.map((c) => (
              <tr key={c.id} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50/60" onClick={() => openDetail(c.id)}>
                <td className="px-4 py-3"><b className="text-navy">{c.name}</b>{c.email && <span className="block text-xs text-slate-400">{c.email}</span>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{showPhone(c.phone) || "–"}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{c.labels.map((l) => <span key={l} className={`rounded px-1.5 py-px text-[11px] font-semibold ${labelTone(labels, l)}`}>{l}</span>)}</div></td>
                <td className="px-4 py-3 text-slate-700">{c.orders_count}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{rupiah(c.spent)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{date(c.last_order_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{CH[c.source ?? ""] ?? "–"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEdit(c)} className="rounded p-1.5 text-slate-400 hover:text-navy" aria-label="Ubah"><Pencil size={15} /></button>
                  <button onClick={() => remove(c)} className="rounded p-1.5 text-slate-400 hover:text-rose-600" aria-label="Hapus"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {data && <Pager page={page} last={data.last_page} onPage={setPage} perPage={perPage} onPerPage={setPerPage} total={data.total} />}
      </Panel>
      {edit && <CustomerForm value={edit} labels={labels} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {detailId && <CustomerDetail id={Number(detailId)} labels={labels} onClose={() => openDetail(null)} onEdit={(c) => { openDetail(null); setEdit(c); }} />}
    </div>
  );
}

function CustomerForm({ value, labels, onClose, onSaved }: { value: Partial<Customer>; labels: ChatLabel[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(value);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true); setErr("");
    try {
      const body = { name: f.name, phone: f.phone || null, email: f.email || null, labels: f.labels ?? [], notes: f.notes || null, opt_in: !!f.opt_in };
      await api(f.id ? `/customers/${f.id}` : "/customers", { method: f.id ? "PUT" : "POST", json: body });
      onSaved();
    } catch (e) { setErr(e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Gagal menyimpan"); } finally { setSaving(false); }
  };
  return (
    <Dialog title={f.id ? "Ubah Pelanggan" : "Tambah Pelanggan"} icon={UserRound} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
        <div><FieldLabel>Nama lengkap</FieldLabel><input className="input" required maxLength={120} value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><FieldLabel>No. HP / WhatsApp</FieldLabel><input className="input" placeholder="0812…" value={f.phone ? showPhone(f.phone).replace(/-/g, "") : ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><FieldLabel>Email</FieldLabel><input className="input" type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        </div>
        <div><FieldLabel>Label</FieldLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            {(f.labels ?? []).map((l) => <span key={l} className={`rounded px-2 py-0.5 text-xs font-semibold ${labelTone(labels, l)}`}>{l}</span>)}
            <LabelPicker labels={labels} value={f.labels ?? []} onChange={(next) => setF({ ...f, labels: next })} />
          </div></div>
        <div><FieldLabel>Catatan</FieldLabel><textarea className="input min-h-20 py-2" maxLength={5000} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
          <span><b className="block text-slate-700">Setuju menerima promosi</b><span className="text-xs text-slate-500">Aktifkan hanya jika pelanggan sudah setuju dikirimi pesan promosi (broadcast).</span></span>
          <Toggle checked={!!f.opt_in} onChange={(v) => setF({ ...f, opt_in: v })} />
        </label>
        {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
        <DialogActions onCancel={onClose} saving={saving} />
      </form>
    </Dialog>
  );
}

function CustomerDetail({ id, labels, onClose, onEdit }: { id: number; labels: ChatLabel[]; onClose: () => void; onEdit: (c: Customer) => void }) {
  const [c, setC] = useState<Customer | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<{ customer: Customer }>(`/customers/${id}`).then((r) => setC(r.customer)).catch((e) => setErr(e instanceof ApiError ? e.message : "Pelanggan tidak ditemukan")); }, [id]);
  return (
    <Dialog title={c?.name ?? "Pelanggan"} icon={Users} onClose={onClose} width="max-w-2xl">
      {err ? <p className="text-sm text-rose-600">{err}</p> : !c ? <p className="py-6 text-center text-sm text-slate-400">Memuat…</p> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 space-y-1 text-sm text-slate-600">
              {c.phone && <p className="flex items-center gap-2"><Phone size={14} />{showPhone(c.phone)}</p>}
              {c.email && <p className="flex items-center gap-2"><Mail size={14} />{c.email}</p>}
              <div className="flex flex-wrap gap-1 pt-1">{c.labels.map((l) => <span key={l} className={`rounded px-1.5 py-px text-[11px] font-semibold ${labelTone(labels, l)}`}>{l}</span>)}</div>
              <p className="text-xs text-slate-400">{c.opt_in ? "Setuju menerima promosi" : "Belum setuju menerima promosi"} · Ditambahkan {date(c.created_at)}</p>
            </div>
            <button onClick={() => onEdit(c)} className="flex h-9 items-center gap-1.5 rounded-lg ring-1 ring-slate-200 px-3 text-sm font-semibold text-slate-600"><Pencil size={14} />Ubah</button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Pesanan</div><b className="text-lg text-navy">{c.orders_count}</b></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Total belanja</div><b className="text-lg text-navy">{rupiah(c.spent)}</b></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Terakhir order</div><b className="text-sm text-navy">{date(c.last_order_at)}</b></div>
          </div>
          {c.notes && <p className="whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{c.notes}</p>}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><ShoppingBag size={15} />Pesanan terakhir</p>
            {!c.orders?.length ? <p className="text-sm text-slate-400">{c.phone ? "Belum ada pesanan dengan nomor ini." : "Tambahkan nomor HP agar pesanan pelanggan ini terlihat."}</p> : (
              <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-100">{c.orders.map((o) => (
                <li key={o.id}><Link href={`/orders?search=${encodeURIComponent(o.code)}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                  <b className="text-slate-700">{o.code}</b><span className="flex-1 text-xs text-slate-400">{date(o.created_at)} · {ORDER_STATUS[o.status] ?? o.status}</span><b className="text-slate-700">{rupiah(o.total)}</b></Link></li>
              ))}</ul>
            )}
          </div>
          {!!c.chats?.length && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><MessageCircle size={15} />Chat terhubung</p>
              <div className="flex flex-wrap gap-2">{c.chats.map((ch) => (
                <Link key={`${ch.channel}-${ch.source_id}-${ch.id}`} href={`/chat?channel=${ch.channel}&source=${encodeURIComponent(ch.source_id)}&c=${encodeURIComponent(ch.id)}`} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                  {CH[ch.channel] ?? ch.channel} · {ch.name ?? ch.id}{ch.status === "done" && " ✓"}</Link>
              ))}</div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
