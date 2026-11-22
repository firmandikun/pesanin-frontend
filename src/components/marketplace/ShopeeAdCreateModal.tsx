"use client";
import { Calendar, Check, Loader2, Megaphone, Search, Sparkles, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  stock: number;
  recommended: boolean;
  already_advertised: boolean;
};

const BUDGET_PRESETS = [25000, 50000, 100000, 200000];

/**
 * Modal "+ Buat Iklan Shopee": pilih toko & produk (dengan badge Rekomendasi Shopee),
 * strategi bidding (GMV Max / Manual + saran ROAS & budget), dan modal harian.
 */
export function ShopeeAdCreateModal({
  open,
  initialShopId,
  onClose,
  onCreated,
}: {
  open: boolean;
  initialShopId?: string;
  onClose: () => void;
  onCreated: (msg: string) => void;
}) {
  const [shops, setShops] = useState<AdShop[]>([]);
  const [shopId, setShopId] = useState("");
  const [products, setProducts] = useState<AdProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [onlyRec, setOnlyRec] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bidding, setBidding] = useState<"auto" | "manual">("auto");
  const [budget, setBudget] = useState("50000");
  const [roasTarget, setRoasTarget] = useState("");
  const [noLimit, setNoLimit] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [suggest, setSuggest] = useState<{ budget_suggested: number | null; roi_suggested: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadOptions = useCallback((sid?: string) => {
    setLoading(true);
    setErr("");
    const qs = sid ? `?shop_id=${encodeURIComponent(sid)}` : "";
    api<{ shops: AdShop[]; shop_id?: number; products: AdProduct[] }>(`/marketplace/ads/create/options${qs}`)
      .then((r) => {
        setShops(r.shops);
        if (r.shop_id) setShopId(String(r.shop_id));
        setProducts(r.products);
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat produk toko."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedIds([]);
    setSuggest(null);
    setErr("");
    loadOptions(initialShopId);
  }, [open, initialShopId, loadOptions]);

  const firstSelected = selectedIds[0];
  useEffect(() => {
    if (!open || !shopId || !firstSelected) { setSuggest(null); return; }
    api<{ budget_suggested: number | null; roi_suggested: number | null }>(
      `/marketplace/ads/create/suggest?shop_id=${shopId}&item_id=${firstSelected}&bidding_method=${bidding}`,
    )
      .then(setSuggest)
      .catch(() => setSuggest(null));
  }, [open, shopId, firstSelected, bidding]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (onlyRec && !p.recommended) return false;
      if (needle && !p.name.toLowerCase().includes(needle) && !(p.sku ?? "").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [products, q, onlyRec]);

  const toggleItem = (id: number) => {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 20 ? cur : [...cur, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !selectedIds.length || busy) return;
    const budgetNum = Math.max(25000, Number(budget) || 0);
    setBusy(true);
    setErr("");
    try {
      await api("/marketplace/ads/create", {
        method: "POST",
        json: {
          shop_id: Number(shopId),
          item_ids: selectedIds,
          bidding_method: bidding,
          budget: budgetNum,
          roas_target: bidding === "auto" && roasTarget ? Number(roasTarget) : undefined,
          start_date: noLimit ? undefined : startDate || undefined,
          end_date: noLimit ? undefined : endDate || undefined,
        },
      });
      onCreated(`Iklan Shopee untuk ${selectedIds.length} produk berhasil dibuat.`);
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Gagal membuat iklan di Shopee.");
    } finally {
      setBusy(false);
    }
  };

  const recCount = products.filter((p) => p.recommended).length;

  return (
    <Modal open={open} onClose={onClose} title="Buat Iklan Produk Shopee" icon={Megaphone} wide>
      <form onSubmit={submit} className="space-y-4">
        {err && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">{err}</p>}

        {/* Step 1: Toko & Pilih Produk */}
        <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
              <Store size={14} className="text-[#ee4d2d]" /> 1. Pilih Toko &amp; Produk
            </span>
            {shops.length > 1 && (
              <Select
                className="input h-8 w-48 bg-white text-xs"
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama produk atau SKU…"
                className="input h-9 w-full bg-white pl-8 text-xs"
              />
            </div>
            {recCount > 0 && (
              <button
                type="button"
                onClick={() => setOnlyRec((v) => !v)}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${onlyRec ? "bg-[#ee4d2d] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
              >
                <Sparkles size={13} /> Rekomendasi Shopee ({recCount})
              </button>
            )}
          </div>

          <div className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" />Memuat produk toko…</p>
            ) : !shops.length ? (
              <p className="py-8 text-center text-xs text-slate-400">Hubungkan toko Shopee aktif terlebih dahulu.</p>
            ) : !filtered.length ? (
              <p className="py-8 text-center text-xs text-slate-400">Tidak ada produk yang cocok.</p>
            ) : (
              filtered.map((p) => {
                const checked = selectedIds.includes(p.item_id);
                return (
                  <button
                    key={p.item_id}
                    type="button"
                    onClick={() => toggleItem(p.item_id)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${checked ? "bg-orange-50/70" : "hover:bg-slate-50"}`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-[#ee4d2d] bg-[#ee4d2d] text-white" : "border-slate-300 bg-white"}`}>
                      {checked && <Check size={11} strokeWidth={3} />}
                    </span>
                    {p.image ? (
                      <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 object-cover" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100" />
                    )}
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
          <p className="text-[11px] text-slate-500">Dipilih: <b>{selectedIds.length}</b> produk (maks. 20 produk per kampanye).</p>
        </div>

        {/* Step 2: Strategi Bidding */}
        <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">2. Strategi Bidding</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setBidding("auto")}
              className={`rounded-xl border p-3 text-left transition ${bidding === "auto" ? "border-[#ee4d2d] bg-white ring-1 ring-[#ee4d2d]" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <div className="flex items-center justify-between">
                <b className="text-xs text-slate-800">GMV Max / Otomatis</b>
                <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#ee4d2d]">Direkomendasikan</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Shopee mengoptimalkan bid otomatis untuk memaksimalkan omzet sesuai target ROAS.</p>
            </button>
            <button
              type="button"
              onClick={() => setBidding("manual")}
              className={`rounded-xl border p-3 text-left transition ${bidding === "manual" ? "border-[#ee4d2d] bg-white ring-1 ring-[#ee4d2d]" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <b className="block text-xs text-slate-800">Manual</b>
              <p className="mt-1 text-[11px] text-slate-500">Bid &amp; kata kunci diatur manual untuk kontrol penuh per klik.</p>
            </button>
          </div>

          {bidding === "auto" && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="text-xs font-medium text-slate-600">Target ROAS (opsional):</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="100"
                placeholder="Otomatis Shopee"
                value={roasTarget}
                onChange={(e) => setRoasTarget(e.target.value)}
                className="input h-8 w-36 bg-white text-xs"
              />
              {suggest?.roi_suggested && (
                <button
                  type="button"
                  onClick={() => setRoasTarget(String(suggest.roi_suggested))}
                  className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#ee4d2d] hover:bg-orange-100"
                >
                  Pakai saran Shopee: {suggest.roi_suggested}x
                </button>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Modal & Jadwal */}
        <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">3. Modal &amp; Periode Iklan</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">Modal Harian (min. Rp25.000)</label>
              <input
                type="number"
                min={25000}
                step={5000}
                required
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="input h-9 w-full bg-white text-sm font-semibold"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-4">
              {BUDGET_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBudget(String(p))}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${Number(budget) === p ? "bg-[#ee4d2d] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
                >
                  {rupiah(p)}
                </button>
              ))}
              {suggest?.budget_suggested && (
                <button
                  type="button"
                  onClick={() => setBudget(String(suggest.budget_suggested))}
                  className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
                >
                  Saran: {rupiah(suggest.budget_suggested)}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
              <input type="checkbox" checked={noLimit} onChange={(e) => setNoLimit(e.target.checked)} />
              <Calendar size={13} className="text-slate-400" /> Tanpa batas waktu (berjalan terus sampai dijeda)
            </label>
            {!noLimit && (
              <div className="flex items-center gap-2 text-xs">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input h-8 bg-white text-xs" />
                <span className="text-slate-400">s/d</span>
                <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="input h-8 bg-white text-xs" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-500">
            {selectedIds.length ? `${selectedIds.length} produk · Modal ${rupiah(Number(budget) || 0)}/hari · ${bidding === "auto" ? "GMV Max" : "Manual"}` : "Pilih minimal 1 produk untuk mulai beriklan."}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
            <button
              type="submit"
              disabled={busy || !selectedIds.length || Number(budget) < 25000}
              className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-5 text-sm font-semibold text-white hover:bg-[#d73211] disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />}
              Terbitkan Iklan
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
