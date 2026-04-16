import type { Wish, Offer } from "@/types";

interface MatchResult {
  offerId: string;
  wishId: string;
  score: number;
  breakdown: {
    brandModel: number;
    year: number;
    km: number;
    price: number;
    color: number;
    transmission: number;
    fuel: number;
    location: number;
  };
}

const WEIGHTS = {
  brandModel: 30,
  year: 15,
  km: 10,
  price: 20,
  color: 5,
  transmission: 5,
  fuel: 5,
  location: 10,
};

const PRICE_TOLERANCE = 0.05; // 5% tolerance

function normalizeBrand(brand: string): string {
  return brand.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeModel(model: string): string {
  return model.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function scoreBrandModel(wish: Wish, offer: Offer): number {
  const wishBrand = normalizeBrand(wish.brand);
  const offerBrand = normalizeBrand(offer.brand);
  const wishModel = normalizeModel(wish.model);
  const offerModel = normalizeModel(offer.model);

  if (wishBrand !== offerBrand) return 0;
  if (wishModel === offerModel) return 100;
  if (offerModel.includes(wishModel) || wishModel.includes(offerModel)) return 80;
  return 0;
}

function scoreYear(wish: Wish, offer: Offer): number {
  if (!wish.yearMin && !wish.yearMax) return 100;
  const year = offer.year;
  const min = wish.yearMin ?? 0;
  const max = wish.yearMax ?? 9999;

  if (year >= min && year <= max) return 100;

  const diff = year < min ? min - year : year - max;
  if (diff <= 1) return 70;
  if (diff <= 2) return 40;
  return 0;
}

function scoreKm(wish: Wish, offer: Offer): number {
  if (!wish.kmMax) return 100;
  if (offer.km <= wish.kmMax) return 100;

  const excess = ((offer.km - wish.kmMax) / wish.kmMax) * 100;
  if (excess <= 10) return 70;
  if (excess <= 20) return 40;
  return 0;
}

function scorePrice(wish: Wish, offer: Offer): number {
  if (!wish.priceMin && !wish.priceMax) return 100;

  const min = wish.priceMin ?? 0;
  const max = wish.priceMax ?? Infinity;
  const price = offer.price;
  const tolerance = max * PRICE_TOLERANCE;

  if (price >= min && price <= max) return 100;
  if (price > max && price <= max + tolerance) return 75;
  if (price < min && price >= min - tolerance) return 75;

  const diff = price < min ? min - price : price - max;
  const range = max - min || max;
  const pctOff = (diff / range) * 100;

  if (pctOff <= 10) return 50;
  if (pctOff <= 20) return 25;
  return 0;
}

function scoreColor(wish: Wish, offer: Offer): number {
  if (!wish.colors || wish.colors.length === 0) return 100;
  if (!offer.color) return 50;
  const offerColor = offer.color.toLowerCase().trim();
  return wish.colors.some((c) => c.toLowerCase().trim() === offerColor) ? 100 : 30;
}

function scoreTransmission(wish: Wish, offer: Offer): number {
  if (wish.transmission === "indiferente") return 100;
  // Without transmission info on offer, give partial score
  return 70;
}

function scoreFuel(wish: Wish, offer: Offer): number {
  if (wish.fuel === "indiferente") return 100;
  return 70;
}

function scoreLocation(wish: Wish, offer: Offer): number {
  if (!wish.cityRef && !wish.stateRef) return 100;
  if (wish.stateRef && offer.state.toLowerCase() === wish.stateRef.toLowerCase()) {
    if (wish.cityRef && offer.city.toLowerCase() === wish.cityRef.toLowerCase()) return 100;
    return 70;
  }
  return 30;
}

export function calculateMatchScore(wish: Wish, offer: Offer): MatchResult {
  const breakdown = {
    brandModel: scoreBrandModel(wish, offer),
    year: scoreYear(wish, offer),
    km: scoreKm(wish, offer),
    price: scorePrice(wish, offer),
    color: scoreColor(wish, offer),
    transmission: scoreTransmission(wish, offer),
    fuel: scoreFuel(wish, offer),
    location: scoreLocation(wish, offer),
  };

  // If brand/model doesn't match at all, score is 0
  if (breakdown.brandModel === 0) {
    return { offerId: offer.id, wishId: wish.id, score: 0, breakdown };
  }

  const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const weightedScore =
    (breakdown.brandModel * WEIGHTS.brandModel +
      breakdown.year * WEIGHTS.year +
      breakdown.km * WEIGHTS.km +
      breakdown.price * WEIGHTS.price +
      breakdown.color * WEIGHTS.color +
      breakdown.transmission * WEIGHTS.transmission +
      breakdown.fuel * WEIGHTS.fuel +
      breakdown.location * WEIGHTS.location) /
    totalWeight;

  return {
    offerId: offer.id,
    wishId: wish.id,
    score: Math.round(weightedScore * 10) / 10,
    breakdown,
  };
}

export function findMatches(
  wishes: Wish[],
  offers: Offer[],
  minScore: number = 50
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const wish of wishes) {
    if (wish.status !== "procurando") continue;

    for (const offer of offers) {
      if (!offer.active) continue;

      const result = calculateMatchScore(wish, offer);
      if (result.score >= minScore) {
        results.push(result);
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export const MATCH_THRESHOLDS = {
  AUTO_NOTIFY: 70,
  SUGGESTION: 50,
  IGNORE: 0,
} as const;
