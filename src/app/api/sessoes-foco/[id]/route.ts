import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseDateTimeBRT } from "@/lib/date"

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/sessoes-foco/[id] — edita início/término de uma sessão (recalcula duração)
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const companyId = session.user.companyId
    const userId    = Number(session.user.id)
    const { id }    = await params

    const atual = await prisma.sessaoFoco.findFirst({
      where:  { id: Number(id), companyId, userId },
      select: { id: true, iniciadoEm: true, encerradoEm: true },
    })
    if (!atual) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })

    const body        = await req.json().catch(() => ({}))
    const iniciadoEm  = body?.iniciadoEm  ? parseDateTimeBRT(String(body.iniciadoEm))  : atual.iniciadoEm
    const encerradoEm = body?.encerradoEm ? parseDateTimeBRT(String(body.encerradoEm)) : atual.encerradoEm
    if (isNaN(iniciadoEm.getTime()) || isNaN(encerradoEm.getTime())) {
      return NextResponse.json({ error: "Datas inválidas" }, { status: 400 })
    }
    const duracaoMin = Math.round((encerradoEm.getTime() - iniciadoEm.getTime()) / 60000)
    if (duracaoMin <= 0) {
      return NextResponse.json({ error: "O término deve ser depois do início" }, { status: 400 })
    }

    await prisma.sessaoFoco.updateMany({
      where: { id: Number(id), companyId, userId },
      data:  { iniciadoEm, encerradoEm, duracaoMin },
    })
    return NextResponse.json({ ok: true, duracaoMin })
  } catch (err) {
    console.error("[PATCH /api/sessoes-foco/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// DELETE /api/sessoes-foco/[id] — remove uma sessão (hard delete: é registro de tempo)
export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const companyId = session.user.companyId
    const userId    = Number(session.user.id)
    const { id }    = await params

    await prisma.sessaoFoco.deleteMany({
      where: { id: Number(id), companyId, userId },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/sessoes-foco/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
