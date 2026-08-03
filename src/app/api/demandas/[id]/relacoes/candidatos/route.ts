import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

/**
 * GET ?q=texto — demandas candidatas a vínculo, para o autocomplete.
 * Exclui a própria demanda, o tipo DIARIO e as que já estão vinculadas.
 */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)
    const demandaId = Number(id)

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim()

    const demanda = await prisma.demanda.findFirst({
      where:  { id: demandaId, companyId, userId, deletedAt: null },
      select: { id: true },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    // Ids já vinculados em qualquer direção
    const jaVinculadas = await prisma.demandaRelacao.findMany({
      where:  { companyId, OR: [{ demandaOrigemId: demandaId }, { demandaDestinoId: demandaId }] },
      select: { demandaOrigemId: true, demandaDestinoId: true },
    })
    const excluir = new Set<number>([demandaId])
    for (const r of jaVinculadas) {
      excluir.add(r.demandaOrigemId)
      excluir.add(r.demandaDestinoId)
    }

    const candidatos = await prisma.demanda.findMany({
      where: {
        companyId,
        userId,
        deletedAt: null,
        tipo:      { not: "DIARIO" },
        id:        { notIn: Array.from(excluir) },
        ...(q ? { titulo: { contains: q } } : {}),
      },
      select:  { id: true, titulo: true, tipo: true, status: true, prazo: true },
      orderBy: { createdAt: "desc" },
      take:    8,
    })

    return NextResponse.json({
      candidatos: candidatos.map((d) => ({
        id:     d.id,
        titulo: d.titulo,
        tipo:   d.tipo as string,
        status: d.status as string,
        prazo:  d.prazo?.toISOString() ?? null,
      })),
    })
  } catch (err) {
    console.error("[GET /api/demandas/[id]/relacoes/candidatos]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
