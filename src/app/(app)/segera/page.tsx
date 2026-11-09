"use client";
import { Construction } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Soon() {
  const f = useSearchParams().get("f") ?? "Fitur";
  return (
    <div className="space-y-6">
      <h1 className="text-[34px] font-bold text-slate-800">{f}</h1>
      <div className="flex flex-col items-center gap-3 surface px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef1fb] text-brand-600"><Construction size={30} /></span>
        <h2 className="text-lg font-bold text-slate-800">Segera hadir</h2>
        <p className="max-w-md text-sm text-slate-500">Halaman <b>{f}</b> sedang disiapkan. Tampilannya sudah tersedia di menu, fungsinya menyusul.</p>
        <Link href="/dashboard" className="mt-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Kembali ke Dashboard</Link>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Soon /></Suspense>;
}
