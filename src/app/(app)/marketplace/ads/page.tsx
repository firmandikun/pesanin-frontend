"use client";
import { ExternalLink, Loader2, Megaphone, RefreshCcw, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DateRange, useDefaultRange } from "@/components/DateRange";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, rupiah } from "@/lib/api";

type Metrics = { expense: number; gmv: number; clicks: number; orders: number };
type Item = { item_id: number; name: string; image: string | null; product_id: number | null };
type Campaign = Metrics & { id: number; campaign_id: number; name: string; status: string | null; ad_type: string | null; bidding_method: string | null; budget: number | null; impressions: number; items_sold: number; items: Item[] };
type ProductRow = Item & Metrics & { campaigns: number; shared: boolean };
type Data = { from: string; to: string; total: Metrics & { impressions: number }; daily: { date: string; expense: number }[]; campaigns: Campaign[]; products: ProductRow[]; topup_url: string | null; balance: { amount: number; shops: number; checked_at: string | null; stale: boolean } };
type Shop = { id: number; shop_name: string; status: string; is_demo: boolean };

/** Product selection (manual = 1 product, auto = Shopee picks) + bidding (manual/auto), as Seller Centre names them. */
const adKind = (c: Campaign) => `${c.ad_type === "auto" ? "Pilih produk otomatis" : "Iklan Produk"} · Bidding ${c.bidding_method === "auto" ? "otomatis" : c.bidding_method === "manual" ? "manual" : "-"}`;
const roas = (m: Metrics) => (m.expense > 0 ? (m.gmv / m.expense).toFixed(1).replace(".", ",") : "-");
const STATUS: Record<string, [string, string]> = {
  ongoing: ["Berjalan", "bg-emerald-50 text-emerald-700"], paused: ["Dijeda", "bg-amber-50 text-amber-700"],
  scheduled: ["Terjadwal", "bg-sky-50 text-sky-700"], ended: ["Selesai", "bg-slate-100 text-slate-500"], closed: ["Ditutup", "bg-slate-100 text-slate-500"],
};

