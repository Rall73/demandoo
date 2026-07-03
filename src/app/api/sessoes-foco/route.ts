import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseDateTimeBRT } from "@/lib/date"

// POST /api/sessoes-foco — registra uma sessão de foco manual (tempo esquecido)
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    const body      = await req.json().catch(() => ({}))
    const demandaId = Number(body?.demandaId)
    const iniStr    = String(body?.iniciadoEm ?? "")
    const fimStr    = String(body?.encerradoEm ?? "")
    if (!demandaId || !iniStr || !fimStr) {
      return NextResponse.json({ error: "Informe a demanda, o início e o término" }, { status: 400 })
    }

    // A demanda precisa ser do próprio usuário
    const demanda = await prisma.demanda.findFirst({
      where:  { id: demandaId, companyId, userId, deletedAt: null },
      select: { id: true },
    })
    if (!demanda) return NextResponse.json({ error: "Demanda não encontrada" }, { status: 404 })

    const iniciadoEm  = parseDateTimeBRT(iniStr)
    const encerradoEm = parseDateTimeBRT(fimStr)
    if (isNaN(iniciadoEm.getTime()) || isNaN(encerradoEm.getTime())) {
      return NextResponse.json({ error: "Datas inválidas" }, { status: 400 })
    }
    const duracaoMin = Math.round((encerradoEm.getTime() - iniciadoEm.getTime()) / 60000)
    if (duracaoMin <= 0) {
      return NextResponse.json({ error: "O término deve ser depois do início" }, { status: 400 })
    }

    const sessao = await prisma.sessaoFoco.create({
      data: { companyId, userId, demandaId, iniciadoEm, encerradoEm, duracaoMin },
    })
    return NextResponse.json({ sessao }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/sessoes-foco]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
