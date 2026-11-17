"use client";
import { PageHead } from "@/components/kit";
import { PrintSettingsCard } from "@/components/PrintSettingsCard";

export default function PrintSettingsPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <PageHead
        title="Pengaturan Cetak Resi & Label"
        tutorial={false}
        crumbs={[["Pengaturan"], ["Cetak Resi & Label"]]}
      />
      <p className="-mt-2 text-sm text-slate-500">
        Konfigurasi format cetak air waybill (AWB) Shopee dan label pengiriman web/manual Pesanin: ukuran kertas printer, ukuran tulisan SKU/produk, serta garis border tabel.
      </p>
      <PrintSettingsCard />
    </div>
  );
}
