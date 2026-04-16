interface WhatsAppMessage {
  to: string;
  template: string;
  parameters: Record<string, string>;
}

interface WhatsAppResponse {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
}

const WHATSAPP_TEMPLATES = {
  match_vendedor: {
    name: "compracerta_match_vendedor",
    body: "🚗 Encontramos um {{vehicle}} {{year}} em {{city}}! Preço: {{price}}. Acesse o sistema para detalhes.",
  },
  match_avaliador: {
    name: "compracerta_match_avaliador",
    body: "📋 Este veículo está na lista de desejos de {{count}} vendedor(es) da rede.",
  },
  match_lojista: {
    name: "compracerta_match_lojista",
    body: "📢 Um vendedor da rede tem um cliente interessado no {{vehicle}} placa {{plate}}. Quer ser conectado?",
  },
  match_concessionaria: {
    name: "compracerta_match_concessionaria",
    body: "🔔 Interesse qualificado no anúncio do {{vehicle}}. Um vendedor da rede tem um cliente buscando este veículo.",
  },
  confirmacao_disponibilidade: {
    name: "compracerta_confirma_disponibilidade",
    body: "📦 O {{vehicle}} ainda está disponível no seu estoque? Responda SIM para manter ativo ou NÃO para remover.",
  },
  follow_up_venda: {
    name: "compracerta_follow_up",
    body: "👋 Olá! O match com o {{vehicle}} resultou em venda? Responda SIM ou NÃO para nos ajudar a melhorar.",
  },
} as const;

type TemplateName = keyof typeof WHATSAPP_TEMPLATES;

function formatPhoneForAPI(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("55")) return cleaned;
  return `55${cleaned}`;
}

function renderTemplate(template: TemplateName, params: Record<string, string>): string {
  let body: string = WHATSAPP_TEMPLATES[template].body;
  for (const [key, value] of Object.entries(params)) {
    body = body.replace(`{{${key}}}`, value);
  }
  return body;
}

export async function sendWhatsAppMessage(
  phone: string,
  template: TemplateName,
  parameters: Record<string, string>
): Promise<WhatsAppResponse> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiUrl || !apiToken || !phoneNumberId) {
    console.warn("[WhatsApp] API not configured, skipping send");
    return {
      messageId: `mock-${Date.now()}`,
      status: "sent",
    };
  }

  const formattedPhone = formatPhoneForAPI(phone);
  const templateConfig = WHATSAPP_TEMPLATES[template];

  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateConfig.name,
      language: { code: "pt_BR" },
      components: [
        {
          type: "body",
          parameters: Object.values(parameters).map((value) => ({
            type: "text",
            text: value,
          })),
        },
      ],
    },
  };

  try {
    const response = await fetch(
      `${apiUrl}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[WhatsApp] Send failed:", error);
      return { messageId: "", status: "failed", error };
    }

    const data = await response.json();
    return {
      messageId: data.messages?.[0]?.id ?? "",
      status: "sent",
    };
  } catch (error) {
    console.error("[WhatsApp] Network error:", error);
    return {
      messageId: "",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendMatchNotification(params: {
  sellerPhone: string;
  vehicleName: string;
  year: number;
  city: string;
  price: string;
}) {
  return sendWhatsAppMessage("match_vendedor" as unknown as string, "match_vendedor", {
    vehicle: params.vehicleName,
    year: String(params.year),
    city: params.city,
    price: params.price,
  });
}

export { WHATSAPP_TEMPLATES, renderTemplate, formatPhoneForAPI };
export type { TemplateName, WhatsAppMessage, WhatsAppResponse };
