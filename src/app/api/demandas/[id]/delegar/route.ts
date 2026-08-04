import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseDataOpcionalBRT } from "@/lib/date"
import { carregarDelegacao } from "@/lib/delegacao-db"

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST — delega a demanda a outro membro da empresa.
 *
 * Cria uma demanda-filha pertencente ao delegado, com a **instrução** do que
 * foi pedido — e não com o checklist da mãe. Copiar as ações criava dois
 * checklists desconectados: o delegado marcava as dele e nada voltava para a
 * mãe. As ações da mãe continuam do delegante; a delegação é um pedido
 * específico, com resposta específica (devolutiva).
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const body      = await req.json()
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)
    const demandaId = Number(id)

    const paraUserId   = Number(body.paraUserId)
    const prazoRetorno = parseDataOpcionalBRT(body.prazoRetorno)
    const instrucao    = typeof body.instrucao === "string" ? body.instrucao.trim() : ""

    if (!paraUserId || isNaN(paraUserId)) {
      return NextResponse.json({ error: "Escolha para quem delegar." }, { status: 400 })
    }
    // Sem checklist copiado, a instrução é o conteúdo da delegação — sem ela a
    // demanda-filha nasceria só com um título repetido
    if (!instrucao) {
      return NextResponse.json(
        { error: "Escreva a instrução do que está sendo delegado." },
        { status: 400 },
      )
    }
    if (paraUserId === userId) {
      return NextResponse.json({ error: "Você não pode delegar para si mesmo." }, { status: 400 })
    }

    // A demanda tem que ser sua
    const mae = await prisma.demanda.findFirst({
      where:  { id: demandaId, companyId, userId, deletedAt: null },
      select: {
        id: true, titulo: true, tipo: true, status: true, prioridade: true, prazo: true,
      },
    })
    if (!mae) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    if (mae.tipo === "DIARIO") {
      return NextResponse.json({ error: "O Diário não pode ser delegado." }, { status: 400 })
    }
    if (mae.status === "CONCLUIDA" || mae.status === "CANCELADA") {
      return NextResponse.json(
        { error: "Não dá para delegar uma demanda já encerrada." },
        { status: 400 },
      )
    }

    // O destinatário tem que ser membro ativo da MESMA empresa
    const para = await prisma.user.findFirst({
      where:  { id: paraUserId, companyId, deletedAt: null, active: true },
      select: { id: true, name: true },
    })
    if (!para) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 })

    // Já delegada para essa mesma pessoa?
    const jaExiste = await prisma.delegacao.findFirst({
      where:  { companyId, demandaOrigemId: demandaId, delegadoParaUserId: paraUserId },
      select: { id: true },
    })
    if (jaExiste) {
      return NextResponse.json(
        { error: `Esta demanda já está delegada para ${para.name}.` },
        { status: 409 },
      )
    }

    const quem = session.user.name ?? "Alguém"

    await prisma.$transaction(async (tx) => {
      // 1) Demanda-filha: a instrução é o conteúdo dela, não o checklist da mãe.
      //    As ações da mãe continuam do delegante.
      const filha = await tx.demanda.create({
        data: {
          companyId,
          userId:            para.id,
          titulo:            mae.titulo,
          descricao:         instrucao,
          tipo:              mae.tipo,
          status:            "ABERTA",
          prioridade:        mae.prioridade,
          prazo:             prazoRetorno ?? mae.prazo,
          solicitanteUserId: userId,
          solicitanteNome:   quem,
        },
        select: { id: true },
      })

      // 2) Vínculo, guardando a instrução de forma imutável — a descrição da
      //    filha pode ser editada pelo delegado, este registro não
      await tx.delegacao.create({
        data: {
          companyId,
          demandaOrigemId:    demandaId,
          demandaFilhaId:     filha.id,
          delegadoPorUserId:  userId,
          delegadoParaUserId: para.id,
          instrucao,
          prazoRetorno,
        },
      })

      // 3) delegadoUserId na mãe — usado pelas abas do Foco (v1.10)
      await tx.demanda.update({
        where: { id: demandaId },
        data:  { delegadoUserId: para.id, delegadoNome: para.name },
      })

      // 4) Auto-log nas duas pontas, com a instrução registrada na mãe
      await tx.comentario.create({
        data: {
          demandaId, userId, companyId, tipo: "STATUS",
          conteudo: `Delegada para ${para.name}: ${instrucao}`,
        },
      })
      await tx.comentario.create({
        data: {
          demandaId: filha.id, userId, companyId, tipo: "STATUS",
          conteudo: `Delegada por ${quem}.`,
        },
      })
    })

    const delegacao = await carregarDelegacao(demandaId, companyId)
    return NextResponse.json({ delegacao }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/demandas/[id]/delegar]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
