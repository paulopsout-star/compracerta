"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Search, CheckCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: { value: number; label: string };
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

function StatCard({ title, value, trend, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p
            className={cn(
              "text-xs mt-1",
              trend.value >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsCardsProps {
  totalWishes?: number;
  activeWishes?: number;
  totalMatches?: number;
  conversionRate?: number;
}

export function StatsCards({
  totalWishes = 47,
  activeWishes = 23,
  totalMatches = 34,
  conversionRate = 18.5,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total de Desejos"
        value={totalWishes}
        trend={{ value: 12, label: "vs. mês anterior" }}
        icon={TrendingUp}
      />
      <StatCard
        title="Desejos Ativos"
        value={activeWishes}
        trend={{ value: 8, label: "vs. mês anterior" }}
        icon={Search}
      />
      <StatCard
        title="Matches Encontrados"
        value={totalMatches}
        trend={{ value: 23, label: "vs. mês anterior" }}
        icon={CheckCircle}
      />
      <StatCard
        title="Taxa de Conversão"
        value={`${conversionRate}%`}
        trend={{ value: 3.2, label: "vs. mês anterior" }}
        icon={Target}
      />
    </div>
  );
}
