import { auth } from "@/auth"
import { notFound } from "next/navigation"
import {
  Inbox, CheckSquare, Lightbulb, CheckCircle2, AlertTriangle,
  Timer, Tag, BookOpen, CalendarClock,
} from "lucide-react"
import { mesAtualISOBrasil, mesExtensoBRT } from "@/lib/date"
import { carregarResumoMes, formatMin, type TipoResumo } from "@/lib/resumo-mes"
import AutoPrint from "@/components/AutoPrint"
import PrintButton from "./PrintButton"

type Ctx = { params: Promise<{ mes: string }>; searchParams: Promise<{ pdf?: string }> }

const TIPO_ICON: Record<string, typeof Inbox> = {
  DEMANDA: Inbox, TAREFA: CheckSquare, IDEIA: Lightbulb,
}

const TIPO_COR: Record<string, string> = {
  DEMANDA: "bg-violet-100 text-violet-700",
  TAREFA:  "bg-emerald-100 text-emerald-700",
  IDEIA:   "bg-amber-100 text-amber-700",
}

const TIPO_LABEL: Record<TipoResumo, string> = {
  DEMANDA: "Demandas", TAREFA: "Tarefas", IDEIA: "Ideias",
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

function Titulo({ icon: Icon, children }: { icon: typeof Inbox; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 mb-3">
      <Icon size={11} strokeWidth={2.5} />
      {children}
    </h2>
  )
}

export default async function ResumoImprimirPage({ params, searchParams }: Ctx) {
  const { mes }  = await params
  const { pdf }  = await searchParams

  if (!/^\d{4}-\d{2}$/.test(mes) || mes > mesAtualISOBrasil()) notFound()

  const session     = await auth()
  const companyId   = session!.user.companyId
  const userId      = Number(session!.user.id)
  const nomeUsuario = session!.user.name ?? ""

  const r = await carregarResumoMes(companyId, userId, mes)

  const entregues = r.prazos.noPrazo + r.prazos.comAtraso
  const taxaPrazo = entregues > 0 ? Math.round((r.prazos.noPrazo / entregues) * 100) : null
  const mesLabel  = mesExtensoBRT(mes)

  return (
    <>
      <style>{`
        @page { size: A4; margin: 2cm 2cm 2.5cm 2cm; }
        @media print {
          .no-print { display: none !important; }
          h2 { break-after: avoid; }
          h3 { break-after: avoid; }
          .entry-row  { break-inside: avoid; }
          .tipo-group { break-inside: avoid; }
          section.compact { break-inside: avoid; }
        }
      `}</style>

      <div className="bg-white min-h-screen p-10 max-w-2xl mx-auto text-sm text-slate-900">

        <div className="no-print flex justify-end mb-6">
          <PrintButton mesISO={mes} />
        </div>

        {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
        <div className="border-b-2 border-slate-900 pb-4 mb-7">
          <h1 className="text-2xl font-bold capitalize">{mesLabel}</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Resumo do mês demandoo — {nomeUsuario}
            {r.ehMesCorrente ? " · parcial até hoje" : ""}
          </p>
        </div>

        {/* ── Números do mês ────────────────────────────────────────────── */}
        <section className="compact mb-6">
          <Titulo icon={CheckCircle2}>Números do mês</Titulo>
          <table className="w-full">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-700">Itens abertos no mês</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">{r.totalCriadas}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-700">Itens concluídos no mês</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">{r.totalConcluidas}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-700">Entregues no prazo</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">
                  {taxaPrazo === null ? "—" : `${taxaPrazo}% (${r.prazos.noPrazo} de ${entregues})`}
                </td>
              </tr>
              {r.tempoMedioDias !== null && (
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-700">Tempo médio até a conclusão</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">
                    {r.tempoMedioDias < 1 ? "menos de 1 dia" : `${r.tempoMedioDias.toFixed(1)} dias`}
                  </td>
                </tr>
              )}
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-700">Tempo de foco</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">
                  {formatMin(r.focoTotalMin)}
                  {r.focoDiasAtivos > 0 ? ` em ${r.focoDiasAtivos} ${r.focoDiasAtivos === 1 ? "dia" : "dias"}` : ""}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-slate-700">Mês anterior</td>
                <td className="py-1.5 text-right text-slate-500 tabular-nums">
                  {r.anterior.criadas} abertas · {r.anterior.concluidas} concluídas · {formatMin(r.anterior.focoTotalMin)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── Movimento por tipo ────────────────────────────────────────── */}
        <section className="compact mb-6">
          <Titulo icon={Inbox}>Movimento por tipo</Titulo>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left font-medium py-1">Tipo</th>
                <th className="text-right font-medium py-1">Abertas</th>
                <th className="text-right font-medium py-1">Concluídas</th>
                <th className="text-right font-medium py-1">Em aberto</th>
                <th className="text-right font-medium py-1">Canceladas</th>
              </tr>
            </thead>
            <tbody>
              {r.movimento.map((m) => (
                <tr key={m.tipo} className="entry-row border-b border-slate-100 last:border-0">
                  <td className="py-1.5 text-slate-800">{TIPO_LABEL[m.tipo]}</td>
                  <td className="py-1.5 text-right tabular-nums">{m.criadas}</td>
                  <td className="py-1.5 text-right tabular-nums">{m.concluidas}</td>
                  <td className="py-1.5 text-right tabular-nums">{m.emAberto}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-400">{m.canceladas}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-2">
            &ldquo;Em aberto&rdquo; e &ldquo;canceladas&rdquo; referem-se aos itens abertos no mês, com a situação de hoje.
          </p>
        </section>

        {/* ── Prazos ────────────────────────────────────────────────────── */}
        {r.prazos.total > 0 && (
          <section className="compact mb-6">
            <Titulo icon={CalendarClock}>Prazos que venciam no mês — {r.prazos.total}</Titulo>
            <table className="w-full">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-700">Entregues no prazo</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{r.prazos.noPrazo}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-700">Entregues com atraso</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{r.prazos.comAtraso}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-700">Vencidas e ainda em aberto</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{r.prazos.emAbertoVencido}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-700">A vencer</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{r.prazos.emAbertoAVencer}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-700">Canceladas</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-slate-400">{r.prazos.canceladas}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* ── Tempo de foco ─────────────────────────────────────────────── */}
        {r.focoPorDemanda.length > 0 && (
          <section className="compact mb-6">
            <Titulo icon={Timer}>
              Tempo de foco — {formatMin(r.focoTotalMin)} · {r.focoSessoes} {r.focoSessoes === 1 ? "sessão" : "sessões"}
            </Titulo>
            <div className="flex flex-col">
              {r.focoPorDemanda.map((f) => (
                <div key={f.demandaId} className="entry-row flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                  <p className="text-slate-700">{f.titulo}</p>
                  <span className="text-xs font-semibold text-slate-600 shrink-0 tabular-nums">{formatMin(f.totalMin)}</span>
                </div>
              ))}
            </div>
            {r.pomodoroCiclos > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Pomodoro: {r.pomodoroCiclos} {r.pomodoroCiclos === 1 ? "ciclo" : "ciclos"}
                {r.pomodoroMin > 0 ? ` · ${formatMin(r.pomodoroMin)}` : ""} (contado à parte)
              </p>
            )}
          </section>
        )}

        {/* ── Diário ────────────────────────────────────────────────────── */}
        {r.diarioPorTipo.length > 0 && (
          <section className="compact mb-6">
            <Titulo icon={BookOpen}>
              Diário — {r.diarioDiasComRegistro} {r.diarioDiasComRegistro === 1 ? "dia" : "dias"} com registro
            </Titulo>
            <div className="flex flex-col">
              {r.diarioPorTipo.map((e) => (
                <div key={e.tipo} className="entry-row flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-slate-700">{ENTRADA_LABEL[e.tipo]}</span>
                  <span className="font-semibold text-slate-800 tabular-nums">{e.total}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Tags ──────────────────────────────────────────────────────── */}
        {r.tags.length > 0 && (
          <section className="compact mb-6">
            <Titulo icon={Tag}>Tags mais usadas</Titulo>
            <p className="text-slate-700 leading-relaxed">
              {r.tags.map((t) => `#${t.nome} (${t.total})`).join("  ·  ")}
            </p>
          </section>
        )}

        {/* ── Concluídas ────────────────────────────────────────────────── */}
        {r.concluidas.length > 0 && (
          <section className="mb-6">
            <Titulo icon={CheckCircle2}>Concluídas no mês — {r.concluidas.length}</Titulo>
            <div className="flex flex-col">
              {r.concluidas.map((d) => {
                const Icon = TIPO_ICON[d.tipo] ?? Inbox
                return (
                  <div key={d.id} className="entry-row flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded shrink-0 mt-0.5 ${TIPO_COR[d.tipo] ?? ""}`}>
                      <Icon size={10} strokeWidth={2.5} />
                    </span>
                    <p className="text-slate-800 leading-snug flex-1">{d.titulo}</p>
                    <span className="text-xs text-slate-400 shrink-0 pt-0.5 tabular-nums">{dataCurta(d.concluidoAt)}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Atrasadas ─────────────────────────────────────────────────── */}
        {r.atrasadas.length > 0 && (
          <section className="mb-6">
            <Titulo icon={AlertTriangle}>Vencidas e ainda em aberto — {r.atrasadas.length}</Titulo>
            <div className="flex flex-col">
              {r.atrasadas.map((d) => {
                const Icon = TIPO_ICON[d.tipo] ?? Inbox
                return (
                  <div key={d.id} className="entry-row flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded shrink-0 mt-0.5 ${TIPO_COR[d.tipo] ?? ""}`}>
                      <Icon size={10} strokeWidth={2.5} />
                    </span>
                    <p className="text-slate-800 leading-snug flex-1">{d.titulo}</p>
                    <span className="text-xs text-slate-400 shrink-0 pt-0.5 tabular-nums">venceu {dataCurta(d.prazo)}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {r.totalCriadas === 0 && r.totalConcluidas === 0 && r.focoTotalMin === 0 && (
          <p className="text-slate-400 italic">Nenhum movimento registrado neste mês.</p>
        )}

      </div>

      {pdf === "1" && <AutoPrint title={`${mes} - Resumo do mês ${nomeUsuario}`} />}
    </>
  )
}
