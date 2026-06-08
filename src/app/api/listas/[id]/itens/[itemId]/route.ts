import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string; itemId: string }> }

// ── PATCH — edita ou conclui item ─────────────────────────────────────────────
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id, itemId } = await params
    const companyId      = session.user.companyId

    const item = await prisma.itemLista.findFirst({
      where: { id: Number(itemId), listaId: Number(id), companyId, deletedAt: null },
      select: { id: true, concluido: true },
    })
    if (!item) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const body: {
      texto?: string
      concluido?: boolean
      dataVencimento?: string | null
      recorrente?: boolean
      lembrarAntesDias?: number | null
      url?: string | null
    } = await req.json()

    const agora = new Date()

    const atualizado = await prisma.itemLista.update({
      where: { id: Number(itemId) },
      data: {
        ...(body.texto     !== undefined && { texto: body.texto.trim() }),
        ...(body.concluido !== undefined && {
          concluido:   body.concluido,
          concluidoAt: body.concluido ? agora : null,
        }),
        ...(body.dataVencimento !== undefined && {
          dataVencimento: body.dataVencimento ? new Date(body.dataVencimento) : null,
        }),
        ...(body.recorrente      !== undefined && { recorrente: body.recorrente }),
        ...(body.lembrarAntesDias !== undefined && { lembrarAntesDias: body.lembrarAntesDias }),
        ...(body.url             !== undefined && { url: body.url?.trim() || null }),
      },
    })

    return NextResponse.json({ ok: true, item: atualizado })
  } catch (err) {
    console.error("[PATCH /api/listas/[id]/itens/[itemId]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// ── DELETE — soft delete do item ──────────────────────────────────────────────
export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id, itemId } = await params
    const companyId      = session.user.companyId
    const userId         = Number(session.user.id)

    const item = await prisma.itemLista.findFirst({
      where: { id: Number(itemId), listaId: Number(id), companyId, deletedAt: null },
      select: { id: true },
    })
    if (!item) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    await prisma.itemLista.update({
      where: { id: Number(itemId) },
      data:  { deletedAt: new Date(), deletedBy: userId },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/listas/[id]/itens/[itemId]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
