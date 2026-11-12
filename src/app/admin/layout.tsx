"use client";

import {
  BookOpen, ChevronRight, CreditCard, FileText, Gauge, LayoutDashboard, LogOut, Megaphone, Menu, Settings2, ShieldCheck, SlidersHorizontal, Store, Users, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { AuthProvider, useAuth } from "@/lib/auth";

const GROUPS: [string, [string, string, React.ElementType][]][] = [
  ["Bisnis", [["Ringkasan", "/admin", LayoutDashboard], ["Pengguna", "/admin/users", Users], ["Tagihan", "/admin/invoices", CreditCard]]],
  ["Produk Pesanin", [["Paket & Fitur", "/admin/plans", SlidersHorizontal], ["Pengaturan Platform", "/admin/settings", Settings2]]],
  ["Operasional", [["Toko Shopee", "/admin/shops", Store]]],
  ["Konten", [["Tutorial", "/admin/content/tutorials", BookOpen], ["Blog", "/admin/blog", FileText], ["Pengumuman", "/admin/content/announcements", Megaphone]]],
];
const ALL = GROUPS.flatMap(([, items]) => items);

function Console({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const allowed = !!user?.is_admin && !user.member;
  useEffect(() => { if (!allowed) router.replace("/dashboard"); }, [allowed, router]);
  // Theme the whole page (incl. modals rendered at the root) with the console palette.
  useEffect(() => { document.documentElement.classList.add("console"); return () => document.documentElement.classList.remove("console"); }, []);
  if (!allowed) return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-500">Khusus admin Pesanin…</div>;
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  const current = ALL.find(([, h]) => active(h));

  return (
    <div className="console min-h-screen bg-slate-100 text-slate-700">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-slate-950 text-slate-300 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
          <LogoMark size={30} />
          <div className="leading-tight"><b className="block text-sm text-white">Pesanin</b><span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-400">Console</span></div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {GROUPS.map(([g, items]) => (
            <div key={g}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{g}</p>
              <div className="mt-2 space-y-0.5">
                {items.map(([label, href, Icon]) => (
                  <Link key={href} href={href} onClick={() => setOpen(false)}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active(href) ? "bg-indigo-500/15 font-semibold text-white ring-1 ring-inset ring-indigo-400/30" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                    <Icon size={17} className={active(href) ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"} />{label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300"><ShieldCheck size={16} /></span>
            <div className="min-w-0 flex-1 leading-tight"><b className="block truncate text-sm text-white">{user!.name}</b><span className="block truncate text-[11px] text-slate-500">{user!.email}</span></div>
            <button onClick={logout} className="rounded-md p-1.5 text-slate-500 hover:bg-white/10 hover:text-rose-300" aria-label="Logout" title="Logout"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-8">
          <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={20} /></button>
          <nav className="flex items-center gap-1.5 text-sm text-slate-500">
            <Gauge size={15} className="text-indigo-500" /><span>Console</span>
            {current && <><ChevronRight size={14} /><b className="text-slate-900">{current[0]}</b></>}
          </nav>
          <span className="ml-auto hidden rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700 sm:inline">Admin platform</span>
          <a href="/" target="_blank" className="hidden text-sm font-medium text-slate-500 hover:text-slate-900 md:inline">Lihat situs ↗</a>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;
  return <AuthProvider loginPath="/admin/login"><Console>{children}</Console></AuthProvider>;
}
