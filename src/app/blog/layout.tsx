import type { Metadata } from "next";

export const metadata: Metadata = { title: "Blog · Pesanin", description: "Tips keuangan marketplace, HPP, iklan, dan jualan online untuk seller Indonesia." };

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
