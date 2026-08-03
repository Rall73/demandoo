import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string; relacaoId: string }> }

/**
 * DELETE — desfaz o vínculo.
 * Hard delete: tabela associativa, mesma regra de `demanda_tags`.
 */
export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id, relacaoId } = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)
    const demandaId = Number(id)

    // A demanda da URL precisa ser do usuário da sessão…
    const demanda = await prisma.demanda.findFirst({
      where:  { id: demandaId, companyId, userId, deletedAt: null },
      select: { id: true },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    // …e o vínculo precisa ser do mesmo tenant e tocar essa demanda
    const relacao = await prisma.demandaRelacao.findFirst({
      where: {
        id: Number(relacaoId),
        companyId,
        OR: [{ demandaOrigemId: demandaId }, { demandaDestinoId: demandaId }],
      },
      select: { id: true },
    })
    if (!relacao) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    await prisma.demandaRelacao.delete({ where: { id: relacao.id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/demandas/[id]/relacoes/[relacaoId]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
