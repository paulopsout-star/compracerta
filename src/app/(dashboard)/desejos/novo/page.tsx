"use client";

import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WishForm } from "@/components/forms/wish-form";
import type { WishFormData } from "@/lib/validators/wish";

export default function NovoDesejoPage() {
  const router = useRouter();

  async function handleSubmit(data: WishFormData) {
    const res = await fetch("/api/desejos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Erro ao cadastrar desejo");
    }

    // Trigger matching after creation
    fetch("/api/matching", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {});

    router.push("/vendedor/desejos");
  }

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
        <WishForm onSubmit={handleSubmit} />
      </div>
    </DashboardLayout>
  );
}
