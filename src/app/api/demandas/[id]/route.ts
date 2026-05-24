import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deleteCloudinaryAsset } from "@/lib/cloudinary"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const { id } = await params
    const demanda = await prisma.demanda.findFirst({
      where:   { id: Number(id), companyId: session.user.companyId, deletedAt: null },
      include: { acoes: { orderBy: { ordem: "asc" } } },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ demanda })
  } catch (err) {
    console.error("[GET /api/demandas/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const { id } = await params
    const body   = await req.json()

    const campos: Record<string, unknown> = {}
    if (body.titulo)     campos.titulo     = body.titulo
    if (body.descricao !== undefined) campos.descricao = body.descricao
    if (body.prioridade) campos.prioridade = body.prioridade
    if (body.tipo)       campos.tipo       = body.tipo
    if (body.prazo !== undefined) campos.prazo = body.prazo ? new Date(body.prazo + "T03:00:00Z") : null
    if (body.delegadoNome !== undefined) campos.delegadoNome = body.delegadoNome || null

    // concluidoAt: set when transitioning to CONCLUIDA, clear when reopening
    if (body.status) {
      campos.status = body.status
      if (body.status === "CONCLUIDA") {
        campos.concluidoAt = new Date()
      } else if (body.status === "ABERTA" || body.status === "EM_ANDAMENTO" || body.status === "CANCELADA") {
        campos.concluidoAt = null
      }
    }

    const demanda = await prisma.demanda.updateMany({
      where: { id: Number(id), companyId: session.user.companyId, deletedAt: null },
      data:  campos,
    })
    return NextResponse.json({ ok: true, demanda })
  } catch (err) {
    console.error("[PATCH /api/demandas/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const { id }   = await params
    const userId   = Number(session.user.id)

    const demanda = await prisma.demanda.findFirst({
      where:  { id: Number(id), companyId: session.user.companyId, deletedAt: null },
      select: { audioUrl: true },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    // Soft delete
    await prisma.demanda.updateMany({
      where: { id: Number(id), companyId: session.user.companyId },
      data:  { deletedAt: new Date(), deletedBy: userId },
    })

    // Remove áudio do Cloudinary (best-effort)
    if (demanda.audioUrl) {
      deleteCloudinaryAsset(demanda.audioUrl, "video").catch(console.error)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/demandas/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
