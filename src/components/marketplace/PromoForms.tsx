"use client";
import { Loader2, Package, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { showAlert } from "@/components/Dialogs";
import { Modal } from "@/components/ui";
import { api, ApiError, rupiah } from "@/lib/api";

export type PromoType = "discount" | "voucher" | "bundle" | "addon" | "flash" | "top_picks";
type Listing = { id: number; item_id: number; model_id: number; name: string; model_name: string | null; price: number; stock: number; image: string | null; status: string };
export type PickModel = { model_id: number; name: string | null; price: number; stock: number; promo: string; promoStock: string };
export type PickItem = { item_id: number; name: string; image: string | null; models: PickModel[]; limit: string };

const toUnix = (v: string) => (v ? Math.floor(new Date(v).getTime() / 1000) : 0);
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const digits = (v: string) => v.replace(/\D/g, "");

/** Search the shop's synced Shopee products and pick them (with their variations). */
export function ProductPicker({ shopId, value, onChange, prices, stock, max }: {
  shopId: number; value: PickItem[]; onChange: (v: PickItem[]) => void; prices?: "promo" | false; stock?: boolean; max?: number;
}) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<PickItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState("");
  const search = () => {
    setBusy(true);
    api<{ listings: { data: Listing[] } }>(`/marketplace/listings?shop_id=${shopId}&status=NORMAL&per_page=20&search=${encodeURIComponent(q)}`)
      .then((r) => {
        const g = r.listings.data.reduce<Record<number, PickItem>>((a, l) => {
          a[l.item_id] ??= { item_id: l.item_id, name: l.name, image: l.image, models: [], limit: "" };
          a[l.item_id].models.push({ model_id: l.model_id, name: l.model_name, price: l.price, stock: l.stock, promo: "", promoStock: "" });
          return a;
        }, {});
        setRes(Object.values(g));
      }).catch(() => setRes([])).finally(() => setBusy(false));
  };
  useEffect(search, [shopId]); // eslint-disable-line react-hooks/exhaustive-deps
  const has = (id: number) => value.some((v) => v.item_id === id);
  const add = (p: PickItem) => { if (!has(p.item_id) && (!max || value.length < max)) onChange([...value, p]); };
  const setModel = (item: number, model: number, patch: Partial<PickModel>) =>
    onChange(value.map((v) => v.item_id !== item ? v : { ...v, models: v.models.map((m) => (m.model_id === model ? { ...m, ...patch } : m)) }));
  const applyPct = () => {
    const p = Number(pct);
    if (!p || p <= 0 || p >= 100) return;
    onChange(value.map((v) => ({ ...v, models: v.models.map((m) => ({ ...m, promo: String(Math.round(m.price * (1 - p / 100))) })) })));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input h-9 w-full pl-9" placeholder="Cari produk toko ini" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())} /></div>
        <button type="button" onClick={search} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">Cari</button>
      </div>
      <div className="max-h-40 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
        {busy ? <p className="p-3 text-xs text-slate-400"><Loader2 size={13} className="inline animate-spin" /> Mencari…</p>
          : !res?.length ? <p className="p-3 text-xs text-slate-400">Tidak ada produk live. Sinkronkan produk dulu di Semua Produk.</p>
          : res.map((p) => (
            <button type="button" key={p.item_id} onClick={() => add(p)} disabled={has(p.item_id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40">
              {p.image ? <img src={p.image} alt="" className="h-7 w-7 rounded object-cover" /> : <Package size={18} className="text-slate-300" />}
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="text-xs text-slate-400">{p.models.length > 1 ? `${p.models.length} variasi` : rupiah(p.models[0].price)}</span>
              {!has(p.item_id) && <Plus size={14} className="text-[#ee4d2d]" />}
            </button>
          ))}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <b className="text-xs text-slate-600">Produk dipilih ({value.length}{max ? `/${max}` : ""})</b>
        {prices === "promo" && value.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs">Diskon semua <input className="input h-8 w-16" value={pct} onChange={(e) => setPct(digits(e.target.value))} placeholder="%" />
            <button type="button" onClick={applyPct} className="h-8 rounded-lg border border-[#ee4d2d] px-2.5 font-semibold text-[#ee4d2d]">Terapkan</button></span>
        )}
      </div>
      {value.length > 0 && (
        <div className="max-h-64 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
          {value.map((v) => (
            <div key={v.item_id} className="px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{v.name}</span>
                {prices === "promo" && <label className="flex items-center gap-1 text-[11px] text-slate-500">Batas/pembeli<input className="input h-7 w-14" value={v.limit} placeholder="∞" onChange={(e) => onChange(value.map((x) => (x.item_id === v.item_id ? { ...x, limit: digits(e.target.value) } : x)))} /></label>}
                <button type="button" onClick={() => onChange(value.filter((x) => x.item_id !== v.item_id))} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
              </div>
              {prices === "promo" && v.models.map((m) => {
                const off = m.promo ? Math.round((1 - Number(m.promo) / m.price) * 100) : null;
                return (
                  <div key={m.model_id} className="mt-1 flex items-center gap-2 pl-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-slate-500">{m.name || "Tanpa variasi"} · {rupiah(m.price)} · stok {m.stock}</span>
                    {off !== null && <span className={off > 0 && off < 100 ? "text-emerald-600" : "text-rose-600"}>{off}%</span>}
                    <input className="input h-7 w-28 text-right" placeholder="Harga promo" value={m.promo} onChange={(e) => setModel(v.item_id, m.model_id, { promo: digits(e.target.value) })} />
                    {stock && <input className="input h-7 w-16 text-right" placeholder="Stok" value={m.promoStock} onChange={(e) => setModel(v.item_id, m.model_id, { promoStock: digits(e.target.value) })} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const payloadItems = (items: PickItem[], withStock = false) => items.map((i) => ({
  item_id: i.item_id, purchase_limit: i.limit ? Number(i.limit) : 0,
  models: i.models.filter((m) => m.promo || !withStock).map((m) => ({ model_id: m.model_id, price: m.promo ? Number(m.promo) : undefined, ...(withStock ? { stock: Number(m.promoStock || 1) } : {}) })),
}));

function L({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}{hint && <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span>}</label>;
}

const TITLE: Record<PromoType, string> = {
  discount: "Buat Promo Toko", voucher: "Buat Voucher", bundle: "Buat Paket Diskon", addon: "Buat Kombo Hemat", flash: "Buat Flash Sale Toko", top_picks: "Buat Produk Unggulan",
};

/** Create form for every promotion kind; posts to Shopee through Pesanin. */
export function PromoForm({ type, shopId, onClose, onCreated, initialItems, initialMain, initial }: {
  type: PromoType; shopId: number; onClose: () => void; onCreated: (warnings: string[]) => void;
  /** Prefill (e.g. from Saran Paket): products already picked and form values such as name / value. */
  initialItems?: PickItem[]; initialMain?: PickItem[]; initial?: Record<string, string>;
}) {
  const now = new Date();
  const [f, setF] = useState<Record<string, string>>({
    name: "", start: local(new Date(now.getTime() + 15 * 60000)), end: local(new Date(now.getTime() + 7 * 86400000)),
    code: "", voucher_type: "shop", reward_type: "fix_amount", discount_amount: "", percentage: "", max_price: "", min_basket_price: "", usage_quantity: "100",
    rule_type: "percentage", value: "", min_amount: "2", purchase_limit: "", date: local(now).slice(0, 10), activate: "1",
    ...initial,
  });
  const [items, setItems] = useState<PickItem[]>(initialItems ?? []);
  const [main, setMain] = useState<PickItem[]>(initialMain ?? []);
  const [slots, setSlots] = useState<{ id: number; start_time: number; end_time: number }[] | null>(null);
  const [slot, setSlot] = useState(0);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const timed = type !== "flash" && type !== "top_picks";

  useEffect(() => {
    if (type !== "flash") return;
    setSlots(null); setSlot(0);
    api<{ slots: typeof slots }>(`/marketplace/promotions/flash/slots?shop_id=${shopId}&date=${f.date}`).then((r) => setSlots(r.slots ?? [])).catch((e) => { setSlots([]); showAlert(e instanceof ApiError ? e.message : "Gagal mengambil slot", "Gagal"); });
  }, [type, shopId, f.date]);

  const submit = async () => {
    const body: Record<string, unknown> = { shop_id: shopId, name: f.name || undefined };
    if (timed) Object.assign(body, { start_time: toUnix(f.start), end_time: toUnix(f.end) });
    if (type === "discount") body.items = payloadItems(items).map((i) => ({ ...i, models: i.models.filter((m) => m.price) }));
    if (type === "voucher") Object.assign(body, { code: f.code, voucher_type: f.voucher_type, reward_type: f.reward_type, usage_quantity: Number(f.usage_quantity), min_basket_price: Number(f.min_basket_price || 0),
      discount_amount: f.reward_type === "fix_amount" ? Number(f.discount_amount) : undefined, percentage: f.reward_type === "percentage" ? Number(f.percentage) : undefined,
      max_price: f.max_price ? Number(f.max_price) : undefined, items: f.voucher_type === "product" ? payloadItems(items) : undefined });
    if (type === "bundle") Object.assign(body, { rule_type: f.rule_type, value: Number(f.value), min_amount: Number(f.min_amount), purchase_limit: Number(f.purchase_limit || 0), items: payloadItems(items) });
    if (type === "addon") Object.assign(body, { main_items: main.map((i) => ({ item_id: i.item_id })), purchase_limit: Number(f.purchase_limit || 1), items: payloadItems(items).map((i) => ({ ...i, models: i.models.filter((m) => m.price) })) });
    if (type === "flash") Object.assign(body, { timeslot_id: slot, items: payloadItems(items, true) });
    if (type === "top_picks") Object.assign(body, { activate: f.activate === "1", items: items.map((i) => ({ item_id: i.item_id })) });
    setBusy(true);
    try {
      const r = await api<{ id: string; warnings: string[] }>(`/marketplace/promotions/${type}`, { method: "POST", json: body });
      onCreated(r.warnings ?? []);
    } catch (e) {
      const err = e instanceof ApiError ? Object.values(e.errors ?? {}).flat()[0] ?? e.message : "Gagal membuat promosi";
      showAlert(err, "Gagal");
    } finally { setBusy(false); }
  };

  const input = (k: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => <input className="input h-9 w-full" value={f[k]} onChange={(e) => set(k, props.inputMode === "numeric" ? digits(e.target.value) : e.target.value)} {...props} />;

  return (
    <Modal open onClose={onClose} title={TITLE[type]} wide>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {type !== "flash" && <L label={type === "top_picks" ? "Nama koleksi (maks. 24 karakter)" : "Nama promosi (tidak terlihat pembeli)"}>{input("name", { maxLength: type === "top_picks" ? 24 : 100 })}</L>}
          {timed && <>
            <L label="Mulai">{input("start", { type: "datetime-local" })}</L>
            <L label="Berakhir" hint={type === "voucher" ? "Maks. 3 bulan" : "Maks. 180 hari"}>{input("end", { type: "datetime-local" })}</L>
          </>}
        </div>

        {type === "voucher" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <L label="Kode voucher (maks. 5 huruf/angka)" hint="Shopee menambahkan awalan kode toko">{input("code", { maxLength: 5 })}</L>
            <L label="Berlaku untuk"><select className="input h-9 w-full" value={f.voucher_type} onChange={(e) => set("voucher_type", e.target.value)}><option value="shop">Semua produk (Voucher Toko)</option><option value="product">Produk tertentu</option></select></L>
            <L label="Jenis potongan"><select className="input h-9 w-full" value={f.reward_type} onChange={(e) => set("reward_type", e.target.value)}><option value="fix_amount">Potongan Rp</option><option value="percentage">Diskon %</option></select></L>
            {f.reward_type === "fix_amount" ? <L label="Potongan (Rp)">{input("discount_amount", { inputMode: "numeric" })}</L> : <>
              <L label="Diskon (%)">{input("percentage", { inputMode: "numeric" })}</L>
              <L label="Maks. potongan (Rp, opsional)">{input("max_price", { inputMode: "numeric" })}</L>
            </>}
            <L label="Min. belanja (Rp)">{input("min_basket_price", { inputMode: "numeric" })}</L>
            <L label="Kuota pemakaian">{input("usage_quantity", { inputMode: "numeric" })}</L>
          </div>
        )}

        {type === "bundle" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <L label="Beli minimal (pcs)">{input("min_amount", { inputMode: "numeric" })}</L>
            <L label="Jenis paket"><select className="input h-9 w-full" value={f.rule_type} onChange={(e) => set("rule_type", e.target.value)}><option value="percentage">Diskon %</option><option value="discount_value">Potongan Rp</option><option value="fix_price">Harga paket Rp</option></select></L>
            <L label={f.rule_type === "percentage" ? "Diskon (%)" : f.rule_type === "fix_price" ? "Harga paket (Rp)" : "Potongan (Rp)"}>{input("value", { inputMode: "numeric" })}</L>
            <L label="Batas paket per pembeli (0 = bebas)">{input("purchase_limit", { inputMode: "numeric" })}</L>
          </div>
        )}

        {type === "flash" && (
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <L label="Tanggal">{input("date", { type: "date" })}</L>
            <L label="Slot jam dari Shopee">
              {slots === null ? <p className="flex h-9 items-center gap-2 text-xs text-slate-400"><Loader2 size={13} className="animate-spin" />Mengambil slot…</p>
                : !slots.length ? <p className="flex h-9 items-center text-xs text-slate-500">Tidak ada slot kosong di tanggal ini.</p>
                : <div className="flex flex-wrap gap-1.5">{slots.map((s) => {
                  const t = (x: number) => new Date(x * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                  return <button type="button" key={s.id} onClick={() => setSlot(s.id)} className={`h-9 rounded-lg border px-3 text-xs font-semibold ${slot === s.id ? "border-[#ee4d2d] bg-orange-50 text-[#ee4d2d]" : "border-slate-200 text-slate-600"}`}>{t(s.start_time)}–{t(s.end_time)}</button>;
                })}</div>}
            </L>
          </div>
        )}

        {type === "addon" && (
          <>
            <div><b className="mb-1 block text-sm text-navy">1. Produk utama</b><p className="mb-2 text-xs text-slate-500">Pembeli produk ini ditawari produk tambahan dengan harga khusus.</p>
              <ProductPicker shopId={shopId} value={main} onChange={setMain} /></div>
            <b className="block text-sm text-navy">2. Produk tambahan & harganya</b>
          </>
        )}
        {type === "top_picks" && <p className="text-xs text-slate-500">Pilih 4–8 produk yang tampil di bagian &quot;Produk Unggulan&quot; halaman toko. Hanya satu koleksi yang bisa aktif.</p>}

        {(type !== "voucher" || f.voucher_type === "product") && (
          <ProductPicker shopId={shopId} value={items} onChange={setItems}
            prices={type === "discount" || type === "flash" || type === "addon" ? "promo" : false} stock={type === "flash"} max={type === "top_picks" ? 8 : undefined} />
        )}
        {type === "addon" && <L label="Maks. produk tambahan per pembelian">{input("purchase_limit", { inputMode: "numeric", placeholder: "1" })}</L>}
        {type === "top_picks" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.activate === "1"} onChange={(e) => set("activate", e.target.checked ? "1" : "0")} className="accent-[#ee4d2d]" />Langsung aktifkan</label>}

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">Promosi dibuat langsung di Shopee dan tampil di Seller Centre.</p>
          <button onClick={submit} disabled={busy || (type === "flash" && !slot)} className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={15} className="animate-spin" />}Buat di Shopee</button>
        </div>
      </div>
    </Modal>
  );
}
