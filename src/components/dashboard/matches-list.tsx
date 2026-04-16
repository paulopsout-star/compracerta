"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL, formatRelativeDate, mockWishes, mockOffers } from "@/lib/data/mock-data";
import type { Match } from "@/types";

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  avaliador: { label: "Avaliador", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  marketplace: { label: "Marketplace", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  estoque_lojista: { label: "Lojista", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

function getScoreColor(score: number) {
  if (score >= 80) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

interface MatchesListProps {
  matches: Match[];
}

export function MatchesList({ matches }: MatchesListProps) {
  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const offer = mockOffers.find((o) => o.id === match.offerId);
        const wish = mockWishes.find((w) => w.id === match.wishId);
        if (!offer || !wish) return null;

        const sourceConfig = SOURCE_LABELS[offer.source] ?? SOURCE_LABELS.marketplace;

        return (
          <Card key={match.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold", getScoreColor(match.score))}>
                      {match.score}%
                    </span>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", sourceConfig.className)}>
                      {sourceConfig.label}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm">
                    {offer.brand} {offer.model}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {offer.version} · {offer.year} · {offer.km.toLocaleString("pt-BR")} km
                  </p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {formatBRL(offer.price)}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {offer.city}/{offer.state}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para: {wish.clientName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Button size="sm" className="flex-1 h-8 text-xs">
                  <Link2 className="mr-1 h-3.5 w-3.5" /> Conectar
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  <X className="mr-1 h-3.5 w-3.5" /> Rejeitar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
