"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Wish } from "@/types";
import { formatBRL, formatRelativeDate } from "@/lib/data/mock-data";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  procurando: { label: "Procurando", variant: "default" },
  match_encontrado: { label: "Match!", variant: "secondary" },
  em_negociacao: { label: "Em Negociação", variant: "outline" },
  convertido: { label: "Convertido", variant: "secondary" },
  perdido: { label: "Perdido", variant: "destructive" },
  expirado: { label: "Expirado", variant: "destructive" },
};

const URGENCY_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  baixa: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

interface WishesTableProps {
  wishes: Wish[];
}

export function WishesTable({ wishes }: WishesTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead className="hidden md:table-cell">Faixa de Preço</TableHead>
            <TableHead className="hidden sm:table-cell">Urgência</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Data</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {wishes.map((wish) => {
            const statusConfig = STATUS_CONFIG[wish.status] ?? STATUS_CONFIG.procurando;
            return (
              <TableRow key={wish.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{wish.clientName}</p>
                    <p className="text-xs text-muted-foreground">{wish.clientPhone}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-sm">
                    {wish.brand} {wish.model}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {wish.yearMin}–{wish.yearMax}
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {wish.priceMin && wish.priceMax
                    ? `${formatBRL(wish.priceMin)} – ${formatBRL(wish.priceMax)}`
                    : "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                      URGENCY_COLORS[wish.urgency]
                    )}
                  >
                    {wish.urgency === "media" ? "Média" : wish.urgency}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusConfig.variant} className="text-xs">
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {formatRelativeDate(wish.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CheckCircle className="mr-2 h-4 w-4" /> Marcar como vendido
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <XCircle className="mr-2 h-4 w-4" /> Cancelar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
