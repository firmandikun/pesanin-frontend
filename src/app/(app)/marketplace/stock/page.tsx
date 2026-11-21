"use client";
import { AlertTriangle, Boxes, Wallet, Check, History, Link2, Loader2, Package, Pencil, Plus, RefreshCcw, Sparkles, Trash2, Unlink, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { askConfirm, showAlert } from "@/components/Dialogs";
import { Dialog, Pager, PageHead, Panel, SearchBox } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, Paginated, rupiah } from "@/lib/api";

type Linked = { id: number; marketplace_shop_id: number; item_id: number; model_id: number; name: string; model_name: string | null; sku: string | null; stock: number; stock_push_error: string | null; image: string | null; status: string;
  shop: { id: number; shop_name: string; is_demo: boolean; status: string } | null };
type Master = { id: number; sku: string; name: string | null; image: string | null; stock: number; hpp?: number; sell_price?: number; push_pending: boolean; pushed_at: string | null; listings: Linked[] };
type Stats = { stock_value: number; stock_units: number; sell_value: number; no_hpp: number; masters: number; linked: number; unlinked_with_sku: number; without_sku: number; candidates: number; empty: number; errors: number };
type Movement = { id: number; kind: "sale" | "restore" | "adjust"; qty: number; stock_after: number; note: string | null; created_at: string };
type ListingRow = { id: number; name: string; model_name: string | null; sku: string | null; stock: number; image: string | null; stock_master_id: number | null; shop: { shop_name: string } };

