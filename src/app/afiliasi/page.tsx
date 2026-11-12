import { ArrowRight, BadgePercent, CheckCircle2, Link2, MessageCircle, Repeat, UserPlus, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SitePage } from "@/components/marketing/SiteChrome";
import { waLink } from "@/lib/site";

export const metadata: Metadata = { title: "Program Afiliasi · Pesanin", description: "Ajak seller memakai Pesanin dan dapatkan komisi berulang dari setiap langganan." };

export default function Afiliasi() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-slate-100 bg-[#fbfaf8]">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-brand-100/50 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">Program Afiliasi</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-navy md:text-[54px]">Ajak seller pakai Pesanin, dapat komisi setiap bulan</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">Cocok untuk mentor jualan online, komunitas seller, agensi iklan, dan kreator konten bisnis. Komisi berulang selama pelanggan yang kamu ajak tetap berlangganan.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={waLink("Halo tim Pesanin, saya mau daftar program afiliasi")} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-7 font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">Daftar Jadi Afiliasi <ArrowRight size={18} /></a>
            <Link href="/#fitur" className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 font-semibold text-navy">Pelajari produknya</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-navy">Cara kerjanya</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {[[UserPlus, "Daftar", "Hubungi tim kami, kamu akan mendapat kode dan link afiliasi pribadi."], [Link2, "Bagikan", "Sebarkan link di konten, kelas, grup komunitas, atau ke klienmu."], [Wallet, "Mereka berlangganan", "Setiap seller yang mendaftar lewat linkmu tercatat otomatis."], [Repeat, "Komisi berulang", "Komisi dibayarkan setiap bulan selama mereka tetap berlangganan."]].map(([Icon, t, d], i) => {
            const I = Icon as React.ElementType;
            return <div key={t as string} className="rounded-3xl border border-slate-200 bg-white p-6"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white"><I size={20} /></span><p className="mt-4 text-xs font-bold text-brand-600">LANGKAH {i + 1}</p><h3 className="mt-1 text-lg font-extrabold text-navy">{t as string}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{d as string}</p></div>;
          })}
        </div>
      </section>
      <section className="border-t border-slate-100 bg-[#fbfaf8] py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-navy">Kenapa mudah merekomendasikan Pesanin</h2>
            <ul className="mt-6 space-y-3">
              {["Masalah nyata seller: tidak tahu laba bersih setelah potongan Shopee, HPP, dan iklan", "Satu langganan untuk analitik keuangan, checkout, inbox WhatsApp, dan broadcast", "Bisa dicoba gratis, jadi calon pelanggan tidak ragu mendaftar", "Materi promosi dan demo produk disediakan tim kami"].map((t) => <li key={t} className="flex gap-3 text-slate-700"><CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-500" />{t}</li>)}
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-navy/5">
            <BadgePercent className="text-brand-500" size={32} />
            <h3 className="mt-4 text-2xl font-extrabold text-navy">Komisi berulang</h3>
            <p className="mt-2 text-slate-600">Persentase komisi, minimum pencairan, dan jadwal pembayaran dijelaskan saat pendaftaran. Kamu bisa memantau pelanggan yang kamu ajak dari dashboard afiliasi.</p>
            <a href={waLink("Halo tim Pesanin, saya mau tanya detail komisi afiliasi")} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#25D366] px-6 font-bold text-white"><MessageCircle size={17} />Tanya detail komisi</a>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
