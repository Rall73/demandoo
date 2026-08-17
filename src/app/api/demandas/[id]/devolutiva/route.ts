import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { carregarDelegacao } from "@/lib/delegacao-db"
import { sendDevolutivaEmail } from "@/lib/email"

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST — o delegado registra o retorno da demanda que recebeu.
 *
 * Grava a devolutiva na delegação e publica um comentário na timeline da MÃE,
 * para que quem delegou veja o retorno no próprio registro. Opcionalmente
 * conclui a demanda-filha no mesmo movimento.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const body      = await req.json()
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)
    const filhaId   = Number(id)

    const texto    = typeof body.devolutiva === "string" ? body.devolutiva.trim() : ""
    const concluir = Boolean(body.concluir)

    if (!texto) {
      return NextResponse.json({ error: "Escreva a devolutiva." }, { status: 400 })
    }

    // A demanda-filha tem que ser sua
    const filha = await prisma.demanda.findFirst({
      where:  { id: filhaId, companyId, userId, deletedAt: null },
      select: { id: true, status: true },
    })
    if (!filha) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const delegacao = await prisma.delegacao.findFirst({
      where: {
        companyId,
        demandaFilhaId:     filhaId,
        delegadoParaUserId: userId,
      },
      select: {
        id: true, demandaOrigemId: true,
        delegadoPor: { select: { name: true, email: true } },
        origem:      { select: { titulo: true } },
      },
    })
    if (!delegacao) {
      return NextResponse.json(
        { error: "Esta demanda não veio de uma delegação." },
        { status: 400 },
      )
    }

    const quem  = session.user.name ?? "O delegado"
    const agora = new Date()

    await prisma.$transaction(async (tx) => {
      await tx.delegacao.update({
        where: { id: delegacao.id },
        data:  { devolutiva: texto, respondidoAt: agora },
      })

      // Retorno visível na timeline de quem delegou
      await tx.comentario.create({
        data: {
          demandaId: delegacao.demandaOrigemId,
          userId, companyId, tipo: "NOTA",
          conteudo:  `Retorno de ${quem}: ${texto}`,
        },
      })

      // E registrado também na própria filha
      await tx.comentario.create({
        data: {
          demandaId: filhaId, userId, companyId, tipo: "STATUS",
          conteudo:  "Devolutiva registrada.",
        },
      })

      if (concluir && filha.status !== "CONCLUIDA") {
        await tx.demanda.update({
          where: { id: filhaId },
          data:  { status: "CONCLUIDA", concluidoAt: agora, focoIniciadoEm: null },
        })
      }
    })

    // Sem await, mesmo motivo do delegar: o retorno já está gravado
    sendDevolutivaEmail(
      delegacao.delegadoPor.email,
      delegacao.delegadoPor.name,
      quem,
      delegacao.origem.titulo,
      texto,
      delegacao.demandaOrigemId,
    ).catch((err) => console.error("[devolutiva] e-mail falhou:", err))

    const atualizada = await carregarDelegacao(filhaId, companyId)
    return NextResponse.json({ delegacao: atualizada })
  } catch (err) {
    console.error("[POST /api/demandas/[id]/devolutiva]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
