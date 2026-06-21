import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hojeISOBrasil, parseDateBRT } from "@/lib/date"

// Registra um ciclo de foco (pomodoro) concluído como comentário do DIARIO de hoje.
// Não usa sessoes_foco de propósito: o pomodoro é foco "livre" e não deve inflar o
// painel "Tempo de foco" (reservado ao tempo gasto em demandas reais).
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    const body = await req.json().catch(() => ({}))
    const dur  = Math.round(Number(body?.duracaoMin))
    if (!Number.isFinite(dur) || dur < 1 || dur > 180) {
      return NextResponse.json({ error: "Duração inválida" }, { status: 400 })
    }

    // DIARIO do dia corrente em Brasília (nunca new Date() cru para "hoje")
    const dataISO   = hojeISOBrasil()
    const inicioDia = parseDateBRT(dataISO)
    const fimDia    = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000)

    let diario = await prisma.demanda.findFirst({
      where:  { companyId, userId, tipo: "DIARIO", prazo: { gte: inicioDia, lt: fimDia }, deletedAt: null },
      select: { id: true },
    })
    if (!diario) {
      const titulo = `Diário — ${dataISO.split("-").reverse().join("/")}`
      diario = await prisma.demanda.create({
        data:   { companyId, userId, titulo, tipo: "DIARIO", status: "ABERTA", prazo: inicioDia, prioridade: "MEDIA" },
        select: { id: true },
      })
    }

    const comentario = await prisma.comentario.create({
      data: {
        demandaId: diario.id,
        userId,
        companyId,
        conteudo:  `Ciclo de foco concluído — ${dur} min`,
        tipo:      "POMODORO",
      },
      select: { id: true, conteudo: true, tipo: true, createdAt: true },
    })

    return NextResponse.json({ ok: true, comentario }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/diario/pomodoro]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
