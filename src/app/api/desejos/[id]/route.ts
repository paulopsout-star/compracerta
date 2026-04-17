import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findById, update, remove } from "@/lib/db";

// GET /api/desejos/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const wish = await findById("wishes", id);
    return NextResponse.json(wish);
  } catch {
    return NextResponse.json({ error: "Desejo não encontrado" }, { status: 404 });
  }
}

// PATCH /api/desejos/[id] — Update status or fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Allow updating status and notes
    const allowedFields: Record<string, unknown> = {};
    if (body.status) allowedFields.status = body.status;
    if (body.notes !== undefined) allowedFields.notes = body.notes;
    if (body.status === "convertido") allowedFields.converted_at = new Date().toISOString();

    const updated = await update("wishes", id, allowedFields);
    return NextResponse.json({ message: "Desejo atualizado", wish: updated });
  } catch (error) {
    console.error("[API] Error updating wish:", error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// DELETE /api/desejos/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    await remove("wishes", id);
    return NextResponse.json({ message: "Desejo removido" });
  } catch (error) {
    console.error("[API] Error deleting wish:", error);
    return NextResponse.json({ error: "Erro ao remover" }, { status: 500 });
  }
}
