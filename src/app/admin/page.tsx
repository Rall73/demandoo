import { prisma } from "@/lib/prisma"
import { hojeNoBrasil } from "@/lib/date"
import {
  Building2, Users, Inbox, Zap, TrendingUp,
  CheckSquare, Lightbulb, Clock, AlertTriangle,
} from "lucide-react"

// custo estimado por captura com IA (USD)
// Whisper ~45s avg ≈ $0.0045 + GPT-4o-mini ≈ $0.0003
const CUSTO_POR_CAPTURA = 0.005
const USD_TO_BRL = 5.7

function KpiCard({
  title, value, sub, icon: Icon, color = "violet",
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color?: "violet" | "emerald" | "amber" | "blue" | "slate"
}) {
  const colors = {
    violet: "bg-violet-100 text-violet-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber:   "bg-amber-100 text-amber-600",
    blue:    "bg-blue-100 text-blue-600",
    slate:   "bg-slate-100 text-slate-600",
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const hoje = hojeNoBrasil()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [
    totalEmpresas,
    totalEmpresasAtivas,
    totalUsuarios,
    totalDemandas,
    aiAggregate,
    demandasHoje,
    aiHoje,
    aiMes,
    novosMes,
    demandasPorTipo,
    empresasPorPlano,
    ultimasCronExecucoes,
  ] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { deletedAt: null, active: true } }),
    prisma.user.count({ where: { deletedAt: null, active: true } }),
    prisma.demanda.count({ where: { deletedAt: null } }),
    prisma.company.aggregate({ _sum: { aiUsedTotal: true } }),
    prisma.demanda.count({ where: { deletedAt: null, createdAt: { gte: hoje } } }),
    prisma.demanda.count({ where: { deletedAt: null, aiProcessado: true, createdAt: { gte: hoje } } }),
    prisma.demanda.count({ where: { deletedAt: null, aiProcessado: true, createdAt: { gte: inicioMes } } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: inicioMes } } }),
    prisma.demanda.groupBy({
      by: ["tipo"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.company.groupBy({
      by: ["planId"],
      where: { deletedAt: null, active: true },
      _count: { id: true },
    }),
    prisma.cronExecucao.findMany({
      orderBy: { executadoEm: "desc" },
      take: 8,
    }),
  ])

  const totalAI = aiAggregate._sum.aiUsedTotal ?? 0
  const custoUSD = totalAI * CUSTO_POR_CAPTURA
  const custoBRL = custoUSD * USD_TO_BRL

  // busca nomes dos planos para o breakdown
  const plans = await prisma.plan.findMany({ where: { active: true } })
  const planMap = Object.fromEntries(plans.map((p) => [p.id, p.name]))

  const tipoMap: Record<string, string> = { DEMANDA: "Demandas", TAREFA: "Tarefas", IDEIA: "Ideias" }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Visão geral do demandoo em{" "}
          {hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Empresas ativas" value={totalEmpresasAtivas} sub={`${totalEmpresas} total`} icon={Building2} color="violet" />
        <KpiCard title="Usuários ativos" value={totalUsuarios} sub={`+${novosMes} esse mês`} icon={Users} color="blue" />
        <KpiCard title="Demandas total" value={totalDemandas.toLocaleString("pt-BR")} sub={`${demandasHoje} hoje`} icon={Inbox} color="slate" />
        <KpiCard title="Capturas IA total" value={totalAI.toLocaleString("pt-BR")} sub={`${aiHoje} hoje · ${aiMes} esse mês`} icon={Zap} color="amber" />
      </div>

      {/* Segunda linha */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* Demandas por tipo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-violet-500" strokeWidth={2} />
            Capturas por tipo
          </h2>
          <div className="space-y-3">
            {[
              { tipo: "DEMANDA", color: "bg-violet-500", icon: Inbox },
              { tipo: "TAREFA",  color: "bg-emerald-500", icon: CheckSquare },
              { tipo: "IDEIA",   color: "bg-amber-500", icon: Lightbulb },
            ].map(({ tipo, color, icon: Icon }) => {
              const count = demandasPorTipo.find((d) => d.tipo === tipo)?._count.id ?? 0
              const pct = totalDemandas > 0 ? Math.round((count / totalDemandas) * 100) : 0
              return (
                <div key={tipo}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-slate-600">
                      <Icon size={13} strokeWidth={2} />
                      {tipoMap[tipo]}
                    </span>
                    <span className="font-semibold text-slate-800">{count.toLocaleString("pt-BR")} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Empresas por plano */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Building2 size={15} className="text-violet-500" strokeWidth={2} />
            Empresas por plano
          </h2>
          <div className="space-y-2">
            {empresasPorPlano
              .sort((a, b) => b._count.id - a._count.id)
              .map(({ planId, _count }) => (
                <div key={planId} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-600">{planMap[planId] ?? `Plano #${planId}`}</span>
                  <span className="text-sm font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                    {_count.id}
                  </span>
                </div>
              ))}
            {empresasPorPlano.length === 0 && (
              <p className="text-sm text-slate-400">Nenhuma empresa cadastrada.</p>
            )}
          </div>
        </div>

        {/* Estimativa de custo OpenAI */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Zap size={15} className="text-amber-500" strokeWidth={2} />
            Estimativa OpenAI
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Custo acumulado estimado</p>
              <p className="text-2xl font-bold text-slate-900">
                R$ {custoBRL.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400">≈ USD {custoUSD.toFixed(2)}</p>
            </div>
            <div className="space-y-1 text-xs text-slate-500 border-t border-slate-100 pt-3">
              <div className="flex justify-between">
                <span>Total capturas IA</span>
                <span className="font-medium text-slate-700">{totalAI.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span>Custo médio/captura</span>
                <span className="font-medium text-slate-700">~$0.005</span>
              </div>
              <div className="flex justify-between">
                <span>Esse mês</span>
                <span className="font-medium text-slate-700">{aiMes} capturas</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-2">
              Estimativa: Whisper ~$0.0045 + GPT-4o-mini ~$0.0005 por captura. Acesse o{" "}
              <a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">
                painel OpenAI
              </a>{" "}
              para valores exatos.
            </p>
          </div>
        </div>
      </div>

      {/* Últimas execuções do cron */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Clock size={15} className="text-violet-500" strokeWidth={2} />
          Últimas execuções de cron
        </h2>
        {ultimasCronExecucoes.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma execução registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-2 font-medium">Job</th>
                  <th className="text-left pb-2 font-medium">Executado em</th>
                  <th className="text-right pb-2 font-medium">Enviados</th>
                  <th className="text-right pb-2 font-medium">D-0</th>
                  <th className="text-right pb-2 font-medium">D-1</th>
                  <th className="text-right pb-2 font-medium">Erros</th>
                </tr>
              </thead>
              <tbody>
                {ultimasCronExecucoes.map((exec) => (
                  <tr key={exec.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5">
                      <span className="bg-violet-100 text-violet-700 text-xs font-medium px-2 py-0.5 rounded">
                        {exec.job}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {exec.executadoEm.toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-800">{exec.enviados}</td>
                    <td className="py-2.5 text-right text-slate-500">{exec.d0}</td>
                    <td className="py-2.5 text-right text-slate-500">{exec.d1}</td>
                    <td className="py-2.5 text-right">
                      {exec.erros > 0 ? (
                        <span className="flex items-center justify-end gap-1 text-red-500">
                          <AlertTriangle size={12} strokeWidth={2} />
                          {exec.erros}
                        </span>
                      ) : (
                        <span className="text-emerald-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
