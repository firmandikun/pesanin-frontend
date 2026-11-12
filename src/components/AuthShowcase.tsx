"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { CheckoutMockup, HeroDashboard, InboxMockup, IncomeMockup, ProfitMockup } from "@/components/marketing/Mockups";

const SLIDES = [
  { title: "Dashboard Ringkasan", sub: "Omzet, laba bersih, dan semua toko kamu dalam satu layar", view: <HeroDashboard /> },
  { title: "Potongan Shopee Terbaca", sub: "Rincian biaya admin, layanan, ongkir, dan Rp1.250 per pesanan otomatis dari API", view: <IncomeMockup /> },
  { title: "Laba Bersih Otomatis", sub: "Omzet dikurangi potongan, HPP, iklan + PPN, dan pengeluaran operasional", view: <ProfitMockup /> },
  { title: "Inbox & Broadcast", sub: "Balas chat WhatsApp dan Shopee dari satu kotak masuk", view: <InboxMockup /> },
  { title: "Checkout & Ongkir", sub: "Form order dengan ongkir 7 kurir, COD, dan resi otomatis", view: <CheckoutMockup /> },
];

export function AuthShowcase() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = (d: number) => setI((v) => (v + d + SLIDES.length) % SLIDES.length);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => go(1), 6000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <aside className="relative hidden h-screen overflow-hidden bg-gradient-to-br from-brand-400 via-brand-500 to-amber-400 lg:sticky lg:top-0 lg:flex lg:flex-col"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-amber-300/40 blur-3xl" />

      <Link href="/" className="relative z-10 m-8 w-max rounded-2xl bg-white/95 px-3.5 py-2 shadow-lg shadow-black/5" aria-label="Pesanin"><Logo small /></Link>

      <div className="relative flex flex-1 flex-col items-center justify-center px-10 xl:px-16">
        <div key={i} className="w-full max-w-[520px] animate-[authSlide_.5s_ease-out]">
          <h2 className="text-center text-2xl font-extrabold text-white">{SLIDES[i].title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm text-white/85">{SLIDES[i].sub}</p>
          <div className="mt-8 [&_.shadow-2xl]:shadow-black/20">{SLIDES[i].view}</div>
        </div>
      </div>

      <div className="relative flex items-center justify-center gap-6 pb-10">
        <button onClick={() => go(-1)} aria-label="Sebelumnya" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-navy shadow-lg transition hover:bg-white"><ChevronLeft size={18} /></button>
        <div className="flex gap-2">
          {SLIDES.map((s, n) => (
            <button key={s.title} onClick={() => setI(n)} aria-label={s.title}
              className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`} />
          ))}
        </div>
        <button onClick={() => go(1)} aria-label="Berikutnya" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-navy shadow-lg transition hover:bg-white"><ChevronRight size={18} /></button>
      </div>
    </aside>
  );
}
