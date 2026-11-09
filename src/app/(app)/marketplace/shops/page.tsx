"use client";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Link2, Loader2, RefreshCcw, Search, Store, Trash2, Unplug } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead, Pager, Panel, PER_PAGE } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError } from "@/lib/api";
import { askConfirm } from "@/components/Dialogs";

type Shop = {
  id: number; shop_id: number; shop_name: string; status: "active" | "expired" | "disconnected"; is_demo: boolean; region: string;
  products_synced_at: string | null; orders_synced_at: string | null; last_error: string | null; listings_count: number; orders_count: number;
};
type Data = { shops: Shop[]; configured: boolean; environment: "sandbox" | "live"; redirect_url: string; push_url: string | null; can_demo: boolean };

const ago = (s: string | null) => {
  if (!s) return "belum pernah";
  const m = Math.round((Date.now() - new Date(s).getTime()) / 6e4);
  return m < 1 ? "baru saja" : m < 60 ? `${m} menit lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`;
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <code className="flex-1 truncate text-xs text-navy">{value}</code>
        <button type="button" onClick={() => navigator.clipboard?.writeText(value).then(() => { setOk(true); setTimeout(() => setOk(false), 1200); })} className="text-xs font-semibold text-brand-600">
          {ok ? "Tersalin" : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

function Shops() {
  const sp = useSearchParams();
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    sp.get("connected") ? { ok: true, text: "Toko Shopee berhasil dihubungkan. Klik Sinkronkan untuk mengambil produk dan pesanan." }
      : sp.get("error") ? { ok: false, text: sp.get("error")! } : null,
  );
  const load = useCallback(() => api<Data>("/marketplace/shops").then(setD), []);
  useEffect(() => { load(); }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Terjadi kesalahan" }); }
    finally { setBusy(""); }
  };
  // Shopee login opens in a new tab; if the redirect page can't load (local dev, no public URL),
  // the seller pastes that page's address here and Pesanin finishes the connection.
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const connect = () => run("connect", async () => {
    const tab = window.open("", "_blank");
    const { url } = await api("/marketplace/shopee/connect", { method: "POST" });
    if (tab) tab.location.href = url; else window.open(url, "_blank");
    setPasting(true); setPasted("");
  });
  const complete = () => run("complete", async () => {
    const r = await api("/marketplace/shopee/complete", { method: "POST", json: { url: pasted.trim() } });
    setPasting(false); setPasted("");
    setMsg({ ok: true, text: `Toko ${r.shop.shop_name} berhasil dihubungkan. Klik Sinkronkan untuk mengambil produk dan pesanan.` });
    load();
  });
  const sync = (s: Shop) => run(`sync-${s.id}`, async () => {
    const r = await api(`/marketplace/shops/${s.id}/sync`, { method: "POST" });
    const x = r.result ?? {};
    setMsg({ ok: true, text: x.products !== undefined ? `Sinkron selesai: ${x.products} listing, ${x.orders ?? 0} pesanan${x.ads !== undefined ? `, ${x.ads} hari biaya iklan` : ""}.${x.ads_error ? ` ${x.ads_error}` : ""}` : r.message });
    load();
  });
  const disconnect = async (s: Shop) => {
    if (!(await askConfirm(s.is_demo ? `Hapus toko contoh beserta pesanan dan biaya iklannya?` : `Putuskan ${s.shop_name}? Riwayat pesanan tetap tersimpan untuk laporan.`))) return;
    run(`del-${s.id}`, async () => { await api(`/marketplace/shops/${s.id}`, { method: "DELETE" }); load(); });
  };

  if (!d) return <div className="py-24 text-center text-sm text-slate-400">Memuat…</div>;
  const active = d.shops.filter((s) => s.status !== "disconnected");
  const needle = q.trim().toLowerCase();
  const filtered = active.filter((s) => (!statusFilter || (statusFilter === "active" ? s.status === "active" : s.status !== "active"))
    && (!needle || s.shop_name.toLowerCase().includes(needle) || String(s.shop_id).includes(needle)));
  const last = Math.max(1, Math.ceil(filtered.length / perPage));
  const rows = filtered.slice((Math.min(page, last) - 1) * perPage, Math.min(page, last) * perPage);

  return (
    <div className="space-y-5">
      <PageHead title="Toko Shopee" tutorial={false} crumbs={[["Marketplace"], ["Toko Shopee"]]}>
        <button onClick={connect} disabled={!!busy || !d.configured} className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white hover:bg-[#d73f22] disabled:opacity-50">
          {busy === "connect" ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}Hubungkan Toko Shopee
        </button>
      </PageHead>

      {pasting && (
        <Panel className="space-y-3 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ee4d2d]"><Link2 size={18} /></span>
            <div className="text-sm">
              <b className="block text-navy">Login toko di tab Shopee yang baru terbuka</b>
              <span className="text-slate-500">Setelah klik <b>Confirm Authorization</b>, Shopee mengarahkan ke halaman Pesanin. Kalau halaman itu tidak bisa dibuka (mis. server lokal), salin seluruh alamat dari address bar tab tersebut lalu tempel di sini.</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="input h-10 min-w-[260px] flex-1 font-mono text-xs" placeholder="https://…/api/shopee/callback?state=…&code=…&shop_id=…" value={pasted} onChange={(e) => setPasted(e.target.value)} />
            <button onClick={complete} disabled={!pasted.includes("code=") || !!busy} className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === "complete" && <Loader2 size={15} className="animate-spin" />}Selesaikan</button>
            <button onClick={() => setPasting(false)} className="h-10 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-600">Tutup</button>
          </div>
        </Panel>
      )}

      {msg && <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}{msg.text}</div>}

      {!d.configured && (
        <Panel className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><AlertTriangle size={20} /></span>
            <div className="flex-1">
              <h2 className="font-bold text-navy">Kredensial Shopee Open Platform belum diisi</h2>
              <p className="mt-1 text-sm text-slate-600">Ambil dari open.shopee.com, lalu isi di <code className="rounded bg-slate-100 px-1">backend/.env</code> dan restart backend.</p>
              <ol className="mt-4 space-y-2.5 text-sm text-slate-700">
                <li><b>1.</b> Console → <b>App List</b> → buka app kamu → salin <b>Partner ID</b> dan <b>Partner Key</b> (untuk uji pakai <i>Test Partner ID/Key</i>).</li>
                <li><b>2.</b> Isi <code className="rounded bg-slate-100 px-1">SHOPEE_PARTNER_ID</code>, <code className="rounded bg-slate-100 px-1">SHOPEE_PARTNER_KEY</code>, dan <code className="rounded bg-slate-100 px-1">SHOPEE_ENV=sandbox</code> (ganti <code className="rounded bg-slate-100 px-1">live</code> setelah app disetujui).</li>
                <li><b>3.</b> Daftarkan Redirect URL di bawah pada pengaturan app (domain harus sama).</li>
                <li><b>4.</b> Opsional: <b>Push Mechanism</b> → Live Push URL ke alamat HTTPS publik agar pesanan masuk real-time.</li>
              </ol>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <CopyField label="Redirect URL (callback otorisasi)" value={d.redirect_url} />
            <CopyField label="Live Push URL (butuh HTTPS publik)" value={d.push_url ?? "https://<domain-publik>/api/shopee/push"} />
          </div>
          <a href="https://open.shopee.com/console" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">Buka Shopee Open Platform<ExternalLink size={14} /></a>
        </Panel>
      )}

      {d.configured && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-white px-5 py-3 text-sm">
          <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" />API Shopee terhubung</span>
          <span className="text-slate-500">Mode: <b className={d.environment === "live" ? "text-emerald-600" : "text-amber-600"}>{d.environment === "live" ? "Live" : "Sandbox (uji)"}</b></span>
          <span className="text-slate-500">Toko terhubung: <b className="text-navy">{active.filter((s) => s.status === "active").length}</b>{active.length > active.filter((s) => s.status === "active").length && <span className="text-rose-600"> · {active.length - active.filter((s) => s.status === "active").length} perlu hubungkan ulang</span>}</span>
        </div>
      )}

      {active.length === 0 ? (
        <Panel className="flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1ee]"><ShopeeMark size={30} /></span>
          <h2 className="mt-4 text-lg font-bold text-navy">Belum ada toko Shopee terhubung</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">Hubungkan satu atau beberapa toko. Produk, pesanan, potongan admin, dan biaya Shopee Ads akan masuk ke Pesanin, terpisah dari pesanan website dan medsos.</p>
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input h-10 pl-9" placeholder="Cari nama toko atau Shop ID" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>
            <Select className="input h-10 w-52" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Semua status ({active.length})</option>
              <option value="active">Aktif ({active.filter((s) => s.status === "active").length})</option>
              <option value="expired">Perlu hubungkan ulang ({active.filter((s) => s.status !== "active").length})</option>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Toko</th><th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 text-right font-semibold">Listing</th><th className="px-3 py-3 text-right font-semibold">Pesanan</th>
                  <th className="px-3 py-3 font-semibold">Sinkron terakhir</th><th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <tr key={s.id} className="align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ShopeeMark size={32} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2"><b className="max-w-[260px] truncate text-navy" title={s.shop_name}>{s.shop_name}</b>
                            {s.is_demo && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">Data contoh</span>}</p>
                          <p className="text-xs text-slate-500">Shop ID {s.shop_id} · {s.region}</p>
                          {s.last_error && <p className="mt-0.5 max-w-[320px] truncate text-xs text-rose-600" title={s.last_error}>{s.last_error}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{s.status === "active" ? "Aktif" : "Perlu hubungkan ulang"}</span></td>
                    <td className="px-3 py-3 text-right"><Link href={`/marketplace/products?shop_id=${s.id}`} className="font-semibold text-navy hover:text-brand-600">{s.listings_count.toLocaleString("id-ID")}</Link></td>
                    <td className="px-3 py-3 text-right"><Link href="/marketplace/orders" className="font-semibold text-navy hover:text-brand-600">{s.orders_count.toLocaleString("id-ID")}</Link></td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{ago(s.orders_synced_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {s.status === "active"
                          ? <button onClick={() => sync(s)} disabled={!!busy} title="Sinkronkan produk, pesanan & iklan" className="flex h-8 items-center gap-1.5 rounded-lg bg-navy px-3 text-xs font-semibold text-white hover:bg-navy-700 disabled:opacity-50">{busy === `sync-${s.id}` ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}Sinkronkan</button>
                          : <button onClick={connect} className="flex h-8 items-center gap-1.5 rounded-lg bg-[#ee4d2d] px-3 text-xs font-semibold text-white"><Link2 size={14} />Hubungkan ulang</button>}
                        <Link href={`/reports/profit?channel=shopee&shop_id=${s.id}`} className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-navy hover:bg-slate-200"><Store size={14} />Laba</Link>
                        <button onClick={() => disconnect(s)} disabled={!!busy} title={s.is_demo ? "Hapus toko contoh" : "Putuskan toko"} aria-label={s.is_demo ? "Hapus" : "Putuskan"} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          {s.is_demo ? <Trash2 size={15} /> : <Unplug size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-500">Tidak ada toko yang cocok.</p>}
          </div>
          <div className="border-t border-slate-100 px-4 py-3">
            <Pager page={page} last={last} onPage={setPage} perPage={perPage} onPerPage={(n) => { setPerPage(n); setPage(1); }} total={filtered.length} />
          </div>
        </Panel>
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense><Shops /></Suspense>;
}
