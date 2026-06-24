# Worker de redacao de placa (YOLO). Roda fora da Vercel (Railway/Render/Fly/VPS).
FROM python:3.11-slim

# libs de sistema necessarias pro OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Coloque os pesos do modelo em models/plate.pt (ver README) ou monte um volume.
ENV MODEL_PATH=models/plate.pt

CMD ["python", "worker.py"]
