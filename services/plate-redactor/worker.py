"""
Worker de redacao de placa — processa a fila `offer_images`.

Loop:
  1. Reivindica um lote de imagens status='pending' (update atomico -> 'processing').
  2. Baixa a `source_url` (http do Avaliador).
  3. Detecta+cobre a placa (ou decide esconder) via detector.PlateDetector.
  4. Sobe a versao tratada pro Supabase Storage (bucket publico) — exceto 'hidden'.
  5. Marca a linha: done / hidden / error.

Roda continuamente (fora da Vercel). Idempotente e resiliente a multiplos workers
(o claim por status evita corrida). Ver README.md para deploy.
"""
from __future__ import annotations

import os
import time
import traceback
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from supabase import create_client

from detector import PlateDetector

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"].strip()
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip()
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "offer-images").strip()
MODEL_PATH = os.getenv("MODEL_PATH", "models/plate.pt").strip()
MODEL_ENABLED = os.getenv("PLATE_MODEL_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "8"))
MAX_ATTEMPTS = int(os.getenv("MAX_ATTEMPTS", "3"))
POLL_INTERVAL = float(os.getenv("POLL_INTERVAL_SECONDS", "5"))
DOWNLOAD_TIMEOUT = float(os.getenv("DOWNLOAD_TIMEOUT_SECONDS", "20"))

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
# Instanciado so quando ha modelo (ver main). Em modo seguro fica None e o worker
# nao processa nada — garante que NENHUMA foto com placa seja servida sem deteccao.
detector: PlateDetector | None = None


def claim_pending(limit: int) -> list[dict]:
    """Pega ate `limit` linhas pending e tenta marca-las processing (uma a uma,
    com guarda por status pra ser seguro com multiplos workers)."""
    res = (
        sb.table("offer_images")
        .select("id, tenant_id, offer_id, source_url, attempts")
        .eq("status", "pending")
        .lt("attempts", MAX_ATTEMPTS)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    claimed: list[dict] = []
    for row in res.data or []:
        upd = (
            sb.table("offer_images")
            .update({"status": "processing", "attempts": (row.get("attempts") or 0) + 1})
            .eq("id", row["id"])
            .eq("status", "pending")  # so vence quem ainda ve 'pending'
            .execute()
        )
        if upd.data:
            claimed.append(row)
    return claimed


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def storage_path(row: dict) -> str:
    return f"{row['tenant_id']}/{row['offer_id']}/{row['id']}.jpg"


def upload(path: str, data: bytes) -> None:
    sb.storage.from_(STORAGE_BUCKET).upload(
        path,
        data,
        {"content-type": "image/jpeg", "upsert": "true", "cache-control": "31536000"},
    )


def finish(row_id: str, fields: dict) -> None:
    fields["updated_at"] = iso_now()
    fields["processed_at"] = iso_now()
    sb.table("offer_images").update(fields).eq("id", row_id).execute()


def process(row: dict) -> None:
    assert detector is not None  # so chamado em modo ativo (ver main)
    resp = requests.get(row["source_url"], timeout=DOWNLOAD_TIMEOUT)
    resp.raise_for_status()

    action, data, has_plate, conf = detector.redact(resp.content)

    if action == "hidden":
        finish(row["id"], {
            "status": "hidden",
            "action": "hidden",
            "has_plate": has_plate,
            "detection_confidence": conf,
        })
        return

    if data is None:
        raise RuntimeError("processamento nao gerou imagem")

    path = storage_path(row)
    upload(path, data)
    finish(row["id"], {
        "status": "done",
        "action": action,
        "has_plate": has_plate,
        "detection_confidence": conf,
        "storage_path": path,
    })


def main() -> None:
    global detector

    # MODO SEGURO: sem modelo habilitado/presente, o worker NAO processa nada.
    # A fila fica 'pending' e o frontend mostra placeholder — nunca servimos uma
    # foto com placa sem ter passado pela deteccao. Quando os pesos chegarem,
    # ligue PLATE_MODEL_ENABLED=true e o backlog e processado automaticamente.
    if not MODEL_ENABLED or not os.path.exists(MODEL_PATH):
        reason = "PLATE_MODEL_ENABLED!=true" if not MODEL_ENABLED else f"pesos ausentes em {MODEL_PATH}"
        print(f"[plate-redactor] MODO SEGURO (ocioso): {reason}. Nenhuma foto sera "
              f"processada/servida ate haver modelo. Sem risco de vazar placa.", flush=True)
        while True:
            time.sleep(max(POLL_INTERVAL, 30.0))

    detector = PlateDetector(MODEL_PATH)
    print(f"[plate-redactor] iniciado | bucket={STORAGE_BUCKET} model={MODEL_PATH} "
          f"batch={BATCH_SIZE} max_attempts={MAX_ATTEMPTS}", flush=True)
    while True:
        try:
            rows = claim_pending(BATCH_SIZE)
        except Exception as e:  # noqa: BLE001
            print(f"[plate-redactor] erro no claim: {e}", flush=True)
            time.sleep(POLL_INTERVAL)
            continue

        if not rows:
            time.sleep(POLL_INTERVAL)
            continue

        for row in rows:
            try:
                process(row)
                print(f"[plate-redactor] ok {row['id']} ({row['source_url'][:60]}...)", flush=True)
            except Exception as e:  # noqa: BLE001
                attempts = (row.get("attempts") or 0) + 1
                # Esgotou tentativas -> error; senao volta pra pending pra retry.
                status = "error" if attempts >= MAX_ATTEMPTS else "pending"
                err = f"{type(e).__name__}: {e}"
                print(f"[plate-redactor] falha {row['id']} (attempt {attempts}): {err}", flush=True)
                traceback.print_exc()
                try:
                    sb.table("offer_images").update({
                        "status": status,
                        "last_error": err[:500],
                        "updated_at": iso_now(),
                    }).eq("id", row["id"]).execute()
                except Exception:  # noqa: BLE001
                    pass


if __name__ == "__main__":
    main()
