"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { HelpCircle, MessageCircle, FileText, Mail } from "lucide-react";

const FAQ = [
  { q: "Como cadastrar um desejo de compra?", a: "Acesse 'Cadastrar Desejo' no menu lateral, preencha os dados do cliente e do veículo desejado, e clique em 'Cadastrar Desejo'." },
  { q: "Como funciona o matching automático?", a: "O sistema varre continuamente as bases de veículos (Avaliador Digital, Marketplace e Estoque de Lojistas) e cruza com os desejos cadastrados. Quando há compatibilidade >= 70%, uma notificação é enviada." },
  { q: "O que significam os scores de match?", a: "Score >= 80: match excelente. Score 60-79: boa sugestão. Score 50-59: possibilidade. Abaixo de 50: ignorado." },
  { q: "Como o lojista atualiza o estoque?", a: "O lojista pode fazer upload de arquivo CSV, XLS ou XLSX com os veículos, ou cadastrar manualmente cada veículo." },
  { q: "Meu desejo expirou, o que fazer?", a: "Desejos têm validade de 15 a 90 dias. Após expirar, você pode criar um novo desejo com os mesmos dados." },
];

export default function AjudaPage() {
  return (
    <DashboardLayout subtitle="Tire suas dúvidas sobre o Compra Certa">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="card-tradox">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-6 h-6 text-[#2563EB]" />
            <h2 className="text-[20px] font-semibold text-[#111827]">Central de Ajuda</h2>
          </div>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between cursor-pointer py-3 px-4 rounded-[10px] hover:bg-[#F7F8FA] transition-colors">
                  <span className="text-[14px] font-medium text-[#111827]">{item.q}</span>
                </summary>
                <p className="text-[14px] text-[#5B6370] px-4 pb-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="card-tradox">
          <h3 className="text-[16px] font-semibold text-[#111827] mb-4">Precisa de mais ajuda?</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: MessageCircle, label: "WhatsApp Suporte", desc: "(31) 99999-0000" },
              { icon: Mail, label: "E-mail", desc: "suporte@canaldorepasse.com.br" },
              { icon: FileText, label: "Documentação", desc: "docs.canaldorepasse.com.br" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-4 rounded-[10px] bg-[#F7F8FA]">
                <item.icon className="w-5 h-5 text-[#2563EB] mt-0.5" />
                <div>
                  <p className="text-[13px] font-medium text-[#111827]">{item.label}</p>
                  <p className="text-[12px] text-[#9AA0AB]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
