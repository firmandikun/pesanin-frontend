export type PaperSize = "100x150" | "78x100" | "100x100" | "a4";
export type ProductTextMode = "sku_first" | "name_only" | "sku_only";

export type PrintSettings = {
  paper_size: PaperSize;
  sku_font_size: number; // 7, 8, 9, 10, 11
  show_table_border: boolean;
  product_text_mode: ProductTextMode;
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paper_size: "100x150",
  sku_font_size: 8,
  show_table_border: true,
  product_text_mode: "sku_first",
};

const STORAGE_KEY = "pesanin_print_settings";

export function getCachedPrintSettings(): PrintSettings {
  if (typeof window === "undefined") return DEFAULT_PRINT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        paper_size: parsed.paper_size || DEFAULT_PRINT_SETTINGS.paper_size,
        sku_font_size: Number(parsed.sku_font_size) || DEFAULT_PRINT_SETTINGS.sku_font_size,
        show_table_border: parsed.show_table_border !== false,
        product_text_mode: parsed.product_text_mode || DEFAULT_PRINT_SETTINGS.product_text_mode,
      };
    }
  } catch {}
  return DEFAULT_PRINT_SETTINGS;
}

export function setCachedPrintSettings(settings: Partial<PrintSettings>) {
  if (typeof window === "undefined") return;
  try {
    const current = getCachedPrintSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}
