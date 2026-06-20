import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseDateBRT } from "@/lib/date"
import {
  Phone, Mail, Users2, PenLine,
  Inbox, CheckSquare, Lightbulb,
  Clock, CheckCircle2, Timer,
} from "lucide-react"
import PrintButton from "./PrintButton"
import AutoPrint   from "./AutoPrint"

type Ctx = { params: Promise<{ data: string }>; searchParams: Promise<{ pdf?: string }> }

const ENTRADA_LABEL: Record<string, string> = {
  TELEFONEMA: "Telefonemas",
  EMAIL:      "E-mails",
  REUNIAO:    "Reuniões",
  NOTA:       "Notas",
}

const TIPO_ICON: Record<string, typeof Inbox> = {
  DEMANDA: Inbox, TAREFA: CheckSquare, IDEIA: Lightbulb,
}

const TIPO_COR: Record<string, string> = {
  DEMANDA: "bg-violet-100 text-violet-700",
  TAREFA:  "bg-emerald-100 text-emerald-700",
  IDEIA:   "bg-amber-100 text-amber-700",
}

function EntradaIcon({ tipo }: { tipo: string }) {
  const icons: Record<string, typeof Phone> = {
    TELEFONEMA: Phone, EMAIL: Mail, REUNIAO: Users2, NOTA: PenLine,
  }
  const Icon = icons[tipo] ?? PenLine
  return <Icon size={12} strokeWidth={2} />
}

function formatMin(min: number): string {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatHoraBRT(d: Date): string {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  })
}

