import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Inbox, CheckSquare, Lightbulb, Calendar, Mic, PenLine } from "lucide-react"
import { inicioMesNoBrasil } from "@/lib/date"
import DemandasList, { type DemandaItem } from "./DemandasList"

type Tipo = "DEMANDA" | "TAREFA" | "IDEIA"

// ── Constantes visuais das abas ───────────────────────────────────────────────
const TIPO_ABA = [
  { t: "DEMANDA" as Tipo, label: "Demandas",  icon: Inbox,       ativo: "bg-violet-600 text-white", badge: "bg-white/20 text-white" },
  { t: "TAREFA"  as Tipo, label: "Tarefas",   icon: CheckSquare, ativo: "bg-emerald-600 text-white", badge: "bg-white/20 text-white" },
  { t: "IDEIA"   as Tipo, label: "Ideias",    icon: Lightbulb,   ativo: "bg-amber-500 text-white", badge: "bg-white/20 text-white" },
] as const

// ── KPIs por tipo ─────────────────────────────────────────────────────────────
function kpiConfig(tipo: Tipo, vals: number[]) {
  if (tipo === "DEMANDA") return [
    { label: "Em aberto",       value: vals[0], cor: vals[0] > 0 ? "text-violet-700" : "text-slate-400", bg: "bg-violet-50" },
    { label: "Concluídas/mês",  value: vals[1], cor: "text-emerald-700",  bg: "bg-emerald-50" },
    { label: "Alta prioridade", value: vals[2], cor: vals[2] > 0 ? "text-red-700" : "text-slate-400", bg: vals[2] > 0 ? "bg-red-50" : "bg-slate-50" },
    { label: "Com prazo",       value: vals[3], cor: "text-amber-700", bg: "bg-amber-50" },
  ]
  if (tipo === "TAREFA") return [
    { label: "A fazer",         value: vals[0], cor: vals[0] > 0 ? "text-amber-700" : "text-slate-400", bg: "bg-amber-50" },
    { label: "Feitas/mês",      value: vals[1], cor: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Com prazo",       value: vals[2], cor: "text-slate-600",  bg: "bg-slate-50" },
    { label: "Alta prioridade", value: vals[3], cor: vals[3] > 0 ? "text-red-700" : "text-slate-400", bg: vals[3] > 0 ? "bg-red-50" : "bg-slate-50" },
  ]
  // IDEIA
  return [
    { label: "Em exploração",   value: vals[0], cor: "text-amber-700", bg: "bg-amber-50" },
    { label: "Arquivadas",      value: vals[1], cor: "text-slate-400", bg: "bg-slate-50" },
    { label: "Total no mês",    value: vals[2], cor: "text-violet-700", bg: "bg-violet-50" },
    { label: "Alta prioridade", value: vals[3], cor: vals[3] > 0 ? "text-red-700" : "text-slate-400", bg: vals[3] > 0 ? "bg-red-50" : "bg-slate-50" },
  ]
}

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)
  const { tipo }  = await searchParams
  const tipoFiltro = (tipo ?? "DEMANDA") as Tipo

  const inicioMes = inicioMesNoBrasil()
  const base      = { companyId, userId, deletedAt: null } as const
  const ativo     = { notIn: ["CONCLUIDA" as const, "CANCELADA" as const] }
  const altaPrio  = { in: ["ALTA" as const, "CRITICA" as const] }
  const baseT     = { ...base, tipo: tipoFiltro } as const

  // Todas as queries em paralelo
  const [counts, demandas, k1, k2, k3, k4] = await Promise.all([
    // Contagens para badges das abas (só ativos)
    prisma.demanda.groupBy({
      by:    ["tipo", "status"],
      where: base,
      _count: true,
    }),

    // Lista principal
    prisma.demanda.findMany({
      where:   { ...base, tipo: tipoFiltro },
      include: { acoes: { orderBy: { ordem: "asc" } } },
      orderBy: [{ status: "asc" }, { prioridade: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),

    // KPI 1
    tipoFiltro === "DEMANDA"
      ? prisma.demanda.count({ where: { ...baseT, status: { in: ["ABERTA", "EM_ANDAMENTO"] } } })
      : tipoFiltro === "TAREFA"
      ? prisma.demanda.count({ where: { ...baseT, status: "ABERTA" } })
      : prisma.demanda.count({ where: { ...baseT, status: { in: ["ABERTA", "EM_ANDAMENTO"] } } }),

    // KPI 2
    tipoFiltro === "IDEIA"
      ? prisma.demanda.count({ where: { ...baseT, status: { in: ["CONCLUIDA", "CANCELADA"] } } })
      : prisma.demanda.count({ where: { ...baseT, status: "CONCLUIDA", updatedAt: { gte: inicioMes } } }),

    // KPI 3
    tipoFiltro === "IDEIA"
      ? prisma.demanda.count({ where: { ...baseT, createdAt: { gte: inicioMes } } })
      : prisma.demanda.count({ where: { ...baseT, prazo: { not: null }, status: ativo } }),

    // KPI 4 — Alta prioridade ativa (igual para todos os tipos)
    prisma.demanda.count({ where: { ...baseT, prioridade: altaPrio, status: ativo } }),
  ])

  // Conta para badges das abas
  const countOf = (t: string) =>
    counts
      .filter((c) => c.tipo === t && c.status !== "CONCLUIDA" && c.status !== "CANCELADA")
      .reduce((acc, c) => acc + c._count, 0)

  // KPIs
  const kpis = kpiConfig(tipoFiltro, [k1, k2, k3, k4])

  // Quota de IA
  const aiQuota     = session!.user.aiQuota
  const aiUsed      = session!.user.aiUsedTotal
  const aiRestante  = aiQuota !== null ? aiQuota - aiUsed : null
  const aiBloqueado = aiQuota !== null && aiUsed >= aiQuota

  // Serializa datas para o client component
  const demandasSerializadas: DemandaItem[] = demandas.map((d) => ({
    id:              d.id,
    titulo:          d.titulo,
    descricao:       d.descricao,
    tipo:            d.tipo,
    status:          d.status,
    prioridade:      d.prioridade,
    prazo:           d.prazo?.toISOString() ?? null,
    solicitanteNome: d.solicitanteNome,
    aiProcessado:    d.aiProcessado,
    createdAt:       d.createdAt.toISOString(),
    acoes:           d.acoes.map((a) => ({ id: a.id, feita: a.feita, descricao: a.descricao })),
  }))

  return (
    <div className="p-4 md:p-8 max-w-4xl">

      {/* ── Banner quota de IA ─────────────────────────────────────────────── */}
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

      {/* ── Abas de tipo ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1">
        {TIPO_ABA.map(({ t, label, icon: Icon, ativo, badge }) => (
          <Link
            key={t}
            href={`/app?tipo=${t}`}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tipoFiltro === t ? ativo : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={15} strokeWidth={2} />
            {label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${
              tipoFiltro === t ? badge : "bg-slate-100 text-slate-500"
            }`}>
              {countOf(t)}
            </span>
          </Link>
        ))}
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map(({ label, value, cor, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3 border border-white`}>
            <p className={`text-2xl font-bold ${cor}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Ações rápidas ──────────────────────────────────────────────────── */}
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium transition-colors ${
            aiBloqueado ? "bg-slate-100 text-slate-400 pointer-events-none" : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <PenLine size={16} strokeWidth={2} />
          Texto + IA
        </Link>
        <Link
          href={`/app/nova?tipo=${tipoFiltro}&modo=manual`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <PenLine size={16} strokeWidth={2} />
          Manual
        </Link>
        <Link
          href="/app/calendario"
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <Calendar size={16} strokeWidth={2} />
          Calendário
        </Link>
      </div>

      {/* ── Lista com filtros (client) ──────────────────────────────────────── */}
      <DemandasList demandas={demandasSerializadas} tipo={tipoFiltro} />

    </div>
  )
}
