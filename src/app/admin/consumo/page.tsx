import { prisma } from "@/lib/prisma"
import { hojeNoBrasil } from "@/lib/date"
import { Zap, Cloud, Clock, Server, ExternalLink, AlertTriangle, BarChart2 } from "lucide-react"

const CUSTO_POR_CAPTURA = 0.005   // USD estimado
const USD_TO_BRL        = 5.7

export default async function AdminConsumoPage() {
  const hoje      = hojeNoBrasil()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [
    aiTotal,
    aiMes,
    aiHoje,
    totalAudios,
    totalAvatares,
    cronExecucoes,
    topConsumidores,
  ] = await Promise.all([
    prisma.company.aggregate({ _sum: { aiUsedTotal: true } }),
    prisma.demanda.count({ where: { aiProcessado: true, deletedAt: null, createdAt: { gte: inicioMes } } }),
    prisma.demanda.count({ where: { aiProcessado: true, deletedAt: null, createdAt: { gte: hoje } } }),
    prisma.demanda.count({ where: { audioUrl: { not: null }, deletedAt: null } }),
    prisma.user.count({ where: { avatarUrl: { not: null }, deletedAt: null } }),
    prisma.cronExecucao.findMany({ orderBy: { executadoEm: "desc" }, take: 30 }),
    prisma.company.findMany({
      where: { deletedAt: null, aiUsedTotal: { gt: 0 } },
      select: { name: true, aiUsedTotal: true, plan: { select: { name: true } } },
      orderBy: { aiUsedTotal: "desc" },
      take: 10,
    }),
  ])

  const totalAI    = aiTotal._sum.aiUsedTotal ?? 0
  const custoUSD   = totalAI * CUSTO_POR_CAPTURA
  const custoBRL   = custoUSD * USD_TO_BRL
  const custoMes   = aiMes * CUSTO_POR_CAPTURA * USD_TO_BRL

  // Estimativa Cloudinary: áudio ~500KB avg, avatar ~50KB avg
  const storageEstMB = (totalAudios * 0.5) + (totalAvatares * 0.05)

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Consumo de recursos</h1>
        <p className="text-slate-500 text-sm mt-1">Estimativas baseadas nos dados do banco. Acesse os painéis externos para valores exatos.</p>
      </div>

      {/* ── OpenAI ── */}
      <section>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
            <Zap size={15} className="text-green-700" strokeWidth={2} />
          </div>
          OpenAI
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: "Capturas IA total",   value: totalAI.toLocaleString("pt-BR"),         sub: "acumulado" },
            { label: "Capturas IA esse mês", value: aiMes.toLocaleString("pt-BR"),           sub: "mês atual" },
            { label: "Capturas IA hoje",     value: aiHoje.toLocaleString("pt-BR"),          sub: "hoje" },
            { label: "Custo estimado total", value: `R$ ${custoBRL.toFixed(2)}`,             sub: `≈ USD ${custoUSD.toFixed(2)}` },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Top consumidores */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Top 10 empresas por consumo de IA</h3>
          <div className="space-y-2">
            {topConsumidores.map((empresa, i) => {
              const pct = totalAI > 0 ? Math.round((empresa.aiUsedTotal / totalAI) * 100) : 0
              return (
                <div key={empresa.name}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="text-slate-600 flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-4">{i + 1}.</span>
                      {empresa.name}
                      <span className="text-xs text-slate-400">({empresa.plan.name})</span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      {empresa.aiUsedTotal.toLocaleString("pt-BR")}
                      <span className="text-slate-400 font-normal ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {topConsumidores.length === 0 && (
              <p className="text-sm text-slate-400">Nenhuma captura com IA ainda.</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <AlertTriangle size={13} className="text-green-600 shrink-0 mt-0.5" strokeWidth={2} />
          <span>
            Estimativa: ~$0.0045/captura voz (Whisper) + ~$0.0005/captura texto (GPT-4o-mini).{" "}
            <a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer"
              className="text-green-700 font-medium underline">
              Ver painel OpenAI →
            </a>
          </span>
        </div>
      </section>

      {/* ── Cloudinary ── */}
      <section>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
            <Cloud size={15} className="text-blue-700" strokeWidth={2} />
          </div>
          Cloudinary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Áudios armazenados",     value: totalAudios.toLocaleString("pt-BR"),            sub: "~500 KB médio" },
            { label: "Avatares armazenados",    value: totalAvatares.toLocaleString("pt-BR"),          sub: "~50 KB médio" },
            { label: "Storage estimado",        value: `~${storageEstMB < 1024 ? storageEstMB.toFixed(0) + " MB" : (storageEstMB / 1024).toFixed(1) + " GB"}`, sub: "estimativa" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <Cloud size={13} className="text-blue-500 shrink-0" strokeWidth={2} />
          <span>
            Plano free do Cloudinary inclui 25 GB de storage e 25 GB de bandwidth/mês.{" "}
            <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer"
              className="text-blue-700 font-medium underline">
              Ver painel Cloudinary →
            </a>
          </span>
        </div>
      </section>

      {/* ── Cron ── */}
      <section>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
            <Clock size={15} className="text-violet-700" strokeWidth={2} />
          </div>
          Cron jobs ({cronExecucoes.length} últimas execuções)
        </h2>

        {cronExecucoes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">
            Nenhuma execução registrada ainda. O log começa a partir do próximo disparo do cron.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">Job</th>
                    <th className="text-left px-4 py-3 font-medium">Data/hora (BRT)</th>
                    <th className="text-right px-4 py-3 font-medium">Enviados</th>
                    <th className="text-right px-4 py-3 font-medium">D-0</th>
                    <th className="text-right px-4 py-3 font-medium">D-1</th>
                    <th className="text-right px-4 py-3 font-medium">Erros</th>
                    <th className="text-left px-4 py-3 font-medium">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {cronExecucoes.map((exec) => (
                    <tr key={exec.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <span className="bg-violet-100 text-violet-700 text-xs font-medium px-2 py-0.5 rounded">
                          {exec.job}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {exec.executadoEm.toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{exec.enviados}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{exec.d0}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{exec.d1}</td>
                      <td className="px-4 py-3 text-right">
                        {exec.erros > 0 ? (
                          <span className="flex items-center justify-end gap-1 text-red-500 font-medium">
                            <AlertTriangle size={12} strokeWidth={2} /> {exec.erros}
                          </span>
                        ) : (
                          <span className="text-emerald-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                        {exec.detalhes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
          <Clock size={13} className="text-violet-500 shrink-0" strokeWidth={2} />
          <span>
            Cron de lembretes roda diariamente às 11h (BRT) via cron-job.org.{" "}
            <a href="https://console.cron-job.org" target="_blank" rel="noopener noreferrer"
              className="text-violet-700 font-medium underline">
              Ver painel cron-job.org →
            </a>
          </span>
        </div>
      </section>

      {/* ── Google Analytics ── */}
      <section>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
            <BarChart2 size={15} className="text-amber-700" strokeWidth={2} />
          </div>
          Google Analytics
        </h2>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          {process.env.NEXT_PUBLIC_GA_ID ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">Propriedade ativa</p>
                <p className="text-xs text-slate-400">
                  ID: <span className="font-mono text-slate-600">{process.env.NEXT_PUBLIC_GA_ID}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Rastreando visualizações de página, eventos e sessões em{" "}
                  <span className="font-medium text-slate-600">demandoo.net</span>
                </p>
              </div>
              <a
                href={`https://analytics.google.com/analytics/web/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                <BarChart2 size={14} strokeWidth={2} />
                Abrir Analytics →
              </a>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-sm font-medium text-slate-700">Google Analytics não configurado</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adicione a variável <span className="font-mono bg-slate-100 px-1 rounded">NEXT_PUBLIC_GA_ID</span> com
                  o ID de medição (G-XXXXXXXXXX) no painel do Hostinger.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <BarChart2 size={13} className="text-amber-500 shrink-0" strokeWidth={2} />
          <span>
            Métricas detalhadas de tráfego, origem, retenção e conversão disponíveis no painel.{" "}
            <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer"
              className="text-amber-700 font-medium underline">
              Ver Google Analytics →
            </a>
          </span>
        </div>
      </section>

      {/* ── Hostinger / Infra ── */}
      <section>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
            <Server size={15} className="text-orange-700" strokeWidth={2} />
          </div>
          Infraestrutura — links de acesso rápido
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { label: "Hostinger — Painel do site",    href: "https://hpanel.hostinger.com", desc: "Logs, deploy, env vars, banco MySQL" },
            { label: "OpenAI — Usage Dashboard",      href: "https://platform.openai.com/usage", desc: "Consumo exato de tokens e custos" },
            { label: "Cloudinary — Media Library",    href: "https://cloudinary.com/console", desc: "Storage, bandwidth, transformações" },
            { label: "cron-job.org — Cronjobs",       href: "https://console.cron-job.org", desc: "Status e histórico dos cron jobs" },
            { label: "GitHub — Repositório",          href: "https://github.com/Rall73/demandoo", desc: "Código-fonte, commits, branches" },
            { label: "Google Analytics — demandoo",   href: "https://analytics.google.com", desc: "Tráfego, visitantes, origem e eventos" },
          ].map(({ label, href, desc }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:border-violet-300 hover:shadow-sm transition-all group"
            >
              <div>
                <p className="text-sm font-medium text-slate-800 group-hover:text-violet-700">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <ExternalLink size={14} className="text-slate-400 group-hover:text-violet-500 shrink-0" strokeWidth={2} />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
