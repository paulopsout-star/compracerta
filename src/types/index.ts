export type UserRole = "vendedor" | "gestor" | "lojista" | "admin";

export type UrgencyLevel = "baixa" | "media" | "alta";

export type WishStatus =
  | "procurando"
  | "match_encontrado"
  | "em_negociacao"
  | "convertido"
  | "perdido"
  | "expirado";

export type OfferSource = "avaliador" | "marketplace" | "estoque_lojista";

export type MatchStatus = "novo" | "notificado" | "aceito" | "rejeitado" | "convertido";

export type NotificationChannel = "whatsapp" | "email" | "sistema";

export type NotificationStatus = "pendente" | "enviado" | "entregue" | "lido" | "respondido" | "erro";

export type TransmissionType = "manual" | "automatico" | "indiferente";

export type FuelType = "flex" | "gasolina" | "diesel" | "hibrido" | "eletrico" | "indiferente";

export type UploadFormat = "csv" | "xls" | "xlsx" | "pdf";

export type UploadStatus = "processando" | "concluido" | "erro" | "revisao_pendente";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  dealershipId?: string;
  dealerStoreId?: string;
  active: boolean;
  createdAt: Date;
}

export interface Dealership {
  id: string;
  name: string;
  cnpj: string;
  city: string;
  state: string;
  active: boolean;
}

export interface DealerStore {
  id: string;
  name: string;
  cnpj: string;
  city: string;
  state: string;
  active: boolean;
  canalRepasseId?: string;
}

export interface Wish {
  id: string;
  sellerId: string;
  clientName: string;
  clientPhone: string;
  clientCpf?: string;
  clientEmail?: string;
  brand: string;
  model: string;
  version?: string;
  yearMin?: number;
  yearMax?: number;
  kmMax?: number;
  priceMin?: number;
  priceMax?: number;
  colors: string[];
  transmission: TransmissionType;
  fuel: FuelType;
  cityRef?: string;
  stateRef?: string;
  radiusKm: number;
  urgency: UrgencyLevel;
  validityDays: number;
  notes?: string;
  lgpdConsent: boolean;
  status: WishStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface Offer {
  id: string;
  source: OfferSource;
  sourceId: string;
  plate?: string;
  brand: string;
  model: string;
  version?: string;
  year: number;
  km: number;
  color?: string;
  price: number;
  city: string;
  state: string;
  active: boolean;
  syncedAt: Date;
  /** Status original da fonte externa (ex: "Avaliado", "Publicado", "Pendente" do Avaliador Digital) */
  externalStatus?: string;
  /** Nome do vendedor/avaliador responsável (da fonte externa) */
  externalSellerName?: string;
  /** Nome da concessionária/unidade (da fonte externa) */
  externalDealershipName?: string;
}

export interface Match {
  id: string;
  wishId: string;
  offerId: string;
  score: number;
  status: MatchStatus;
  createdAt: Date;
  convertedAt?: Date;
  wish?: Wish;
  offer?: Offer;
}

export interface Notification {
  id: string;
  matchId: string;
  recipientId: string;
  channel: NotificationChannel;
  template: string;
  content: string;
  status: NotificationStatus;
  sentAt?: Date;
  readAt?: Date;
  respondedAt?: Date;
}

export interface StockUpload {
  id: string;
  dealerStoreId: string;
  fileUrl: string;
  format: UploadFormat;
  status: UploadStatus;
  linesProcessed: number;
  linesWithError: number;
  createdAt: Date;
}

export interface DashboardStats {
  totalWishes: number;
  activeWishes: number;
  totalMatches: number;
  conversionRate: number;
  avgTimeToMatch: number;
}
