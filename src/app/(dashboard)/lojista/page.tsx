"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Package,
  Search,
  Zap,
  TrendingUp,
  Upload,
  FileSpreadsheet,
  MapPin,
} from "lucide-react";
import { formatBRL, mockDealerStoreStock, mockMatches } from "@/lib/data/mock-data";
import { MatchesList } from "@/components/dashboard/matches-list";

export default function LojistaDashboard() {
  return (
    <DashboardLayout pageTitle="Dashboard do Lojista" role="lojista" userName="Auto Center BH">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Veículos no Estoque", value: "32", icon: Package, trend: "+5 esta semana" },
            { title: "Procurados Agora", value: "8", icon: Search, trend: "25% do estoque" },
            { title: "Matches Este Mês", value: "14", icon: Zap, trend: "+40% vs anterior" },
            { title: "Conversões", value: "4", icon: TrendingUp, trend: "28.6% de taxa" },
          ].map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Veículos sendo procurados */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-5 w-5 text-primary" />
                Veículos do Estoque Sendo Procurados
              </CardTitle>
              <CardDescription>
                Estes veículos do seu estoque têm demanda ativa na rede
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead className="hidden sm:table-cell">Cidade</TableHead>
                    <TableHead className="text-center">Interessados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDealerStoreStock
                    .filter((s) => s.matchCount > 0)
                    .sort((a, b) => b.matchCount - a.matchCount)
                    .map((item) => (
                      <TableRow key={item.model}>
                        <TableCell className="font-medium text-sm">{item.model}</TableCell>
                        <TableCell className="text-sm">{formatBRL(item.price)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {item.city}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={item.matchCount >= 3 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {item.matchCount} {item.matchCount === 1 ? "interessado" : "interessados"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Upload de estoque */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="h-5 w-5 text-primary" />
                  Atualizar Estoque
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Arraste um arquivo ou clique aqui</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      CSV, XLS, XLSX ou PDF (máx. 10MB)
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Selecionar arquivo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Último upload: 13/04/2026 — 32 veículos processados
                </p>
              </CardContent>
            </Card>

            {/* Matches recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Matches Recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0 px-4 pb-4">
                <MatchesList matches={mockMatches.slice(0, 2)} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
