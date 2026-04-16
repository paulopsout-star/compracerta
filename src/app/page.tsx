import Link from "next/link";
import { Car, Search, Zap, Bell, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg">Compra Certa</span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                Canal do Repasse
              </span>
            </div>
          </div>
          <Link href="/login">
            <Button>Entrar</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="h-4 w-4" />
              Novo no ecossistema Canal do Repasse
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Transforme desejos em{" "}
              <span className="text-primary">vendas reais</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Conecte automaticamente os veiculos que seus clientes procuram com as
              ofertas disponíveis no ecossistema. Notificação via WhatsApp em tempo real.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Começar agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#como-funciona">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Como funciona
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
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
                  "O sistema varre continuamente 3 bases: Avaliador Digital, Marketplace e Estoque de Lojistas para encontrar o veículo ideal.",
              },
              {
                icon: Bell,
                title: "3. Notificação instantânea",
                description:
                  "Quando há match, todas as partes recebem notificação via WhatsApp para fechar o negócio rapidamente.",
              },
            ].map((step) => (
              <div key={step.title} className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
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
              <div key={profile.title} className="border rounded-xl p-6 space-y-3">
                <h3 className="font-semibold text-lg">{profile.title}</h3>
                <ul className="space-y-2">
                  {profile.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
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
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            <span className="font-semibold">Compra Certa</span>
            <span className="text-xs text-muted-foreground">by Canal do Repasse</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Canal do Repasse. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
