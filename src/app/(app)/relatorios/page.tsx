import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import RelatorioClient, { type DemandaRelatorio } from "./RelatorioClient"

type Tipo = "DEMANDA" | "TAREFA" | "IDEIA"

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)

  const { tipo } = await searchParams
  const tipoFiltro = (tipo ?? "DEMANDA") as Tipo

  const base = { companyId, userId, deletedAt: null } as const

  const [demandas, contagens] = await Promise.all([
    prisma.demanda.findMany({
      where:   { ...base, tipo: tipoFiltro },
      include: { acoes: { where: { deletedAt: null }, orderBy: { ordem: "asc" } } },
      orderBy: [{ status: "asc" }, { prioridade: "asc" }, { createdAt: "desc" }],
      take:    200,
    }),
    prisma.demanda.groupBy({
      by:    ["tipo"],
      where: base,
      _count: true,
    }),
  ])

  // Contagem total por tipo (não só ativos)
  const counts: Record<string, number> = {}
  for (const c of contagens) {
    counts[c.tipo] = (counts[c.tipo] ?? 0) + c._count
  }

  const demandasSerializadas: DemandaRelatorio[] = demandas.map((d) => ({
    id:              d.id,
    titulo:          d.titulo,
    descricao:       d.descricao,
    tipo:            d.tipo as Tipo,
    status:          d.status as DemandaRelatorio["status"],
    prioridade:      d.prioridade as DemandaRelatorio["prioridade"],
    prazo:           d.prazo?.toISOString() ?? null,
    solicitanteNome: d.solicitanteNome,
    aiProcessado:    d.aiProcessado,
    acoes:           d.acoes.map((a) => ({ id: a.id, feita: a.feita, descricao: a.descricao })),
    createdAt:       d.createdAt.toISOString(),
  }))

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-slate-500 text-sm mt-1">
          Selecione os itens que deseja imprimir ou salvar como PDF.
        </p>
      </div>

      <RelatorioClient
        demandas={demandasSerializadas}
        tipo={tipoFiltro}
        counts={counts}
      />
    </div>
  )
}
