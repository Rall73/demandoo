import { auth } from "@/auth"
import Link from "next/link"
import {
  ChevronLeft, ChevronRight, Inbox, CheckSquare, Lightbulb,
  CheckCircle2, AlertTriangle, Timer, Tag, BookOpen, Printer,
  TrendingUp, TrendingDown, Minus, CalendarClock, Hourglass,
  FileText, FileDown,
} from "lucide-react"
import { mesAtualISOBrasil, mesExtensoBRT } from "@/lib/date"
import {
  carregarResumoMes, formatMin, variacao,
  type TipoResumo, type ItemResumo,
} from "@/lib/resumo-mes"

export const metadata = { title: "Resumo do mês — demandoo" }

const TIPO_ICON: Record<TipoResumo, typeof Inbox> = {
  DEMANDA: Inbox, TAREFA: CheckSquare, IDEIA: Lightbulb,
}

const TIPO_LABEL: Record<TipoResumo, string> = {
  DEMANDA: "Demandas", TAREFA: "Tarefas", IDEIA: "Ideias",
}

const TIPO_TEMA: Record<TipoResumo, { bg: string; text: string; barra: string }> = {
  DEMANDA: { bg: "bg-violet-100",  text: "text-violet-700",  barra: "bg-violet-500" },
  TAREFA:  { bg: "bg-emerald-100", text: "text-emerald-700", barra: "bg-emerald-500" },
  IDEIA:   { bg: "bg-amber-100",   text: "text-amber-700",   barra: "bg-amber-500" },
}

const ENTRADA_LABEL: Record<string, string> = {
  TELEFONEMA: "Telefonemas", EMAIL: "E-mails", REUNIAO: "Reuniões", NOTA: "Notas",
}

function dataCurta(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo",
  })
}

function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  const v = variacao(atual, anterior)
  if (v === null || v === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Minus size={11} strokeWidth={2} />
        {v === 0 ? "igual ao mês anterior" : "sem base anterior"}
      </span>
    )
  }
  const subiu = v > 0
  const Icon  = subiu ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${subiu ? "text-emerald-600" : "text-red-500"}`}>
      <Icon size={11} strokeWidth={2.5} />
      {subiu ? "+" : ""}{v}% vs. mês anterior
    </span>
  )
}

function ListaItens({ itens, campo }: { itens: ItemResumo[]; campo: "concluidoAt" | "prazo" }) {
  return (
    <div className="flex flex-col">
      {itens.map((d) => {
        const Icon = TIPO_ICON[d.tipo] ?? Inbox
        const tema = TIPO_TEMA[d.tipo]
        return (
          <Link
            key={d.id}
            href={`/app/${d.id}`}
            className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded transition-colors"
          >
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg shrink-0 ${tema.bg} ${tema.text}`}>
              <Icon size={12} strokeWidth={2.5} />
            </span>
            <p className="text-sm text-slate-800 leading-snug flex-1 min-w-0 truncate">{d.titulo}</p>
            <span className="text-xs text-slate-400 shrink-0 tabular-nums">
              {dataCurta(campo === "concluidoAt" ? d.concluidoAt : d.prazo)}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function Secao({
  icon: Icon, titulo, extra, children,
}: {
  icon: typeof Inbox; titulo: string; extra?: string; children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4">
        <Icon size={16} className="text-slate-400" strokeWidth={2} />
        {titulo}
        {extra && <span className="ml-auto text-xs font-medium text-slate-500">{extra}</span>}
      </h2>
      {children}
    </section>
  )
}

