import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// ── GET — lista todas as listas da empresa ────────────────────────────────────
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const companyId = session.user.companyId

    const listas = await prisma.lista.findMany({
      where: { companyId, deletedAt: null },
      include: {
        _count: {
          select: { itens: { where: { deletedAt: null } } },
        },
        itens: {
          where: { deletedAt: null, concluido: false },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ listas })
  } catch (err) {
    console.error("[GET /api/listas]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// ── POST — cria nova lista ────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    const body: { titulo?: string; descricao?: string; tipo?: string; cor?: string } = await req.json()

    const titulo = (body.titulo ?? "").trim()
    if (!titulo) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 })

    const tiposValidos = ["COMPRAS", "VENCIMENTOS", "LEMBRETES", "GERAL"]
    const tipo = tiposValidos.includes(body.tipo ?? "") ? (body.tipo as "COMPRAS" | "VENCIMENTOS" | "LEMBRETES" | "GERAL") : "GERAL"

    const lista = await prisma.lista.create({
      data: {
        companyId,
        userId,
        titulo,
        descricao: (body.descricao ?? "").trim() || null,
        tipo,
        cor: body.cor ?? null,
      },
    })

    return NextResponse.json({ ok: true, lista }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/listas]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
