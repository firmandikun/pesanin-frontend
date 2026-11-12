/** Official brand marks stored in /public/brands (Simple Icons SVGs in brand colour, or the brand's own site icon). */
export const BRANDS = {
  shopee: ["Shopee", "svg"], whatsapp: ["WhatsApp", "svg"], meta: ["Meta", "svg"], tiktok: ["TikTok", "svg"],
  instagram: ["Instagram", "svg"], facebook: ["Facebook", "svg"], googleads: ["Google Ads", "svg"],
  midtrans: ["Midtrans", "png"], biteship: ["Biteship", "png"], jne: ["JNE", "png"], jnt: ["J&T Express", "png"],
  sicepat: ["SiCepat", "png"], anteraja: ["AnterAja", "png"], pos: ["POS Indonesia", "png"], spx: ["SPX Express", "png"], sap: ["SAP Express", "png"],
} as const;

export type Brand = keyof typeof BRANDS;

export function BrandIcon({ name, size = 20, className = "" }: { name: Brand; size?: number; className?: string }) {
  const [label, ext] = BRANDS[name];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/brands/${name}.${ext}`} alt={label} width={size} height={size} className={`shrink-0 object-contain ${className}`} style={{ width: size, height: size }} />;
}
