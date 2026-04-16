import Link from "next/link";
import { Search, Zap, Bell, ArrowRight, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#EEF0F3]">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-[#2563EB] text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-[16px] text-[#111827]">Compra Certa</span>
              <span className="text-[11px] text-[#9AA0AB] ml-2 hidden sm:inline">
                by Canal do Repasse
              </span>
            </div>
          </div>
          <Link
            href="/login"
            className="h-[40px] px-6 rounded-[10px] bg-[#2563EB] text-white text-[14px] font-medium inline-flex items-center hover:brightness-90 transition-all"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center bg-[#F7F8FA]">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(37,99,235,0.08)] text-[#2563EB] text-[13px] font-semibold">
              <Zap className="h-4 w-4" />
              Novo no ecossistema Canal do Repasse
            </div>
            <h1 className="text-[40px] md:text-[48px] lg:text-[56px] font-bold tracking-tight leading-[1.1] text-[#111827]">
              Transforme desejos em{" "}
              <span className="text-[#2563EB]">vendas reais</span>
            </h1>
            <p className="text-[16px] md:text-[18px] text-[#5B6370] max-w-2xl mx-auto leading-relaxed">
              Conecte automaticamente os veículos que seus clientes procuram com as
              ofertas disponíveis no ecossistema. Notificação via WhatsApp em tempo real.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/login"
                className="h-[48px] px-8 rounded-[10px] bg-[#2563EB] text-white text-[15px] font-medium inline-flex items-center gap-2 hover:brightness-90 transition-all w-full sm:w-auto justify-center"
              >
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#como-funciona"
                className="h-[48px] px-8 rounded-[10px] bg-[#1A1D23] text-white text-[15px] font-medium inline-flex items-center hover:bg-[#2A2E35] transition-colors w-full sm:w-auto justify-center"
              >
                Como funciona
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-[28px] md:text-[32px] font-bold text-center text-[#111827] mb-12">
            Como funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: Search,
                title: "1. Cadastre o desejo",
                description:
                  "O vendedor registra o veículo que o cliente procura com marca, modelo, faixa de preço e preferências.",
              },
              {
                icon: Zap,
                title: "2. Matching automático",
                description:
                  "O sistema varre continuamente 3 bases: Avaliador Digital, Marketplace e Estoque de Lojistas.",
              },
              {
                icon: Bell,
                title: "3. Notificação instantânea",
                description:
                  "Quando há match, todas as partes recebem notificação via WhatsApp para fechar o negócio.",
              },
            ].map((step) => (
              <div key={step.title} className="text-center space-y-4">
                <div className="quick-action-circle mx-auto">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="text-[18px] font-semibold text-[#111827]">{step.title}</h3>
                <p className="text-[14px] text-[#5B6370] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24 bg-[#F7F8FA]">
        <div className="container mx-auto px-4">
          <h2 className="text-[28px] md:text-[32px] font-bold text-center text-[#111827] mb-12">
            Benefícios para cada perfil
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: "Vendedores",
                items: [
                  "Converta leads que seriam perdidos em vendas",
                  "Acompanhe desejos e matches em tempo real",
                  "Receba notificações direto no WhatsApp",
                ],
              },
              {
                title: "Gestores",
                items: [
                  "Dashboard completo da equipe de vendas",
                  "Ranking de performance e conversão",
                  "Insights de demanda da sua região",
                ],
              },
              {
                title: "Lojistas",
                items: [
                  "Seu estoque ativamente procurado por compradores",
                  "Upload simples de planilha ou PDF",
                  "Aumento de giro do estoque",
                ],
              },
              {
                title: "Avaliadores",
                items: [
                  "Saiba se o carro tem demanda antes de precificar",
                  "Notificação integrada ao Avaliador Digital",
                  "Decisão de compra mais assertiva",
                ],
              },
            ].map((profile) => (
              <div key={profile.title} className="card-tradox space-y-3">
                <h3 className="font-semibold text-[16px] text-[#111827]">{profile.title}</h3>
                <ul className="space-y-2.5">
                  {profile.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#5B6370]">
                      <CheckCircle className="h-4 w-4 text-[#2563EB] mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#EEF0F3] py-8 bg-white">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-[#2563EB] text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <span className="font-semibold text-[14px] text-[#111827]">Compra Certa</span>
            <span className="text-[11px] text-[#9AA0AB]">by Canal do Repasse</span>
          </div>
          <p className="text-[12px] text-[#9AA0AB]">
            &copy; {new Date().getFullYear()} Canal do Repasse. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
