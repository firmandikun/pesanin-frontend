"use client";
import { BarChart3, BookOpen, Boxes, ChevronDown, ClipboardCheck, Gift, LayoutDashboard, LogOut, Maximize2, Megaphone, Menu, MessageCircle, MessageSquareMore, Package, Settings, Store, Truck, User, Wallet } from "lucide-react";
import { AlertTriangle, Crown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FloatingChatDrawer } from "@/components/inbox/FloatingChatDrawer";
import { AuthProvider, useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { loadSiteConfig, SidebarMenuItem } from "@/lib/site";
import { canOpen } from "@/lib/roles";
import { Logo, LogoMark } from "@/components/Logo";
import { WhatsNew } from "@/components/WhatsNew";

type Child = { label: string; href: string; lock?: string };
type NavItem = { key: string; label: string; icon: LucideIcon; href?: string; badge?: string; children?: Child[]; external?: boolean };

const ICON_MAP: Record<string, LucideIcon> = {
  Megaphone,
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardCheck,
  MessageCircle,
  Store,
  BarChart3,
  Wallet,
  Gift,
  Settings,
  BookOpen,
  Truck,
};


const PLAN_NAME: Record<string, string> = { gratis: "Gratis", starter: "Starter", bisnis: "Bisnis", pro: "Pro" };

// Fallback navigation used only if the server response has not yet returned `sidebar`.
const NAV_FALLBACK: SidebarMenuItem[] = [
  { key: "whats_new", label: "Info Terbaru", icon: "Megaphone", href: "#whats-new", visible: true },
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/dashboard", visible: true },
  { key: "products", label: "Produk", icon: "Package", href: "/products", visible: true },
  { key: "dropship", label: "Dropship Pesanin", icon: "Boxes", href: "/dropship", visible: true },
  { key: "orders", label: "Pesanan Media Sosial", icon: "ClipboardCheck", visible: true, children: [
    { label: "Semua Pesanan Medsos", href: "/orders" },
    { label: "Checkout Ditinggalkan", href: "/orders?view=abandoned" },
    { label: "Diarsipkan", href: "/orders?view=archived" },
    { label: "Konfirmasi Pembayaran", href: "/others/payments" },
  ] },
  { key: "chat", label: "Chat", icon: "MessageCircle", visible: true, children: [
    { label: "Kotak Masuk", href: "/chat" },
    { label: "Broadcast", href: "/broadcast" },
    { label: "Template WhatsApp", href: "/broadcast/templates" },
    { label: "Pelanggan", href: "/customers" },
    { label: "Balasan Cepat & Label", href: "/chat/quick-replies" },
    { label: "Team Members", href: "/others/team-members" },
  ] },
  { key: "marketplace", label: "Marketplace", icon: "Store", visible: true, children: [
    { label: "Daftar Toko", href: "/marketplace/shops" },
    { label: "Semua Produk", href: "/marketplace/products" },
    { label: "Performa Produk", href: "/marketplace/product-performance" },
    { label: "Stok Master", href: "/marketplace/stock" },
    { label: "Pesanan & Pengiriman", href: "/marketplace/orders" },
    { label: "Scan Out", href: "/marketplace/scan-out" },
    { label: "Promosi", href: "/marketplace/promotions" },
    { label: "Ulasan", href: "/marketplace/reviews" },
    { label: "Kesehatan Akun", href: "/marketplace/health" },
    { label: "Saldo", href: "/marketplace/balance" },
  ] },
  { key: "reports", label: "Laporan Bisnis", icon: "BarChart3", visible: true, children: [
    { label: "Laporan Penjualan", href: "/reports/sales" },
    { label: "Statistik Penjualan", href: "/reports/statistics" },
    { label: "Laba Bersih", href: "/reports/profit" },
    { label: "Pengeluaran", href: "/reports/expenses" },
    { label: "Laporan Produk", href: "/others/product-reports" },
    { label: "Biaya Iklan", href: "/reports/ads" },
    { label: "Iklan Meta", href: "/reports/meta-ads" },
    { label: "Riset Produk", href: "/reports/research" },
    { label: "Riset Pasar", href: "/reports/market" },
    { label: "Diagnosa Bisnis AI", href: "/reports/ai-diagnosis" },
  ] },
  { key: "operations", label: "Operasional Media Sosial", icon: "Wallet", visible: true, children: [
    { label: "Inventori Medsos", href: "/others/inventory" },
    { label: "Transaksi Medsos", href: "/others/transactions" },
    { label: "Saldo", href: "/settings/balance" },
  ] },
  { key: "promotions", label: "Promosi", icon: "Gift", visible: true, children: [
    { label: "Landing Page", href: "/landing-pages" },
    { label: "Laporan Landing Page", href: "/landing-pages/reports" },
    { label: "Kupon", href: "/others/coupons" },
    { label: "Afiliasi", href: "/affiliate" },
    { label: "Follow Up Manual", href: "/settings/followup" },
  ] },
  { key: "settings", label: "Pengaturan", icon: "Settings", visible: true, children: [
    { label: "Akun", href: "/settings/account" },
    { label: "Paket & Tagihan", href: "/settings/billing" },
    { label: "Integrasi", href: "/settings/integrations" },
    { label: "Alamat Pickup", href: "/settings/addresses" },
    { label: "Otomatisasi Pesanan", href: "/settings/automation" },
    { label: "Cetak Resi & Label", href: "/settings/print" },
    { label: "Notifikasi", href: "/settings/notifications" },
    { label: "Tracking Pixel", href: "/settings/tracking" },
    { label: "Custom Domain", href: "/settings/domains" },
    { label: "Perangkat Diblokir", href: "/settings/banned" },
    { label: "Log Aktivitas", href: "/settings/activity" },
  ] },
  { key: "tutorial", label: "Tutorial", icon: "BookOpen", href: "/tutorial", visible: true },
];


function Shell({ children }: { children: React.ReactNode }) {
  const { user, setUser, logout } = useAuth();
  const member = user!.member ?? null;
  const router = useRouter();
  const pathname = usePathname();
  // Admin accounts manage Pesanin from the console, not a store.
  const consoleOnly = !!user!.is_admin && !member;
  useEffect(() => { if (consoleOnly) router.replace("/admin"); }, [consoleOnly, router]);
  // Trial or plan (incl. grace) is over: everything but Paket & Tagihan sends the store to the plan picker.
  const sub = user!.subscription;
  const lockedPath = !consoleOnly && sub?.status === "expired" && !pathname.startsWith("/settings/billing");
  useEffect(() => { if (lockedPath) router.replace("/langganan"); }, [lockedPath, router]);
  const [notice, setNotice] = useState<{ text: string; tone: string } | null>(null);
  const [sidebarItems, setSidebarItems] = useState<SidebarMenuItem[]>(() => user!.sidebar ?? NAV_FALLBACK);
  const [hiddenPaths, setHiddenPaths] = useState<string[]>(() => user!.hidden_paths ?? []);
  // A page of the other track (e.g. Landing Page for a Marketplace store): shown as an add-on prompt instead.
  const otherTrack = !consoleOnly && hiddenPaths.some((h) => pathname === h || pathname.startsWith(h + "/"));
  useEffect(() => {
    if (user?.sidebar) setSidebarItems(user.sidebar);
  }, [user?.sidebar]);
  useEffect(() => {
    loadSiteConfig().then((s) => {
      if (s?.notice) setNotice({ text: s.notice, tone: s.notice_tone });
    });
    const refreshSidebar = () => {
      api<{ items: SidebarMenuItem[]; hidden?: string[] }>("/sidebar")
        .then((res) => {
          if (Array.isArray(res?.items)) {
            setSidebarItems(res.items);
            setHiddenPaths(res.hidden ?? []);
            setUser({ ...user!, sidebar: res.items, hidden_paths: res.hidden ?? [] });
          }
        })
        .catch(() => {});
    };
    refreshSidebar();
    window.addEventListener("focus", refreshSidebar);
    const onVis = () => { if (document.visibilityState === "visible") refreshSidebar(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", refreshSidebar);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const NAV_ALL: NavItem[] = sidebarItems
    .filter((item) => item.visible !== false)
    .map((item) => ({
      key: item.key,
      label: item.label,
      icon: ICON_MAP[item.icon] ?? Package,
      href: item.href,
      badge: item.badge,
      children: item.children,
    }));

  // Team members only see the pages their role can use.
  const NAV = member ? NAV_ALL.flatMap((item) => {
    if (item.children) { const children = item.children.filter((c) => canOpen(member, c.href)); return children.length ? [{ ...item, children }] : []; }
    return !item.href || canOpen(member, item.href) ? [item] : [];
  }) : NAV_ALL;
  const search = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState(false);
  const [wide, setWide] = useState(true);
  const [news, setNews] = useState(false);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setUpgrade((e as CustomEvent<string>).detail);
    window.addEventListener("pesanin:upgrade", on);
    return () => window.removeEventListener("pesanin:upgrade", on);
  }, []);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (consoleOnly) return <div className="flex h-screen items-center justify-center text-slate-400">Membuka Pesanin Console…</div>;
  if (lockedPath) return <div className="flex h-screen items-center justify-center text-slate-400">Membuka pilihan paket…</div>;
  const fullscreen = pathname.startsWith("/products/new") || /^\/products\/\d+\/edit/.test(pathname) || /^\/landing-pages\/\d+$/.test(pathname);
  if (fullscreen) return <>{children}</>;

  const here = pathname + (search.toString() ? `?${search}` : "");
  const isActive = (href: string) => {
    if (href.startsWith("#")) return false;
    const [path, q] = href.split("?");
    if (q) return here === href || (path === "/segera" && here === href);
    return pathname === path && !(path === "/orders" && search.get("view"));
  };
  const toggleSidebar = () => (window.innerWidth < 1024 ? setMobile(!mobile) : setCollapsed(!collapsed));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="app-shell-chrome fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-slate-200 bg-white pr-4 text-slate-700">
        <div className={`flex h-full shrink-0 items-center overflow-hidden pl-4 transition-[width,padding] duration-300 ${collapsed ? "lg:w-[68px] lg:justify-center lg:pl-0" : "lg:w-[230px] lg:pl-5"}`}>
          <Link href="/dashboard" aria-label="Pesanin" className="flex items-center gap-2">
            <span className={collapsed ? "lg:hidden" : ""}><Logo /></span>
            {collapsed && <span className="hidden lg:block"><LogoMark /></span>}
          </Link>
        </div>
        <button onClick={toggleSidebar} className="ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#FE551B]" aria-label="Menu"><Menu size={20} /></button>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className={pathname?.startsWith("/chat") ? "" : "sm:hidden"}><NotificationBell /></span>
          {!member && <Link href="/settings/billing" className="hidden items-center gap-1.5 rounded-full bg-[#FFF1EB] py-1 pl-1 pr-3 text-xs font-semibold text-[#FE551B] ring-1 ring-orange-200/70 transition hover:bg-orange-100 md:flex">
            <span className="flex items-center gap-1 rounded-full bg-[#FE551B] px-2 py-0.5 text-white"><Crown size={12} />{PLAN_NAME[user!.active_plan ?? "gratis"]}{sub?.status === "trial" && " · Trial"}</span>
            {sub?.status === "trial" ? `${sub.days_left} hari lagi` : user!.active_plan === "pro" ? "Kelola paket" : "Upgrade"}
          </Link>}
          {!member && <HeaderBalance />}
          <div className="relative">
            <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 font-medium text-slate-700 hover:text-[#FE551B]"><User size={19} className="rounded-full border border-slate-300 p-0.5 text-slate-600" /><span className="hidden sm:inline">{member?.name ?? user!.name}</span><ChevronDown size={15} className="text-slate-400" /></button>
            {menu && (
              <div className="absolute right-0 mt-3 w-52 rounded-xl border border-slate-200 bg-white p-1 text-sm text-slate-700 shadow-xl" onMouseLeave={() => setMenu(false)}>
                <div className="border-b border-slate-100 px-3 py-2"><b className="block text-slate-800">{user!.store_name}</b>
                  <span className="text-xs text-slate-500">{member ? `${member.name} · ${member.role_label}` : user!.email}</span></div>
                {!member && <>
                  <Link href="/settings/account" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50" onClick={() => setMenu(false)}><User size={16} />My Account</Link>
                  <Link href="/settings/billing" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50" onClick={() => setMenu(false)}><Crown size={16} />Paket & Tagihan</Link>
                  <Link href="/settings/account" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50" onClick={() => setMenu(false)}><Settings size={16} />Settings</Link>
                </>}
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-rose-600 hover:bg-rose-50"><LogOut size={16} />Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className={`app-shell-chrome no-scrollbar fixed bottom-0 left-0 top-14 z-30 overflow-y-auto bg-[#FE551B] pb-24 pt-3 transition-[width,transform] duration-300 ease-out
        ${mobile ? "translate-x-0 shadow-xl" : "-translate-x-full"} lg:translate-x-0 lg:shadow-none ${collapsed ? "w-[68px]" : "w-[230px]"}`}>
        <nav className={`space-y-0.5 text-[13px] transition-[padding] duration-300 ${collapsed ? "px-2.5" : "px-3"}`}>
          {NAV.map((item) => {
            const Icon = item.icon;
            const childActive = item.children?.some((c) => isActive(c.href));
            const active = item.href ? isActive(item.href) : false;
            const isOpen = open[item.label] ?? true;
            const row = (
              <span className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium transition-colors ${active ? "bg-white/20 text-white" : childActive ? "text-white" : "text-white/90 hover:bg-white/10 hover:text-white"}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${active ? "text-white" : childActive ? "text-white" : "text-white/80 group-hover:text-white"}`}><Icon size={17} strokeWidth={1.8} /></span>
                {!collapsed && <span className="flex-1 truncate leading-tight">{item.label}</span>}
                {!collapsed && item.children && <ChevronDown size={14} className={`text-white/70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />}
              </span>
            );
            return (
              <div key={item.label}>
                {item.href === "#whats-new" ? <button className="w-full text-left" title={item.label} onClick={() => setNews(true)}>{row}</button>
                  : item.href ? <Link href={item.href} onClick={() => setMobile(false)} title={item.label}>{row}</Link>
                  : <button className="w-full text-left" title={item.label} onClick={() => { setCollapsed(false); setOpen({ ...open, [item.label]: !isOpen }); }}>{row}</button>}
                {item.children && (
                  <div className={`grid transition-[grid-template-rows,opacity,visibility] duration-200 ease-out ${isOpen && !collapsed ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                      <div className="mb-1.5 ml-8 mt-0.5 space-y-0.5">
                        {item.children.map((c) => {
                          const on = isActive(c.href);
                          return (
                            <Link key={c.href} href={c.href} onClick={() => setMobile(false)} tabIndex={isOpen && !collapsed ? 0 : -1}
                              className={`flex items-center rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${on ? "bg-white/20 font-medium text-white" : "text-white/85 hover:bg-white/10 hover:text-white"}`}>
                              {c.label}
                              {c.lock && <span title={`Tersedia mulai paket ${c.lock}`} className="ml-auto rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">{c.lock}</span>}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={() => setWide(!wide)} className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white" title="Wide Screen">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center text-white/80 group-hover:text-white"><Maximize2 size={17} strokeWidth={1.8} /></span>{!collapsed && "Wide Screen"}
          </button>
        </nav>
      </aside>
      {news && <WhatsNew onClose={() => setNews(false)} />}
      {upgrade && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setUpgrade(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600"><Crown size={26} /></span>
            <h3 className="mt-4 text-lg font-bold text-navy">Upgrade paket untuk lanjut</h3>
            <p className="mt-2 text-sm text-slate-600">{upgrade}</p>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setUpgrade(null)} className="h-10 flex-1 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Nanti saja</button>
              <Link href="/settings/billing#paket" onClick={() => setUpgrade(null)} className="flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Lihat paket</Link>
            </div>
          </div>
        </div>
      )}
      {mobile && <div className="fixed inset-0 top-16 z-20 bg-slate-900/30 lg:hidden" onClick={() => setMobile(false)} />}

      <main className={`app-shell flex-1 pt-14 sm:pr-12 transition-[padding] duration-300 ease-out ${collapsed ? "lg:pl-[68px]" : "lg:pl-[230px]"}`}>
        <div className={`mx-auto px-4 py-8 md:px-8 ${wide ? "max-w-none" : "max-w-[1180px]"}`}>
          {sub?.status === "trial" && <SubBanner tone="brand" icon={<Gift size={18} />} cta={member ? null : ["Pilih paket", "/langganan"]}
            text={<><b>Masa trial paket Bisnis {sub.days_left === 0 ? "berakhir hari ini" : `tersisa ${sub.days_left} hari`}.</b> {member ? "Minta pemilik toko memilih paket sebelum trial berakhir." : "Pilih paket sebelum trial berakhir agar sinkron pesanan dan laporan tetap berjalan."}</>} />}
          {sub?.status === "grace" && <SubBanner tone="rose" icon={<AlertTriangle size={18} />} cta={member ? null : ["Perpanjang", "/langganan"]}
            text={<><b>Paket {PLAN_NAME[sub.plan] ?? sub.plan} sudah berakhir.</b> Masa tenggang {sub.days_left === 0 ? "habis hari ini" : `tinggal ${sub.days_left} hari`}, setelah itu akses dashboard dikunci sampai paket diperpanjang.</>} />}
          {notice && <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${notice.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-sky-200 bg-sky-50 text-sky-800"}`}>📢 {notice.text}</div>}
          {otherTrack ? (
            <div className="mx-auto mt-16 max-w-lg rounded-2xl bg-white p-8 text-center">
              <h1 className="text-lg font-bold text-navy">Fitur ini ada di jalur {user!.plan_track === "marketplace" ? "Pesanin Social & Web" : "Pesanin Marketplace"}</h1>
              <p className="mt-2 text-sm text-slate-500">Paketmu di jalur {user!.plan_track === "marketplace" ? "Marketplace (Shopee)" : "Social & Web (Meta Ads, WhatsApp, IG & COD)"}. Jualan di keduanya? Tambahkan jalur ini sebagai add-on, hemat 30%.</p>
              <div className="mt-5 flex justify-center gap-2">
                <Link href="/settings/billing#paket" className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white">Aktifkan add-on</Link>
                <Link href="/dashboard" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-600">Ke Dashboard</Link>
              </div>
            </div>
          ) : canOpen(member, pathname) ? children : (
            <div className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-8 text-center">
              <h1 className="text-lg font-bold text-navy">Halaman ini tidak tersedia untuk peran {member?.role_label}</h1>
              <p className="mt-2 text-sm text-slate-500">Minta pemilik toko mengubah peranmu di Kelola Tim jika kamu perlu akses.</p>
              <Link href="/dashboard" className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white">Ke Dashboard</Link>
            </div>
          )}
        </div>
      </main>
      <FloatingChatDrawer />
      <button className="print:hidden fixed bottom-5 left-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg" aria-label="Bantuan"><MessageSquareMore size={22} /></button>
    </div>
  );
}

function SubBanner({ tone, icon, text, cta }: { tone: "brand" | "rose"; icon: React.ReactNode; text: React.ReactNode; cta: [string, string] | null }) {
  const c = tone === "brand" ? "border-brand-200 bg-brand-50 text-brand-900 [&_.ic]:bg-brand-100 [&_.ic]:text-brand-600" : "border-rose-200 bg-rose-50 text-rose-900 [&_.ic]:bg-rose-100 [&_.ic]:text-rose-600";
  return (
    <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${c}`}>
      <span className="ic flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">{icon}</span>
      <p className="min-w-[200px] flex-1">{text}</p>
      {cta && <Link href={cta[1]} className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${tone === "brand" ? "bg-brand-600 hover:bg-brand-700" : "bg-rose-600 hover:bg-rose-700"}`}>{cta[0]}</Link>}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><Suspense><Shell>{children}</Shell></Suspense></AuthProvider>;
}

/** Header wallet: money Pesanin holds for the seller (E-Payment via Pesanin's Midtrans), links to Saldo. */
function HeaderBalance() {
  const [held, setHeld] = useState<number | null>(null);
  useEffect(() => { api<{ held: number }>("/balance/summary").then((r) => setHeld(r.held)).catch(() => setHeld(null)); }, []);
  if (held === null) return null;
  return (
    <Link href="/settings/balance" title="Dana E-Payment di Pesanin" className="hidden items-center gap-2 font-medium hover:text-white/80 sm:flex">
      <Wallet size={19} />{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(held)}
    </Link>
  );
}
