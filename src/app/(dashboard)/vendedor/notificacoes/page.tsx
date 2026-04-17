"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Bell, Loader2, MessageCircle, Mail, CheckCheck } from "lucide-react";
import { toast } from "sonner";

const CHANNEL_ICON: Record<string, { icon: typeof Bell; color: string }> = {
  whatsapp: { icon: MessageCircle, color: "text-green-500" },
  email: { icon: Mail, color: "text-blue-500" },
  sistema: { icon: Bell, color: "text-gray-500" },
};

export default function NotificacoesPage() {
  const [notifs, setNotifs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  function load() { fetch("/api/notificacoes").then(r => r.json()).then(d => setNotifs(d.data ?? [])).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function markAllRead() {
    const unread = notifs.filter(n => n.status !== "lido" && n.status !== "respondido").map(n => n.id as string);
    if (!unread.length) return;
    await fetch("/api/notificacoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: unread }) });
    toast.success("Notificações marcadas como lidas");
    load();
  }

  return (
    <DashboardLayout role="vendedor" subtitle="Acompanhe suas notificações">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Bell className="w-5 h-5 text-[#2563EB]" /><h2 className="text-[20px] font-semibold text-[#111827]">Notificações</h2></div>
          <button onClick={markAllRead} className="h-[36px] px-4 rounded-[8px] border border-[#E8EAEE] text-[13px] font-medium text-[#5B6370] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors inline-flex items-center gap-1.5"><CheckCheck className="w-4 h-4" />Marcar todas como lidas</button>
        </div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#9AA0AB]" /></div> : notifs.length === 0 ? (
          <div className="card-tradox text-center py-12"><Bell className="w-12 h-12 mx-auto text-[#9AA0AB] mb-4" /><h3 className="text-[16px] font-semibold text-[#111827] mb-2">Nenhuma notificação</h3><p className="text-[14px] text-[#5B6370]">Você será notificado quando houver matches para seus desejos.</p></div>
        ) : (
          <div className="card-tradox !p-0 divide-y divide-[#EEF0F3]">
            {notifs.map((n) => {
              const ch = CHANNEL_ICON[n.channel as string] ?? CHANNEL_ICON.sistema;
              const Icon = ch.icon;
              const isRead = n.status === "lido" || n.status === "respondido";
              return (
                <div key={n.id as string} className={`flex gap-4 p-5 ${isRead ? "opacity-60" : ""}`}>
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${ch.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[#111827] leading-relaxed">{n.content as string}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`w-2 h-2 rounded-full ${isRead ? "bg-gray-300" : "bg-[#2563EB]"}`} />
                      <span className="text-[12px] text-[#9AA0AB] capitalize">{n.status as string}</span>
                      <span className="text-[12px] text-[#9AA0AB]">· {new Date(n.created_at as string).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
