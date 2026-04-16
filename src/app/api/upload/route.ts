import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
];

// POST /api/upload — Upload stock file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Arquivo excede o limite de 10MB" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato não suportado. Use CSV, XLS, XLSX ou PDF." },
        { status: 400 }
      );
    }

    // Determine format
    const ext = file.name.split(".").pop()?.toLowerCase();
    const format = ext === "csv" ? "csv" : ext === "pdf" ? "pdf" : "xlsx";

    // TODO: Save file to S3/Cloud Storage
    // TODO: Queue async processing job
    // TODO: For PDF, use LLM extraction with human review

    const upload = {
      id: `su-${Date.now()}`,
      dealerStoreId: "ds1", // From auth session
      fileName: file.name,
      fileSize: file.size,
      format,
      status: "processando",
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        message: "Upload recebido e em processamento",
        upload,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[API] Upload error:", error);
    return NextResponse.json(
      { error: "Erro no upload do arquivo" },
      { status: 500 }
    );
  }
}
