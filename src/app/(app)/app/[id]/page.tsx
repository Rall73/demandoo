import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Mic } from "lucide-react"
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
const PRIO_COLOR: Record<string, string> = {
  BAIXA:   "bg-slate-100 text-slate-500",
  MEDIA:   "bg-yellow-100 text-yellow-700",
  ALTA:    "bg-orange-100 text-orange-700",
  CRITICA: "bg-red-100 text-red-700",
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

  const prazoStr = demanda.prazo
    ? new Date(demanda.prazo.getTime() - 3 * 3600000).toLocaleDateString("pt-BR")
    : null

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div className="flex gap-2 flex-wrap">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${TIPO_COLOR[demanda.tipo]}`}>
            {demanda.tipo}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[demanda.status]}`}>
            {STATUS_LABEL[demanda.status]}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRIO_COLOR[demanda.prioridade]}`}>
            {demanda.prioridade}
          </span>
        </div>
      </div>

      {/* Título e descrição */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h1 className="text-xl font-bold text-slate-900 mb-3">{demanda.titulo}</h1>
        {demanda.descricao && (
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{demanda.descricao}</p>
        )}
      </div>

      {/* Metadados */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 space-y-3 text-sm">
        {demanda.solicitanteNome && (
          <div className="flex gap-2">
            <span className="text-slate-400 w-24 shrink-0">Solicitante</span>
            <span className="text-slate-800 font-medium">{demanda.solicitanteNome}</span>
          </div>
        )}
        {prazoStr && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 w-24 shrink-0">Prazo</span>
            <span className="text-slate-800 font-medium flex items-center gap-1.5">
              <Calendar size={13} strokeWidth={2} className="text-violet-500" />
              {prazoStr}
            </span>
            <a
              href={`/api/demandas/${demanda.id}/calendar.ics`}
              download
              className="text-xs text-violet-600 hover:underline ml-1"
            >
              + Calendário
            </a>
          </div>
        )}
        {demanda.audioUrl && (
          <div className="flex gap-2">
            <span className="text-slate-400 w-24 shrink-0 flex items-center gap-1">
              <Mic size={13} strokeWidth={2} /> Áudio
            </span>
            <audio controls src={demanda.audioUrl} className="h-8 flex-1" />
          </div>
        )}
      </div>

      {/* Ações */}
      {demanda.acoes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Próximas ações</p>
          <div className="space-y-2">
            {demanda.acoes.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className={`mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center border ${
                  a.feita ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                }`}>
                  {a.feita && <span className="text-white text-[10px]">✓</span>}
                </div>
                <span className={`text-sm ${a.feita ? "line-through text-slate-400" : "text-slate-700"}`}>
                  {a.descricao}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações interativas (client) */}
      <DetalheActions demandaId={demanda.id} status={demanda.status} tipo={demanda.tipo} />
    </div>
  )
}
