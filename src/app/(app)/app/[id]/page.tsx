import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { hojeNoBrasil } from "@/lib/date"
import { ArrowLeft, Calendar, Mic, AlertTriangle, Sparkles, User, Printer } from "lucide-react"
import DetalheActions from "./DetalheActions"
import DetalheContent from "./DetalheContent"
import AcoesInterativas from "./AcoesInterativas"
import ComentariosSection, { type ComentarioItem, type AnexoItem } from "./ComentariosSection"

const STATUS_LABEL: Record<string, string> = {
  ABERTA:       "Aberta",
  EM_ANDAMENTO: "Em andamento",
  EM_ESPERA:    "Em espera",
  CONCLUIDA:    "Concluída",
  CANCELADA:    "Cancelada",
}
const STATUS_COLOR: Record<string, string> = {
  ABERTA:       "bg-blue-100 text-blue-700",
  EM_ANDAMENTO: "bg-amber-100 text-amber-700",
  EM_ESPERA:    "bg-orange-100 text-orange-700",
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

// Formata duração em dias/horas entre duas datas
function duracaoLegivel(de: Date, ate: Date): string {
  const diffMs   = ate.getTime() - de.getTime()
  const diffHs   = Math.floor(diffMs / 3600000)
  const diffDias = Math.floor(diffHs / 24)
  if (diffDias >= 1) return `${diffDias} dia${diffDias > 1 ? "s" : ""}`
  if (diffHs   >= 1) return `${diffHs}h`
  return "< 1h"
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
    include: {
      acoes:       { where: { deletedAt: null }, orderBy: { ordem: "asc" } },
      tags:        { include: { tag: true } },
      comentarios: {
        where:   { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
      anexos: {
        where:   { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
    },
  })

  if (!demanda) notFound()

  const aiQuota     = session!.user.aiQuota
  const aiUsed      = session!.user.aiUsedTotal
  const aiBloqueado = aiQuota !== null && aiUsed >= aiQuota

  const comentariosSerializados: ComentarioItem[] = demanda.comentarios.map((c) => ({
    id:        c.id,
    conteudo:  c.conteudo,
    audioUrl:  c.audioUrl ?? null,
    tipo:      c.tipo as ComentarioItem["tipo"],
    createdAt: c.createdAt.toISOString(),
    user:      { name: c.user.name },
  }))

  const anexosSerializados: AnexoItem[] = demanda.anexos.map((a) => ({
    id:        a.id,
    url:       a.url,
    nome:      a.nome,
    tipo:      a.tipo,
    tamanho:   a.tamanho,
    createdAt: a.createdAt.toISOString(),
    userId:    a.userId,
    user:      { name: a.user.name },
  }))

  const hoje    = hojeNoBrasil()
  const vencida =
    !!demanda.prazo &&
    demanda.prazo < hoje &&
    demanda.status !== "CONCLUIDA" &&
    demanda.status !== "CANCELADA"

  const prazoStr = demanda.prazo
    ? new Date(demanda.prazo.getTime() - 3 * 3600000).toLocaleDateString("pt-BR")
    : null

  const duracaoStr =
    demanda.concluidoAt && demanda.createdAt
      ? duracaoLegivel(demanda.createdAt, demanda.concluidoAt)
      : null

  return (
    <div className="p-4 md:p-8 max-w-2xl">

      {/* ── Cabeçalho — badges de status/prioridade ───────────────────────────── */}
      <div className="flex items-start gap-3 mb-6">
        <Link
          href={`/app/lista?tipo=${demanda.tipo}`}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div className="flex gap-2 flex-wrap flex-1">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[demanda.status]}`}>
            {STATUS_LABEL[demanda.status]}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIO_COLOR[demanda.prioridade]}`}>
            {PRIO_LABEL[demanda.prioridade]}
          </span>
          {demanda.aiProcessado && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-violet-100 text-violet-700">
              <Sparkles size={11} strokeWidth={2} />
              IA
            </span>
          )}
          {vencida && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700">
              <AlertTriangle size={11} strokeWidth={2.5} />
              Prazo vencido
            </span>
          )}
        </div>
        <a
          href={`/relatorios/imprimir?ids=${demanda.id}&tipo=${demanda.tipo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
          title="Imprimir este item"
        >
          <Printer size={16} strokeWidth={2} />
        </a>
      </div>

      {/* ── Card principal: tipo (dropdown) + título + descrição + editar detalhes ── */}
      <DetalheContent
        demandaId={demanda.id}
        tipo={demanda.tipo as "DEMANDA" | "TAREFA" | "IDEIA"}
        titulo={demanda.titulo}
        descricao={demanda.descricao}
        prioridade={demanda.prioridade}
        prazo={demanda.prazo?.toISOString() ?? null}
        delegadoNome={demanda.delegadoNome ?? null}
        tags={demanda.tags.map((dt) => dt.tag.nome)}
      />

      {/* ── Metadados ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 space-y-3 text-sm">
        <div className="flex gap-2">
          <span className="text-slate-400 w-28 shrink-0">Criada em</span>
          <span className="text-slate-600">
            {new Date(demanda.createdAt.getTime() - 3 * 3600000).toLocaleDateString("pt-BR", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>

        {demanda.status === "CONCLUIDA" && demanda.concluidoAt && (
          <div className="flex gap-2">
            <span className="text-slate-400 w-28 shrink-0">Concluída em</span>
            <span className="text-emerald-700 font-medium">
              {new Date(demanda.concluidoAt.getTime() - 3 * 3600000).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
              {duracaoStr && (
                <span className="text-slate-400 font-normal ml-1.5">({duracaoStr})</span>
              )}
            </span>
          </div>
        )}

        {demanda.solicitanteNome && (
          <div className="flex gap-2">
            <span className="text-slate-400 w-28 shrink-0">Solicitante</span>
            <span className="text-slate-800 font-medium">{demanda.solicitanteNome}</span>
          </div>
        )}

        {demanda.delegadoNome && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 w-28 shrink-0 flex items-center gap-1">
              <User size={13} strokeWidth={2} /> Delegado
            </span>
            <span className="text-slate-800 font-medium">{demanda.delegadoNome}</span>
          </div>
        )}

        {prazoStr && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 w-28 shrink-0">Prazo</span>
            <span className={`font-medium flex items-center gap-1.5 ${vencida ? "text-red-600" : "text-slate-800"}`}>
              <Calendar size={13} strokeWidth={2} className={vencida ? "text-red-500" : "text-violet-500"} />
              {prazoStr}
              {vencida && <span className="text-red-500 text-xs font-normal">(vencido)</span>}
            </span>
            <a
              href={`/api/demandas/${demanda.id}/calendar.ics`}
              download
              className="text-xs text-violet-600 hover:underline"
            >
              + Calendário
            </a>
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

      {/* ── Ações interativas ───────────────────────────────────────────────────── */}
      <AcoesInterativas
        demandaId={demanda.id}
        acoes={demanda.acoes.map((a) => ({ id: a.id, descricao: a.descricao, feita: a.feita }))}
      />

      {/* ── Histórico + Relatório IA ────────────────────────────────────────────── */}
      <ComentariosSection
        demandaId={demanda.id}
        sessionUserId={userId}
        initialComentarios={comentariosSerializados}
        initialAnexos={anexosSerializados}
        relatorioGerado={demanda.relatorioGerado ?? null}
        relatorioGeradoAt={demanda.relatorioGeradoAt?.toISOString() ?? null}
        aiBloqueado={aiBloqueado}
        tipo={demanda.tipo}
      />

      {/* ── Transições de status + exclusão (client) ───────────────────────────── */}
      <DetalheActions
        demandaId={demanda.id}
        status={demanda.status}
        tipo={demanda.tipo}
      />
    </div>
  )
}