export default async function DiarioImprimirPage({ params, searchParams }: Ctx) {
  const { data: dataParam }  = await params
  const { pdf }              = await searchParams

  const session     = await auth()
  const companyId   = session!.user.companyId
  const userId      = Number(session!.user.id)
  const nomeUsuario = session!.user.name ?? ""

  const dataISO   = dataParam
  const inicioDia = parseDateBRT(dataISO)
  const fimDia    = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000)

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(inicioDia)

  const diario = await prisma.demanda.findFirst({
    where: { companyId, userId, tipo: "DIARIO", prazo: { gte: inicioDia, lt: fimDia }, deletedAt: null },
    select: { id: true },
  })

  const [demandasHoje, acoesHoje, comentarios, sessoesHoje] = await Promise.all([
    prisma.demanda.findMany({
      where:   { companyId, userId, deletedAt: null, tipo: { not: "DIARIO" },
                 status: { notIn: ["CONCLUIDA", "CANCELADA"] }, prazo: { gte: inicioDia, lt: fimDia } },
      select:  { id: true, titulo: true, tipo: true, prioridade: true, status: true },
      orderBy: [{ prioridade: "asc" }, { titulo: "asc" }],
    }),
    prisma.acaoDemanda.findMany({
      where:  { deletedAt: null, feita: false, prazo: { gte: inicioDia, lt: fimDia },
                demanda: { companyId, userId, deletedAt: null } },
      select: { id: true, descricao: true, feita: true,
                demanda: { select: { id: true, titulo: true, tipo: true } } },
    }),
    diario
      ? prisma.comentario.findMany({
          where:   { demandaId: diario.id, deletedAt: null, tipo: { notIn: ["STATUS"] } },
          orderBy: { createdAt: "asc" },
          select:  { id: true, conteudo: true, tipo: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.sessaoFoco.findMany({
      where:   { companyId, userId, iniciadoEm: { gte: inicioDia, lt: fimDia } },
      include: { demanda: { select: { id: true, titulo: true, tipo: true } } },
    }),
  ])

  const tempoMap = new Map<number, { titulo: string; tipo: string; totalMin: number }>()
  for (const s of sessoesHoje) {
    const ex = tempoMap.get(s.demandaId)
    if (ex) ex.totalMin += s.duracaoMin
    else tempoMap.set(s.demandaId, { titulo: s.demanda.titulo, tipo: s.demanda.tipo, totalMin: s.duracaoMin })
  }
  const resumoTempo = Array.from(tempoMap.entries())
    .map(([demandaId, v]) => ({ demandaId, ...v }))
    .sort((a, b) => b.totalMin - a.totalMin)
  const totalMin = resumoTempo.reduce((acc, r) => acc + r.totalMin, 0)

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 2cm 2cm 2.5cm 2cm;
        }
        @media print {
          .no-print { display: none !important; }
          /* Rodapé fixo em todas as páginas */
          .print-footer {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-top: 1px solid #e2e8f0;
            font-size: 9pt;
            color: #94a3b8;
            background: white;
          }
          /* Quebra de página */
          h2 { break-after: avoid; }
          h3 { break-after: avoid; }
          .entry-row   { break-inside: avoid; }
          .tipo-group  { break-inside: avoid; }
          section.compact { break-inside: avoid; }
        }
      `}</style>

      <div className="bg-white min-h-screen p-10 max-w-2xl mx-auto text-sm text-slate-900">

        {/* Botões de exportação — só na tela */}
        <div className="no-print flex justify-end mb-6">
          <PrintButton dataISO={dataISO} />
        </div>

        {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
        <div className="border-b-2 border-slate-900 pb-4 mb-7">
          <h1 className="text-2xl font-bold capitalize">{dataFormatada}</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Diário — {nomeUsuario}</p>
        </div>

        {/* ── Agenda do dia ─────────────────────────────────────────────── */}
        {demandasHoje.length > 0 && (
          <section className="compact mb-6">
            <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 mb-3">
              <Clock size={11} strokeWidth={2.5} />
              Agenda do dia
            </h2>
            <div className="flex flex-col">
              {demandasHoje.map((d) => {
                const Icon = TIPO_ICON[d.tipo] ?? Inbox
                return (
                  <div key={d.id} className="entry-row flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded shrink-0 mt-0.5 ${TIPO_COR[d.tipo] ?? ""}`}>
                      <Icon size={10} strokeWidth={2.5} />
                    </span>
                    <p className="text-slate-800 leading-snug">{d.titulo}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Ações de hoje ─────────────────────────────────────────────── */}
        {acoesHoje.length > 0 && (
          <section className="compact mb-6">
            <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 mb-3">
              <CheckCircle2 size={11} strokeWidth={2.5} />
              Ações de hoje
            </h2>
            <div className="flex flex-col">
              {acoesHoje.map((a) => (
                <div key={a.id} className="entry-row flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
                  <span className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 leading-snug">{a.descricao}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.demanda.titulo}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Tempo de foco ─────────────────────────────────────────────── */}
        {resumoTempo.length > 0 && (
          <section className="compact mb-6">
            <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 mb-3">
              <Timer size={11} strokeWidth={2.5} />
              Tempo de foco — {formatMin(totalMin)}
            </h2>
            <div className="flex flex-col">
              {resumoTempo.map((r) => (
                <div key={r.demandaId} className="entry-row flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                  <p className="text-slate-700">{r.titulo}</p>
                  <span className="text-xs font-semibold text-slate-600 shrink-0">{formatMin(r.totalMin)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Registros do dia ──────────────────────────────────────────── */}
        {comentarios.length > 0 && (
          <section className="mb-6">
            <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 mb-4">
              <PenLine size={11} strokeWidth={2.5} />
              Registros do dia
            </h2>
            <div className="flex flex-col gap-5">
              {(["TELEFONEMA", "EMAIL", "REUNIAO", "NOTA"] as const).map((tipo) => {
                const itens = comentarios.filter((c) => c.tipo === tipo)
                if (itens.length === 0) return null
                return (
                  <div key={tipo} className="tipo-group">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      <EntradaIcon tipo={tipo} />
                      {ENTRADA_LABEL[tipo]}
                    </h3>
                    <div className="flex flex-col">
                      {itens.map((c) => (
                        <div key={c.id} className="entry-row flex gap-3 py-1.5 border-b border-slate-100 last:border-0">
                          <span className="text-xs text-slate-400 shrink-0 w-10 pt-0.5">
                            {formatHoraBRT(c.createdAt)}
                          </span>
                          <p className="text-slate-800 leading-snug whitespace-pre-wrap flex-1">{c.conteudo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {demandasHoje.length === 0 && acoesHoje.length === 0 &&
         resumoTempo.length === 0 && comentarios.length === 0 && (
          <p className="text-slate-400 italic">Nenhum registro para este dia.</p>
        )}

      </div>

      {/* ── Rodapé impresso ───────────────────────────────────────────────── */}
      <div className="print-footer">
        <span>demandoo</span>
      </div>

      {/* Auto-print quando vindo do botão PDF do Diário */}
      {pdf === "1" && (
        <AutoPrint title={`${dataISO} - Diário ${nomeUsuario}`} />
      )}
    </>
  )
}
