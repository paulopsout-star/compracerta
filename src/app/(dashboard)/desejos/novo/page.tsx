"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WishForm } from "@/components/forms/wish-form";

export default function NovoDesejoPage() {
  return (
    <DashboardLayout pageTitle="Novo Desejo de Compra" role="vendedor">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Cadastre o veículo que seu cliente deseja comprar. O sistema fará uma
            varredura contínua nas bases do ecossistema Canal do Repasse e notificará
            você quando encontrar um match.
          </p>
        </div>
        <WishForm />
      </div>
    </DashboardLayout>
  );
}
