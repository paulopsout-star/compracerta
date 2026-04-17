import { NextRequest, NextResponse } from "next/server";
import { fetchModels } from "@/lib/services/fipe-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ brandCode: string }> }
) {
  const { brandCode } = await params;
  if (!brandCode) return NextResponse.json({ error: "brandCode requerido" }, { status: 400 });
  const models = await fetchModels(brandCode);
  return NextResponse.json({ data: models });
}
