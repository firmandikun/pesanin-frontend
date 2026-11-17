"use client";
import { CheckCircle2, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Panel, Toggle } from "@/components/kit";
import { api, ApiError } from "@/lib/api";

export type ShopeeChatAutomationConfig = {
  unpaid_reminder: boolean;
  unpaid_text: string;
  delivered_review: boolean;
  delivered_text: string;
};

export const DEFAULT_SHOPEE_CHAT_CONFIG: ShopeeChatAutomationConfig = {
  unpaid_reminder: true,
  unpaid_text:
    "Halo Kak {{nama}}, pesananmu ({{order_sn}}) sudah kami siapkan ya kak. Yuk segera selesaikan pembayarannya agar paket bisa langsung kami kirimkan hari ini ya kak 🙏",
  delivered_review: true,
  delivered_text:
    "Halo Kak {{nama}}, pesananmu ({{order_sn}}) sudah sampai ya. Mohon periksa kelengkapan produknya. Jika sudah sesuai, mohon bantu klik 'Pesanan Diterima' dan berikan ulasan bintang 5 ⭐⭐⭐⭐⭐ ya kak. Terima kasih banyak! 🙏",
};

export function ShopeeChatAutomationCard() {
  const [cfg, setCfg] = useState<ShopeeChatAutomationConfig>(DEFAULT_SHOPEE_CHAT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<Record<string, any>>("/user-settings")
      .then((res) => {
        const remote = res?.shopee_chat_automation;
        if (remote) {
          setCfg({
            unpaid_reminder: remote.unpaid_reminder !== false,
            unpaid_text: remote.unpaid_text || DEFAULT_SHOPEE_CHAT_CONFIG.unpaid_text,
            delivered_review: remote.delivered_review !== false,
            delivered_text: remote.delivered_text || DEFAULT_SHOPEE_CHAT_CONFIG.delivered_text,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = async (next: ShopeeChatAutomationConfig) => {
    setCfg(next);
    setSaving(true);
    setMsg(null);
    try {
      await api("/user-settings", {
        method: "PUT",
        json: { key: "shopee_chat_automation", value: next },
      });
      setMsg({ ok: true, text: "Pengaturan chat otomatis Shopee berhasil disimpan." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan pengaturan" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel className="space-y-5 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <MessageSquare size={20} />
        </span>
        <div className="flex-1">
          <b className="text-slate-800">Follow-up & Chat Otomatis Pembeli Shopee</b>
          <p className="text-sm text-slate-500">
            Kirim chat ramah otomatis langsung ke pembeli di Shopee Chat untuk mengingatkan pesanan belum dibayar dan meminta ulasan bintang 5 saat barang sampai.
          </p>
        </div>
      </div>

      {msg && (
        <p className={`rounded-lg p-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {msg.text}
        </p>
      )}

      {/* 1. Pengingat Pesanan Belum Bayar */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <b className="block text-sm text-slate-800">1. Pengingat Pesanan Belum Bayar (Unpaid Follow-up)</b>
            <span className="text-xs text-slate-500">
              Otomatis kirim pesan chat ke pembeli Shopee yang sudah checkout tapi belum bayar, agar segera menyelesaikan pembayaran sebelum batas waktu habis.
            </span>
          </div>
          <Toggle
            checked={cfg.unpaid_reminder}
            onChange={(v) => save({ ...cfg, unpaid_reminder: v })}
          />
        </div>

        {cfg.unpaid_reminder && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Template Pesan Pengingat Bayar</label>
              <span className="text-[11px] text-slate-400">Variabel: {"{{nama}}"}, {"{{order_sn}}"}</span>
            </div>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              rows={3}
              value={cfg.unpaid_text}
              onChange={(e) => setCfg({ ...cfg, unpaid_text: e.target.value })}
              onBlur={() => save(cfg)}
            />
          </div>
        )}
      </div>

      {/* 2. Ucapan Terima Kasih & Ulasan Bintang 5 */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <b className="block text-sm text-slate-800">2. Minta Ulasan Bintang 5 Saat Paket Sampai (Delivered)</b>
            <span className="text-xs text-slate-500">
              Otomatis kirim chat ramah saat status pesanan menjadi Selesai / Diterima, mengingatkan pembeli klik "Pesanan Diterima" dan memberikan ulasan bintang 5.
            </span>
          </div>
          <Toggle
            checked={cfg.delivered_review}
            onChange={(v) => save({ ...cfg, delivered_review: v })}
          />
        </div>

        {cfg.delivered_review && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Template Pesan Ulasan</label>
              <span className="text-[11px] text-slate-400">Variabel: {"{{nama}}"}, {"{{order_sn}}"}</span>
            </div>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              rows={3}
              value={cfg.delivered_text}
              onChange={(e) => setCfg({ ...cfg, delivered_text: e.target.value })}
              onBlur={() => save(cfg)}
            />
          </div>
        )}
      </div>

      {saving && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 size={13} className="animate-spin" /> Menyimpan perubahan…
        </p>
      )}
    </Panel>
  );
}