const err = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);
const when = (s: string | null) => (s ? new Date(s).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");
const KIND: Record<Movement["kind"], string> = { sale: "Terjual", restore: "Batal, stok kembali", adjust: "Ubah manual" };

/** Marketplace → Stok Master: one stock per SKU shared by every Shopee shop. */
export default function StockMasterPage() {
  const [d, setD] = useState<{ masters: Paginated<Master>; stats: Stats } | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<Master | null>(null);
  const [linking, setLinking] = useState<Master | "new" | null>(null);
  const [howOpen, setHowOpen] = useState(false);

  const load = useCallback(() => {
    api<{ masters: Paginated<Master>; stats: Stats }>(`/marketplace/stock-masters?${new URLSearchParams({ search, filter, page: String(page), per_page: "20" })}`).then(setD).catch(() => setD(null));
  }, [search, filter, page]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const replace = (m: Master) => setD((cur) => cur && { ...cur, masters: { ...cur.masters, data: cur.masters.data.map((x) => (x.id === m.id ? m : x)) } });
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e) { showAlert(err(e, "Gagal"), "Gagal"); } finally { setBusy(""); }
  };

  const generate = () => run("gen", async () => {
    const r = await api<{ masters: number; listings: number }>("/marketplace/stock-masters/generate", { method: "POST" });
    setNotice(r.masters || r.listings ? `${r.masters} stok master dibuat, ${r.listings} listing terhubung. Stok sudah dikirim ke semua toko.` : "Tidak ada SKU baru yang dipakai di lebih dari satu listing.");
    load();
  });

  const s = d?.stats;
  const masters = d?.masters.data ?? [];

  return (
    <div className="space-y-5">
      <PageHead title="Stok Master" tutorial={false} crumbs={[["Marketplace"], ["Stok Master"]]}>
        <button onClick={() => setLinking("new")} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50"><Plus size={16} />Dari satu listing</button>
        <button onClick={generate} disabled={busy === "gen"} className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white hover:bg-[#d73f22] disabled:opacity-60">
          {busy === "gen" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}Buat dari SKU yang sama{s?.candidates ? ` (${s.candidates})` : ""}
        </button>
      </PageHead>

      <Panel className="p-4">
        <button onClick={() => setHowOpen(!howOpen)} className="flex w-full items-center justify-between text-left">
          <span className="flex items-center gap-2 text-sm font-semibold text-navy"><Boxes size={17} className="text-[#ee4d2d]" />Satu stok untuk semua toko Shopee, disatukan lewat SKU</span>
          <span className="text-xs font-semibold text-[#ee4d2d]">{howOpen ? "Tutup" : "Cara kerja"}</span>
        </button>
        {howOpen && (
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            <li>• Listing dengan <b>SKU yang sama</b> (SKU variasi, atau SKU induk untuk produk tanpa variasi) di toko mana pun memakai satu stok.</li>
            <li>• Pesanan baru di toko mana pun <b>memotong stok master sekali</b>, lalu stok baru dikirim ke semua toko dalam ±30 detik, jadi tidak oversell.</li>
            <li>• Pesanan <b>batal</b> mengembalikan stoknya. Barang <b>retur</b> tidak otomatis kembali (cek dulu kondisinya), tambahkan manual.</li>
            <li>• Pesanan sebelum stok master dibuat tidak ikut dipotong. Stok awal = stok <b>terkecil</b> di antara listing yang disatukan.</li>
            <li>• Ubah stok di sini (atau di Semua Produk), jangan di Seller Centre: perubahan di Seller Centre akan tertimpa stok master.</li>
          </ul>
        )}
      </Panel>

      {notice && <p className="flex items-start justify-between gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><span className="flex items-center gap-2"><Check size={16} />{notice}</span><button onClick={() => setNotice("")} aria-label="Tutup"><X size={15} /></button></p>}

      {s && (
        <div className="surface flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Wallet size={22} /></span>
          <div>
            <p className="text-xs font-medium text-slate-500">Modal tertahan di gudang (belum muter)</p>
            <p className="mt-0.5 text-2xl font-bold text-navy">{rupiah(s.stock_value)}</p>
            <p className="text-xs text-slate-400">Sisa stok × HPP · {s.stock_units.toLocaleString("id-ID")} pcs</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Potensi omzet kalau terjual semua</p>
            <p className="mt-0.5 text-lg font-bold text-emerald-600">{rupiah(s.sell_value)}</p>
            <p className="text-xs text-slate-400">Sisa stok × harga jual saat ini</p>
          </div>
          {s.no_hpp > 0 && (
            <p className="flex max-w-sm items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{s.no_hpp.toLocaleString("id-ID")} SKU masih ada stok tapi HPP-nya kosong, belum ikut dihitung. Isi lewat Semua Produk → Input HPP Massal.</p>
          )}
        </div>
      )}
      {s && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {([["Stok master", s.masters, "text-navy"], ["Listing terhubung", s.linked, "text-emerald-600"], ["Belum terhubung (ada SKU)", s.unlinked_with_sku, "text-amber-600"],
            ["Listing tanpa SKU", s.without_sku, "text-slate-500"], ["Gagal dikirim ke Shopee", s.errors, s.errors ? "text-rose-600" : "text-navy"]] as const).map(([l, v, c]) => (
            <div key={l} className="surface p-4"><p className="text-xs font-medium text-slate-500">{l}</p><p className={`mt-1 text-xl font-bold ${c}`}>{v.toLocaleString("id-ID")}</p></div>
          ))}
        </div>
      )}
      {s && s.without_sku > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{s.without_sku.toLocaleString("id-ID")} listing belum punya SKU, jadi tidak bisa disatukan otomatis. Isi SKU yang sama untuk produk yang sama di Seller Centre, sinkronkan produk, lalu klik &quot;Buat dari SKU yang sama&quot;. Atau hubungkan manual lewat ikon <b>Hubungkan</b> di baris stok master.{" "}
            <a href="/marketplace/products?buat_sku=1" className="font-semibold underline">Buat SKU otomatis sekarang</a></span>
        </p>
      )}

      <Panel>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari SKU atau nama" />
          <Select className="input w-52" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
            <option value="">Semua stok master</option><option value="empty">Stok habis</option><option value="error">Gagal dikirim ke Shopee</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Produk / SKU", "Stok master", "HPP / Modal", "Listing di toko", "Terakhir dikirim", ""].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {!d && <tr><td colSpan={6} className="py-14 text-center text-slate-400"><Loader2 size={18} className="mx-auto animate-spin" /></td></tr>}
              {masters.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 align-top hover:bg-slate-50/50">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {m.image ? <img src={m.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Package size={18} /></span>}
                      <div className="min-w-0"><p className="max-w-[260px] truncate font-medium text-navy" title={m.name ?? ""}>{m.name || m.sku}</p><p className="font-mono text-xs text-slate-500">{m.sku}</p></div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><StockEdit m={m} onSaved={replace} /></td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {m.hpp && m.hpp > 0 ? (
                      <div>
                        <p className="font-semibold text-slate-800">{rupiah(m.hpp)}<span className="text-[11px] font-normal text-slate-400"> /pcs</span></p>
                        <p className="text-[11px] text-slate-500">Modal: {rupiah(Math.max(0, m.stock) * m.hpp)}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Belum diisi</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex max-w-[380px] flex-wrap gap-1.5">
                      {m.listings.map((l) => (
                        <span key={l.id} title={l.stock_push_error ?? `${l.name}${l.model_name ? ` · ${l.model_name}` : ""}`}
                          className={`group inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${l.stock_push_error ? "border-rose-200 bg-rose-50 text-rose-700" : l.stock !== Math.max(0, m.stock) ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600"}`}>
                          <ShopeeMark size={12} /><span className="max-w-[110px] truncate">{l.shop?.shop_name ?? "Toko"}{l.model_name ? ` · ${l.model_name}` : ""}</span><b>{l.stock}</b>
                          <button onClick={() => run(`un${l.id}`, async () => {
                            if (!(await askConfirm(`Lepas listing ini dari stok master? Stoknya di ${l.shop?.shop_name ?? "toko"} tidak berubah, tapi tidak ikut sinkron lagi.`, { title: "Lepas listing", confirmLabel: "Lepas" }))) return;
                            replace(await api<Master>(`/marketplace/stock-masters/${m.id}/listings/${l.id}`, { method: "DELETE" }));
                          })} className="hidden text-slate-400 hover:text-rose-600 group-hover:inline" aria-label="Lepas listing"><Unlink size={12} /></button>
                        </span>
                      ))}
                      {!m.listings.length && <span className="text-xs text-slate-400">Belum ada listing</span>}
                    </div>
                    {m.listings.some((l) => l.stock_push_error) && <p className="mt-1 text-xs text-rose-600">Sebagian toko menolak stok ini. Arahkan kursor ke label merah untuk alasannya, lalu Dorong ulang.</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{m.push_pending ? <span className="font-semibold text-amber-600">Menunggu dikirim…</span> : when(m.pushed_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <IconBtn title="Riwayat stok" onClick={() => setHistory(m)}><History size={15} /></IconBtn>
                      <IconBtn title="Hubungkan listing lain" onClick={() => setLinking(m)}><Link2 size={15} /></IconBtn>
                      <IconBtn title="Dorong ulang ke semua toko" busy={busy === `push${m.id}`} onClick={() => run(`push${m.id}`, async () => replace(await api<Master>(`/marketplace/stock-masters/${m.id}/push`, { method: "POST" })))}><RefreshCcw size={15} /></IconBtn>
                      <IconBtn title="Hapus stok master" danger onClick={() => run(`del${m.id}`, async () => {
                        if (!(await askConfirm(`Hapus stok master ${m.sku}? Stok di tiap toko tetap seperti sekarang, tapi tidak disinkronkan lagi.`, { title: "Hapus stok master", confirmLabel: "Hapus", danger: true }))) return;
                        await api(`/marketplace/stock-masters/${m.id}`, { method: "DELETE" }); load();
                      })}><Trash2 size={15} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {d && !masters.length && (
            <div className="py-14 text-center text-sm text-slate-500">
              {search || filter ? "Tidak ada stok master yang cocok." : <>Belum ada stok master.{s?.candidates ? <> Ada <b>{s.candidates}</b> SKU yang dipakai di lebih dari satu listing, klik <b>Buat dari SKU yang sama</b>.</> : " Pastikan produk yang sama memakai SKU yang sama di tiap toko."}</>}
            </div>
          )}
        </div>
        {d && d.masters.last_page > 1 && <Pager page={d.masters.current_page} last={d.masters.last_page} onPage={setPage} total={d.masters.total} />}
      </Panel>

      {history && <HistoryDialog m={history} onClose={() => setHistory(null)} />}
      {linking && <LinkDialog target={linking} onClose={() => setLinking(null)} onDone={(m) => { setLinking(null); if (linking === "new") load(); else replace(m); }} />}
    </div>
  );
}

function IconBtn({ children, title, onClick, busy, danger }: { children: React.ReactNode; title: string; onClick: () => void; busy?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} title={title} aria-label={title}
      className={`rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 ${danger ? "hover:text-rose-600" : "hover:text-navy"}`}>
      {busy ? <Loader2 size={15} className="animate-spin" /> : children}
    </button>
  );
}

/** Inline stock editor: the new value is recorded in the history and sent to every shop. */
function StockEdit({ m, onSaved }: { m: Master; onSaved: (m: Master) => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(String(m.stock));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!edit) setV(String(m.stock)); }, [m.stock, edit]);
  const save = async () => {
    setBusy(true);
    try { onSaved(await api<Master>(`/marketplace/stock-masters/${m.id}`, { method: "PUT", json: { stock: Number(v), note: note || null } })); setEdit(false); setNote(""); }
    catch (e) { showAlert(err(e, "Gagal menyimpan stok"), "Gagal"); } finally { setBusy(false); }
  };
  if (!edit) return (
    <button onClick={() => setEdit(true)} className="group inline-flex items-center gap-2">
      <span className={`text-lg font-bold ${m.stock <= 0 ? "text-rose-600" : "text-navy"}`}>{m.stock.toLocaleString("id-ID")}</span>
      <Pencil size={13} className="text-slate-300 group-hover:text-slate-500" />
      {m.stock < 0 && <span className="text-[11px] font-semibold text-rose-600">oversell</span>}
    </button>
  );
  return (
    <div className="w-44 space-y-1.5">
      <input type="number" min={0} autoFocus className="input h-9" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
      <input className="input h-8 text-xs" placeholder="Catatan (restok, opname…)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-1.5">
        <button onClick={save} disabled={busy || v === ""} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 text-xs font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}Simpan</button>
        <button onClick={() => setEdit(false)} className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-600">Batal</button>
      </div>
    </div>
  );
}

function HistoryDialog({ m, onClose }: { m: Master; onClose: () => void }) {
  const [rows, setRows] = useState<Movement[] | null>(null);
  useEffect(() => { api<Movement[]>(`/marketplace/stock-masters/${m.id}/movements`).then(setRows).catch(() => setRows([])); }, [m.id]);
  return (
    <Dialog title={`Riwayat stok · ${m.sku}`} icon={History} onClose={onClose} width="max-w-xl">
      {!rows ? <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Memuat…</p>
        : !rows.length ? <p className="text-sm text-slate-500">Belum ada perubahan stok sejak stok master dibuat.</p>
        : (
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0"><b className="block text-navy">{KIND[r.kind]}</b><span className="block truncate text-xs text-slate-500">{r.note ?? "-"} · {when(r.created_at)}</span></span>
                <span className="shrink-0 text-right"><b className={r.qty < 0 ? "text-rose-600" : "text-emerald-600"}>{r.qty > 0 ? `+${r.qty}` : r.qty}</b><span className="block text-xs text-slate-400">jadi {r.stock_after}</span></span>
              </li>
            ))}
          </ul>
        )}
    </Dialog>
  );
}

