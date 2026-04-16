export interface SelectOption {
  value: string;
  label: string;
}

export const BRANDS: SelectOption[] = [
  { value: "fiat", label: "Fiat" },
  { value: "chevrolet", label: "Chevrolet" },
  { value: "volkswagen", label: "Volkswagen" },
  { value: "toyota", label: "Toyota" },
  { value: "hyundai", label: "Hyundai" },
  { value: "honda", label: "Honda" },
  { value: "jeep", label: "Jeep" },
  { value: "renault", label: "Renault" },
  { value: "nissan", label: "Nissan" },
  { value: "ford", label: "Ford" },
  { value: "peugeot", label: "Peugeot" },
  { value: "citroen", label: "Citroën" },
  { value: "mitsubishi", label: "Mitsubishi" },
  { value: "bmw", label: "BMW" },
  { value: "mercedes-benz", label: "Mercedes-Benz" },
  { value: "audi", label: "Audi" },
  { value: "kia", label: "Kia" },
  { value: "caoa-chery", label: "CAOA Chery" },
  { value: "volvo", label: "Volvo" },
  { value: "ram", label: "RAM" },
];

export const MODELS_BY_BRAND: Record<string, SelectOption[]> = {
  fiat: [
    { value: "argo", label: "Argo" },
    { value: "cronos", label: "Cronos" },
    { value: "mobi", label: "Mobi" },
    { value: "pulse", label: "Pulse" },
    { value: "fastback", label: "Fastback" },
    { value: "strada", label: "Strada" },
    { value: "toro", label: "Toro" },
  ],
  chevrolet: [
    { value: "onix", label: "Onix" },
    { value: "onix-plus", label: "Onix Plus" },
    { value: "tracker", label: "Tracker" },
    { value: "s10", label: "S10" },
    { value: "spin", label: "Spin" },
    { value: "montana", label: "Montana" },
  ],
  volkswagen: [
    { value: "polo", label: "Polo" },
    { value: "virtus", label: "Virtus" },
    { value: "t-cross", label: "T-Cross" },
    { value: "nivus", label: "Nivus" },
    { value: "taos", label: "Taos" },
    { value: "saveiro", label: "Saveiro" },
    { value: "amarok", label: "Amarok" },
  ],
  toyota: [
    { value: "corolla", label: "Corolla" },
    { value: "corolla-cross", label: "Corolla Cross" },
    { value: "yaris", label: "Yaris" },
    { value: "hilux", label: "Hilux" },
    { value: "sw4", label: "SW4" },
    { value: "rav4", label: "RAV4" },
  ],
  hyundai: [
    { value: "hb20", label: "HB20" },
    { value: "hb20s", label: "HB20S" },
    { value: "creta", label: "Creta" },
    { value: "tucson", label: "Tucson" },
    { value: "santa-fe", label: "Santa Fe" },
  ],
  honda: [
    { value: "civic", label: "Civic" },
    { value: "city", label: "City" },
    { value: "hr-v", label: "HR-V" },
    { value: "wr-v", label: "WR-V" },
    { value: "cr-v", label: "CR-V" },
    { value: "zr-v", label: "ZR-V" },
  ],
  jeep: [
    { value: "renegade", label: "Renegade" },
    { value: "compass", label: "Compass" },
    { value: "commander", label: "Commander" },
    { value: "wrangler", label: "Wrangler" },
  ],
  renault: [
    { value: "kwid", label: "Kwid" },
    { value: "sandero", label: "Sandero" },
    { value: "logan", label: "Logan" },
    { value: "duster", label: "Duster" },
    { value: "oroch", label: "Oroch" },
    { value: "captur", label: "Captur" },
  ],
  nissan: [
    { value: "kicks", label: "Kicks" },
    { value: "versa", label: "Versa" },
    { value: "sentra", label: "Sentra" },
    { value: "frontier", label: "Frontier" },
  ],
  ford: [
    { value: "ranger", label: "Ranger" },
    { value: "territory", label: "Territory" },
    { value: "bronco-sport", label: "Bronco Sport" },
    { value: "maverick", label: "Maverick" },
  ],
  peugeot: [
    { value: "208", label: "208" },
    { value: "2008", label: "2008" },
    { value: "3008", label: "3008" },
    { value: "partner", label: "Partner" },
  ],
  citroen: [
    { value: "c3", label: "C3" },
    { value: "c3-aircross", label: "C3 Aircross" },
    { value: "c4-cactus", label: "C4 Cactus" },
  ],
  mitsubishi: [
    { value: "outlander", label: "Outlander" },
    { value: "eclipse-cross", label: "Eclipse Cross" },
    { value: "l200", label: "L200 Triton" },
    { value: "pajero-sport", label: "Pajero Sport" },
  ],
  bmw: [
    { value: "320i", label: "320i" },
    { value: "x1", label: "X1" },
    { value: "x3", label: "X3" },
    { value: "x5", label: "X5" },
  ],
  "mercedes-benz": [
    { value: "c200", label: "C 200" },
    { value: "gla-200", label: "GLA 200" },
    { value: "glb-200", label: "GLB 200" },
    { value: "gle-400", label: "GLE 400" },
  ],
  audi: [
    { value: "a3", label: "A3" },
    { value: "q3", label: "Q3" },
    { value: "q5", label: "Q5" },
    { value: "a4", label: "A4" },
  ],
  kia: [
    { value: "sportage", label: "Sportage" },
    { value: "seltos", label: "Seltos" },
    { value: "cerato", label: "Cerato" },
    { value: "carnival", label: "Carnival" },
  ],
  "caoa-chery": [
    { value: "tiggo-5x", label: "Tiggo 5X" },
    { value: "tiggo-7", label: "Tiggo 7" },
    { value: "tiggo-8", label: "Tiggo 8" },
    { value: "arrizo-6", label: "Arrizo 6" },
  ],
  volvo: [
    { value: "xc40", label: "XC40" },
    { value: "xc60", label: "XC60" },
    { value: "s60", label: "S60" },
  ],
  ram: [
    { value: "rampage", label: "Rampage" },
    { value: "1500", label: "1500" },
    { value: "2500", label: "2500" },
    { value: "3500", label: "3500" },
  ],
};

