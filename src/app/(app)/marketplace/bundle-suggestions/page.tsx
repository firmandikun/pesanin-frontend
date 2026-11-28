"use client";
import { Gift, Info, Layers, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { showAlert } from "@/components/Dialogs";
import { PageHead, Panel } from "@/components/kit";
import { PromoForm, type PickItem } from "@/components/marketplace/PromoForms";
import { Select } from "@/components/Select";
import { api, rupiah } from "@/lib/api";

type Item = { item_id: number; name: string; image: string | null; orders: number; price: number; price_max: number; models: { model_id: number; name: string | null; price: number; stock: number }[] };
type Pair = { key: string; shop_id: number; shop_name: string | null; together: number; confidence: number; lift: number; items: [Item, Item]; pair_price: number };
type Data = { pairs: Pair[]; summary: { orders: number; multi_item_orders: number; days: number } };
type Shop = { id: number; shop_name: string; platform?: string; status: string; is_demo: boolean };

const pick = (i: Item): PickItem => ({
  item_id: i.item_id, name: i.name, image: i.image, limit: "",
  models: i.models.map((m) => ({ model_id: m.model_id, name: m.name, price: m.price, stock: m.stock, promo: "", promoStock: "" })),
});
const price = (i: Item) => (i.price_max > i.price ? `${rupiah(i.price)}–${rupiah(i.price_max)}` : rupiah(i.price));

/**
 * Saran Paket: products buyers often put in the same Shopee order, from the shop's last 90 days. Each pair can be
 * turned into a Paket Diskon (both products, buy 2 get X% off) or a Kombo Hemat (buy A, add B at a special price).
 */
export default function BundleSuggestionsPage() {
  const [d, setD] = useState<Data | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shop, setShop] = useState("");
  const [form, setForm] = useState<{ pair: Pair; type: "bundle" | "addon" } | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api<{ shops: Shop[] }>("/marketplace/shops").then((r) => setShops(r.shops.filter((x) => (x.platform ?? "shopee") === "shopee" && x.status !== "disconnected" && !x.is_demo))).catch(() => {});
  }, []);
  const load = useCallback(() => {
    setD(null);
    api<Data>(`/marketplace/listings/bundle-suggestions${shop ? `?shop_id=${shop}` : ""}`).then(setD).catch(() => setD({ pairs: [], summary: { orders: 0, multi_item_orders: 0, days: 90 } }));
  }, [shop]);
  useEffect(() => { load(); }, [load]);

  const s = d?.summary;
  const multiPct = s && s.orders ? Math.round((s.multi_item_orders / s.orders) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHead title="Saran Paket" tutorial={false} crumbs={[["Marketplace"], ["Saran Paket"]]}>
        {shops.length > 1 && (
          <Select className="input w-48" value={shop} onChange={(e) => setShop(e.target.value)}>
            <option value="">Semua toko ({shops.length})</option>{shops.map((x) => <option key={x.id} value={x.id}>{x.shop_name}</option>)}
          </Select>
        )}
      </PageHead>

      {s && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel className="p-4"><p className="text-xs font-medium text-slate-500">Pesanan dianalisis</p><p className="mt-1 text-xl font-bold text-navy">{s.orders.toLocaleString("id-ID")}</p><p className="text-[11px] text-slate-400">{s.days} hari terakhir</p></Panel>
          <Panel className="p-4"><p className="text-xs font-medium text-slate-500">Pesanan berisi 2+ produk</p><p className="mt-1 text-xl font-bold text-navy">{s.multi_item_orders.toLocaleString("id-ID")}</p><p className="text-[11px] text-slate-400">{multiPct}% dari semua pesanan</p></Panel>
          <Panel className="p-4"><p className="text-xs font-medium text-slate-500">Pasangan produk ditemukan</p><p className="mt-1 text-xl font-bold text-navy">{d?.pairs.length ?? 0}</p><p className="text-[11px] text-slate-400">dibeli bersama min. 2 kali</p></Panel>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-800"><Info size={14} className="mt-0.5 shrink-0" />
        Pasangan produk yang paling sering ada di satu pesanan. Jadikan <b className="mx-0.5">Paket Diskon</b> (beli keduanya lebih murah) atau <b className="mx-0.5">Kombo Hemat</b> (beli produk utama, tambah produk kedua dengan harga khusus) supaya pembeli lain ikut membeli lebih banyak dalam satu pesanan.
      </p>
      {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <Panel>
        {!d && <p className="py-14 text-center text-slate-400"><Loader2 size={18} className="mx-auto animate-spin" /></p>}
        {d && !d.pairs.length && (
          <p className="py-14 text-center text-sm text-slate-500">Belum ada produk yang sering dibeli bersamaan. Saran muncul setelah ada pesanan berisi 2 produk berbeda atau lebih.</p>
        )}
        {!!d?.pairs.length && (
          <div className="divide-y divide-slate-100">
            {d.pairs.map((p) => (
              <div key={p.key} className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex min-w-0 flex-1 basis-[420px] items-center gap-3">
                  {p.items.map((i, idx) => (
                    <div key={i.item_id} className="flex min-w-0 flex-1 items-center gap-2.5">
                      {idx === 1 && <Plus size={16} className="shrink-0 text-slate-400" />}
                      {i.image ? <img src={i.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" />}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-navy">{i.name}</p>
                        <p className="text-xs text-slate-500">{price(i)} · {i.orders} pesanan</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="w-40 shrink-0 text-sm">
                  <p className="font-bold text-navy">{p.together}× dibeli bersama</p>
                  <p className="text-xs text-slate-500">{p.confidence}% pembeli salah satunya juga beli yang lain</p>
                  {shops.length > 1 && <p className="text-[11px] text-slate-400">{p.shop_name}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setForm({ pair: p, type: "bundle" })} className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white hover:bg-brand-700"><Layers size={15} />Paket Diskon</button>
                  <button onClick={() => setForm({ pair: p, type: "addon" })} className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Gift size={15} />Kombo Hemat</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {form && (
        <PromoForm
          key={`${form.pair.key}:${form.type}`}
          type={form.type}
          shopId={form.pair.shop_id}
          // Kombo Hemat: the product bought more often is the main one, the other is offered as the add-on.
          initialMain={form.type === "addon" ? [pick([...form.pair.items].sort((a, b) => b.orders - a.orders)[0])] : undefined}
          initialItems={form.type === "addon" ? [pick([...form.pair.items].sort((a, b) => b.orders - a.orders)[1])] : form.pair.items.map(pick)}
          initial={form.type === "bundle" ? { name: "Paket Hemat", rule_type: "percentage", value: "5", min_amount: "2" } : { name: "Kombo Hemat" }}
          onClose={() => setForm(null)}
          onCreated={(w) => {
            setForm(null);
            setNotice(w.length ? `Promosi dibuat, tapi ${w.length} produk ditolak Shopee.` : "Promosi berhasil dibuat di Shopee. Lihat di Marketplace → Promosi.");
            if (w.length) showAlert(w.join("\n"), "Produk ditolak Shopee");
          }}
        />
      )}
    </div>
  );
}
