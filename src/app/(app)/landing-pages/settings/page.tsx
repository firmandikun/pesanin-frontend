"use client";
import { ArrowRight, Globe, MessageCircle, SquareTerminal, Tag, UsersRound } from "lucide-react";
import Link from "next/link";

const ITEMS = [
  [Globe, "Domain Kustom", "/settings/domains"], [UsersRound, "Anggota Tim", "/others/team-members"],
  [SquareTerminal, "Mengelola Pixel", "/settings/tracking"], [MessageCircle, "Nomor Whatsapp", "/settings/account"],
  [Tag, "Label Halaman", "/landing-pages"],
] as const;

export default function LandingSettings() {
  return (
    <div className="space-y-5">
      <h1 className="text-[34px] font-bold text-slate-800">Pengaturan</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {ITEMS.map(([Icon, label, href]) => (
          <Link key={label} href={href} className="flex items-center gap-3 surface surface-hover px-4 py-3.5">
            <Icon size={20} className="text-slate-700" /><span className="flex-1 font-semibold text-slate-800">{label}</span>
            <span className="flex items-center gap-1 text-sm font-medium text-brand-600">Atur<ArrowRight size={15} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
