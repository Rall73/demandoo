import { prisma } from "@/lib/prisma"
import type { RelacaoItem, Sentido } from "@/lib/relacoes"

const SELECT_LIGADA = {
  id: true, titulo: true, tipo: true, status: true, prazo: true, deletedAt: true,
} as const

/**
 * Carrega os vínculos de uma demanda nos dois sentidos.
 * `companyId` da sessão é obrigatório — nunca confie só no id da demanda.
 */
export async function carregarRelacoes(
  demandaId: number,
  companyId: number,
): Promise<RelacaoItem[]> {
  const linhas = await prisma.demandaRelacao.findMany({
    where: {
      companyId,
      OR: [{ demandaOrigemId: demandaId }, { demandaDestinoId: demandaId }],
    },
    select: {
      id: true, tipo: true, demandaOrigemId: true, demandaDestinoId: true,
      origem:  { select: SELECT_LIGADA },
      destino: { select: SELECT_LIGADA },
    },
    orderBy: { createdAt: "asc" },
  })

  return linhas
    // O vínculo sobrevive ao soft delete da outra ponta, mas não deve ser exibido
    .filter((l) => {
      const outra = l.demandaOrigemId === demandaId ? l.destino : l.origem
      return outra.deletedAt === null
    })
    .map((l) => {
      // Se a demanda consultada é a origem, o outro lado está "adiante"
      const ehOrigem = l.demandaOrigemId === demandaId
      const outra    = ehOrigem ? l.destino : l.origem
      return {
        relacaoId: l.id,
        tipo:      l.tipo,
        sentido:   (ehOrigem ? "ADIANTE" : "ATRAS") as Sentido,
        demanda: {
          id:     outra.id,
          titulo: outra.titulo,
          tipo:   outra.tipo as string,
          status: outra.status as string,
          prazo:  outra.prazo?.toISOString() ?? null,
        },
      }
    })
}
