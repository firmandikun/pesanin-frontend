"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useState } from "react";
import { LandingPageBuilder } from "@/components/landing/LandingPageBuilder";
import { api, Product } from "@/lib/api";
import { LandingPage } from "@/lib/landing";

function BuilderPage({ id }: { id: string }) {
  const sp = useSearchParams();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api<LandingPage>(`/landing-pages/${id}`).then(setPage);
    Promise.all(["physical", "digital"].map((t) => api(`/products?per_page=100&type=${t}`))).then((r) =>
      setProducts(r.flatMap((x) => x.products.data)),
    );
  }, [id]);

  if (!page) {
    return <div className="flex h-screen items-center justify-center bg-[#141416] text-slate-400">Memuat builder…</div>;
  }

  return (
    <LandingPageBuilder
      initialPage={page}
      products={products}
      fetchProductCheckout
      backHref="/landing-pages"
      backLabel="Back to Page List"
      initialTab={sp.get("tab") === "settings" ? "settings" : "home"}
      previewHref={`/p/${page.slug}?preview=1`}
      onSave={async (next, status) => {
        const saved = await api<LandingPage>(`/landing-pages/${page.id}`, {
          method: "PUT",
          json: {
            title: next.title,
            slug: next.slug,
            label: next.label || null,
            status: status ?? next.status,
            product_id: next.product_id ?? null,
            theme: next.theme,
            seo: next.seo,
            settings: next.settings,
            blocks: next.blocks,
          },
        });
        setPage(saved);
        return saved;
      }}
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <BuilderPage id={id} />
    </Suspense>
  );
}
