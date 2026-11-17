"use client";
import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Loader2, Mail, Package, Phone, Search, ShoppingBag, Star, StickyNote, Trash2, Truck, Unlink, UserPlus, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { ShopeeMark } from "@/components/ChannelBadge";
import { api, ApiError, Paginated, rupiah } from "@/lib/api";
import { ChatLabel, Customer, keyQuery, labelTone, Note, ORDER_STATUS, showPhone, ThreadKey } from "@/lib/inbox";

type ShopeeBuyerInfo = {
  username: string;
  orders_count: number;
  spent: number;
  badge: string;
  has_issue: boolean;
  active_order: {
    code: string;
    status: string;
    total: number;
    tracking_number: string | null;
    courier: string | null;
    items: {
      name: string;
      variant?: string | null;
      sku?: string | null;
      qty: number;
      price: number;
    }[];
    product_specs?: {
      name: string;
      description?: string | null;
      features?: string[];
      sku?: string | null;
      stock?: number;
    } | null;
    created_at: string | null;
  } | null;
  orders: {
    id: number;
    code: string;
    status: string;
    total: number;
    tracking_number: string | null;
    courier: string | null;
    created_at: string | null;
  }[];
};

type ThreadRes = {
  notes: Note[];
  customer: Customer | null;
  suggest: Customer | null;
  shopee_buyer?: ShopeeBuyerInfo | null;
};
const dateShort = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" });

const SHOPEE_STATUS_MAP: Record<string, { label: string; tone: string }> = {
  UNPAID: { label: "Belum bayar", tone: "bg-amber-50 text-amber-700" },
  READY_TO_SHIP: { label: "Perlu dikirim", tone: "bg-blue-50 text-blue-700" },
  PROCESSED: { label: "Siap diserahkan", tone: "bg-indigo-50 text-indigo-700" },
  SHIPPED: { label: "Sedang dikirim", tone: "bg-sky-50 text-sky-700" },
  TO_CONFIRM_RECEIVE: { label: "Menunggu konfirmasi", tone: "bg-cyan-50 text-cyan-700" },
  COMPLETED: { label: "Selesai", tone: "bg-emerald-50 text-emerald-700" },
  CANCELLED: { label: "Dibatalkan", tone: "bg-rose-50 text-rose-700" },
  IN_CANCEL: { label: "Pengajuan batal", tone: "bg-rose-50 text-rose-700" },
  TO_RETURN: { label: "Retur", tone: "bg-orange-50 text-orange-700" },
};

/** Right-hand panel of a conversation: who the buyer is (customer + their orders) and internal notes. */
export function ThreadSidebar({
  thread,
  phone,
  labels,
  onClose,
  onCustomer,
  onInsertText,
  onAddLabel,
}: {
  thread: ThreadKey;
  phone?: string;
  labels: ChatLabel[];
  onClose: () => void;
  onCustomer?: (id: number | null) => void;
  onInsertText?: (text: string) => void;
  onAddLabel?: (label: string) => void;
}) {
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
        {thread.channel === "shopee" ? <ShopeeMark size={16} /> : <UserRound size={16} className="text-slate-500" />}
        <b className="flex-1 text-sm text-navy">{thread.channel === "shopee" ? "Profil Pembeli Shopee" : "Profil pelanggan"}</b>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Tutup panel"><X size={16} /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {err && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{err}</p>}
        {!data ? <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Memuat…</p> : (
          <>
            {data.shopee_buyer ? (
              <ShopeeBuyerCard
                buyer={data.shopee_buyer}
                shopId={thread.source}
                onInsertText={onInsertText}
                onAddLabel={onAddLabel}
              />
            ) : data.customer ? (
              <CustomerCard c={data.customer} labels={labels} onUnlink={() => link({ customer_id: null })} />
            ) : (
              <LinkCustomer name={thread.name ?? ""} phone={phone} suggest={data.suggest} onLink={link} />
            )}
            <Notes thread={thread} notes={data.notes} onChange={(notes) => setData((d) => d && { ...d, notes })} />
          </>
        )}
      </div>
    </aside>
  );
}

