import { z } from "zod";

function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(cleaned[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  return rem === parseInt(cleaned[10]);
}

const currentYear = new Date().getFullYear();

export const wishSchema = z
  .object({
    clientName: z
      .string()
      .min(3, "Nome deve ter pelo menos 3 caracteres")
      .max(100, "Nome muito longo"),
    clientPhone: z
      .string()
      .regex(
        /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/,
        "Telefone inválido. Use o formato (XX) XXXXX-XXXX"
      ),
    clientCpf: z
      .string()
      .optional()
      .refine((val) => !val || validateCPF(val), "CPF inválido"),
    clientEmail: z
      .string()
      .email("E-mail inválido")
      .optional()
      .or(z.literal("")),
    brand: z.string().min(1, "Marca é obrigatória"),
    model: z.string().min(1, "Modelo é obrigatório"),
    version: z.string().optional(),
    yearMin: z.coerce
      .number()
      .min(2000, "Ano mínimo deve ser a partir de 2000")
      .max(currentYear + 1, `Ano máximo é ${currentYear + 1}`)
      .optional(),
    yearMax: z.coerce
      .number()
      .min(2000, "Ano mínimo deve ser a partir de 2000")
      .max(currentYear + 1, `Ano máximo é ${currentYear + 1}`)
      .optional(),
    kmMax: z.coerce.number().positive("Quilometragem deve ser positiva").optional(),
    priceMin: z.coerce.number().positive("Preço deve ser positivo").optional(),
    priceMax: z.coerce.number().positive("Preço deve ser positivo").optional(),
    colors: z.array(z.string()).default([]),
    transmission: z.enum(["manual", "automatico", "indiferente"]).default("indiferente"),
    fuel: z
      .enum(["flex", "gasolina", "diesel", "hibrido", "eletrico", "indiferente"])
      .default("indiferente"),
    cityRef: z.string().optional(),
    stateRef: z
      .string()
      .length(2, "UF deve ter 2 caracteres")
      .optional()
      .or(z.literal("")),
    radiusKm: z.coerce.number().min(10).max(500).default(100),
    urgency: z.enum(["baixa", "media", "alta"]).default("media"),
    validityDays: z.coerce.number().refine((v) => [15, 30, 60, 90].includes(v), {
      message: "Validade deve ser 15, 30, 60 ou 90 dias",
    }),
    notes: z.string().max(500, "Observações devem ter no máximo 500 caracteres").optional(),
    lgpdConsent: z.boolean().refine((val) => val === true, {
      message: "Você deve aceitar os termos de consentimento LGPD",
    }),
  })
  .refine(
    (data) => {
      if (data.yearMin && data.yearMax) return data.yearMax >= data.yearMin;
      return true;
    },
    { message: "Ano máximo deve ser maior ou igual ao ano mínimo", path: ["yearMax"] }
  )
  .refine(
    (data) => {
      if (data.priceMin && data.priceMax) return data.priceMax >= data.priceMin;
      return true;
    },
    { message: "Preço máximo deve ser maior ou igual ao preço mínimo", path: ["priceMax"] }
  );

export type WishFormData = z.input<typeof wishSchema>;
