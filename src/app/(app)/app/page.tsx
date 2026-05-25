import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
  Inbox, CheckSquare, Lightbulb, Plus, Calendar,
  CheckCircle2, AlertTriangle, Archive, Compass, ArrowRight,
} from "lucide-react"
import { hojeNoBrasil } from "@/lib/date"

type Tipo = "DEMANDA" | "TAREFA" | "IDEIA"

type Metrica = {
  icon:  typeof Inbox
  label: string
  value: number
  cor:   string
  sub?:  string
}

export default async function DashboardPage() {
  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)

  const hoje  = hojeNoBrasil()
  const base  = { companyId, userId, deletedAt: null } as const
  const ativo = { in: ["ABERTA" as const, "EM_ANDAMENTO" as const] }

  // ── Queries em paralelo ───────────────────────────────────────────────────
  const [
    // DEMANDA
    demandaTotal, demandaConcluidas, demandaConcluidasComPrazo, demandaConcluidasNoPrazo, demandaVencidas,
    // TAREFA
    tarefaTotal,  tarefaConcluidas,  tarefaConcluidasComPrazo,  tarefaConcluidasNoPrazo,  tarefaVencidas,
    // IDEIA
    ideiaTotal,   ideiaEmExploracao, ideiaConcluidas,           ideiaArquivadas,
    // Quota IA
    company,
  ] = await Promise.all([
    // ── DEMANDA ──
    prisma.demanda.count({ where: { ...base, tipo: "DEMANDA" } }),
    prisma.demanda.count({ where: { ...base, tipo: "DEMANDA", status: "CONCLUIDA" } }),
    prisma.demanda.count({ where: { ...base, tipo: "DEMANDA", status: "CONCLUIDA", prazo: { not: null } } }),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) as n FROM demandas
      WHERE companyId = ${companyId} AND userId = ${userId}
        AND deletedAt IS NULL AND tipo = 'DEMANDA'
        AND status = 'CONCLUIDA' AND prazo IS NOT NULL
        AND concluidoAt <= prazo
    `.then((r) => Number(r[0]?.n ?? 0)),
    prisma.demanda.count({ where: { ...base, tipo: "DEMANDA", status: ativo, prazo: { lt: hoje } } }),

    // ── TAREFA ──
    prisma.demanda.count({ where: { ...base, tipo: "TAREFA" } }),
    prisma.demanda.count({ where: { ...base, tipo: "TAREFA", status: "CONCLUIDA" } }),
    prisma.demanda.count({ where: { ...base, tipo: "TAREFA", status: "CONCLUIDA", prazo: { not: null } } }),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) as n FROM demandas
      WHERE companyId = ${companyId} AND userId = ${userId}
        AND deletedAt IS NULL AND tipo = 'TAREFA'
        AND status = 'CONCLUIDA' AND prazo IS NOT NULL
        AND concluidoAt <= prazo
    `.then((r) => Number(r[0]?.n ?? 0)),
    prisma.demanda.count({ where: { ...base, tipo: "TAREFA", status: ativo, prazo: { lt: hoje } } }),

    // ── IDEIA ──
    prisma.demanda.count({ where: { ...base, tipo: "IDEIA" } }),
    prisma.demanda.count({ where: { ...base, tipo: "IDEIA", status: ativo } }),
    prisma.demanda.count({ where: { ...base, tipo: "IDEIA", status: "CONCLUIDA" } }),
    prisma.demanda.count({ where: { ...base, tipo: "IDEIA", status: "CANCELADA" } }),

    // ── Quota IA ──
    prisma.company.findUnique({
      where: { id: companyId },
      select: { aiUsedTotal: true, plan: { select: { aiQuota: true } } },
    }),
  ])

  // Quota IA
  const aiQuota     = company?.plan.aiQuota ?? null
  const aiUsed      = company?.aiUsedTotal ?? 0
  const aiRestante  = aiQuota !== null ? aiQuota - aiUsed : null
  const aiBloqueado = aiQuota !== null && aiUsed >= aiQuota

  // ── Estrutura dos cards ──────────────────────────────────────────────────
  const cardDemanda = {
    tipo:      "DEMANDA" as Tipo,
    label:     "Demandas",
    sub:       "Solicitações de terceiros",
    icon:      Inbox,
    accent:    "violet",
    href:      "/app/lista?tipo=DEMANDA",
    metricas: ([
      { icon: Inbox,         label: "Total",         value: demandaTotal,       cor: "text-slate-800" },
      { icon: CheckCircle2,  label: "Concluídas",    value: demandaConcluidas,  cor: "text-emerald-600" },
      { icon: CheckCircle2,  label: "No prazo",      value: demandaConcluidasNoPrazo, cor: "text-emerald-600",
        sub: demandaConcluidasComPrazo > 0 ? `de ${demandaConcluidasComPrazo} c/ prazo` : "—" },
      { icon: AlertTriangle, label: "Vencidas",      value: demandaVencidas,    cor: demandaVencidas > 0 ? "text-red-600" : "text-slate-400" },
    ] as Metrica[]),
  }

  const cardTarefa = {
    tipo:      "TAREFA" as Tipo,
    label:     "Tarefas",
    sub:       "Coisas suas para fazer",
    icon:      CheckSquare,
    accent:    "emerald",
    href:      "/app/lista?tipo=TAREFA",
    metricas: ([
      { icon: CheckSquare,   label: "Total",         value: tarefaTotal,       cor: "text-slate-800" },
      { icon: CheckCircle2,  label: "Concluídas",    value: tarefaConcluidas,  cor: "text-emerald-600" },
      { icon: CheckCircle2,  label: "No prazo",      value: tarefaConcluidasNoPrazo, cor: "text-emerald-600",
        sub: tarefaConcluidasComPrazo > 0 ? `de ${tarefaConcluidasComPrazo} c/ prazo` : "—" },
      { icon: AlertTriangle, label: "Vencidas",      value: tarefaVencidas,    cor: tarefaVencidas > 0 ? "text-red-600" : "text-slate-400" },
    ] as Metrica[]),
  }

  const cardIdeia = {
    tipo:      "IDEIA" as Tipo,
    label:     "Ideias",
    sub:       "Insights e explorações",
    icon:      Lightbulb,
    accent:    "amber",
    href:      "/app/lista?tipo=IDEIA",
    metricas: ([
      { icon: Lightbulb,    label: "Total",         value: ideiaTotal,         cor: "text-slate-800" },
      { icon: Compass,      label: "Em exploração", value: ideiaEmExploracao,  cor: "text-amber-600" },
      { icon: CheckCircle2, label: "Concluídas",    value: ideiaConcluidas,    cor: "text-emerald-600" },
      { icon: Archive,      label: "Arquivadas",    value: ideiaArquivadas,    cor: "text-slate-400" },
    ] as Metrica[]),
  }

  const cards = [cardDemanda, cardTarefa, cardIdeia]

  return (
    <div className="p-4 md:p-8 max-w-5xl">

      {/* ── Saudação ───────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Olá, {session!.user.name?.split(" ")[0] ?? ""}</h1>
        <p className="text-slate-500 text-sm mt-1">Seu painel de demandas, tarefas e ideias.</p>
      </div>

      {/* ── Banner quota IA ─────────────────────────────────────────────────── */}
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

      {/* ── Botão principal: Nova captura ─────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/app/nova"
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold shadow-sm transition-colors ${
            aiBloqueado ? "bg-slate-400 cursor-not-allowed pointer-events-none" : "bg-violet-600 hover:bg-violet-700"
          }`}
        >
          <Plus size={18} strokeWidth={2.5} />
          Nova captura
        </Link>
        <Link
          href="/app/calendario"
          className="ml-auto flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <Calendar size={16} strokeWidth={2} />
          Calendário
        </Link>
      </div>

      {/* ── 3 cards de resumo por tipo ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          const accentBg     = card.accent === "violet" ? "bg-violet-100" : card.accent === "emerald" ? "bg-emerald-100" : "bg-amber-100"
          const accentText   = card.accent === "violet" ? "text-violet-700" : card.accent === "emerald" ? "text-emerald-700" : "text-amber-700"
          const accentHover  = card.accent === "violet" ? "hover:border-violet-300" : card.accent === "emerald" ? "hover:border-emerald-300" : "hover:border-amber-300"

          return (
            <Link
              key={card.tipo}
              href={card.href}
              className={`group bg-white rounded-2xl border border-slate-200 p-5 transition-all hover:shadow-sm ${accentHover}`}
            >
              {/* Header do card */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 ${accentBg} rounded-xl flex items-center justify-center`}>
                    <Icon size={17} className={accentText} strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm">{card.label}</h2>
                    <p className="text-xs text-slate-500">{card.sub}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" strokeWidth={2} />
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 gap-3">
                {card.metricas.map((m) => {
                  const MIcon = m.icon
                  return (
                    <div key={m.label} className="bg-slate-50 rounded-lg p-2.5">
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-0.5">
                        <MIcon size={11} strokeWidth={2} />
                        {m.label}
                      </div>
                      <p className={`text-xl font-bold ${m.cor}`}>{m.value}</p>
                      {m.sub && <p className="text-[10px] text-slate-400 mt-0.5">{m.sub}</p>}
                    </div>
                  )
                })}
              </div>
            </Link>
          )
        })}
      </div>

    </div>
  )
}
