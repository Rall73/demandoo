import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseDateBRT } from "@/lib/date"
import {
  Phone, Mail, Users2, PenLine,
  Inbox, CheckSquare, Lightbulb,
  Clock, CheckCircle2, Timer,
} from "lucide-react"
import PrintButton from "./PrintButton"

type Ctx = { params: Promise<{ data: string }> }

const ENTRADA_LABEL: Record<string, string> = {
  TELEFONEMA: "Telefonema",
  EMAIL:      "E-mail",
  REUNIAO:    "Reunião",
  NOTA:       "Nota",
}

const ENTRADA_COR: Record<string, string> = {
  TELEFONEMA: "text-sky-700    bg-sky-50    border-sky-200",
  EMAIL:      "text-violet-700 bg-violet-50 border-violet-200",
  REUNIAO:    "text-emerald-700 bg-emerald-50 border-emerald-200",
  NOTA:       "text-amber-700  bg-amber-50  border-amber-200",
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
  return <Icon size={13} strokeWidth={2} />
}

function formatMin(min: number): string {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatHoraBRT(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  })
}

export default async function DiarioImprimirPage({ params }: Ctx) {
  const { data: dataParam } = await params

  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)

  const dataISO   = dataParam
  const inicioDia = parseDateBRT(dataISO)
  const fimDia    = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000)

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(inicioDia)

  // Demanda DIARIO
  const diario = await prisma.demanda.findFirst({
    where: { companyId, userId, tipo: "DIARIO", prazo: { gte: inicioDia, lt: fimDia }, deletedAt: null },
    select: { id: true },
  })

  const [demandasHoje, acoesHoje, comentarios, sessoesHoje] = await Promise.all([
    prisma.demanda.findMany({
      where: { companyId, userId, deletedAt: null, tipo: { not: "DIARIO" },
               status: { notIn: ["CONCLUIDA", "CANCELADA"] }, prazo: { gte: inicioDia, lt: fimDia } },
      select: { id: true, titulo: true, tipo: true, prioridade: true, status: true },
      orderBy: [{ prioridade: "asc" }, { titulo: "asc" }],
    }),
    prisma.acaoDemanda.findMany({
      where: { deletedAt: null, feita: false, prazo: { gte: inicioDia, lt: fimDia },
               demanda: { companyId, userId, deletedAt: null } },
      select: { id: true, descricao: true, feita: true, demanda: { select: { id: true, titulo: true, tipo: true } } },
    }),
    diario
      ? prisma.comentario.findMany({
          where: { demandaId: diario.id, deletedAt: null, tipo: { notIn: ["STATUS"] } },
          orderBy: { createdAt: "asc" },
          select: { id: true, conteudo: true, tipo: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.sessaoFoco.findMany({
      where: { companyId, userId, iniciadoEm: { gte: inicioDia, lt: fimDia } },
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
    <div className="print:text-black bg-white min-h-screen p-8 max-w-4xl mx-auto text-sm">

      {/* Botão de impressão — oculto na impressão */}
      <div className="print:hidden flex justify-end mb-6">
        <PrintButton />
      </div>

      {/* Cabeçalho */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 capitalize">{dataFormatada}</h1>
        <p className="text-slate-500 text-sm mt-1">Diário — demandoo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── Coluna esquerda: compromissos ─────────────────────────────── */}
        <div>

          {/* Vence hoje */}
          {demandasHoje.length > 0 && (
            <section className="mb-6">
              <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">
                <Clock size={11} strokeWidth={2.5} />
                Vence hoje
              </h2>
              <div className="flex flex-col gap-2">
                {demandasHoje.map((d) => {
                  const Icon = TIPO_ICON[d.tipo] ?? Inbox
                  return (
                    <div key={d.id} className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
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

          {/* Ações */}
          {acoesHoje.length > 0 && (
            <section className="mb-6">
              <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">
                <CheckCircle2 size={11} strokeWidth={2.5} />
                Ações de hoje
              </h2>
              <div className="flex flex-col gap-1.5">
                {acoesHoje.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 py-1 border-b border-slate-100 last:border-0">
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-800 leading-snug">{a.descricao}</p>
                      <p className="text-xs text-slate-400">{a.demanda.titulo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tempo de foco */}
          {resumoTempo.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">
                <Timer size={11} strokeWidth={2.5} />
                Tempo de foco — {formatMin(totalMin)}
              </h2>
              <div className="flex flex-col gap-1.5">
                {resumoTempo.map((r) => (
                  <div key={r.demandaId} className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-0">
                    <p className="text-slate-700 truncate">{r.titulo}</p>
                    <span className="text-xs font-semibold text-slate-600 shrink-0">{formatMin(r.totalMin)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {demandasHoje.length === 0 && acoesHoje.length === 0 && resumoTempo.length === 0 && (
            <p className="text-slate-400 italic">Nenhum compromisso registrado.</p>
          )}
        </div>

        {/* ── Coluna direita: registros agrupados por tipo ─────────────── */}
        <div>
          <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">
            <PenLine size={11} strokeWidth={2.5} />
            Registros do dia
          </h2>

          {comentarios.length === 0 ? (
            <p className="text-slate-400 italic">Nenhum registro.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {(["TELEFONEMA", "EMAIL", "REUNIAO", "NOTA"] as const).map((tipo) => {
                const itens = comentarios.filter((c) => c.tipo === tipo)
                if (itens.length === 0) return null
                return (
                  <div key={tipo}>
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      <EntradaIcon tipo={tipo} />
                      {ENTRADA_LABEL[tipo]}
                    </h3>
                    <div className="flex flex-col">
                      {itens.map((c) => (
                        <div key={c.id} className="flex gap-3 py-1.5 border-b border-slate-100 last:border-0">
                          <span className="text-xs text-slate-400 shrink-0 w-10 pt-0.5">
                            {formatHoraBRT(c.createdAt.toISOString())}
                          </span>
                          <p className="text-slate-800 leading-snug whitespace-pre-wrap flex-1">{c.conteudo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
