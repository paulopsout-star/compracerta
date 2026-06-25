"""
Treina um detector YOLO de PLACA (1 classe) para o worker plate-redactor.

Objetivo e DETECCAO (achar o retangulo da placa pra borrar), nao OCR — entao
qualquer dataset de "license plate detection" serve, independente do pais.

Rode no Google Colab (GPU gratis) ou em maquina com GPU. Saida final:
  runs/detect/<name>/weights/best.pt   <- este e o arquivo que vai pro worker.

Exemplos:
  python train.py --data /content/dataset/data.yaml --epochs 50
  python train.py --data ./plates/data.yaml --base yolo11s.pt --epochs 80 --imgsz 800
"""
import argparse

from ultralytics import YOLO


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="data.yaml do dataset (export YOLOv8 do Roboflow)")
    ap.add_argument("--base", default="yolo11n.pt", help="modelo base (yolo11n=leve/rapido; yolo11s=mais preciso)")
    ap.add_argument("--epochs", type=int, default=50)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--name", default="plate")
    args = ap.parse_args()

    model = YOLO(args.base)
    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        name=args.name,
        patience=15,  # early stop se nao melhorar
    )

    # Validacao final — olhe o mAP/recall. Recall alto importa: placa nao detectada
    # = placa vazada. Prefira recall alto mesmo as custas de alguns falsos positivos
    # (que so causam um blur a mais).
    metrics = model.val()
    print("=== Metricas ===")
    print(getattr(metrics, "results_dict", metrics))
    print(f"\nPesos finais: runs/detect/{args.name}/weights/best.pt")


if __name__ == "__main__":
    main()