function ShopeeBuyerCard({
  buyer,
  shopId,
  onInsertText,
  onAddLabel,
}: {
  buyer: ShopeeBuyerInfo;
  shopId?: string;
  onInsertText?: (text: string) => void;
  onAddLabel?: (label: string) => void;
}) {
  const active = buyer.active_order;
  const activeStatus = active ? (SHOPEE_STATUS_MAP[active.status] ?? { label: active.status, tone: "bg-slate-100 text-slate-600" }) : null;
  const firstItem = active?.items[0];

  const sendComplaintUnboxing = () => {
    onInsertText?.(
      `Halo Kak ${buyer.username}, mohon maaf sekali atas kendala yang dialami 🙏\n\nUntuk mempermudah proses klaim garansi toko kami, mohon kirimkan video unboxing paket saat dibuka dan foto resi pengirimannya ya kak. Tim kami akan segera bantu solusi terbaik secepatnya 🙏`
    );
    onAddLabel?.("Komplain");
  };

  const sendComplaintReplace = () => {
    onInsertText?.(
      `Halo Kak ${buyer.username}, jangan khawatir ya kak, toko kami bergaransi penuh 🙏\n\nKami akan bantu kirimkan barang pengganti / part yang kurang tanpa biaya tambahan. Mohon konfirmasi ulang alamat lengkap dan nomor HP penerimanya ya kak agar langsung kami jadwalkan pengiriman hari ini 🙏`
    );
    onAddLabel?.("Komplain");
  };

  const sendProductSpecs = () => {
    if (!firstItem) return;
    const name = firstItem.name;
    const variant = firstItem.variant ? ` (Variasi: ${firstItem.variant})` : "";
    const specs = active?.product_specs?.description
      ? `\n\nSpesifikasi:\n${active.product_specs.description.slice(0, 200)}…`
      : "\n\nSpesifikasi:\n- Kualitas: Original & presisi\n- Bahan: Berkualitas tinggi, langsung pas dipasang\n- Stok: Ready dan siap langsung dikirim hari ini";

    onInsertText?.(
      `Halo Kak, untuk produk ${name}${variant}:${specs}\n\nSilakan langsung diorder ya kak agar segera kami proses hari ini 🙏`
    );
  };

  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-navy">@{buyer.username}</p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${buyer.badge === "Pelanggan Setia" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>
            {buyer.badge === "Pelanggan Setia" && <Star size={11} className="fill-emerald-600 text-emerald-600" />}
            {buyer.badge}
          </span>
          {buyer.has_issue && (
            <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700" title="Pembeli pernah melakukan pembatalan atau retur pesanan">
              <AlertTriangle size={11} />Pernah Batal/Retur
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="text-[11px] text-slate-500">Total pesanan</div>
          <b className="text-sm text-navy">{buyer.orders_count}x belanja</b>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="text-[11px] text-slate-500">Total belanja (LTV)</div>
          <b className="text-sm text-emerald-700">{rupiah(buyer.spent)}</b>
        </div>
      </div>

      {active && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="font-semibold text-navy flex items-center gap-1">
              <Truck size={13} className="text-sky-600" />Pesanan saat ini
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${activeStatus?.tone}`}>
              {activeStatus?.label}
            </span>
          </div>
          <p className="font-mono text-[11px] text-slate-600">{active.code}</p>
          {active.tracking_number && (
            <p className="text-[11px] text-slate-700 font-medium">
              Resi: <span className="font-mono">{active.tracking_number}</span> {active.courier ? `(${active.courier})` : ""}
            </p>
          )}
          {active.items.length > 0 && (
            <div className="text-slate-600 text-[11px]">
              <b className="text-navy">{firstItem?.name}</b>
              {firstItem?.variant && <span className="block text-slate-500">Variasi: {firstItem.variant}</span>}
              {active.items.length > 1 && <span className="text-[10px] text-slate-400 block">(+{active.items.length - 1} item lagi)</span>}
            </div>
          )}
          <p className="font-semibold text-navy pt-1 border-t border-sky-100 flex justify-between">
            <span>Total:</span>
            <span>{rupiah(active.total)}</span>
          </p>

          {/* Quick Product Specs Button */}
          {firstItem && (
            <div className="pt-1 border-t border-sky-200/60">
              <button
                type="button"
                onClick={sendProductSpecs}
                className="w-full text-left flex items-center justify-between rounded-lg bg-white p-2 text-[11px] font-medium text-navy shadow-xs hover:bg-slate-50 ring-1 ring-sky-200/80 transition"
                title="Kirim detail spesifikasi produk ini ke kolom chat"
              >
                <span className="flex items-center gap-1.5">
                  <Package size={12} className="text-sky-600 shrink-0" />
                  Kirim Spek Produk ke Chat
                </span>
                <span className="text-[10px] font-semibold text-sky-700">Salin</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Complaint Solutions & Actions */}
      <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs space-y-2">
        <b className="text-rose-900 block font-semibold flex items-center gap-1">
          <AlertTriangle size={13} className="text-rose-600" />Solusi Komplain &amp; Kendala
        </b>
        <p className="text-[11px] text-slate-600">
          Klik untuk mengisi balasan ramah &amp; solusi komplain langsung ke chat:
        </p>
        <div className="grid gap-1.5">
          <button
            type="button"
            onClick={sendComplaintUnboxing}
            className="w-full text-left rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 ring-1 ring-rose-200/70 hover:bg-rose-50/80 transition flex items-center justify-between"
          >
            <span>📹 Minta Bukti Video Unboxing</span>
            <span className="text-[10px] text-rose-600 font-semibold">Gunakan</span>
          </button>
          <button
            type="button"
            onClick={sendComplaintReplace}
            className="w-full text-left rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 ring-1 ring-rose-200/70 hover:bg-rose-50/80 transition flex items-center justify-between"
          >
            <span>🔄 Solusi Kirim Barang Pengganti</span>
            <span className="text-[10px] text-rose-600 font-semibold">Gunakan</span>
          </button>
          <button
            type="button"
            onClick={() => onAddLabel?.("Komplain")}
            className="w-full text-center rounded-lg bg-rose-100/70 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-200/70 transition"
          >
            🏷️ Tandai Chat Ini Sebagai "Komplain"
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <ShoppingBag size={13} />Riwayat pesanan ({buyer.orders.length})
        </p>
        <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-100">
          {buyer.orders.map((o) => {
            const st = SHOPEE_STATUS_MAP[o.status] ?? { label: o.status, tone: "bg-slate-100 text-slate-600" };
            return (
              <li key={o.id}>
                <Link
                  href={shopId ? `/marketplace/shops/${shopId}/transactions` : `/orders?search=${encodeURIComponent(o.code)}`}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs hover:bg-slate-50 transition"
                  title="Lihat transaksi ini"
                >
                  <div className="min-w-0 flex-1">
                    <b className="block truncate font-mono text-slate-700">{o.code}</b>
                    <span className="text-[11px] text-slate-400">
                      {o.created_at ? dateShort(o.created_at) : ""} · <span className={`rounded px-1 text-[10px] font-semibold ${st.tone}`}>{st.label}</span>
                    </span>
                  </div>
                  <b className="text-slate-700 text-right">{rupiah(o.total)}</b>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
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
