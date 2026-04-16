"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp } from "lucide-react";
import { mockTeamStats, mockTopModels, mockDashboardStats } from "@/lib/data/mock-data";

export default function GestorDashboard() {
  return (
    <DashboardLayout pageTitle="Dashboard do Gestor" role="gestor" userName="Ricardo Pereira">
      <div className="space-y-6">
        <StatsCards {...mockDashboardStats} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Team Ranking */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-primary" />
                Ranking da Equipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-center">Desejos</TableHead>
                    <TableHead className="text-center">Matches</TableHead>
                    <TableHead className="text-center">Conversões</TableHead>
                    <TableHead>Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTeamStats
                    .sort((a, b) => b.rate - a.rate)
                    .map((s, i) => (
                      <TableRow key={s.seller}>
                        <TableCell>
                          <span className={`font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                            {i + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{s.seller}</TableCell>
                        <TableCell className="text-center">{s.wishes}</TableCell>
                        <TableCell className="text-center">{s.matches}</TableCell>
                        <TableCell className="text-center">{s.conversions}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={s.rate} className="h-2 w-16" />
                            <span className="text-xs font-medium">{s.rate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Modelos mais procurados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                Mais Procurados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTopModels.map((item, i) => (
                  <div key={item.model} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-5">
                        {i + 1}.
                      </span>
                      <span className="text-sm font-medium">{item.model}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.count} desejos
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Modelos mais buscados na sua região que você pode não ter em estoque.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Desejos por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Procurando", value: 23, total: 47, color: "bg-primary" },
                  { label: "Match Encontrado", value: 8, total: 47, color: "bg-chart-2" },
                  { label: "Em Negociação", value: 5, total: 47, color: "bg-chart-3" },
                  { label: "Convertido", value: 7, total: 47, color: "bg-chart-4" },
                  { label: "Perdido/Expirado", value: 4, total: 47, color: "bg-muted-foreground" },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${(item.value / item.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matches por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {[
                  { month: "Nov", value: 12 },
                  { month: "Dez", value: 18 },
                  { month: "Jan", value: 22 },
                  { month: "Fev", value: 28 },
                  { month: "Mar", value: 31 },
                  { month: "Abr", value: 34 },
                ].map((item) => (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative flex-1 flex items-end">
                      <div
                        className="w-full bg-primary/80 rounded-t-md transition-all hover:bg-primary"
                        style={{ height: `${(item.value / 40) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.month}</span>
                    <span className="text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
