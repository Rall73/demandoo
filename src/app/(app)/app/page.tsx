import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus, Inbox, CheckSquare, Lightbulb, Calendar, Mic, PenLine } from "lucide-react"

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)
  const { tipo }  = await searchParams
  const tipoFiltro = (tipo ?? "DEMANDA") as "DEMANDA" | "TAREFA" | "IDEIA"

  // Contagens por tipo e status
  const [counts, demandas] = await Promise.all([
    prisma.demanda.groupBy({
      by:     ["tipo", "status"],
      where:  { companyId, userId, deletedAt: null },
      _count: true,
    }),
    prisma.demanda.findMany({
      where: { companyId, userId, deletedAt: null, tipo: tipoFiltro },
      include: { acoes: { orderBy: { ordem: "asc" } } },
      orderBy: [{ status: "asc" }, { prioridade: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
  ])

  const countOf = (t: string, s?: string) =>
    counts
      .filter((c) => c.tipo === t && (s ? c.status === s : true))
      .reduce((acc, c) => acc + c._count, 0)

  // Info de quota de IA
  const aiQuota    = session!.user.aiQuota
  const aiUsed     = session!.user.aiUsedTotal
  const aiRestante = aiQuota !== null ? aiQuota - aiUsed : null
  const aiBloqueado = aiQuota !== null && aiUsed >= aiQuota

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Banner de quota de IA */}
      {aiQuota !== null && aiRestante !== null && aiRestante <= Math.ceil(aiQuota * 0.3) && (
        <div className={`mb-6 rounded-xl border px-4 py-3 flex items-center justify-between gap-4 text-sm ${
          aiBloqueado
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          <span>
            {aiBloqueado
              ? "Suas capturas com IA acabaram. A captura manual continua disponível."
              : `Você tem ${aiRestante} captura${aiRestante === 1 ? "" : "s"} com IA restante${aiRestante === 1 ? "" : "s"}.`}
          </span>
          <Link
            href="/planos"
            className="shrink-0 bg-violet-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-violet-700 transition-colors"
          >
            Fazer upgrade
          </Link>
        </div>
      )}

      {/* Abas de tipo */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1">
        {([
          { t: "DEMANDA", label: "Demandas", icon: Inbox },
          { t: "TAREFA",  label: "Tarefas",  icon: CheckSquare },
          { t: "IDEIA",   label: "Ideias",   icon: Lightbulb },
        ] as const).map(({ t, label, icon: Icon }) => (
          <Link
            key={t}
            href={`/app?tipo=${t}`}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tipoFiltro === t
                ? "bg-violet-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={15} strokeWidth={2} />
            {label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${
              tipoFiltro === t ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {countOf(t, "ABERTA") + countOf(t, "EM_ANDAMENTO")}
            </span>
          </Link>
        ))}
      </div>

      {/* Ações rápidas */}
      <div className="flex gap-2 mb-6">
        <Link
          href={`/app/nova?tipo=${tipoFiltro}`}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors ${
            aiBloqueado ? "bg-slate-400 cursor-not-allowed pointer-events-none" : "bg-violet-600 hover:bg-violet-700"
          }`}
        >
          <Mic size={16} strokeWidth={2} />
          Captura por voz
        </Link>
        <Link
          href={`/app/nova?tipo=${tipoFiltro}&modo=texto`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <PenLine size={16} strokeWidth={2} />
          Digitar
        </Link>
        <Link
          href="/app/calendario"
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <Calendar size={16} strokeWidth={2} />
          Calendário
        </Link>
      </div>

      {/* Lista de demandas */}
      {demandas.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Plus size={40} className="mx-auto mb-3 opacity-40" strokeWidth={1.5} />
          <p className="font-medium">Nenhum registro ainda</p>
          <p className="text-sm mt-1">Crie sua primeira captura acima.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {demandas.map((d) => (
            <Link
              key={d.id}
              href={`/app/${d.id}`}
              className="block bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-violet-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    d.status === "CONCLUIDA" || d.status === "CANCELADA"
                      ? "line-through text-slate-400"
                      : "text-slate-800"
                  }`}>
                    {d.titulo}
                  </p>
                  {d.descricao && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{d.descricao}</p>
                  )}
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  d.prioridade === "CRITICA" ? "bg-red-100 text-red-700" :
                  d.prioridade === "ALTA"    ? "bg-orange-100 text-orange-700" :
                  d.prioridade === "MEDIA"   ? "bg-yellow-100 text-yellow-700" :
                  "bg-slate-100 text-slate-500"
                }`}>
                  {d.prioridade}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
