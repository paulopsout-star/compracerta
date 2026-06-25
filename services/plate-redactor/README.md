# plate-redactor

Worker que cobre a **placa** das fotos das ofertas (Avaliador Digital) antes de
exibi-las ao usuario. Le a fila `offer_images` (Postgres/Supabase), baixa cada
foto, detecta a placa com **YOLO**, **borra** a regiao (ou **esconde** a foto na
duvida) e re-hospeda a versao tratada no **Supabase Storage**.

Roda **fora da Vercel** (serverless nao serve pra inferencia continua). Use um
container em Railway / Render / Fly.io / VPS.

## Como funciona

```
offer_images (status=pending)  ->  worker  ->  Storage (bucket publico)
                                      |
                                      +-> offer_images.status = done | hidden | error
```

- O **app Next.js** so enfileira (`status=pending`) e le o resultado (`status=done`).
- Este worker e o unico que baixa as URLs cruas (http) e decide o que e servivel.
- `source_url` e a placa **nunca** vao ao frontend.

## Politica de redacao ("na duvida, esconder")

Calibravel por env (ver `.env.example`):

| Confianca da deteccao        | Acao                                  |
| ---------------------------- | ------------------------------------- |
| `>= PLATE_CONF_BLUR`         | tem placa -> **borra** e serve        |
| `[PLATE_CONF_DOUBT, BLUR)`   | duvida -> **esconde** a foto*         |
| `< PLATE_CONF_DOUBT`         | sem placa -> serve **limpa**          |

\* Com `PLATE_HIDE_ON_DOUBT=0`, a faixa de duvida e borrada e servida em vez de
escondida. Comece **conservador** (hide ligado, limiares baixos) e relaxe com dados.

> Falso-negativo do detector = placa vazada. Antes de soltar em producao, revise
> visualmente uma amostra de fotos `done` (ver QA abaixo).

## Pesos do modelo (`MODEL_PATH`)

Precisa de um YOLO de **deteccao de placa** (detecta o retangulo da placa; nao faz
OCR, entao serve para Mercosul e modelo antigo). Opcoes:

- Treine um YOLOv8/YOLO11 num dataset de placas (ex.: datasets de "license plate
  detection") e exporte `best.pt`.
- Ou use pesos publicos de deteccao de placa ja treinados.

Coloque o arquivo em `models/plate.pt` (ou ajuste `MODEL_PATH`). **Nao** versione
os pesos no git — monte como volume ou baixe no build/start.

### Modo seguro (sem modelo ainda)

Enquanto nao houver pesos, deixe `PLATE_MODEL_ENABLED` **desligado** (vazio/`0`).
O worker sobe e fica **ocioso**: nao processa nem serve nenhuma foto, a fila
`offer_images` permanece `pending` e o app mostra placeholder. Assim nao ha
qualquer risco de servir uma foto com placa sem deteccao.

Quando treinar/obter os pesos: coloque em `MODEL_PATH`, set `PLATE_MODEL_ENABLED=true`
e reinicie — o backlog `pending` e processado automaticamente.

## Deploy no Render (Background Worker)

O repo tem um `render.yaml` (Blueprint) na raiz. Passos:

1. No Render: **New > Blueprint** e conecte o repo `paulopsout-star/compracerta`
   (na branch onde este codigo esta).
2. O Blueprint cria o worker `plate-redactor` (Docker, contexto `services/plate-redactor`).
3. Em **Environment**, preencha os secrets marcados `sync: false`:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Deixe `PLATE_MODEL_ENABLED` vazio por enquanto (modo seguro).
5. Create — o worker sobe ocioso. Logs devem mostrar "MODO SEGURO (ocioso)".

## Rodar local

```bash
cp .env.example .env        # preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
pip install -r requirements.txt
# coloque os pesos em models/plate.pt
python worker.py
```

## Docker

```bash
docker build -t plate-redactor .
docker run --env-file .env -v "$PWD/models:/app/models" plate-redactor
```

## QA de seguranca (antes de producao)

1. Rode contra o Supabase de **homologacao**.
2. Crie um desejo no app (ex.: Honda Civic) pra popular `offer_images`.
3. Deixe o worker processar e inspecione no Storage:
   - fotos `action=blurred`: a placa esta **ilegivel**?
   - amostra de `action=clean` (exteriores): nenhuma placa **escapou**?
   - `status=hidden`: confirmou que **nao** foi pro bucket.
4. Ajuste `PLATE_CONF_*` / `PLATE_HIDE_ON_DOUBT` conforme o resultado.

## Reprocessar

Para reprocessar uma oferta, volte as linhas pra `pending`:

```sql
update offer_images set status='pending', attempts=0, last_error=null
where offer_id = '<id>';
```
