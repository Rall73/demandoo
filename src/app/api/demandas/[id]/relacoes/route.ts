import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { carregarRelacoes } from "@/lib/relacoes-db"
import type { RelacaoTipo } from "@prisma/client"

type Ctx = { params: Promise<{ id: string }> }

const TIPOS_VALIDOS = ["CONTINUACAO", "DESDOBRAMENTO", "RELACIONADA"] as const

/** Confirma que a demanda existe e pertence ao tenant/usuário da sessão. */
async function minhaDemanda(id: number, companyId: number, userId: number) {
  return prisma.demanda.findFirst({
    where:  { id, companyId, userId, deletedAt: null },
    select: { id: true },
  })
}

// ── GET: vínculos da demanda, nos dois sentidos ─────────────────────────────
export async function GET(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    const demanda = await minhaDemanda(Number(id), companyId, userId)
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const relacoes = await carregarRelacoes(Number(id), companyId)
    return NextResponse.json({ relacoes })
  } catch (err) {
    console.error("[GET /api/demandas/[id]/relacoes]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// ── POST: cria vínculo ──────────────────────────────────────────────────────
export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const body      = await req.json()
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    const estaId  = Number(id)
    const outraId = Number(body.demandaId)
    const tipo    = body.tipo as RelacaoTipo
    const sentido = body.sentido

    if (!outraId || isNaN(outraId)) {
      return NextResponse.json({ error: "Demanda de destino inválida." }, { status: 400 })
    }
    if (outraId === estaId) {
      return NextResponse.json({ error: "Uma demanda não pode ser vinculada a si mesma." }, { status: 400 })
    }
    if (!(TIPOS_VALIDOS as readonly string[]).includes(tipo)) {
      return NextResponse.json({ error: "Tipo de vínculo inválido." }, { status: 400 })
    }
    if (sentido !== "ADIANTE" && sentido !== "ATRAS") {
      return NextResponse.json({ error: "Sentido inválido." }, { status: 400 })
    }

    // As duas pontas precisam ser do mesmo tenant e do mesmo usuário
    const [esta, outra] = await Promise.all([
      minhaDemanda(estaId,  companyId, userId),
      minhaDemanda(outraId, companyId, userId),
    ])
    if (!esta || !outra) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    // ADIANTE: esta demanda é a origem (veio antes). ATRAS: é o destino.
    const demandaOrigemId  = sentido === "ADIANTE" ? estaId  : outraId
    const demandaDestinoId = sentido === "ADIANTE" ? outraId : estaId

    // Já vinculadas em qualquer direção? Não duplica.
    const existente = await prisma.demandaRelacao.findFirst({
      where: {
        companyId,
        OR: [
          { demandaOrigemId: estaId,  demandaDestinoId: outraId },
          { demandaOrigemId: outraId, demandaDestinoId: estaId  },
        ],
      },
      select: { id: true },
    })
    if (existente) {
      return NextResponse.json(
        { error: "Estas demandas já estão vinculadas." },
        { status: 409 },
      )
    }

    await prisma.demandaRelacao.create({
      data: { companyId, demandaOrigemId, demandaDestinoId, tipo },
    })

    const relacoes = await carregarRelacoes(estaId, companyId)
    return NextResponse.json({ relacoes }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/demandas/[id]/relacoes]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
