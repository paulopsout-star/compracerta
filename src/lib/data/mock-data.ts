import type {
  Wish,
  Offer,
  Match,
  Notification,
  DashboardStats,
  User,
} from "@/types";

export const mockSellers: User[] = [
  { id: "u1", name: "João Silva", email: "joao@conc.com", phone: "(31) 99999-0001", role: "vendedor", dealershipId: "d1", active: true, createdAt: new Date("2025-06-01") },
  { id: "u2", name: "Maria Santos", email: "maria@conc.com", phone: "(31) 99999-0002", role: "vendedor", dealershipId: "d1", active: true, createdAt: new Date("2025-07-15") },
  { id: "u3", name: "Carlos Oliveira", email: "carlos@conc.com", phone: "(31) 99999-0003", role: "vendedor", dealershipId: "d1", active: true, createdAt: new Date("2025-08-20") },
  { id: "u4", name: "Ana Souza", email: "ana@conc.com", phone: "(31) 99999-0004", role: "vendedor", dealershipId: "d1", active: true, createdAt: new Date("2025-09-10") },
];

export const mockWishes: Wish[] = [
  {
    id: "w1", sellerId: "u1", clientName: "Roberto Mendes", clientPhone: "(31) 98765-4321",
    brand: "Honda", model: "Civic", yearMin: 2021, yearMax: 2024, kmMax: 50000,
    priceMin: 100000, priceMax: 130000, colors: ["preto", "prata"],
    transmission: "automatico", fuel: "flex", cityRef: "Belo Horizonte", stateRef: "MG",
    radiusKm: 100, urgency: "alta", validityDays: 30, lgpdConsent: true,
    status: "procurando", createdAt: new Date("2026-04-10"), expiresAt: new Date("2026-05-10"),
  },
  {
    id: "w2", sellerId: "u1", clientName: "Fernanda Lima", clientPhone: "(31) 91234-5678",
    brand: "Toyota", model: "Corolla", yearMin: 2020, yearMax: 2024, kmMax: 60000,
    priceMin: 110000, priceMax: 150000, colors: [],
    transmission: "automatico", fuel: "indiferente", cityRef: "Belo Horizonte", stateRef: "MG",
    radiusKm: 150, urgency: "media", validityDays: 60, lgpdConsent: true,
    status: "match_encontrado", createdAt: new Date("2026-04-05"), expiresAt: new Date("2026-06-05"),
  },
  {
    id: "w3", sellerId: "u2", clientName: "Pedro Costa", clientPhone: "(31) 92345-6789",
    brand: "Fiat", model: "Argo", yearMin: 2022, yearMax: 2025, kmMax: 30000,
    priceMin: 60000, priceMax: 85000, colors: ["branco", "cinza"],
    transmission: "indiferente", fuel: "flex", cityRef: "Contagem", stateRef: "MG",
    radiusKm: 50, urgency: "baixa", validityDays: 30, lgpdConsent: true,
    status: "procurando", createdAt: new Date("2026-04-12"), expiresAt: new Date("2026-05-12"),
  },
  {
    id: "w4", sellerId: "u2", clientName: "Lucia Ferreira", clientPhone: "(31) 93456-7890",
    brand: "Volkswagen", model: "T-Cross", yearMin: 2021, yearMax: 2024, kmMax: 40000,
    priceMin: 90000, priceMax: 120000, colors: [],
    transmission: "automatico", fuel: "flex", cityRef: "Betim", stateRef: "MG",
    radiusKm: 80, urgency: "alta", validityDays: 15, lgpdConsent: true,
    status: "em_negociacao", createdAt: new Date("2026-04-08"), expiresAt: new Date("2026-04-23"),
  },
  {
    id: "w5", sellerId: "u3", clientName: "Marcos Almeida", clientPhone: "(62) 98765-0001",
    brand: "Jeep", model: "Compass", yearMin: 2020, yearMax: 2023, kmMax: 70000,
    priceMin: 120000, priceMax: 160000, colors: ["preto"],
    transmission: "automatico", fuel: "diesel", cityRef: "Goiânia", stateRef: "GO",
    radiusKm: 200, urgency: "media", validityDays: 60, lgpdConsent: true,
    status: "convertido", createdAt: new Date("2026-03-01"), expiresAt: new Date("2026-05-01"),
  },
  {
    id: "w6", sellerId: "u3", clientName: "Renata Dias", clientPhone: "(62) 91234-0002",
    brand: "Hyundai", model: "Creta", yearMin: 2022, yearMax: 2025, kmMax: 35000,
    priceMin: 95000, priceMax: 130000, colors: ["branco", "prata", "cinza"],
    transmission: "automatico", fuel: "flex", cityRef: "Goiânia", stateRef: "GO",
    radiusKm: 100, urgency: "alta", validityDays: 30, lgpdConsent: true,
    status: "procurando", createdAt: new Date("2026-04-14"), expiresAt: new Date("2026-05-14"),
  },
  {
    id: "w7", sellerId: "u4", clientName: "Thiago Rocha", clientPhone: "(31) 94567-8901",
    brand: "Chevrolet", model: "Tracker", yearMin: 2021, yearMax: 2024, kmMax: 45000,
    priceMin: 85000, priceMax: 115000, colors: [],
    transmission: "automatico", fuel: "flex", stateRef: "MG",
    radiusKm: 150, urgency: "media", validityDays: 30, lgpdConsent: true,
    status: "perdido", createdAt: new Date("2026-02-15"), expiresAt: new Date("2026-03-15"),
  },
  {
    id: "w8", sellerId: "u4", clientName: "Camila Nunes", clientPhone: "(31) 95678-9012",
    brand: "Fiat", model: "Pulse", yearMin: 2023, yearMax: 2025, kmMax: 20000,
    priceMin: 80000, priceMax: 100000, colors: ["vermelho", "preto"],
    transmission: "automatico", fuel: "flex", cityRef: "Belo Horizonte", stateRef: "MG",
    radiusKm: 50, urgency: "baixa", validityDays: 90, lgpdConsent: true,
    status: "expirado", createdAt: new Date("2025-12-01"), expiresAt: new Date("2026-03-01"),
  },
];

