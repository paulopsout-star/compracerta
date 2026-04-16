"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Building2,
  Zap,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Database,
  Wifi,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AdminDashboard() {
  return (
    <DashboardLayout pageTitle="Painel Administrativo" role="admin" userName="Admin Sistema">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Usuários Ativos", value: "156", icon: Users, detail: "12 novos esta semana" },
            { title: "Concessionárias", value: "23", icon: Building2, detail: "MG e GO" },
            { title: "Matches Hoje", value: "47", icon: Zap, detail: "+18% vs ontem" },
            { title: "WhatsApp Enviados", value: "234", icon: MessageCircle, detail: "89% entregues" },
          ].map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Status das Integrações */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-primary" />
                Status das Integrações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Canal do Repasse (Marketplace)", status: "online", latency: "45ms", lastSync: "há 2 min", icon: Wifi },
                  { name: "Avaliador Digital (Read Replica)", status: "online", latency: "120ms", lastSync: "há 5 min", icon: Database },
                  { name: "WhatsApp Business API", status: "online", latency: "89ms", lastSync: "há 1 min", icon: MessageCircle },
                  { name: "Fila de Matching (RabbitMQ)", status: "online", latency: "12ms", lastSync: "contínuo", icon: Zap },
                ].map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <integration.icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{integration.name}</p>
                        <p className="text-xs text-muted-foreground">Latência: {integration.latency} · Sync: {integration.lastSync}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Online
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Métricas de Notificação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notificações WhatsApp</CardTitle>
              <CardDescription>Últimas 24 horas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Enviadas", value: 234, total: 234, color: "bg-blue-500" },
                { label: "Entregues", value: 208, total: 234, color: "bg-green-500" },
                { label: "Lidas", value: 156, total: 234, color: "bg-emerald-500" },
                { label: "Respondidas", value: 89, total: 234, color: "bg-primary" },
                { label: "Com erro", value: 3, total: 234, color: "bg-destructive" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-medium">{item.value} ({Math.round((item.value / item.total) * 100)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${(item.value / item.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Logs recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs de Atividade Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="hidden md:table-cell">Entidade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { time: "16:42", action: "Desejo criado", user: "João Silva", entity: "Wish #w129", status: "success" },
                  { time: "16:38", action: "Match encontrado", user: "Sistema", entity: "Match #m87", status: "success" },
                  { time: "16:35", action: "WhatsApp enviado", user: "Sistema", entity: "Notif #n201", status: "success" },
                  { time: "16:30", action: "Upload de estoque", user: "Auto Center BH", entity: "Upload #su45", status: "success" },
                  { time: "16:22", action: "Falha no envio WhatsApp", user: "Sistema", entity: "Notif #n200", status: "error" },
                  { time: "16:15", action: "Novo usuário cadastrado", user: "Admin", entity: "User #u157", status: "success" },
                  { time: "16:10", action: "Sync Avaliador Digital", user: "CDC Worker", entity: "Offer batch #89", status: "success" },
                ].map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground">{log.time}</TableCell>
                    <TableCell className="text-sm font-medium">{log.action}</TableCell>
                    <TableCell className="text-sm">{log.user}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{log.entity}</TableCell>
                    <TableCell>
                      {log.status === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
