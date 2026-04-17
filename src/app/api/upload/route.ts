import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase, insert } from "@/lib/db";
import { parseCSV, parseXLSX } from "@/lib/services/stock-parser";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
  "text/plain",
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Arquivo excede o limite de 10MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const dealerStoreId = (session.user as Record<string, unknown>).dealerStoreId as string | null;

    // Create upload record
    const upload = await insert("stock_uploads", {
      dealer_store_id: dealerStoreId,
      file_url: file.name,
      format: ext === "csv" ? "csv" : ext === "pdf" ? "pdf" : "xlsx",
      status: "processando",
    });

    // Parse file
    let result;
    if (ext === "csv" || file.type === "text/csv" || file.type === "text/plain") {
      const text = await file.text();
      result = parseCSV(text);
    } else if (ext === "xls" || ext === "xlsx") {
      const buffer = await file.arrayBuffer();
      result = parseXLSX(buffer);
    } else if (ext === "pdf") {
      // PDF parsing requires LLM — mark for manual review
      await supabase
        .from("stock_uploads")
        .update({ status: "revisao_pendente", error_details: { message: "PDF requer revisão manual" } })
        .eq("id", (upload as Record<string, unknown>).id);

      return NextResponse.json({
        message: "PDF recebido. Requer revisão manual para extração dos dados.",
        upload: { ...(upload as Record<string, unknown>), status: "revisao_pendente" },
      }, { status: 202 });
    } else {
      return NextResponse.json({ error: "Formato não suportado" }, { status: 400 });
    }

    // Insert parsed vehicles as offers
    let created = 0;
    for (const vehicle of result.vehicles) {
      try {
        await insert("offers", {
          source: "estoque_lojista",
          source_id: `upload-${(upload as Record<string, unknown>).id}-${created}`,
          plate: vehicle.plate || null,
          brand: vehicle.brand,
          model: vehicle.model,
          version: vehicle.version || null,
          year: vehicle.year,
          km: vehicle.km,
          color: vehicle.color || null,
          price: vehicle.price,
          city: vehicle.city,
          state: vehicle.state,
          dealer_store_id: dealerStoreId,
        });
        created++;
      } catch (err) {
        result.errors.push({ line: 0, message: `Erro ao inserir ${vehicle.brand} ${vehicle.model}: ${err}` });
      }
    }

    // Update upload status
    await supabase
      .from("stock_uploads")
      .update({
        status: result.errors.length > 0 ? "concluido" : "concluido",
        lines_processed: created,
        lines_with_error: result.errors.length,
        error_details: result.errors.length > 0 ? { errors: result.errors.slice(0, 20) } : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (upload as Record<string, unknown>).id);

    // Trigger matching for new offers
    if (created > 0) {
      const { data: newOffers } = await supabase
        .from("offers")
        .select("id")
        .eq("dealer_store_id", dealerStoreId)
        .order("created_at", { ascending: false })
        .limit(created);

      for (const offer of newOffers ?? []) {
        fetch(`${request.nextUrl.origin}/api/matching/trigger`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerId: offer.id }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      message: `Upload concluído: ${created} veículos processados, ${result.errors.length} erros`,
      processed: created,
      errors: result.errors.length,
      errorDetails: result.errors.slice(0, 10),
    }, { status: 201 });
  } catch (error) {
    console.error("[API] Upload error:", error);
    return NextResponse.json({ error: "Erro no upload do arquivo" }, { status: 500 });
  }
}
