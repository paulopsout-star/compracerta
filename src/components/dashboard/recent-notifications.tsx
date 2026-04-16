"use client";

import { MessageCircle, Mail, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";
import { formatRelativeDate } from "@/lib/data/mock-data";

const CHANNEL_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  whatsapp: { icon: MessageCircle, color: "text-green-500" },
  email: { icon: Mail, color: "text-blue-500" },
  sistema: { icon: Bell, color: "text-gray-500" },
};

const STATUS_DOTS: Record<string, string> = {
  pendente: "bg-gray-400",
  enviado: "bg-blue-400",
  entregue: "bg-blue-500",
  lido: "bg-green-500",
  respondido: "bg-emerald-500",
  erro: "bg-red-500",
};

interface RecentNotificationsProps {
  notifications: Notification[];
}

export function RecentNotifications({ notifications }: RecentNotificationsProps) {
  return (
    <div className="space-y-1">
      {notifications.map((notif) => {
        const config = CHANNEL_CONFIG[notif.channel] ?? CHANNEL_CONFIG.sistema;
        const Icon = config.icon;
        return (
          <div key={notif.id} className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="shrink-0 mt-0.5">
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed line-clamp-2">{notif.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("h-2 w-2 rounded-full", STATUS_DOTS[notif.status])} />
                <span className="text-xs text-muted-foreground capitalize">{notif.status}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {notif.sentAt ? formatRelativeDate(notif.sentAt) : "—"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
