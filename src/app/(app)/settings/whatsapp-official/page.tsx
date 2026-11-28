import { redirect } from "next/navigation";

/** Old address: WhatsApp is connected from Pengaturan → WhatsApp. */
export default function WhatsAppOfficial() {
  redirect("/settings/whatsapp");
}
