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
