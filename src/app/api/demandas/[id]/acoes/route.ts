import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id } = await params
    const body   = await req.json()
    const { descricao } = body

    if (!descricao?.trim()) {
      return NextResponse.json({ error: "Descrição obrigatória" }, { status: 400 })
    }

    // Verifica que a demanda pertence ao companyId da sessão
    const demanda = await prisma.demanda.findFirst({
      where: { id: Number(id), companyId: session.user.companyId, deletedAt: null },
      select: { id: true },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    // Determina a próxima ordem
    const ultima = await prisma.acaoDemanda.findFirst({
      where:   { demandaId: Number(id), deletedAt: null },
      orderBy: { ordem: "desc" },
      select:  { ordem: true },
    })
    const proxOrdem = (ultima?.ordem ?? -1) + 1

    const acao = await prisma.acaoDemanda.create({
      data: {
        demandaId: Number(id),
        descricao: descricao.trim().slice(0, 1000),
        ordem:     proxOrdem,
      },
    })

    return NextResponse.json({ acao }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/demandas/[id]/acoes]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
