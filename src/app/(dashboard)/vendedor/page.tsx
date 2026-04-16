"use client";

import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { WishesTable } from "@/components/dashboard/wishes-table";
import { MatchesList } from "@/components/dashboard/matches-list";
import { RecentNotifications } from "@/components/dashboard/recent-notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  mockWishes,
  mockMatches,
  mockNotifications,
  mockDashboardStats,
} from "@/lib/data/mock-data";

export default function VendedorDashboard() {
  const sellerWishes = mockWishes.filter((w) => w.sellerId === "u1");

  return (
    <DashboardLayout pageTitle="Dashboard do Vendedor" role="vendedor">
      <div className="space-y-6">
        {/* Stats */}
        <StatsCards {...mockDashboardStats} />

        {/* Action */}
        <div className="flex justify-end">
          <Link href="/desejos/novo">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Desejo
            </Button>
          </Link>
        </div>

        {/* Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meus Desejos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <WishesTable wishes={sellerWishes} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Matches Recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0 px-4 pb-4">
                <MatchesList matches={mockMatches.slice(0, 3)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notificações</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RecentNotifications notifications={mockNotifications.slice(0, 4)} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