export const mockOffers: Offer[] = [
  { id: "o1", source: "marketplace", sourceId: "mp-001", brand: "Honda", model: "Civic", version: "EXL 2.0", year: 2022, km: 32000, color: "Preto", price: 125000, city: "Belo Horizonte", state: "MG", active: true, syncedAt: new Date("2026-04-15") },
  { id: "o2", source: "avaliador", sourceId: "av-001", brand: "Toyota", model: "Corolla", version: "XEi 2.0", year: 2021, km: 45000, color: "Prata", price: 128000, city: "Contagem", state: "MG", active: true, syncedAt: new Date("2026-04-14") },
  { id: "o3", source: "estoque_lojista", sourceId: "el-001", plate: "BET2A34", brand: "Fiat", model: "Argo", version: "Trekking 1.3", year: 2023, km: 18000, color: "Branco", price: 72000, city: "Belo Horizonte", state: "MG", active: true, syncedAt: new Date("2026-04-13") },
  { id: "o4", source: "marketplace", sourceId: "mp-002", brand: "Volkswagen", model: "T-Cross", version: "Highline TSI", year: 2022, km: 28000, color: "Cinza", price: 108000, city: "Betim", state: "MG", active: true, syncedAt: new Date("2026-04-12") },
  { id: "o5", source: "avaliador", sourceId: "av-002", brand: "Jeep", model: "Compass", version: "Longitude Diesel", year: 2021, km: 55000, color: "Preto", price: 142000, city: "Goiânia", state: "GO", active: true, syncedAt: new Date("2026-04-11") },
  { id: "o6", source: "estoque_lojista", sourceId: "el-002", plate: "GHI3J45", brand: "Hyundai", model: "Creta", version: "Ultimate 2.0", year: 2023, km: 22000, color: "Branco", price: 118000, city: "Goiânia", state: "GO", active: true, syncedAt: new Date("2026-04-10") },
  { id: "o7", source: "marketplace", sourceId: "mp-003", brand: "Chevrolet", model: "Tracker", version: "Premier Turbo", year: 2022, km: 35000, color: "Vermelho", price: 98000, city: "Uberlândia", state: "MG", active: true, syncedAt: new Date("2026-04-09") },
  { id: "o8", source: "avaliador", sourceId: "av-003", brand: "Fiat", model: "Pulse", version: "Impetus Turbo", year: 2024, km: 12000, color: "Preto", price: 95000, city: "Belo Horizonte", state: "MG", active: true, syncedAt: new Date("2026-04-08") },
  { id: "o9", source: "estoque_lojista", sourceId: "el-003", plate: "JKL4M56", brand: "Honda", model: "HR-V", version: "EXL CVT", year: 2023, km: 25000, color: "Prata", price: 135000, city: "Belo Horizonte", state: "MG", active: true, syncedAt: new Date("2026-04-07") },
  { id: "o10", source: "marketplace", sourceId: "mp-004", brand: "Toyota", model: "Corolla Cross", version: "XRE Hybrid", year: 2023, km: 18000, color: "Branco", price: 175000, city: "Ribeirão das Neves", state: "MG", active: true, syncedAt: new Date("2026-04-06") },
];

export const mockMatches: Match[] = [
  { id: "m1", wishId: "w1", offerId: "o1", score: 95, status: "notificado", createdAt: new Date("2026-04-15") },
  { id: "m2", wishId: "w2", offerId: "o2", score: 88, status: "aceito", createdAt: new Date("2026-04-14") },
  { id: "m3", wishId: "w3", offerId: "o3", score: 92, status: "novo", createdAt: new Date("2026-04-13") },
  { id: "m4", wishId: "w4", offerId: "o4", score: 85, status: "notificado", createdAt: new Date("2026-04-12") },
  { id: "m5", wishId: "w5", offerId: "o5", score: 78, status: "convertido", createdAt: new Date("2026-03-15"), convertedAt: new Date("2026-03-20") },
  { id: "m6", wishId: "w6", offerId: "o6", score: 55, status: "novo", createdAt: new Date("2026-04-14") },
];

