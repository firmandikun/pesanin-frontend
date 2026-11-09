import type { Metadata } from "next";
import "./globals.css";
import { DialogHost } from "@/components/Dialogs";

export const metadata: Metadata = {
  title: "Pesanin — Terima pesanan rapi, tanpa ribet",
  description: "Pesanin: form order, checkout dengan ongkir otomatis, COD, follow up WhatsApp, dan landing page untuk jualan online.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}<DialogHost /></body>
    </html>
  );
}
