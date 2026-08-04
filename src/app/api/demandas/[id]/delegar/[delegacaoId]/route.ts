import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { carregarDelegacao } from "@/lib/delegacao-db"

type Ctx = { params: Promise<{ id: string; delegacaoId: string }> }

/**
 * DELETE — cancela a delegação e remove a demanda-filha.
 *
 * Só enquanto a filha está intocada (ABERTA, sem comentário do delegado e sem
 * ação marcada). Depois disso é recusado: apagar trabalho que outra pessoa já
 * fez não pode ser consequência de um clique.
 */
export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id, delegacaoId } = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)
    const demandaId = Number(id)

    // A demanda-mãe tem que ser sua
    const mae = await prisma.demanda.findFirst({
      where:  { id: demandaId, companyId, userId, deletedAt: null },
      select: { id: true },
    })
    if (!mae) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const delegacao = await prisma.delegacao.findFirst({
      where: {
        id: Number(delegacaoId),
        companyId,
        demandaOrigemId:   demandaId,
        delegadoPorUserId: userId,
      },
      select: {
        id: true, demandaFilhaId: true,
        delegadoPara: { select: { name: true } },
        filha: {
          select: {
            id: true, status: true,
            comentarios: { where: { deletedAt: null, tipo: { not: "STATUS" } }, select: { id: true } },
            acoes:       { where: { deletedAt: null, feita: true },            select: { id: true } },
            delegacoesFeitas: { select: { id: true } },
          },
        },
      },
    })
    if (!delegacao) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const f = delegacao.filha
    const intocada =
      f.status === "ABERTA" &&
      f.comentarios.length === 0 &&
      f.acoes.length === 0 &&
      f.delegacoesFeitas.length === 0

    if (!intocada) {
      return NextResponse.json(
        {
          error:
            `${delegacao.delegadoPara.name} já mexeu nesta demanda — o cancelamento apagaria o ` +
            `trabalho dela. Converse e peça que ela cancele do lado dela, ou deixe registrada a devolutiva.`,
        },
        { status: 409 },
      )
    }

    await prisma.$transaction(async (tx) => {
      // A delegação some junto com a filha (FK ON DELETE CASCADE), mas removemos
      // explicitamente para não depender do cascade em leitura posterior
      await tx.delegacao.delete({ where: { id: delegacao.id } })
      await tx.demanda.update({
        where: { id: delegacao.demandaFilhaId },
        data:  { deletedAt: new Date(), deletedBy: userId },
      })
      await tx.demanda.update({
        where: { id: demandaId },
        data:  { delegadoUserId: null, delegadoNome: null },
      })
      await tx.comentario.create({
        data: {
          demandaId, userId, companyId, tipo: "STATUS",
          conteudo: `Delegação para ${delegacao.delegadoPara.name} cancelada.`,
        },
      })
    })

    const atualizada = await carregarDelegacao(demandaId, companyId)
    return NextResponse.json({ delegacao: atualizada })
  } catch (err) {
    console.error("[DELETE /api/demandas/[id]/delegar/[delegacaoId]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