/** Iklan Shopee: ad spend synced from the Shopee Ads API, per campaign and per promoted product. */
export default function ShopeeAds() {
  const [range, setRange] = useState(useDefaultRange());
  const [shops, setShops] = useState<Shop[]>([]);
  const [shop, setShop] = useState("");
  const [d, setD] = useState<Data | null>(null);
  const [view, setView] = useState<"products" | "campaigns">("products");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { api<{ shops: Shop[] }>("/marketplace/shops").then((r) => setShops(r.shops.filter((s) => s.status !== "disconnected"))); }, []);
  const load = useCallback(() => {
    api<Data>(`/marketplace/ads?${new URLSearchParams({ from: range.from, to: range.to, ...(shop ? { shop } : {}) })}`).then(setD);
  }, [range, shop]);
  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setBusy(true); setMsg("");
    try {
      for (const s of shops.filter((x) => !x.is_demo && (!shop || String(x.id) === shop))) {
        await api(`/marketplace/shops/${s.id}/sync`, { method: "POST", json: { what: "ads" } });
      }
      setMsg("Data iklan diperbarui dari Shopee.");
      load();
    } catch (e) { setMsg(e instanceof ApiError ? e.message : "Gagal mengambil data iklan"); }
    finally { setBusy(false); }
  };

  const t = d?.total;
  const maxDaily = Math.max(1, ...(d?.daily.map((x) => x.expense) ?? [0]));
  return (
    <div className="space-y-5">
      <PageHead title="Iklan Shopee" tutorial={false} crumbs={[["Marketplace"], ["Iklan Shopee"]]}>
        <button onClick={sync} disabled={busy} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}Ambil data iklan
        </button>
      </PageHead>
      <div className="flex flex-wrap items-center gap-2">
        <DateRange value={range} onChange={setRange} />
        {shops.length > 1 && (
          <Select className="input h-10 w-56" value={shop} onChange={(e) => setShop(e.target.value)}>
            <option value="">Semua toko ({shops.length})</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.shop_name}</option>)}
          </Select>
        )}
      </div>
      {msg && <p className="rounded-xl bg-white p-3 text-sm text-slate-600">{msg}</p>}

      {!d ? <p className="py-16 text-center text-sm text-slate-400">Memuat…</p> : (
        <>
          {d.balance.shops > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ee4d2d]"><Wallet size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-slate-500">Saldo iklan · {shop ? shops.find((x) => String(x.id) === shop)?.shop_name : `Semua toko (${d.balance.shops})`}</p>
                <p className={`text-xl font-bold ${d.balance.amount ? "text-navy" : "text-rose-600"}`}>{rupiah(d.balance.amount)}</p>
                <p className="text-[11px] text-slate-400">
                  {d.balance.stale ? "Gagal mengambil dari Shopee, menampilkan data terakhir" : "Langsung dari Shopee Ads API"}
                  {d.balance.checked_at && ` · ${new Date(d.balance.checked_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </div>
              {d.balance.amount === 0 && d.topup_url && <a href={d.topup_url} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600">Isi saldo<ExternalLink size={12} /></a>}
            </div>
          )}
          {d.balance.shops > 0 && d.balance.amount === 0 && d.campaigns.some((c) => c.status === "ongoing") && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Ada kampanye berjalan tapi saldo iklan Rp0, jadi iklan tidak akan tayang sampai saldo diisi di Seller Centre{d.topup_url ? "" : " (toko sandbox: Shopee Console → Test Account-Sandbox v2 → Login Seller Center)"}.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Biaya iklan", rupiah(t!.expense)], ["Penjualan dari iklan", rupiah(t!.gmv)], ["ROAS", roas(t!)],
              ["Klik", t!.clicks.toLocaleString("id-ID")], ["Pesanan dari iklan", t!.orders.toLocaleString("id-ID")],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 truncate text-xl font-bold text-navy">{v}</p></div>
            ))}
          </div>

          {d.daily.length > 0 && (
            <Panel className="p-5">
              <h2 className="font-bold text-navy">Biaya iklan per hari</h2>
              <div className="mt-4 flex h-32 items-end gap-1">
                {d.daily.map((x) => (
                  <div key={x.date} className="group relative flex-1" title={`${new Date(x.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}: ${rupiah(x.expense)}`}>
                    <div className="w-full rounded-t bg-[#ee4d2d]/80 group-hover:bg-[#ee4d2d]" style={{ height: `${Math.max(2, (x.expense / maxDaily) * 128)}px` }} />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <div className="flex w-fit rounded-xl bg-white p-1">
            {([["products", `Per produk (${d.products.length})`], ["campaigns", `Per kampanye (${d.campaigns.length})`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} className={`h-9 rounded-lg px-4 text-sm font-semibold ${view === k ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"}`}>{l}</button>
            ))}
          </div>

          {(view === "products" ? d.products.length : d.campaigns.length) === 0 ? (
            <Panel className="flex flex-col items-center gap-2 p-10 text-center">
              <Megaphone size={26} className="text-slate-300" />
              <p className="font-semibold text-navy">Belum ada kampanye Iklan Produk</p>
              <p className="max-w-md text-sm text-slate-500">Buat iklan di Seller Centre Shopee → Iklan Shopee, lalu klik <b>Ambil data iklan</b>. Data juga diambil otomatis setiap hari jam 06.00.</p>
            </Panel>
          ) : view === "products" ? (
            <Panel className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3 font-semibold">Produk diiklankan</th><th className="px-3 py-3 text-right font-semibold">Biaya iklan</th><th className="px-3 py-3 text-right font-semibold">Penjualan</th><th className="px-3 py-3 text-right font-semibold">ROAS</th><th className="px-3 py-3 text-right font-semibold">Klik</th><th className="px-3 py-3 text-right font-semibold">Pesanan</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.products.map((p) => (
                    <tr key={p.item_id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="h-10 w-10 rounded-lg bg-slate-100" />}
                          <div className="min-w-0"><p className="line-clamp-1 max-w-[340px] font-medium text-slate-700">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.campaigns} kampanye{p.shared && " · sebagian biaya dibagi rata dengan produk lain di kampanye yang sama"}</p></div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-navy">{rupiah(p.expense)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{rupiah(p.gmv)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{roas(p)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{p.clicks.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{p.orders.toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          ) : (
            <Panel className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3 font-semibold">Kampanye</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 text-right font-semibold">Biaya iklan</th><th className="px-3 py-3 text-right font-semibold">Penjualan</th><th className="px-3 py-3 text-right font-semibold">ROAS</th><th className="px-3 py-3 text-right font-semibold">Klik</th><th className="px-3 py-3 text-right font-semibold">Pesanan</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.campaigns.map((c) => {
                    const [label, tone] = STATUS[c.status ?? ""] ?? [c.status ?? "-", "bg-slate-100 text-slate-500"];
                    return (
                      <tr key={c.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-700">{c.name}</p>
                          <p className="text-xs text-slate-400">{adKind(c)}{c.budget ? ` · budget ${rupiah(c.budget)}` : ""}</p>
                          <p className="mt-1 line-clamp-2 max-w-[380px] text-xs text-slate-500">{c.items.map((i) => i.name).join(" · ") || "-"}</p>
                        </td>
                        <td className="px-3 py-3"><span className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>{label}</span></td>
                        <td className="px-3 py-3 text-right font-semibold text-navy">{rupiah(c.expense)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{rupiah(c.gmv)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{roas(c)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{c.clicks.toLocaleString("id-ID")}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{c.orders.toLocaleString("id-ID")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          )}
          <p className="text-xs text-slate-400">Biaya iklan total dari laporan harian Shopee Ads (semua jenis iklan). Rincian per produk/kampanye hanya untuk Iklan Produk. Penjualan &amp; pesanan memakai atribusi luas Shopee.</p>
        </>
      )}
    </div>
  );
}