export const mockNotifications: Notification[] = [
  { id: "n1", matchId: "m1", recipientId: "u1", channel: "whatsapp", template: "match_vendedor", content: "🚗 Encontramos um Honda Civic EXL 2022 em BH! Preço: R$ 125.000. Acesse o sistema para detalhes.", status: "entregue", sentAt: new Date("2026-04-15T10:30:00") },
  { id: "n2", matchId: "m2", recipientId: "u1", channel: "whatsapp", template: "match_vendedor", content: "🚗 Encontramos um Toyota Corolla XEi 2021 em Contagem! Preço: R$ 128.000.", status: "lido", sentAt: new Date("2026-04-14T14:00:00"), readAt: new Date("2026-04-14T14:15:00") },
  { id: "n3", matchId: "m3", recipientId: "u2", channel: "sistema", template: "match_vendedor", content: "Novo match encontrado para o desejo de Pedro Costa: Fiat Argo Trekking 2023.", status: "enviado", sentAt: new Date("2026-04-13T09:00:00") },
  { id: "n4", matchId: "m4", recipientId: "u2", channel: "whatsapp", template: "match_vendedor", content: "🚗 VW T-Cross Highline 2022 disponível em Betim por R$ 108.000!", status: "respondido", sentAt: new Date("2026-04-12T11:00:00"), readAt: new Date("2026-04-12T11:30:00"), respondedAt: new Date("2026-04-12T11:32:00") },
  { id: "n5", matchId: "m5", recipientId: "u3", channel: "whatsapp", template: "match_vendedor", content: "🚗 Jeep Compass Longitude Diesel 2021 em Goiânia! R$ 142.000.", status: "lido", sentAt: new Date("2026-03-15T16:00:00"), readAt: new Date("2026-03-15T16:10:00") },
];

export const mockDashboardStats: DashboardStats = {
  totalWishes: 47,
  activeWishes: 23,
  totalMatches: 34,
  conversionRate: 18.5,
  avgTimeToMatch: 3.2,
};

export const mockTeamStats = [
  { seller: "João Silva", wishes: 12, matches: 8, conversions: 3, rate: 25.0 },
  { seller: "Maria Santos", wishes: 15, matches: 10, conversions: 4, rate: 26.7 },
  { seller: "Carlos Oliveira", wishes: 10, matches: 9, conversions: 2, rate: 20.0 },
  { seller: "Ana Souza", wishes: 10, matches: 7, conversions: 1, rate: 10.0 },
];

export const mockWishesByStatus = [
  { status: "Procurando", count: 23, fill: "var(--color-chart-1)" },
  { status: "Match Encontrado", count: 8, fill: "var(--color-chart-2)" },
  { status: "Em Negociação", count: 5, fill: "var(--color-chart-3)" },
  { status: "Convertido", count: 7, fill: "var(--color-chart-4)" },
  { status: "Perdido/Expirado", count: 4, fill: "var(--color-chart-5)" },
];

export const mockMatchesByMonth = [
  { month: "Nov", matches: 12 },
  { month: "Dez", matches: 18 },
  { month: "Jan", matches: 22 },
  { month: "Fev", matches: 28 },
  { month: "Mar", matches: 31 },
  { month: "Abr", matches: 34 },
];

export const mockTopModels = [
  { model: "Honda Civic", count: 8 },
  { model: "Toyota Corolla", count: 7 },
  { model: "Jeep Compass", count: 6 },
  { model: "VW T-Cross", count: 5 },
  { model: "Hyundai Creta", count: 5 },
];

export const mockDealerStoreStock = [
  { model: "Fiat Argo Trekking 2023", price: 72000, matchCount: 3, city: "BH" },
  { model: "Hyundai Creta Ultimate 2023", price: 118000, matchCount: 2, city: "Goiânia" },
  { model: "Honda HR-V EXL 2023", price: 135000, matchCount: 1, city: "BH" },
  { model: "Chevrolet Onix Plus 2024", price: 82000, matchCount: 0, city: "Contagem" },
  { model: "Toyota Corolla XEi 2022", price: 120000, matchCount: 4, city: "BH" },
];

export function getMatchWithDetails(matchId: string) {
  const match = mockMatches.find((m) => m.id === matchId);
  if (!match) return null;
  return {
    ...match,
    wish: mockWishes.find((w) => w.id === match.wishId),
    offer: mockOffers.find((o) => o.id === match.offerId),
  };
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} sem`;
  return date.toLocaleDateString("pt-BR");
}