export const BRAZILIAN_STATES: SelectOption[] = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

export const CAR_COLORS: SelectOption[] = [
  { value: "branco", label: "Branco" },
  { value: "prata", label: "Prata" },
  { value: "preto", label: "Preto" },
  { value: "cinza", label: "Cinza" },
  { value: "vermelho", label: "Vermelho" },
  { value: "azul", label: "Azul" },
  { value: "marrom", label: "Marrom" },
  { value: "bege", label: "Bege" },
  { value: "verde", label: "Verde" },
  { value: "amarelo", label: "Amarelo" },
  { value: "laranja", label: "Laranja" },
  { value: "dourado", label: "Dourado" },
];

export const TRANSMISSION_OPTIONS: SelectOption[] = [
  { value: "indiferente", label: "Indiferente" },
  { value: "automatico", label: "Automático" },
  { value: "manual", label: "Manual" },
];

export const FUEL_OPTIONS: SelectOption[] = [
  { value: "indiferente", label: "Indiferente" },
  { value: "flex", label: "Flex" },
  { value: "gasolina", label: "Gasolina" },
  { value: "diesel", label: "Diesel" },
  { value: "hibrido", label: "Híbrido" },
  { value: "eletrico", label: "Elétrico" },
];

export const URGENCY_OPTIONS: SelectOption[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

export const VALIDITY_OPTIONS: SelectOption[] = [
  { value: "15", label: "15 dias" },
  { value: "30", label: "30 dias" },
  { value: "60", label: "60 dias" },
  { value: "90", label: "90 dias" },
];
