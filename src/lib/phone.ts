/**
 * Normalização de telefones brasileiros — regra do "9" mobile.
 *
 * Desde 2014 todo celular BR tem 11 dígitos (DDD + 9 + 8 dígitos), mas o
 * provedor WhatsApp/Meta às vezes entrega números antigos sem o "9", e
 * cadastros legados também podem estar nesse formato. Para qualquer entrada
 * mobile válida geramos as duas variantes — com e sem o 9 — em ordem de
 * preferência (com 9 primeiro, que é o padrão atual).
 *
 * Uso típico:
 *   - DB lookup: testar todas as variantes para tolerar legado.
 *   - APIs externas (Avaliador): tentar com 9, fallback sem 9.
 *   - Persistência: usar `toCanonicalE164` para gravar sempre na forma com 9.
 */

const COUNTRY_CODE = "55";

interface BrPhoneParts {
  ddd: string;        // 2 dígitos
  subscriber: string; // 8 ou 9 dígitos
}

function parseBrPhone(input: string): BrPhoneParts | null {
  const digits = input.replace(/\D/g, "");
  const noDdi = digits.startsWith(COUNTRY_CODE) ? digits.slice(COUNTRY_CODE.length) : digits;
  if (noDdi.length !== 10 && noDdi.length !== 11) return null;
  return { ddd: noDdi.slice(0, 2), subscriber: noDdi.slice(2) };
}

function isMobileSubscriber(subscriber: string): boolean {
  return /^[6-9]/.test(subscriber);
}

/**
 * Retorna as variantes possíveis (apenas dígitos, sem DDI, sem +) cobrindo
 * a regra do 9. Para fixos/inválidos retorna o número original. Para celular
 * sempre retorna [comNove, semNove] nessa ordem.
 */
export function brazilianPhoneVariants(input: string): string[] {
  const parts = parseBrPhone(input);
  if (!parts) return [];

  const { ddd, subscriber } = parts;

  if (subscriber.length === 8) {
    if (!isMobileSubscriber(subscriber)) {
      return [`${ddd}${subscriber}`];
    }
    return [`${ddd}9${subscriber}`, `${ddd}${subscriber}`];
  }

  if (subscriber[0] !== "9") {
    return [`${ddd}${subscriber}`];
  }

  const last8 = subscriber.slice(1);
  return [`${ddd}9${last8}`, `${ddd}${last8}`];
}

/**
 * Como `brazilianPhoneVariants`, mas em E.164 completo (`+55...`).
 */
export function phoneE164Variants(input: string): string[] {
  return brazilianPhoneVariants(input).map((d) => `+${COUNTRY_CODE}${d}`);
}

/**
 * Forma canônica E.164 — preferida para persistência e exibição.
 * Para celular retorna sempre com o 9. Retorna null se inválido.
 */
export function toCanonicalE164(input: string): string | null {
  const variants = phoneE164Variants(input);
  return variants[0] ?? null;
}
