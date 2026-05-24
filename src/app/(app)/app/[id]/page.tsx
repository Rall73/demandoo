import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Mic, AlertTriangle } from "lucide-react"
import DetalheActions from "./DetalheActions"

const STATUS_LABEL: Record<string, string> = {
  ABERTA:       "Aberta",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA:    "Concluída",
  CANCELADA:    "Cancelada",
}
const STATUS_COLOR: Record<string, string> = {
  ABERTA:       "bg-blue-100 text-blue-700",
  EM_ANDAMENTO: "bg-amber-100 text-amber-700",
  CONCLUIDA:    "bg-emerald-100 text-emerald-700",
  CANCELADA:    "bg-slate-100 text-slate-500",
}
const PRIO_LABEL: Record<string, string> = {
  BAIXA:   "Baixa",
  MEDIA:   "Média",
  ALTA:    "Alta",
  CRITICA: "Crítica",
}
const PRIO_COLOR: Record<string, string> = {
  BAIXA:   "bg-slate-100 text-slate-500",
  MEDIA:   "bg-yellow-100 text-yellow-700",
  ALTA:    "bg-orange-100 text-orange-700",
  CRITICA: "bg-red-100 text-red-700",
}
const TIPO_LABEL: Record<string, string> = {
  DEMANDA: "Demanda",
  TAREFA:  "Tarefa",
  IDEIA:   "Ideia",
}
const TIPO_COLOR: Record<string, string> = {
  DEMANDA: "bg-violet-100 text-violet-700",
  TAREFA:  "bg-emerald-100 text-emerald-700",
  IDEIA:   "bg-amber-100 text-amber-700",
}

export default async function DetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)
  const { id }    = await params

  const demanda = await prisma.demanda.findFirst({
    where:   { id: Number(id), companyId, userId, deletedAt: null },
    include: { acoes: { orderBy: { ordem: "asc" } } },
  })

  if (!demanda) notFound()

  // Prazo vencido: prazo existe, é passado e status ainda é ativo
  const agora    = new Date()
  const vencida  =
    !!demanda.prazo &&
    demanda.prazo < agora &&
    demanda.status !== "CONCLUIDA" &&
    demanda.status !== "CANCELADA"

  // Formata prazo como data local (BRT)
  const prazoStr = demanda.prazo
    ? new Date(demanda.prazo.getTime() - 3 * 3600000)
        .toLocaleDateString("pt-BR")
    : null

  return (
    <div className="p-4 md:p-8 max-w-2xl">

      {/* ── Cabeçalho com badges ────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-6">
        <Link
          href="/app"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div className="flex gap-2 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TIPO_COLOR[demanda.tipo]}`}>
            {TIPO_LABEL[demanda.tipo]}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[demanda.status]}`}>
            {STATUS_LABEL[demanda.status]}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIO_COLOR[demanda.prioridade]}`}>
            {PRIO_LABEL[demanda.prioridade]}
          </span>
          {vencida && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700">
              <AlertTriangle size={11} strokeWidth={2.5} />
              Prazo vencido
            </span>
          )}
        </div>
      </div>

      {/* ── Título e descrição ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h1 className="text-xl font-bold text-slate-900 mb-3">{demanda.titulo}</h1>
        {demanda.descricao && (
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
            {demanda.descricao}
          </p>
        )}
      </div>

      {/* ── Metadados ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 space-y-3 text-sm">
        <div className="flex gap-2">
          <span className="text-slate-400 w-28 shrink-0">Criada em</span>
          <span className="text-slate-600">
            {new Date(demanda.createdAt.getTime() - 3 * 3600000)
              .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {demanda.solicitanteNome && (
          <div className="flex gap-2">
            <span className="text-slate-400 w-28 shrink-0">Solicitante</span>
            <span className="text-slate-800 font-medium">{demanda.solicitanteNome}</span>
          </div>
        )}

        {prazoStr && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 w-28 shrink-0">Prazo</span>
            <span className={`font-medium flex items-center gap-1.5 ${vencida ? "text-red-600" : "text-slate-800"}`}>
              <Calendar size={13} strokeWidth={2} className={vencida ? "text-red-500" : "text-violet-500"} />
              {prazoStr}
              {vencida && <span className="text-red-500 text-xs">(vencido)</span>}
            </span>
            {!vencida && (
              <a
                href={`/api/demandas/${demanda.id}/calendar.ics`}
                download
                className="text-xs text-violet-600 hover:underline"
              >
                + Calendário
              </a>
            )}
          </div>
        )}

        {demanda.audioUrl && (
          <div className="flex gap-2">
            <span className="text-slate-400 w-28 shrink-0 flex items-center gap-1">
              <Mic size={13} strokeWidth={2} /> Áudio
            </span>
            <audio controls src={demanda.audioUrl} className="h-8 flex-1" />
          </div>
        )}
      </div>

      {/* ── Ações (sub-checklist) ──────────────────────────────────────────── */}
      {demanda.acoes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">Próximas ações</p>
            <span className={`text-xs font-medium ${
              demanda.acoes.every(a => a.feita) ? "text-emerald-600" : "text-slate-400"
            }`}>
              {demanda.acoes.filter(a => a.feita).length}/{demanda.acoes.length}
            </span>
          </div>
          <div className="space-y-2">
            {demanda.acoes.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className={`mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center border ${
                  a.feita ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                }`}>
                  {a.feita && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <span className={`text-sm leading-snug ${a.feita ? "line-through text-slate-400" : "text-slate-700"}`}>
                  {a.descricao}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ações interativas (client) ─────────────────────────────────────── */}
      <DetalheActions
        demandaId={demanda.id}
        status={demanda.status}
        tipo={demanda.tipo}
      />
    </div>
  )
}
