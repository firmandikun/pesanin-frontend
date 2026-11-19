"use client";
import { use, useEffect, useState } from "react";
import { captureAttribution } from "@/lib/attribution";
import { api, Product } from "@/lib/api";
import { CheckoutExtras, CheckoutForm, Store } from "@/components/CheckoutForm";
import { PaymentReturn } from "@/components/PaymentReturn";
import { mergePixels, PixelScripts } from "@/components/PixelScripts";

export default function PublicCheckout({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  // Remember where the visitor came from (FB/IG/TikTok/Google…) before they reach the checkout.
  useEffect(() => { captureAttribution(); }, []);
  const [data, setData] = useState<({ product: Product; payment_methods: string[]; store: Store; global_pixels?: Record<string, string[]> } & CheckoutExtras) | null>(null);
  const [missing, setMissing] = useState(false);
  const [returnCode, setReturnCode] = useState<string | null>(null);
  useEffect(() => { setReturnCode(new URLSearchParams(location.search).get("order")); }, []);

  useEffect(() => {
    api(`/public/products/${slug}`).then((d) => {
      setData(d);
      document.title = d.product.form_settings?.page_name || d.product.site_title || d.product.name;
    }).catch(() => setMissing(true));
  }, [slug]);

  if (missing) return <div className="flex min-h-screen items-center justify-center text-slate-500">Halaman tidak ditemukan atau produk tidak aktif.</div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center text-slate-400">Memuat…</div>;
  // Product tracking + success-page pixels + the product's own pixel fields + saved "Semua halaman" pixels.
  const px = mergePixels(
    data.product.form_settings?.tracking?.pixels as { platform?: string; id?: string }[] | undefined,
    data.product.success_settings?.pixels as { platform?: string; id?: string }[] | undefined,
    { facebook: [data.product.pixels?.facebook], tiktok: [data.product.pixels?.tiktok] },
    data.global_pixels,
  );
  const bg = data.product.form_settings?.background;

  return (
    <div className="min-h-screen px-3 py-6 md:py-10" style={{ background: bg && bg !== "#ffffff" ? bg : "#f3f4f8" }}>
      <PixelScripts pixels={px} kind="checkout" />
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-5 md:p-8">
        {returnCode ? <PaymentReturn code={returnCode} /> : <CheckoutForm product={data.product} methods={data.payment_methods} store={data.store} extras={data} />}
      </div>
    </div>
  );
}
