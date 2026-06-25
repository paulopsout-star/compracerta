"""
Deteccao de placa + politica de redacao.

Usa um modelo YOLO treinado em PLACAS (deteccao do retangulo, nao OCR — funciona
para Mercosul e modelo antigo, em angulos variados). A politica implementa o
requisito "na duvida, esconder a foto":

  - confianca >= CONF_BLUR      -> tem placa: borra a(s) regiao(oes) e SERVE.
  - CONF_DOUBT <= conf < CONF_BLUR -> duvida: nao temos certeza se e placa nem se
                                   localizamos por inteiro -> ESCONDE a foto
                                   (quando HIDE_ON_DOUBT=1), senao borra e serve.
  - sem deteccao acima de CONF_DOUBT -> sem placa: SERVE limpa (re-hospedada).

Retorna (action, processed_bytes_or_None, has_plate, max_conf):
  action in {"blurred", "clean", "hidden"}.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

import cv2
import numpy as np

CONF_BLUR = float(os.getenv("PLATE_CONF_BLUR", "0.35"))
CONF_DOUBT = float(os.getenv("PLATE_CONF_DOUBT", "0.15"))
HIDE_ON_DOUBT = os.getenv("PLATE_HIDE_ON_DOUBT", "1").strip() not in ("0", "false", "False", "")
# Margem extra ao redor da bbox (fracao da largura/altura da caixa) — cobre folga
# de localizacao imperfeita.
BOX_MARGIN = float(os.getenv("PLATE_BOX_MARGIN", "0.25"))


@dataclass
class Box:
    x1: int
    y1: int
    x2: int
    y2: int
    conf: float


class PlateDetector:
    def __init__(self, model_path: str):
        # Import tardio: ultralytics e pesado e so e necessario no worker.
        from ultralytics import YOLO

        self.model = YOLO(model_path)

    def _detect(self, img: np.ndarray) -> list[Box]:
        # imgsz alto ajuda a pegar placas pequenas/distantes (mais recall).
        results = self.model.predict(img, conf=CONF_DOUBT, imgsz=1280, verbose=False)
        boxes: list[Box] = []
        for r in results:
            if r.boxes is None:
                continue
            for b in r.boxes:
                conf = float(b.conf[0])
                x1, y1, x2, y2 = (int(v) for v in b.xyxy[0])
                boxes.append(Box(x1, y1, x2, y2, conf))
        return boxes

    def _blur_region(self, img: np.ndarray, box: Box) -> None:
        h, w = img.shape[:2]
        bw, bh = box.x2 - box.x1, box.y2 - box.y1
        mx, my = int(bw * BOX_MARGIN), int(bh * BOX_MARGIN)
        x1 = max(0, box.x1 - mx)
        y1 = max(0, box.y1 - my)
        x2 = min(w, box.x2 + mx)
        y2 = min(h, box.y2 + my)
        if x2 <= x1 or y2 <= y1:
            return
        roi = img[y1:y2, x1:x2]
        # Kernel proporcional ao tamanho da regiao -> blur forte e ilegivel.
        k = max(31, (max(x2 - x1, y2 - y1) // 3) | 1)
        img[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (k, k), 0)
        # Pixelizacao adicional por cima, para nao restar nada legivel.
        small = cv2.resize(img[y1:y2, x1:x2], (8, 8), interpolation=cv2.INTER_LINEAR)
        img[y1:y2, x1:x2] = cv2.resize(small, (x2 - x1, y2 - y1), interpolation=cv2.INTER_NEAREST)

    def redact(self, image_bytes: bytes) -> tuple[str, bytes | None, bool, float]:
        arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            # Nao decodificou -> trata como erro de leitura (deixa o worker logar).
            raise ValueError("imagem nao decodificavel")

        boxes = self._detect(img)
        max_conf = max((b.conf for b in boxes), default=0.0)
        has_plate = max_conf >= CONF_DOUBT

        confident = [b for b in boxes if b.conf >= CONF_BLUR]

        if confident:
            # Tem placa com confianca: borra TODAS as regioes suspeitas (>= CONF_DOUBT).
            for b in boxes:
                if b.conf >= CONF_DOUBT:
                    self._blur_region(img, b)
            ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 88])
            return ("blurred", buf.tobytes() if ok else None, True, max_conf)

        if has_plate and HIDE_ON_DOUBT:
            # Faixa de duvida e politica conservadora -> esconde a foto.
            return ("hidden", None, True, max_conf)

        if has_plate:
            # HIDE_ON_DOUBT desligado: borra mesmo assim e serve.
            for b in boxes:
                self._blur_region(img, b)
            ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 88])
            return ("blurred", buf.tobytes() if ok else None, True, max_conf)

        # Sem indicio de placa -> serve limpa (re-encodada/re-hospedada).
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 88])
        return ("clean", buf.tobytes() if ok else None, False, max_conf)
