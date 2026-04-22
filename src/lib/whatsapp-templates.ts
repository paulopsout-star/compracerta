/**
 * Templates WhatsApp do Compra Certa — spec seção 11.
 *
 * Sintaxe de variáveis: {{ var }}  (com ou sem espaços).
 * Blocos condicionais opcionais: {{#if var}}...{{/if}} — renderizam apenas se
 * `var` é truthy e não vazio (strings "" e null são tratadas como falsy).
 */

export const WHATSAPP_TEMPLATES = {
  boas_vindas: `👋 Olá, {{ vendedor_nome }}! Sou o assistente do *Compra Certa*.

Posso te ajudar a:
🚗 Cadastrar um desejo de cliente
🔍 Ver seus desejos ativos
📊 Acompanhar matches encontrados

*Para começar, me diga o que o cliente procura.*
Exemplo: _"Quero um Civic 2022 automático, até 120 mil"_

Digite *ajuda* a qualquer momento para ver os comandos.`,

  numero_nao_cadastrado: `Olá! Esse número não está cadastrado no *Compra Certa* nem na base do *Avaliador Digital*.

Para solicitar acesso, entre em contato com o *gestor da sua concessionária*.

Seus dados *não foram armazenados* nesta conversa.`,

  vendedor_inativo: `Olá, {{ vendedor_nome }}.

Seu cadastro está temporariamente inativo no *Compra Certa*. Para reativar, procure seu gestor na concessionária ou envie e-mail para suporte@canaldorepasse.com.br.`,

  escolher_concessionaria: `Você atua em mais de uma unidade da rede. Em qual você está atendendo esse cliente?

{{ lista_concessionarias_numeradas }}

Responda com o número da opção.`,

  pergunta_marca_modelo: `🚗 Qual marca e modelo o cliente procura?

_Exemplos: Honda Civic, Jeep Compass, Toyota Corolla_`,

  pergunta_ano: `📅 Qual faixa de ano?

_Exemplos: "2020 a 2023" ou "a partir de 2021" ou "só 2022"_`,

  pergunta_preco: `💰 Qual o orçamento máximo?

_Pode mandar assim: "120 mil" ou "R$ 130000" ou "até 100k"_`,

  pergunta_cliente: `👤 Qual o nome e telefone do cliente?

_Formato: João Silva - (31) 98888-7777_

Esses dados serão usados apenas para buscar o veículo na rede, conforme nossa política de privacidade.`,

  pergunta_consentimento_lgpd: `🔒 *Consentimento do cliente* (LGPD)

O cliente autorizou que os dados dele (nome e telefone) sejam usados pelo Compra Certa para buscar o veículo na rede do Canal do Repasse?

Responda *SIM* ou *NÃO*.`,

  confirmacao_desejo: `📝 *Confere aí antes de eu cadastrar:*

🚗 *Veículo*
{{ marca }} {{ modelo }}{{#if versao}} {{ versao }}{{/if}}
Ano: {{ ano_min }} a {{ ano_max }}
{{#if km_max_linha}}{{ km_max_linha }}
{{/if}}{{#if cambio_linha}}{{ cambio_linha }}
{{/if}}{{#if cor_linha}}{{ cor_linha }}
{{/if}}
💰 *Orçamento*
{{#if preco_min_linha}}{{ preco_min_linha }}
{{/if}}Até R$ {{ preco_max_formatted }}

👤 *Cliente*
{{ cliente_nome }} - {{ cliente_telefone_formatted }}

📍 *Região*
{{ cidade_ref }} - {{ estado }}
Raio: {{ raio_km }}km

⏱ *Urgência*: {{ urgencia }}
📅 *Validade*: {{ validade_dias }} dias

Pode cadastrar?
1️⃣ SIM, cadastrar
2️⃣ EDITAR algum dado
3️⃣ CANCELAR`,

  cadastro_confirmado: `✅ *Desejo cadastrado com sucesso!*

ID: #{{ desejo_id_short }}
{{ marca }} {{ modelo }} {{ ano_min }}-{{ ano_max }}

Já estou procurando na rede. Vou te avisar aqui mesmo assim que encontrar um match.

_Enquanto isso, você pode:_
📊 Enviar *status* para ver seus desejos ativos
❓ Enviar *ajuda* para ver os comandos`,

  match_encontrado: `🎯 *Encontramos um match!*

*{{ marca }} {{ modelo }}{{#if versao}} {{ versao }}{{/if}} {{ ano }}*
📏 {{ km_formatted }} km
🎨 {{ cor }}
💰 R$ {{ preco_formatted }}

📊 *Aderência: {{ score }}%*
{{ score_detalhamento_bullets }}

🏢 *Onde está*
{{ origem_label }}
{{ origem_detalhes }}
Status: {{ status_veiculo }}

👤 *Contato*
{{ contato_nome }}
{{ contato_telefone }}

{{#if alternativas_linha}}{{ alternativas_linha }}

{{/if}}_Responda:_
*1* - Ver mais detalhes
*2* - Próxima opção ({{ alt_count }} alternativas)
*3* - Encaminhar resumo para o cliente`,

  notificacao_gestor: `🔔 *Compra Certa: oportunidade na sua unidade*

Um vendedor da rede tem um cliente interessado em um veículo da sua unidade.

🚗 *Veículo*
{{ marca }} {{ modelo }} {{ ano }}
Placa: {{ placa_mascarada }}

📋 *Situação do veículo*
{{ origem_situacao }}
{{ origem_colaborador }}

🔍 *Desejo do cliente (resumo)*
Faixa de preço: R$ {{ preco_min_k }}k–{{ preco_max_k }}k
Região: {{ regiao }}
Urgência: {{ urgencia }}

👤 *Vendedor interessado*
{{ vendedor_nome }}
{{ vendedor_concessionaria }}
{{ vendedor_telefone }}

_Entre em contato para agilizar o repasse._

{{ unsubscribe_footer }}`,

  sem_match: `Sem matches por enquanto para o *{{ marca }} {{ modelo }}* ({{ ano_range }}).

Vou continuar varrendo a rede e te aviso assim que algo aparecer. O desejo fica ativo por {{ validade_dias }} dias.

_Dica_: você pode enviar *status* a qualquer momento para acompanhar.`,

  sessao_timeout: `⏱ Vi que você parou o cadastro no meio.

Seu rascunho foi salvo e fica disponível por 24h. Quando quiser retomar, me manda uma nova mensagem que eu te levo de onde parou.`,

  retomar_rascunho: `👋 Oi de novo, {{ vendedor_nome }}!

Você tem um cadastro em andamento:
*{{ resumo_rascunho }}*

Quer:
1️⃣ RETOMAR esse cadastro
2️⃣ Começar um NOVO desejo
3️⃣ Ver STATUS dos desejos ativos`,

  duplicata_detectada: `🔍 Encontrei um desejo parecido que você cadastrou há {{ dias_atras }} dias:

*{{ resumo_desejo_existente }}*

Você quer:
1️⃣ ATUALIZAR o existente
2️⃣ Criar um NOVO desejo (caso seja outro cliente)
3️⃣ CANCELAR`,

  limite_diario: `Você já cadastrou {{ limite }} desejos hoje. Esse é o limite diário do sistema.

Os cadastros voltam a ser liberados amanhã às 00h. Se precisa cadastrar mais urgência, fale com seu gestor.`,

  ajuda_menu: `📱 *Comandos do Compra Certa*

🚗 _Cadastrar desejo:_ me diga o que o cliente procura
📊 *status* - ver seus desejos ativos
🔢 *próximo* - ver próxima opção de match
📄 *detalhes* - detalhes do match atual
↪️ *encaminhar* - texto pronto pro cliente
❌ *cancelar* - cancelar o que está fazendo
📊 *relatorio* - link do seu dashboard
❓ *ajuda* - este menu

Quer começar um cadastro? É só me dizer o modelo que o cliente procura.`,

  feedback_conversao: `Oi, {{ vendedor_nome }}! Passando pra saber:

O match do *{{ marca }} {{ modelo }}* que encontramos 3 dias atrás resultou em venda?

1️⃣ SIM, fechamos
2️⃣ Em NEGOCIAÇÃO
3️⃣ NÃO fechou
4️⃣ Cliente desistiu`,

  manutencao: `⚙️ O Compra Certa está em manutenção programada.

Previsão de retorno: {{ previsao_retorno }}.

Desculpe o transtorno. Se a urgência for alta, entre em contato: suporte@canaldorepasse.com.br`,

  encaminhar_cliente: `Oi, {{ cliente_nome }}! 👋

Encontramos uma boa opção pro carro que você procura:

🚗 *{{ marca }} {{ modelo }}{{#if versao}} {{ versao }}{{/if}} {{ ano }}*
📏 {{ km_formatted }} km
🎨 {{ cor }}
💰 R$ {{ preco_formatted }}
📍 {{ cidade }}

Quer que eu agende uma visita? Me avisa que já organizo tudo.`,
} as const;

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATES;

