"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WishForm } from "@/components/forms/wish-form";

export default function NovoDesejoPage() {
  return (
    <DashboardLayout role="vendedor" subtitle="Cadastre o veículo que seu cliente procura">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-[20px] font-semibold text-[#111827] mb-2">Novo Desejo de Compra</h2>
          <p className="text-[14px] text-[#5B6370]">
            O sistema fará uma varredura contínua nas bases do ecossistema Canal do Repasse
            e notificará você quando encontrar um match.
          </p>
        </div>
        <WishForm />
      </div>
    </DashboardLayout>
  );
}