/** Pick a listing: link it to a master, or ("new") start a master from its SKU. */
function LinkDialog({ target, onClose, onDone }: { target: Master | "new"; onClose: () => void; onDone: (m: Master) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ListingRow[] | null>(null);
  const [busy, setBusy] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      api<{ listings: Paginated<ListingRow> }>(`/marketplace/listings?${new URLSearchParams({ search: q, per_page: "15" })}`).then((r) => setRows(r.listings.data)).catch(() => setRows([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const pick = async (l: ListingRow) => {
    setBusy(l.id);
    try {
      onDone(target === "new"
        ? await api<Master>("/marketplace/stock-masters", { method: "POST", json: { listing_id: l.id } })
        : await api<Master>(`/marketplace/stock-masters/${target.id}/listings`, { method: "POST", json: { listing_id: l.id } }));
    } catch (e) { showAlert(err(e, "Gagal menghubungkan"), "Gagal"); } finally { setBusy(0); }
  };
  const isNew = target === "new";
  return (
    <Dialog title={isNew ? "Buat stok master dari listing" : `Hubungkan listing ke ${target.sku}`} icon={Link2} onClose={onClose} width="max-w-2xl">
      <p className="mb-3 text-sm text-slate-500">{isNew ? "Stok awal diambil dari stok listing ini. Listing lain dengan SKU yang sama ikut terhubung." : `Stok listing yang dipilih akan diganti stok master (${target.stock}).`}</p>
      <SearchBox value={q} onChange={setQ} placeholder="Cari nama atau SKU" />
      <ul className="mt-3 max-h-[50vh] divide-y divide-slate-100 overflow-y-auto">
        {!rows && <li className="py-6 text-center text-slate-400"><Loader2 size={16} className="mx-auto animate-spin" /></li>}
        {rows?.map((l) => {
          const here = !isNew && l.stock_master_id === target.id;
          const elsewhere = !!l.stock_master_id && !here;
          return (
            <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
              {l.image ? <img src={l.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Package size={16} /></span>}
              <span className="min-w-0 flex-1">
                <b className="block truncate text-navy">{l.name}{l.model_name ? ` · ${l.model_name}` : ""}</b>
                <span className="block truncate text-xs text-slate-500">{l.shop.shop_name} · SKU {l.sku || "—"} · stok {l.stock}</span>
              </span>
              {here ? <span className="text-xs font-semibold text-emerald-600">Terhubung</span>
                : <button onClick={() => pick(l)} disabled={!!busy || (isNew && !l.sku)} title={isNew && !l.sku ? "Listing tanpa SKU" : undefined}
                    className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-navy hover:border-[#ee4d2d] hover:text-[#ee4d2d] disabled:opacity-40">
                    {busy === l.id ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}{elsewhere ? "Pindahkan" : isNew ? "Pilih" : "Hubungkan"}
                  </button>}
            </li>
          );
        })}
        {rows && !rows.length && <li className="py-6 text-center text-sm text-slate-500">Tidak ada listing yang cocok.</li>}
      </ul>
    </Dialog>
  );
}
