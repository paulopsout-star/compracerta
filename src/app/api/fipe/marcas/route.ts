import { NextResponse } from "next/server";
import { fetchBrands } from "@/lib/services/fipe-api";

export async function GET() {
  const brands = await fetchBrands();
  return NextResponse.json({ data: brands });
}