export default async function ResumoMesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)

  const mesAtual   = mesAtualISOBrasil()
  const { mes }    = await searchParams
  // Nunca aceita mês futuro nem formato inválido
  const mesISO     = (mes && /^\d{4}-\d{2}$/.test(mes) && mes <= mesAtual) ? mes : mesAtual

  const r = await carregarResumoMes(companyId, userId, mesISO)

  const taxaConclusao = r.totalCriadas > 0
    ? Math.round((r.totalConcluidas / r.totalCriadas) * 100)
    : null
  const entregues = r.prazos.noPrazo + r.prazos.comAtraso
  const taxaPrazo = entregues > 0 ? Math.round((r.prazos.noPrazo / entregues) * 100) : null
  const focoMax   = r.focoPorDemanda[0]?.totalMin ?? 0

  return (
    <div className="p-4 md:p-8 max-w-5xl">

      {/* ── Cabeçalho + navegação de mês ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 capitalize">{mesExtensoBRT(mesISO)}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {r.ehMesCorrente ? "Mês em andamento — parcial até hoje." : "Fechamento do mês."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/app/resumo?mes=${r.mesAnterior}`}
            title="Mês anterior"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </Link>
          {r.mesSeguinte <= mesAtual ? (
            <Link
              href={`/app/resumo?mes=${r.mesSeguinte}`}
              title="Mês seguinte"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </Link>
          ) : (
            <span className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-100 text-slate-300">
              <ChevronRight size={16} strokeWidth={2} />
            </span>
          )}
          <span className="w-px h-6 bg-slate-200 mx-1" />

          <Link
            href={`/resumo/${mesISO}/imprimir`}
            title="Abrir versão para impressão"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Printer size={16} strokeWidth={2} />
          </Link>
          <Link
            href={`/resumo/${mesISO}/imprimir?pdf=1`}
            title="Exportar PDF"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <FileText size={16} strokeWidth={2} />
          </Link>
          <a
            href={`/api/resumo/${mesISO}/exportar-doc`}
            download
            title="Exportar Word (.doc)"
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            <FileDown size={16} strokeWidth={2} />
          </a>
        </div>
      </div>

      {/* ── KPIs principais ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Abertas no mês</p>
          <p className="text-3xl font-bold text-slate-900">{r.totalCriadas}</p>
          <div className="mt-1"><Variacao atual={r.totalCriadas} anterior={r.anterior.criadas} /></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Concluídas no mês</p>
          <p className="text-3xl font-bold text-emerald-600">{r.totalConcluidas}</p>
          <div className="mt-1"><Variacao atual={r.totalConcluidas} anterior={r.anterior.concluidas} /></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Entregues no prazo</p>
          <p className="text-3xl font-bold text-slate-900">
            {taxaPrazo === null ? "—" : `${taxaPrazo}%`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {entregues > 0 ? `${r.prazos.noPrazo} de ${entregues} com prazo` : "nenhum prazo entregue"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Tempo de foco</p>
          <p className="text-3xl font-bold text-slate-900">{formatMin(r.focoTotalMin)}</p>
          <div className="mt-1"><Variacao atual={r.focoTotalMin} anterior={r.anterior.focoTotalMin} /></div>
        </div>
      </div>

      <div className="flex flex-col gap-4">

        {/* ── Movimento por tipo ───────────────────────────────────────────── */}
        <Secao
          icon={Inbox}
          titulo="Movimento por tipo"
          extra={taxaConclusao !== null ? `${taxaConclusao}% de conclusão` : undefined}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {r.movimento.map((m) => {
              const Icon = TIPO_ICON[m.tipo]
              const tema = TIPO_TEMA[m.tipo]
              return (
                <div key={m.tipo} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${tema.bg} ${tema.text}`}>
                      <Icon size={14} strokeWidth={2} />
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{TIPO_LABEL[m.tipo]}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <dt className="text-slate-500">Abertas</dt>
                      <dd className="text-lg font-bold text-slate-800">{m.criadas}</dd>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <dt className="text-slate-500">Concluídas</dt>
                      <dd className="text-lg font-bold text-emerald-600">{m.concluidas}</dd>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <dt className="text-slate-500">Em aberto</dt>
                      <dd className="text-lg font-bold text-slate-800">{m.emAberto}</dd>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <dt className="text-slate-500">Canceladas</dt>
                      <dd className="text-lg font-bold text-slate-400">{m.canceladas}</dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            &ldquo;Em aberto&rdquo; e &ldquo;canceladas&rdquo; referem-se aos itens abertos no mês, com a situação de hoje.
          </p>
        </Secao>

        {/* ── Prazos do mês ────────────────────────────────────────────────── */}
        <Secao
          icon={CalendarClock}
          titulo="Prazos que venciam no mês"
          extra={`${r.prazos.total} ${r.prazos.total === 1 ? "item" : "itens"}`}
        >
          {r.prazos.total === 0 ? (
            <p className="text-sm text-slate-400 italic">Nenhum item tinha prazo neste mês.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Entregues no prazo", value: r.prazos.noPrazo,         cor: "text-emerald-600", icon: CheckCircle2 },
                { label: "Entregues com atraso", value: r.prazos.comAtraso,     cor: "text-amber-600",   icon: Hourglass },
                { label: "Vencidas em aberto", value: r.prazos.emAbertoVencido, cor: r.prazos.emAbertoVencido > 0 ? "text-red-600" : "text-slate-400", icon: AlertTriangle },
                { label: "A vencer",           value: r.prazos.emAbertoAVencer, cor: "text-slate-800",   icon: CalendarClock },
              ].map((c) => {
                const Icon = c.icon
                return (
                  <div key={c.label} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Icon size={12} strokeWidth={2} />
                      {c.label}
                    </div>
                    <p className={`text-2xl font-bold ${c.cor}`}>{c.value}</p>
                  </div>
                )
              })}
            </div>
          )}
          {r.tempoMedioDias !== null && (
            <p className="text-xs text-slate-500 mt-3">
              Tempo médio entre abertura e conclusão:{" "}
              <span className="font-semibold text-slate-700">
                {r.tempoMedioDias < 1
                  ? "menos de 1 dia"
                  : `${r.tempoMedioDias.toFixed(1)} dias`}
              </span>
            </p>
          )}
        </Secao>

        {/* ── Tempo de foco ────────────────────────────────────────────────── */}
        <Secao
          icon={Timer}
          titulo="Tempo de foco"
          extra={
            r.focoTotalMin > 0
              ? `${formatMin(r.focoTotalMin)} · ${r.focoSessoes} ${r.focoSessoes === 1 ? "sessão" : "sessões"} · ${r.focoDiasAtivos} ${r.focoDiasAtivos === 1 ? "dia" : "dias"}`
              : undefined
          }
        >
          {r.focoPorDemanda.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Nenhuma sessão de foco registrada neste mês.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {r.focoPorDemanda.slice(0, 10).map((f) => (
                  <div key={f.demandaId} className="flex items-center gap-3">
                    <Link
                      href={`/app/${f.demandaId}`}
                      className="text-sm text-slate-700 hover:text-violet-700 truncate flex-1 min-w-0 transition-colors"
                    >
                      {f.titulo}
                    </Link>
                    <div className="w-24 sm:w-40 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${focoMax > 0 ? Math.round((f.totalMin / focoMax) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 shrink-0 w-16 text-right tabular-nums">
                      {formatMin(f.totalMin)}
                    </span>
                  </div>
                ))}
              </div>
              {r.focoPorDemanda.length > 10 && (
                <p className="text-xs text-slate-400 mt-3">
                  + {r.focoPorDemanda.length - 10} outras demandas com tempo registrado.
                </p>
              )}
            </>
          )}
          {r.pomodoroCiclos > 0 && (
            <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              Pomodoro:{" "}
              <span className="font-semibold text-slate-700">
                {r.pomodoroCiclos} {r.pomodoroCiclos === 1 ? "ciclo" : "ciclos"}
                {r.pomodoroMin > 0 ? ` · ${formatMin(r.pomodoroMin)}` : ""}
              </span>
              {" "}(contado à parte do tempo de foco das demandas)
            </p>
          )}
        </Secao>

        {/* ── Diário + Tags ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Secao
            icon={BookOpen}
            titulo="Diário"
            extra={r.diarioDiasComRegistro > 0
              ? `${r.diarioDiasComRegistro} ${r.diarioDiasComRegistro === 1 ? "dia" : "dias"} com registro`
              : undefined}
          >
            {r.diarioPorTipo.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhum registro no Diário neste mês.</p>
            ) : (
              <div className="flex flex-col">
                {r.diarioPorTipo.map((e) => (
                  <div key={e.tipo} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-700">{ENTRADA_LABEL[e.tipo]}</span>
                    <span className="text-sm font-semibold text-slate-800 tabular-nums">{e.total}</span>
                  </div>
                ))}
              </div>
            )}
          </Secao>

          <Secao icon={Tag} titulo="Tags mais usadas">
            {r.tags.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhuma tag usada nos itens deste mês.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {r.tags.map((t) => (
                  <span
                    key={t.nome}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
                  >
                    #{t.nome}
                    <span className="text-slate-400">{t.total}</span>
                  </span>
                ))}
              </div>
            )}
          </Secao>
        </div>

        {/* ── Concluídas ───────────────────────────────────────────────────── */}
        <Secao
          icon={CheckCircle2}
          titulo="Concluídas no mês"
          extra={`${r.concluidas.length} ${r.concluidas.length === 1 ? "item" : "itens"}`}
        >
          {r.concluidas.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Nada foi concluído neste mês.</p>
          ) : (
            <ListaItens itens={r.concluidas} campo="concluidoAt" />
          )}
        </Secao>

        {/* ── Atrasadas ────────────────────────────────────────────────────── */}
        {r.atrasadas.length > 0 && (
          <Secao
            icon={AlertTriangle}
            titulo="Vencidas e ainda em aberto"
            extra={`${r.atrasadas.length} ${r.atrasadas.length === 1 ? "item" : "itens"}`}
          >
            <ListaItens itens={r.atrasadas} campo="prazo" />
          </Secao>
        )}

      </div>
    </div>
  )
}
