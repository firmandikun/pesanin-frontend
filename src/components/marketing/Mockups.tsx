import { Bell, CheckCircle2, FileSpreadsheet, MessageCircle, RefreshCcw, TrendingUp, Truck } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { ShopeeMark } from "@/components/ChannelBadge";
import { LogoMark } from "@/components/Logo";

const Frame = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-2xl shadow-navy/10">
    <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
      <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      <span className="ml-2 flex-1 text-xs font-semibold text-slate-500">{title}</span>{right}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Live = () => <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"><RefreshCcw size={10} />Sinkron 30 dtk</span>;

/** Hero: connected channels + the money picture of the month. */
export function HeroDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <Frame title="Dashboard Pesanin" right={<Live />}>
        <div className="grid grid-cols-3 gap-2">
          {[["Omzet", "Rp156,8 jt", "text-navy"], ["Laba bersih", "Rp48,3 jt", "text-emerald-600"], ["Margin", "30,8%", "text-brand-600"]].map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-[10px] text-slate-500">{l}</p><p className={`mt-0.5 text-base font-extrabold ${c}`}>{v}</p></div>
          ))}
        </div>
        <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dari omzet ke laba</p>
        <div className="flex h-16 items-stretch gap-1 overflow-hidden rounded-xl text-[10px] font-semibold text-white">
          {[["Omzet", "100%", "bg-emerald-500", 34], ["HPP", "38%", "bg-rose-400", 22], ["Potongan", "17%", "bg-orange-400", 16], ["Iklan", "9%", "bg-violet-400", 12], ["Laba", "31%", "bg-green-600", 16]].map(([l, p, c, w]) => (
            <div key={l as string} className={`flex flex-col justify-center px-2 ${c}`} style={{ flex: w as number }}><span className="opacity-80">{l}</span><b className="text-xs">{p}</b></div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {[["Toko Fashion Official", "1.204 pesanan"], ["Beauty Care Store", "842 pesanan"]].map(([n, s]) => (
            <div key={n} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
              <ShopeeMark size={28} /><div className="flex-1"><b className="block text-xs text-navy">{n}</b><span className="text-[11px] text-slate-500">{s} · Shopee</span></div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CheckCircle2 size={14} />Terhubung</span>
            </div>
          ))}
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
            <LogoMark size={28} />
            <div className="flex-1"><b className="block text-xs text-navy">Checkout Web & Landing Page</b><span className="flex items-center gap-1 text-[11px] text-slate-500">318 pesanan · <BrandIcon name="instagram" size={11} /><BrandIcon name="tiktok" size={11} /><BrandIcon name="meta" size={11} /><BrandIcon name="whatsapp" size={11} /></span></div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CheckCircle2 size={14} />Aktif</span>
          </div>
        </div>
      </Frame>
      <div className="absolute -left-8 -top-5 hidden animate-[float_6s_ease-in-out_infinite] rounded-2xl bg-navy px-4 py-2.5 text-xs font-semibold text-white shadow-xl sm:block">
        <span className="flex items-center gap-2"><Bell size={14} />Pesanan Shopee baru · Rp129.000</span>
      </div>
      <div className="absolute -bottom-5 -right-6 hidden animate-[float_7s_ease-in-out_1.5s_infinite] rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-navy shadow-xl ring-1 ring-slate-100 sm:block">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />Potongan Shopee terbaca otomatis</span>
      </div>
    </div>
  );
}

/** One Shopee order: what the buyer paid vs what lands in the seller's balance. */
export function IncomeMockup() {
  const lines: [string, number][] = [["Biaya Admin", -1885], ["Biaya Layanan", -1257], ["Biaya Pemrosesan Pesanan", -1250], ["Ongkir Aktual", -3500], ["Subsidi Ongkir Shopee", 3500], ["Pajak Pemotongan", -114]];
  const rp = (n: number) => `${n < 0 ? "− " : "+ "}Rp${Math.abs(n).toLocaleString("id-ID")}`;
  return (
    <Frame title="Rincian penghasilan · 2611124FQU1SJJ">
      <div className="flex items-center justify-between">
        <div><p className="text-xs text-slate-500">Harga produk</p><p className="text-lg font-extrabold text-navy">Rp22.850</p></div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Estimasi penghasilan</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {lines.map(([l, v]) => <div key={l} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] text-slate-500">{l}</p><p className={`text-sm font-bold ${v < 0 ? "text-rose-600" : "text-emerald-600"}`}>{rp(v)}</p></div>)}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-dashed border-slate-200 pt-3 text-center">
        <div><p className="text-[10px] text-slate-500">Pendapatan</p><p className="text-sm font-extrabold text-blue-600">Rp18.344</p></div>
        <div><p className="text-[10px] text-slate-500">HPP</p><p className="text-sm font-extrabold text-orange-600">Rp5.000</p></div>
        <div><p className="text-[10px] text-slate-500">Laba</p><p className="text-sm font-extrabold text-emerald-600">Rp13.344</p></div>
      </div>
    </Frame>
  );
}

export function ProfitMockup() {
  const rows: [string, string, string][] = [["Omzet", "Rp45,2 jt", "text-navy"], ["Potongan marketplace", "− Rp7,9 jt", "text-rose-600"], ["HPP produk", "− Rp18,4 jt", "text-rose-600"], ["Biaya iklan (+PPN)", "− Rp6,1 jt", "text-rose-600"], ["Biaya operasional", "− Rp4,7 jt", "text-rose-600"]];
  return (
    <Frame title="Laba bersih · November">
      <div className="space-y-2.5 text-sm">
        {rows.map(([l, v, c]) => <div key={l} className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-600">{l}</span><b className={c}>{v}</b></div>)}
        <div className="flex justify-between rounded-xl bg-emerald-50 px-3 py-2.5"><b className="text-navy">Laba bersih</b><b className="text-emerald-600">Rp8,1 jt · 17,9%</b></div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
        {[["HPP belum diisi", "3 SKU", "bg-amber-50 text-amber-700"], ["Retur", "24", "bg-rose-50 text-rose-700"], ["Produk rugi", "1", "bg-slate-100 text-slate-700"]].map(([l, v, c]) => <div key={l} className={`rounded-xl px-2 py-2 ${c}`}><b className="block text-sm">{v}</b>{l}</div>)}
      </div>
    </Frame>
  );
}

export function AdsMockup() {
  const bars = [42, 55, 48, 70, 62, 80, 74, 88, 66, 92, 84, 96];
  return (
    <Frame title="Iklan & ROAS · 30 hari">
      <div className="grid grid-cols-3 gap-2">
        {[["Biaya iklan", "Rp6,1 jt"], ["Penjualan iklan", "Rp41,8 jt"], ["ROAS", "6,9×"]].map(([l, v]) => <div key={l} className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-[10px] text-slate-500">{l}</p><p className="mt-0.5 text-base font-extrabold text-navy">{v}</p></div>)}
      </div>
      <div className="mt-4 flex h-20 items-end gap-1">{bars.map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === bars.length - 1 ? "var(--color-brand-500)" : "#e2e8f0" }} />)}</div>
      <div className="mt-4 space-y-2 text-xs">
        {([["shopee", "Shopee Ads · Cover knalpot", "ROAS 9,2×", "text-emerald-600"], ["meta", "Meta Ads · Toner Lemon", "ROAS 4,1×", "text-emerald-600"], ["shopee", "Shopee Ads · Helm retro", "ROAS 1,3×", "text-rose-600"]] as const).map(([b, l, v, c]) => <div key={l} className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-600">{b === "shopee" ? <ShopeeMark size={14} /> : <BrandIcon name={b} size={14} />}{l}</span><b className={c}>{v}</b></div>)}
      </div>
    </Frame>
  );
}

export function ReportMockup() {
  return (
    <Frame title="Laporan Laba Rugi · Januari" right={<span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><FileSpreadsheet size={13} />Excel · PDF</span>}>
      <div className="space-y-2 text-sm">
        {[["Pendapatan penjualan", "Rp82.400.000"], ["Potongan marketplace", "(Rp13.900.000)"], ["Harga pokok penjualan", "(Rp31.200.000)"], ["Laba kotor", "Rp37.300.000"], ["Biaya iklan", "(Rp4.600.000)"], ["Biaya operasional", "(Rp3.100.000)"]].map(([l, v], i) => (
          <div key={l} className={`flex justify-between ${i === 3 ? "border-t border-slate-200 pt-2 font-bold text-navy" : "text-slate-600"}`}><span>{l}</span><span>{v}</span></div>
        ))}
        <div className="flex justify-between rounded-xl bg-navy px-3 py-2.5 font-bold text-white"><span>Laba bersih</span><span>Rp29.600.000 · 35,9%</span></div>
      </div>
    </Frame>
  );
}

export function CheckoutMockup() {
  return (
    <Frame title="pesanin.id/c/toner-lemon">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl">🍋</span>
        <div><p className="font-bold text-navy">Toner Lemon Brightening</p><p className="text-sm text-slate-500"><s>Rp189.000</s> <b className="text-brand-600">Rp149.000</b></p></div>
      </div>
      <div className="mt-4 space-y-2">{["Rina Kartika · 0812 3456 7890", "Coblong, Kota Bandung"].map((l) => <div key={l} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-medium text-navy">{l}</div>)}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {([["jne", "JNE REG", "Rp12.000"], ["sicepat", "SiCepat", "Rp11.000"], ["jnt", "J&T · COD", "Bayar di tempat"]] as const).map(([b, k, v], i) => <div key={k} className={`rounded-xl px-2.5 py-2 ${i === 0 ? "border-2 border-brand-500 bg-brand-50" : "border border-slate-200"}`}><b className="flex items-center gap-1.5 text-navy"><BrandIcon name={b} size={14} className="rounded-sm" />{k}</b><span className="text-slate-500">{v}</span></div>)}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3"><span className="text-sm text-slate-500">Total</span><span className="text-xl font-extrabold text-navy">Rp161.000</span></div>
      <div className="mt-3 flex h-11 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">Pesan Sekarang</div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><Truck size={13} />Lunas → resi Biteship terbit otomatis</p>
    </Frame>
  );
}

export function InboxMockup() {
  return (
    <Frame title="Inbox WhatsApp & Shopee">
      <div className="grid grid-cols-[130px_1fr] gap-3">
        <div className="space-y-1.5">
          {[["Rina K.", "WhatsApp", true], ["budi_store", "Shopee", false], ["Dewi L.", "WhatsApp", false]].map(([n, s, a]) => (
            <div key={n as string} className={`rounded-lg px-2.5 py-2 text-[11px] ${a ? "bg-brand-50 ring-1 ring-brand-200" : "bg-slate-50"}`}><b className="block text-navy">{n as string}</b><span className="flex items-center gap-1 text-slate-500">{s === "Shopee" ? <ShopeeMark size={11} /> : <BrandIcon name="whatsapp" size={11} />}{s as string}</span></div>
          ))}
        </div>
        <div className="space-y-2 text-[11px]">
          <p className="w-fit max-w-[90%] rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2 text-slate-700">Kak, paket saya sudah dikirim?</p>
          <p className="ml-auto w-fit max-w-[90%] rounded-xl rounded-tr-sm bg-emerald-100 px-3 py-2 text-slate-800">Sudah kak 🙏 Resi JX1234567890 via JNE REG.</p>
          <div className="flex flex-wrap gap-1">{["VIP", "Repeat order"].map((t) => <span key={t} className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">{t}</span>)}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
        <BrandIcon name="whatsapp" size={30} />
        <div className="flex-1"><b className="block text-navy">Broadcast: Promo 12.12</b><span className="text-slate-500">1.240 kontak · template disetujui Meta</span></div>
        <span className="flex items-center gap-1 font-semibold text-emerald-600"><MessageCircle size={13} />96% terkirim</span>
      </div>
    </Frame>
  );
}

export function TrendBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><TrendingUp size={13} />{children}</span>;
}
