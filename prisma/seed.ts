import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg(process.env.DIRECT_URL || process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

/**
 * Seed mínimo — cria apenas as entidades necessárias para login
 * (usuários demo, 1 concessionária, 1 lojista).
 * NÃO cria desejos, ofertas, matches ou notificações — a plataforma começa
 * "limpa" e os dados reais são criados pelos usuários.
 */

async function main() {
  console.log("🌱 Seeding database (usuários e estrutura organizacional apenas)...");

  const dealership = await prisma.dealership.upsert({
    where: { cnpj: "12345678000100" },
    update: {},
    create: {
      name: "Concessionária Estrela BH",
      cnpj: "12345678000100",
      city: "Belo Horizonte",
      state: "MG",
    },
  });
  console.log(`✓ Dealership: ${dealership.name}`);

  const dealerStore = await prisma.dealerStore.upsert({
    where: { cnpj: "98765432000100" },
    update: {},
    create: {
      name: "Auto Center BH",
      cnpj: "98765432000100",
      city: "Belo Horizonte",
      state: "MG",
      canalRepasseId: "cr-001",
    },
  });
  console.log(`✓ Dealer Store: ${dealerStore.name}`);

  const passwordHash = await hash("123456", 12);

  const users = [
    { name: "João Silva", email: "vendedor@compracerta.com", phone: "(31) 99999-0001", role: "vendedor" as const, dealershipId: dealership.id },
    { name: "Ricardo Pereira", email: "gestor@compracerta.com", phone: "(31) 99999-0002", role: "gestor" as const, dealershipId: dealership.id },
    { name: "Auto Center BH", email: "lojista@compracerta.com", phone: "(31) 99999-0003", role: "lojista" as const, dealerStoreId: dealerStore.id },
    { name: "Admin Sistema", email: "admin@compracerta.com", phone: "(31) 99999-0004", role: "admin" as const },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { passwordHash },
      create: { ...userData, passwordHash },
    });
    console.log(`✓ User: ${user.email} (${user.role})`);
  }

  // Feature flags — WhatsApp conversacional (Z-API). Idempotente: cria ausentes,
  // não sobrescreve valores já customizados por admins.
  const flagDefaults: Array<{ key: string; enabled: boolean; value?: unknown; description: string }> = [
    { key: "whatsapp.inbound.enabled",  enabled: true,  description: "Recebimento de mensagens WhatsApp" },
    { key: "whatsapp.outbound.enabled", enabled: true,  description: "Envio de mensagens WhatsApp" },
    { key: "whatsapp.zapi.enabled",     enabled: true,  description: "Usa Z-API como provedor (fallback: Meta Cloud)" },
    { key: "whatsapp.shadow_mode",      enabled: false, description: "Processa sem enviar resposta (QA)" },
    { key: "conversation.llm.enabled",  enabled: true,  description: "Usa LLM para extração" },
    { key: "conversation.llm.provider", enabled: true,  value: "claude", description: "claude | openai | auto" },
    { key: "conversation.llm.model",    enabled: true,  value: "claude-sonnet-4-5", description: "Modelo do LLM" },
    { key: "conversation.audio_transcription.enabled", enabled: false, description: "Transcrição de áudios (Whisper)" },
    { key: "conversation.image_recognition.enabled",   enabled: false, description: "Reconhecimento de fotos" },
    { key: "conversation.session_timeout_minutes",     enabled: true,  value: 30, description: "Timeout de sessão (min)" },
    { key: "conversation.draft_expiration_hours",      enabled: true,  value: 24, description: "Validade do rascunho (h)" },
    { key: "wish.creation.enabled",            enabled: true,  description: "Criação de novos desejos" },
    { key: "wish.duplicate_detection.enabled", enabled: true,  description: "Detecção de duplicatas" },
    { key: "wish.max_per_seller_per_day",      enabled: true,  value: 20, description: "Limite diário" },
    { key: "wish.require_client_consent",      enabled: true,  description: "LGPD — não desligar em prod" },
    { key: "match.auto_notify.enabled",           enabled: true,  description: "Notificação automática de match" },
    { key: "match.notify_origin_manager.enabled", enabled: true,  description: "Notifica gestor de origem" },
    { key: "match.min_score_threshold",           enabled: true,  value: 70, description: "Score mínimo (0-100)" },
    { key: "match.max_alternatives",              enabled: true,  value: 10, description: "Máx alternativas por grupo" },
    { key: "notification.window_start_hour",      enabled: true,  value: 7,  description: "Início janela envio (BRT)" },
    { key: "notification.window_end_hour",        enabled: true,  value: 22, description: "Fim janela envio (BRT)" },
    { key: "notification.urgency_override_window",enabled: true,  description: "Urgência alta ignora janela" },
    { key: "notification.email_fallback.enabled", enabled: true,  description: "Fallback por e-mail" },
    { key: "feedback.conversion_check.enabled",   enabled: true,  description: "Pergunta D+3 pós match" },
    { key: "rate_limit.inbound_per_min_per_user", enabled: true, value: 10, description: "Msgs/min recebidas por usuário" },
    { key: "rate_limit.outbound_per_min_global",  enabled: true, value: 60, description: "Msgs/min global envio" },
    { key: "logging.verbose.enabled",   enabled: false, description: "Logs detalhados" },
    { key: "maintenance_mode.enabled",  enabled: false, description: "Modo manutenção" },
  ];

  for (const f of flagDefaults) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: {}, // não sobrescreve valores customizados
      create: {
        key: f.key,
        enabled: f.enabled,
        value: (f.value ?? null) as never,
        description: f.description,
        environment: "production",
      },
    });
  }
  console.log(`✓ Feature flags: ${flagDefaults.length} (idempotente)`);

  console.log("\n✅ Seed completed — plataforma pronta, sem dados fictícios");
  console.log("\n📋 Credenciais demo (senha: 123456):");
  console.log("   vendedor@compracerta.com");
  console.log("   gestor@compracerta.com");
  console.log("   lojista@compracerta.com");
  console.log("   admin@compracerta.com");
}

main()
  .catch((e) => { console.error("❌ Seed error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
