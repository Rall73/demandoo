import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

// ── GET — detalhe de uma lista ────────────────────────────────────────────────
export async function GET(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId

    const lista = await prisma.lista.findFirst({
      where: { id: Number(id), companyId, deletedAt: null },
      include: {
        itens: {
          where: { deletedAt: null },
          orderBy: [{ concluido: "asc" }, { ordem: "asc" }, { createdAt: "asc" }],
        },
      },
    })

    if (!lista) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    return NextResponse.json({ lista })
  } catch (err) {
    console.error("[GET /api/listas/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// ── PATCH — edita lista ───────────────────────────────────────────────────────
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId

    const lista = await prisma.lista.findFirst({
      where: { id: Number(id), companyId, deletedAt: null },
      select: { id: true },
    })
    if (!lista) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const body: { titulo?: string; descricao?: string; tipo?: string; cor?: string } = await req.json()

    const tiposValidos = ["COMPRAS", "VENCIMENTOS", "LEMBRETES", "GERAL"]

    const atualizada = await prisma.lista.update({
      where: { id: Number(id) },
      data: {
        ...(body.titulo    !== undefined && { titulo: body.titulo.trim() }),
        ...(body.descricao !== undefined && { descricao: body.descricao.trim() || null }),
        ...(body.tipo      !== undefined && tiposValidos.includes(body.tipo) && {
          tipo: body.tipo as "COMPRAS" | "VENCIMENTOS" | "LEMBRETES" | "GERAL",
        }),
        ...(body.cor !== undefined && { cor: body.cor || null }),
      },
    })

    return NextResponse.json({ ok: true, lista: atualizada })
  } catch (err) {
    console.error("[PATCH /api/listas/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// ── DELETE — soft delete da lista ─────────────────────────────────────────────
export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    const lista = await prisma.lista.findFirst({
      where: { id: Number(id), companyId, deletedAt: null },
      select: { id: true, userId: true },
    })
    if (!lista) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    await prisma.lista.update({
      where: { id: Number(id) },
      data:  { deletedAt: new Date(), deletedBy: userId },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/listas/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
