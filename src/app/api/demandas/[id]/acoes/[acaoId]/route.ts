import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string; acaoId: string }> }

// Verifica que a ação pertence a uma demanda do companyId da sessão
async function verificarAcao(acaoId: number, demandaId: number, companyId: number) {
  return prisma.acaoDemanda.findFirst({
    where: {
      id:       acaoId,
      demandaId,
      deletedAt: null,
      demanda:  { companyId, deletedAt: null },
    },
  })
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id, acaoId } = await params
    const body           = await req.json()
    const companyId      = session.user.companyId

    const acao = await verificarAcao(Number(acaoId), Number(id), companyId)
    if (!acao) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const campos: Record<string, unknown> = {}
    if (body.descricao !== undefined) campos.descricao = body.descricao.trim().slice(0, 1000)
    if (body.feita     !== undefined) campos.feita     = Boolean(body.feita)

    await prisma.acaoDemanda.update({ where: { id: Number(acaoId) }, data: campos })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PATCH /api/demandas/[id]/acoes/[acaoId]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id, acaoId } = await params
    const companyId      = session.user.companyId

    const acao = await verificarAcao(Number(acaoId), Number(id), companyId)
    if (!acao) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    // Soft delete
    await prisma.acaoDemanda.update({
      where: { id: Number(acaoId) },
      data:  { deletedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/demandas/[id]/acoes/[acaoId]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
