// Which app pages a signed-in team member may open, by role. The API enforces the same rules;
// this only hides menu items and shows a friendly "no access" screen.

export type Member = { id: number; name: string; email: string | null; role: "admin" | "cs" | "advertiser" | "gudang"; role_label: string };

const COMMON = ["/dashboard", "/tutorial", "/segera", "/settings/notifications", "#whats-new"];
// Owner-only pages: billing, keys, account, team management.
const OWNER_ONLY = ["/settings/billing", "/settings/integrations", "/settings/account", "/settings/banned", "/settings/activity", "/settings/domains", "/settings/balance", "/marketplace/balance", "/others/team-members"];
const ROLE_PAGES: Record<Member["role"], string[]> = {
  admin: [],
  cs: ["/chat", "/customers", "/orders", "/products", "/marketplace/orders", "/marketplace/products", "/others/inventory", "/others/payments", "/whatsapp-rotator/chats"],
  gudang: ["/orders", "/products", "/marketplace/orders", "/marketplace/products", "/others/inventory", "/others/transactions"],
  advertiser: ["/broadcast", "/customers", "/reports", "/landing-pages", "/marketplace/ads", "/settings/tracking", "/products", "/affiliate", "/others/coupons", "/others/product-reports", "/whatsapp-rotator"],
};

const under = (path: string, base: string) => path === base || path.startsWith(base + "/") || path.startsWith(base + "?");

export function canOpen(member: Member | null | undefined, href: string): boolean {
  if (!member) return true;
  const path = href.split("?")[0] || href;
  if (OWNER_ONLY.some((b) => under(path, b))) return false;
  if (member.role === "admin" || COMMON.some((b) => under(path, b))) return true;
  return ROLE_PAGES[member.role].some((b) => under(path, b));
}
