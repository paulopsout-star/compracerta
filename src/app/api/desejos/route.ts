import { NextRequest, NextResponse } from "next/server";
import { wishSchema } from "@/lib/validators/wish";

// POST /api/desejos — Create a new wish
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = wishSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.validityDays);

    // TODO: Replace with Prisma when DB is connected
    const wish = {
      id: `w-${Date.now()}`,
      sellerId: "u1", // From auth session
      ...data,
      status: "procurando",
      createdAt: new Date(),
      expiresAt,
    };

    // TODO: Trigger matching engine after wish creation
    // await triggerMatching(wish);

    return NextResponse.json(
      { message: "Desejo cadastrado com sucesso", wish },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] Error creating wish:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// GET /api/desejos — List wishes (with filters)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const sellerId = searchParams.get("sellerId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  // TODO: Replace with Prisma query
  const mockResponse = {
    data: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
    filters: { status, sellerId },
  };

  return NextResponse.json(mockResponse);
}
