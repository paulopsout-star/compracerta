import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg(process.env.DIRECT_URL || process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create dealership
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
  console.log("✓ Dealership:", dealership.name);

  // Create dealer store
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
  console.log("✓ Dealer Store:", dealerStore.name);

  const passwordHash = await hash("123456", 12);

  // Create demo users
  const users = [
    {
      name: "João Silva",
      email: "vendedor@compracerta.com",
      phone: "(31) 99999-0001",
      role: "vendedor" as const,
      dealershipId: dealership.id,
    },
    {
      name: "Ricardo Pereira",
      email: "gestor@compracerta.com",
      phone: "(31) 99999-0002",
      role: "gestor" as const,
      dealershipId: dealership.id,
    },
    {
      name: "Auto Center BH",
      email: "lojista@compracerta.com",
      phone: "(31) 99999-0003",
      role: "lojista" as const,
      dealerStoreId: dealerStore.id,
    },
    {
      name: "Admin Sistema",
      email: "admin@compracerta.com",
      phone: "(31) 99999-0004",
      role: "admin" as const,
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { passwordHash },
      create: {
        ...userData,
        passwordHash,
      },
    });
    console.log(`✓ User: ${user.email} (${user.role})`);
  }

  // Create sample wishes
  const vendedor = await prisma.user.findUnique({
    where: { email: "vendedor@compracerta.com" },
  });

  if (vendedor) {
    const wishes = [
      {
        sellerId: vendedor.id,
        dealershipId: dealership.id,
        clientName: "Roberto Mendes",
        clientPhone: "(31) 98765-4321",
        brand: "Honda",
        model: "Civic",
        yearMin: 2021,
        yearMax: 2024,
        kmMax: 50000,
        priceMin: 100000,
        priceMax: 130000,
        colors: ["preto", "prata"],
        transmission: "automatico" as const,
        fuel: "flex" as const,
        cityRef: "Belo Horizonte",
        stateRef: "MG",
        radiusKm: 100,
        urgency: "alta" as const,
        validityDays: 30,
        lgpdConsent: true,
        status: "procurando" as const,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        sellerId: vendedor.id,
        dealershipId: dealership.id,
        clientName: "Fernanda Lima",
        clientPhone: "(31) 91234-5678",
        brand: "Toyota",
        model: "Corolla",
        yearMin: 2020,
        yearMax: 2024,
        kmMax: 60000,
        priceMin: 110000,
        priceMax: 150000,
        colors: [],
        transmission: "automatico" as const,
        fuel: "indiferente" as const,
        cityRef: "Belo Horizonte",
        stateRef: "MG",
        radiusKm: 150,
        urgency: "media" as const,
        validityDays: 60,
        lgpdConsent: true,
        status: "procurando" as const,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
      {
        sellerId: vendedor.id,
        dealershipId: dealership.id,
        clientName: "Lucia Ferreira",
        clientPhone: "(31) 93456-7890",
        brand: "Volkswagen",
        model: "T-Cross",
        yearMin: 2021,
        yearMax: 2024,
        kmMax: 40000,
        priceMin: 90000,
        priceMax: 120000,
        colors: [],
        transmission: "automatico" as const,
        fuel: "flex" as const,
        cityRef: "Betim",
        stateRef: "MG",
        radiusKm: 80,
        urgency: "alta" as const,
        validityDays: 15,
        lgpdConsent: true,
        status: "procurando" as const,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const wishData of wishes) {
      await prisma.wish.create({ data: wishData });
    }
    console.log(`✓ ${wishes.length} wishes created`);
  }

  // Create sample offers
  const lojista = await prisma.user.findUnique({
    where: { email: "lojista@compracerta.com" },
  });

  const offers = [
    {
      source: "marketplace" as const,
      sourceId: "mp-001",
      brand: "Honda",
      model: "Civic",
      version: "EXL 2.0",
      year: 2022,
      km: 32000,
      color: "Preto",
      price: 125000,
      city: "Belo Horizonte",
      state: "MG",
    },
    {
      source: "avaliador" as const,
      sourceId: "av-001",
      brand: "Toyota",
      model: "Corolla",
      version: "XEi 2.0",
      year: 2021,
      km: 45000,
      color: "Prata",
      price: 128000,
      city: "Contagem",
      state: "MG",
    },
    {
      source: "estoque_lojista" as const,
      sourceId: "el-001",
      plate: "BET2A34",
      brand: "Fiat",
      model: "Argo",
      version: "Trekking 1.3",
      year: 2023,
      km: 18000,
      color: "Branco",
      price: 72000,
      city: "Belo Horizonte",
      state: "MG",
      dealerStoreId: dealerStore.id,
    },
    {
      source: "marketplace" as const,
      sourceId: "mp-002",
      brand: "Volkswagen",
      model: "T-Cross",
      version: "Highline TSI",
      year: 2022,
      km: 28000,
      color: "Cinza",
      price: 108000,
      city: "Betim",
      state: "MG",
    },
    {
      source: "estoque_lojista" as const,
      sourceId: "el-002",
      plate: "GHI3J45",
      brand: "Hyundai",
      model: "Creta",
      version: "Ultimate 2.0",
      year: 2023,
      km: 22000,
      color: "Branco",
      price: 118000,
      city: "Belo Horizonte",
      state: "MG",
      dealerStoreId: dealerStore.id,
    },
  ];

  for (const offerData of offers) {
    await prisma.offer.create({ data: offerData });
  }
  console.log(`✓ ${offers.length} offers created`);

  console.log("\n✅ Seed completed!");
  console.log("\n📋 Demo credentials (password: 123456):");
  console.log("  vendedor@compracerta.com");
  console.log("  gestor@compracerta.com");
  console.log("  lojista@compracerta.com");
  console.log("  admin@compracerta.com");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
