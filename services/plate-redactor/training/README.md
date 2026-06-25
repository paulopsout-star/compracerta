# Treinar o detector de placa (`plate.pt`)

Runbook pra gerar os pesos YOLO que o worker usa pra **cobrir a placa**. Como
o objetivo e so DETECTAR o retangulo da placa (nao ler), um dataset publico de
"license plate detection" ja resolve — nao precisa ser de placa brasileira.

Tempo: ~30–60 min num **Google Colab** com GPU gratis.

---

## 1. Conseguir um dataset (Roboflow Universe)

1. Em https://universe.roboflow.com procure **"license plate detection"** (ha varios
   datasets prontos, alguns com mAP >95%). Escolha um com **1 classe** = placa.
2. No dataset: **Download Dataset** → formato **YOLOv8** → ele gera um snippet
   `pip install roboflow` + `rf.workspace(...).project(...).version(N).download("yolov8")`
   com a sua **API key**. Guarde esse snippet.

> Alternativa: rotular suas proprias fotos (melhores pros seus angulos), mas da
> mais trabalho. Comece com um dataset pronto.

## 2. Treinar no Colab

1. Colab → **Runtime → Change runtime type → T4 GPU**.
2. Células:

```python
!pip install ultralytics roboflow

# cole o snippet do Roboflow (baixa o dataset + gera data.yaml)
from roboflow import Roboflow
rf = Roboflow(api_key="SUA_API_KEY")
ds = rf.workspace("WORKSPACE").project("PROJETO").version(N).download("yolov8")

# treina (yolo11n = leve; suba pra yolo11s se quiser mais precisao)
!yolo detect train model=yolo11n.pt data={ds.location}/data.yaml epochs=50 imgsz=640
```

3. Confira as métricas no fim (procure **recall alto** — placa nao detectada =
   placa vazada). Os pesos ficam em `runs/detect/train/weights/best.pt`.
4. Baixe o `best.pt` (renomeie pra `plate.pt`).

> Em vez do comando `yolo`, dá pra usar `python train.py --data {ds.location}/data.yaml`.

## 3. Publicar os pesos pro worker baixar

O worker baixa o modelo de `MODEL_URL` no boot (assim nao commitamos `.pt` no git).
Opcao simples — Supabase Storage:

1. Supabase → Storage → crie um bucket **`models`** (pode ser privado).
2. Suba o `plate.pt`.
3. Pegue a URL pública (ou uma signed URL de longa duração) do objeto.

## 4. Ativar no Render

No serviço **plate-redactor** → Environment:

- `MODEL_URL` = URL do `plate.pt` (passo 3)
- `PLATE_MODEL_ENABLED` = `true`
- (mantenha `MODEL_PATH=models/plate.pt`)

Save → o worker reinicia, baixa o modelo e sai do modo seguro. Logs:
`[plate-redactor] iniciado | bucket=offer-images model=models/plate.pt ...`

## 5. QA antes de confiar

1. Crie um desejo no app (ex.: Honda Civic) → enche `offer_images` com `pending`.
2. O worker processa: `pending → done|hidden`.
3. **Inspecao visual** no bucket `offer-images`:
   - `action=blurred`: placa **ilegível**?
   - amostra de `clean` (exteriores): nenhuma placa **escapou**?
   - `hidden`: confirmou que **nao** foi pro bucket.
4. Calibre `PLATE_CONF_BLUR` / `PLATE_CONF_DOUBT` / `PLATE_HIDE_ON_DOUBT` conforme
   o resultado (sem redeploy — sao env vars).
