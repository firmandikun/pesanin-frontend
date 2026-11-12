import { ArrowRight, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SitePage } from "@/components/marketing/SiteChrome";
import { TutorialLibrary } from "@/components/marketing/TutorialLibrary";
import { waLink } from "@/lib/site";

export const metadata: Metadata = { title: "Tutorial Pesanin", description: "Pelajari cara memaksimalkan Pesanin: hubungkan Shopee, isi HPP, baca transaksi, pengeluaran, iklan, checkout, dan inbox WhatsApp." };

export default function Tutorials() {
  return (
    <SitePage>
      <section className="border-b border-slate-100 bg-[#fbfaf8]">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">Tutorial</span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-navy md:text-5xl">Tutorial Pesanin</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Pelajari cara memaksimalkan Pesanin untuk mengelola pesanan dan menghitung laba bisnis online kamu.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12"><TutorialLibrary /></section>
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-10 text-center text-white md:p-14">
          <h2 className="text-3xl font-extrabold">Siap mulai kelola bisnismu?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">Terapkan yang sudah kamu pelajari: hubungkan toko, isi HPP, dan lihat laba bersih per pesanan hari ini.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 font-bold text-brand-600">Mulai Sekarang <ArrowRight size={18} /></Link>
            <a href={waLink("Halo tim Pesanin, saya mau dipandu setup")} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/15 px-6 font-semibold text-white"><MessageCircle size={18} />Minta dipandu</a>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
