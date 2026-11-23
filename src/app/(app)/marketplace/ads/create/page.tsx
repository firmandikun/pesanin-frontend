"use client";
import { Check, Loader2, Megaphone, Plus, Search, Sparkles, Store, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageHead, Panel } from "@/components/kit";
import { RoasCalculatorSection } from "@/components/marketplace/RoasCalculatorSection";
import { Select } from "@/components/Select";
import { Modal } from "@/components/ui";
import { api, ApiError, rupiah } from "@/lib/api";

type AdShop = { id: number; shop_name: string };
type AdProduct = {
  item_id: number;
  name: string;
  sku: string | null;
  image: string | null;
  price: number;
  cost_price: number;
  stock: number;
  recommended: boolean;
  already_advertised: boolean;
};

const BUDGET_PRESETS = [25000, 50000, 100000, 200000];

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CreateShopeeAdPage />
    </Suspense>
  );
}

/**
 * Buat Iklan Produk Shopee: laid out like Shopee Seller Centre's 3-panel flow
 * (Mode Pemilihan → Strategi Iklan → Modal & Durasi).
 */
function CreateShopeeAdPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialShop = sp.get("shop") || "";

  const [shops, setShops] = useState<AdShop[]>([]);
  const [shopId, setShopId] = useState(initialShop);
  const [products, setProducts] = useState<AdProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Panel 1: Mode Pemilihan
  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState("");
  const [onlyRec, setOnlyRec] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Panel 2: Strategi Iklan
  const [bidding, setBidding] = useState<"auto" | "roas">("roas");
  const [targets, setTargets] = useState<Record<number, string>>({});
  const [shopFeePct, setShopFeePct] = useState(0);
  const [suggests, setSuggests] = useState<Record<number, { budget_suggested: number | null; roi_suggested: number | null; category_name?: string | null }>>({});

  // Panel 3: Modal & Durasi
  const [budgetMode, setBudgetMode] = useState<"unlimited" | "daily">("daily");
  const [budget, setBudget] = useState("50000");
  const [periodMode, setPeriodMode] = useState<"unlimited" | "custom">("unlimited");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");

  const loadOptions = useCallback((sid?: string) => {
    setLoading(true);
    setErr("");
    const qs = sid ? `?shop_id=${encodeURIComponent(sid)}` : "";
    api<{ shops: AdShop[]; shop_id?: number; shop_fee_pct?: number; products: AdProduct[] }>(`/marketplace/ads/create/options${qs}`)
      .then((r) => {
        setShops(r.shops);
        if (r.shop_id) setShopId(String(r.shop_id));
        setShopFeePct(r.shop_fee_pct ?? 0);
        setProducts(r.products);
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat produk toko Shopee."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOptions(initialShop || undefined);
  }, [initialShop, loadOptions]);

  // Fetch Shopee ROI & budget suggestion for newly selected items.
  useEffect(() => {
    if (!shopId || !selectedIds.length) return;
    selectedIds.forEach((id) => {
      if (suggests[id]) return;
      api<{ budget_suggested: number | null; roi_suggested: number | null; category_name?: string | null }>(
        `/marketplace/ads/create/suggest?shop_id=${shopId}&item_id=${id}&bidding_method=auto`,
      )
        .then((res) => setSuggests((cur) => ({ ...cur, [id]: res })))
        .catch(() => {});
    });
  }, [shopId, selectedIds, suggests]);

  const selectedProducts = useMemo(
    () => selectedIds.map((id) => products.find((p) => p.item_id === id)).filter((x): x is AdProduct => !!x),
    [selectedIds, products],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (onlyRec && !p.recommended) return false;
      if (needle && !p.name.toLowerCase().includes(needle) && !(p.sku ?? "").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [products, q, onlyRec]);

  const toggleItem = (id: number) => {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 30 ? cur : [...cur, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !selectedIds.length || busy) return;
    setBusy(true);
    setErr("");
    try {
      await api("/marketplace/ads/create", {
        method: "POST",
        json: {
          shop_id: Number(shopId),
          ad_mode: "individual",
          item_ids: selectedIds,
          bidding_method: bidding,
          budget_mode: budgetMode,
          budget: budgetMode === "daily" ? Math.max(25000, Number(budget) || 0) : undefined,
          targets: bidding === "roas"
            ? Object.fromEntries(Object.entries(targets).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)]))
            : undefined,
          start_date: periodMode === "custom" ? startDate || undefined : undefined,
          end_date: periodMode === "custom" ? endDate || undefined : undefined,
        },
      });
      router.push(`/marketplace/ads?shop=${shopId}&created=1`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Gagal menerbitkan iklan ke Shopee.");
    } finally {
      setBusy(false);
    }
  };

  const recCount = products.filter((p) => p.recommended).length;

  return (
    <form onSubmit={submit} className="space-y-4 pb-20">
      <PageHead title="Buat Iklan Produk" tutorial={false} crumbs={[["Marketplace"], ["Iklan Shopee", "/marketplace/ads"], ["Buat Iklan Produk"]]}>
        {shops.length > 1 && (
          <Select
            className="input h-10 w-52 bg-white"
            value={shopId}
            onChange={(e) => {
              setShopId(e.target.value);
              setSelectedIds([]);
              loadOptions(e.target.value);
            }}
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.shop_name}</option>
            ))}
          </Select>
        )}
      </PageHead>

      {err && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{err}</div>}

      {/* Panel 1: Mode Pemilihan */}
      <Panel className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-[15px] font-bold text-slate-800">Mode Pemilihan</h2>
          <span className="text-xs text-slate-400">Pilih cara pengelompokan produk iklan</span>
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-start">
          <label className="pt-2 text-xs font-medium text-slate-600">Mode Pemilihan Produk</label>
          <div className="flex items-start gap-3 rounded-xl border border-[#ee4d2d] bg-orange-50/30 p-4 ring-1 ring-[#ee4d2d] sm:max-w-md">
            <div className="flex-1">
              <b className="block text-sm text-slate-800">Iklan Individual</b>
              <p className="mt-1 text-xs text-slate-500">Iklankan produk satu per satu berdasarkan target ROAS &amp; tujuanmu.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ee4d2d]"><Megaphone size={20} /></span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
          <label className="text-xs font-medium text-slate-600">Pilih Produk</label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={loading || !shops.length}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#ee4d2d] bg-white px-4 text-xs font-semibold text-[#ee4d2d] hover:bg-orange-50 disabled:opacity-50"
            >
              <Plus size={15} /> Tambah Produk
            </button>
            <span className="text-xs text-slate-500"><b>{selectedIds.length}</b> / 30 produk dipilih</span>
          </div>
        </div>
      </Panel>

      {/* Panel 2: Kalkulator ROAS & Simulasi Margin Cuan */}
      <RoasCalculatorSection
        products={selectedProducts}
        shopFeePct={shopFeePct}
        suggests={suggests}
        onApplyRoas={(itemId, roas) => {
          setBidding("roas");
          setTargets((cur) => ({ ...cur, [itemId]: String(roas) }));
        }}
      />

      {/* Panel 3: Strategi Iklan */}
      <Panel className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-[15px] font-bold text-slate-800">Strategi Iklan</h2>
          <span className="text-xs text-slate-400">Pilih mode bidding dan Target ROAS</span>
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-start">
          <label className="pt-2 text-xs font-medium text-slate-600">Mode Bidding</label>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setBidding("auto")}
                className={`rounded-xl border p-4 text-left transition ${bidding === "auto" ? "border-[#ee4d2d] bg-orange-50/30 ring-1 ring-[#ee4d2d]" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <b className="block text-sm text-slate-800">GMV Max Auto</b>
                <p className="mt-1 text-xs text-slate-500">Maksimalkan penjualan dengan mempertahankan ROAS 7 hari setelah Tahap Adaptasi.</p>
              </button>

              <button
                type="button"
                onClick={() => setBidding("roas")}
                className={`rounded-xl border p-4 text-left transition ${bidding === "roas" ? "border-[#ee4d2d] bg-orange-50/30 ring-1 ring-[#ee4d2d]" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <b className="block text-sm text-slate-800">GMV Max ROAS</b>
                <p className="mt-1 text-xs text-slate-500">Capai 80–120% dari Target ROAS 7 hari setelah Tahap Adaptasi.</p>
              </button>
            </div>

            {/* Selected Products Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Produk</th>
                    <th className="px-4 py-2.5 font-medium">Target ROAS</th>
                    <th className="px-4 py-2.5 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {!selectedProducts.length ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                        Pilih produk terlebih dahulu dengan tombol <b>+ Tambah Produk</b> di atas.
                      </td>
                    </tr>
                  ) : (
                    selectedProducts.map((p) => {
                      const sg = suggests[p.item_id];
                      return (
                        <tr key={p.item_id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {p.image ? <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" /> : <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-100" />}
                              <div className="min-w-0">
                                <p className="max-w-[280px] truncate font-semibold text-slate-800">{p.name}</p>
                                <p className="text-[11px] text-slate-400">{rupiah(p.price)} · Stok {p.stock}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {bidding === "auto" ? (
                              <span className="text-slate-500">Otomatis Shopee</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.5"
                                  max="100"
                                  placeholder="mis. 6.0"
                                  value={targets[p.item_id] ?? ""}
                                  onChange={(e) => setTargets((cur) => ({ ...cur, [p.item_id]: e.target.value }))}
                                  className="input h-8 w-24 text-xs"
                                />
                                {sg?.roi_suggested && (
                                  <button
                                    type="button"
                                    onClick={() => setTargets((cur) => ({ ...cur, [p.item_id]: String(sg.roi_suggested) }))}
                                    className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-[#ee4d2d] hover:bg-orange-100"
                                  >
                                    Saran {sg.roi_suggested}x
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => toggleItem(p.item_id)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Hapus">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400">Untuk hasil yang optimal, hindari mengubah pengaturan Target ROAS selama 7 hari pertama setelah iklan diaktifkan.</p>
          </div>
        </div>
      </Panel>

      {/* Panel 3: Modal & Durasi */}
      <Panel className="space-y-5 p-5 sm:p-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-[15px] font-bold text-slate-800">Modal &amp; Durasi</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-start">
          <label className="pt-1 text-xs font-medium text-slate-600">Modal</label>
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-700">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="budgetMode" checked={budgetMode === "unlimited"} onChange={() => setBudgetMode("unlimited")} />
                Tak Terbatas
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="budgetMode" checked={budgetMode === "daily"} onChange={() => setBudgetMode("daily")} />
                Atur Modal Harian (per produk)
              </label>
            </div>
            {budgetMode === "daily" && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={25000}
                  step={5000}
                  required
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="input h-9 w-40 text-sm font-semibold"
                />
                {BUDGET_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setBudget(String(p))}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${Number(budget) === p ? "bg-[#ee4d2d] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {rupiah(p)}
                  </button>
                ))}
                {selectedIds[0] && suggests[selectedIds[0]]?.budget_suggested && (
                  <button
                    type="button"
                    onClick={() => setBudget(String(suggests[selectedIds[0]].budget_suggested))}
                    className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                  >
                    Saran: {rupiah(suggests[selectedIds[0]].budget_suggested!)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-start">
          <label className="pt-1 text-xs font-medium text-slate-600">Periode Iklan</label>
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-700">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="periodMode" checked={periodMode === "unlimited"} onChange={() => setPeriodMode("unlimited")} />
                Tidak Terbatas
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="periodMode" checked={periodMode === "custom"} onChange={() => setPeriodMode("custom")} />
                Atur periode iklan
              </label>
            </div>
            {periodMode === "custom" && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input h-9 text-xs" />
                <span className="text-slate-400">s/d</span>
                <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="input h-9 text-xs" />
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <Link href="/marketplace/ads" className="flex h-10 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Batal
        </Link>
        <button
          type="submit"
          disabled={busy || !selectedIds.length || (budgetMode === "daily" && Number(budget) < 25000)}
          className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-6 text-sm font-semibold text-white hover:bg-[#d73211] disabled:opacity-50"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Tampilkan
        </button>
      </div>

      {/* Product Picker Modal */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Pilih Produk untuk Diiklankan" icon={Store} wide>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama produk atau SKU…" className="input h-9 w-full pl-8 text-xs" />
            </div>
            {recCount > 0 && (
              <button
                type="button"
                onClick={() => setOnlyRec((v) => !v)}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${onlyRec ? "bg-[#ee4d2d] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                <Sparkles size={13} /> Rekomendasi Shopee ({recCount})
              </button>
            )}
          </div>

          <div className="max-h-[52vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" />Memuat produk…</p>
            ) : !filtered.length ? (
              <p className="py-10 text-center text-xs text-slate-400">Tidak ada produk yang cocok.</p>
            ) : (
              filtered.map((p) => {
                const checked = selectedIds.includes(p.item_id);
                return (
                  <button
                    key={p.item_id}
                    type="button"
                    onClick={() => toggleItem(p.item_id)}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition ${checked ? "bg-orange-50/70" : "hover:bg-slate-50"}`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-[#ee4d2d] bg-[#ee4d2d] text-white" : "border-slate-300 bg-white"}`}>
                      {checked && <Check size={11} strokeWidth={3} />}
                    </span>
                    {p.image ? <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{p.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span>{rupiah(p.price)}</span>
                        <span>· Stok {p.stock}</span>
                        {p.recommended && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Rekomendasi Shopee</span>}
                        {p.already_advertised && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Sedang Diiklankan</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">{selectedIds.length} / 30 produk dipilih</span>
            <button type="button" onClick={() => setPickerOpen(false)} className="h-9 rounded-lg bg-[#ee4d2d] px-5 text-xs font-semibold text-white hover:bg-[#d73211]">
              Selesai
            </button>
          </div>
        </div>
      </Modal>
    </form>
  );
}