type Primitive = string | number | boolean | null | undefined;
export type TemplateVars = Record<string, Primitive>;

function isTruthy(v: Primitive): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return !Number.isNaN(v);
  return true;
}

function toStr(v: Primitive): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/**
 * Renderiza template resolvendo {{#if var}}...{{/if}} e {{ var }}.
 * Variáveis ausentes renderizam como string vazia (não lança erro).
 */
export function renderTemplate(name: WhatsAppTemplateName, vars: TemplateVars = {}): string {
  let body: string = WHATSAPP_TEMPLATES[name];

  // {{#if var}}...{{/if}} — não-greedy para permitir vários blocos no mesmo template
  body = body.replace(/\{\{#if\s+([a-zA-Z_][\w]*)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key: string, inner: string) => {
    return isTruthy(vars[key]) ? inner : "";
  });

  // {{ var }} simples
  body = body.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_, key: string) => toStr(vars[key]));

  return body;
}

/**
 * Formata valor BRL — "R$ 120.000".
 */
export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/**
 * Formata telefone BR para exibição: +5531988887777 → (31) 98888-7777.
 */
export function formatPhoneBR(e164: string): string {
  const cleaned = e164.replace(/\D/g, "");
  const nat = cleaned.startsWith("55") ? cleaned.slice(2) : cleaned;
  if (nat.length === 11) return `(${nat.slice(0, 2)}) ${nat.slice(2, 7)}-${nat.slice(7)}`;
  if (nat.length === 10) return `(${nat.slice(0, 2)}) ${nat.slice(2, 6)}-${nat.slice(6)}`;
  return e164;
}
