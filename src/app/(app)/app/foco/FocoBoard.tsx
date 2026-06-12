"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Inbox, CheckSquare, Lightbulb,
  Clock, PlayCircle, PauseCircle,
  AlertCircle, ChevronRight, ArrowUpDown,
  Loader2, X, Check,
} from "lucide-react"

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Tipo       = "DEMANDA" | "TAREFA" | "IDEIA"
type Status     = "ABERTA" | "EM_ANDAMENTO" | "EM_ESPERA"
type Prioridade = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"
type Ordenacao  = "PADRAO" | "CRIACAO" | "VENCIMENTO" | "IMPORTANCIA"

export interface DemandaFoco {
  id:               number
  titulo:           string
  tipo:             Tipo
  status:           Status
  prioridade:       Prioridade
  prazo:            string | null
  delegadoNome:     string | null
  focoIniciadoEm:   string | null
  focoMotivoEspera: string | null
  createdAt:        string
}

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPO_ICON: Record<Tipo, typeof Inbox> = {
  DEMANDA: Inbox,
  TAREFA:  CheckSquare,
  IDEIA:   Lightbulb,
}
const TIPO_COLOR: Record<Tipo, string> = {
  DEMANDA: "bg-violet-100 text-violet-700",
  TAREFA:  "bg-emerald-100 text-emerald-700",
  IDEIA:   "bg-amber-100 text-amber-700",
}
const TIPO_ATIVO: Record<Tipo, string> = {
  DEMANDA: "bg-violet-600 text-white",
  TAREFA:  "bg-emerald-600 text-white",
  IDEIA:   "bg-amber-500 text-white",
}
const PRIO_ORDEM: Record<Prioridade, number> = {
  CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3,
}
const PRIO_COLOR: Record<Prioridade, string> = {
  BAIXA:   "text-slate-400",
  MEDIA:   "text-yellow-600",
  ALTA:    "text-orange-600",
  CRITICA: "text-red-600",
}
const PRIO_LABEL: Record<Prioridade, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", CRITICA: "Crítica",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrazo(iso: string | null): string | null {
  if (!iso) return null
  const d    = new Date(iso)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - hoje.getTime()) / 86400000)
  if (diff < 0)   return `venceu há ${Math.abs(diff)}d`
  if (diff === 0) return "vence hoje"
  if (diff === 1) return "vence amanhã"
  return `vence ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
}

function isPrazoUrgente(iso: string | null): boolean {
  if (!iso) return false
  const d    = new Date(iso)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return d.getTime() <= hoje.getTime() + 86400000
}

function formatDuracao(isoInicio: string): string {
  const ms   = Date.now() - new Date(isoInicio).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function aplicarOrdenacao(lista: DemandaFoco[], ord: Ordenacao): DemandaFoco[] {
  return [...lista].sort((a, b) => {
    if (ord === "IMPORTANCIA") {
      const diff = PRIO_ORDEM[a.prioridade] - PRIO_ORDEM[b.prioridade]
      return diff !== 0 ? diff : a.titulo.localeCompare(b.titulo)
    }
    if (ord === "VENCIMENTO") {
      if (!a.prazo && !b.prazo) return 0
      if (!a.prazo) return 1
      if (!b.prazo) return -1
      return new Date(a.prazo).getTime() - new Date(b.prazo).getTime()
    }
    if (ord === "CRIACAO") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    // PADRAO: prioridade → prazo → criação
    const pd = PRIO_ORDEM[a.prioridade] - PRIO_ORDEM[b.prioridade]
    if (pd !== 0) return pd
    if (a.prazo && b.prazo) return new Date(a.prazo).getTime() - new Date(b.prazo).getTime()
    if (a.prazo) return -1
    if (b.prazo) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

// ── Card ─────────────────────────────────────────────────────────────────────

function DemandaCard({
  demanda, isDragging, onDragStart, col,
}: {
  demanda:     DemandaFoco
  isDragging:  boolean
  onDragStart: (e: React.DragEvent, id: number) => void
  col:         Status
}) {
  const [elapsed, setElapsed] = useState(
    demanda.focoIniciadoEm ? formatDuracao(demanda.focoIniciadoEm) : ""
  )

  useEffect(() => {
    if (col !== "EM_ANDAMENTO" || !demanda.focoIniciadoEm) return
    const iv = setInterval(() => setElapsed(formatDuracao(demanda.focoIniciadoEm!)), 30000)
    return () => clearInterval(iv)
  }, [col, demanda.focoIniciadoEm])

  const TipoIcon  = TIPO_ICON[demanda.tipo]
  const prazoText = formatPrazo(demanda.prazo)
  const urgente   = isPrazoUrgente(demanda.prazo)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, demanda.id)}
      className={`
        group relative bg-white border rounded-xl p-3.5 cursor-grab active:cursor-grabbing
        transition-all duration-150 select-none
        ${isDragging
          ? "opacity-40 rotate-1 shadow-lg border-violet-200"
          : "border-slate-200 hover:border-violet-300 hover:shadow-md"
        }
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${TIPO_COLOR[demanda.tipo]}`}>
          <TipoIcon size={10} strokeWidth={2.5} />
          {demanda.tipo === "DEMANDA" ? "Demanda" : demanda.tipo === "TAREFA" ? "Tarefa" : "Ideia"}
        </span>
        {(demanda.prioridade === "ALTA" || demanda.prioridade === "CRITICA") && (
          <span className={`text-[11px] font-semibold ${PRIO_COLOR[demanda.prioridade]}`}>
            ▲ {PRIO_LABEL[demanda.prioridade]}
          </span>
        )}
      </div>

      <Link
        href={`/app/${demanda.id}`}
        className="block text-sm font-semibold text-slate-800 leading-snug hover:text-violet-700 transition-colors mb-2 pr-4"
        onClick={(e) => e.stopPropagation()}
      >
        {demanda.titulo}
      </Link>

      {prazoText && (
        <div className={`flex items-center gap-1 text-xs font-medium mb-2 ${urgente ? "text-red-600" : "text-slate-400"}`}>
          {urgente && <AlertCircle size={11} strokeWidth={2.5} />}
          <Clock size={11} strokeWidth={2} />
          {prazoText}
        </div>
      )}

      {col === "EM_ANDAMENTO" && demanda.focoIniciadoEm && (
        <div className="flex items-center gap-1.5 mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700">
            Em foco há {elapsed || formatDuracao(demanda.focoIniciadoEm)}
          </span>
        </div>
      )}

      {col === "EM_ESPERA" && demanda.focoMotivoEspera && (
        <div className="mt-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
          <PauseCircle size={11} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{demanda.focoMotivoEspera}</span>
        </div>
      )}

      <ChevronRight
        size={14}
        strokeWidth={2}
        className="absolute top-3.5 right-3 text-slate-300 group-hover:text-violet-400 transition-colors"
      />
    </div>
  )
}

// ── Coluna ───────────────────────────────────────────────────────────────────

function Coluna({
  titulo, status, icon: Icon, cor, demandas,
  dragId, dragOver, onDragStart, onDragOver, onDragLeave, onDrop,
}: {
  titulo:      string
  status:      Status
  icon:        typeof PlayCircle
  cor:         string
  demandas:    DemandaFoco[]
  dragId:      number | null
  dragOver:    Status | null
  onDragStart: (e: React.DragEvent, id: number) => void
  onDragOver:  (e: React.DragEvent, col: Status) => void
  onDragLeave: () => void
  onDrop:      (col: Status) => void
}) {
  const isOver = dragOver === status

  return (
    <div className="flex flex-col gap-0 min-h-0">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cor}`}>
          <Icon size={14} strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-800">{titulo}</h2>
          <p className="text-xs text-slate-400">{demandas.length} {demandas.length === 1 ? "item" : "itens"}</p>
        </div>
        {status === "EM_ANDAMENTO" && demandas.length >= 3 && (
          <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            Muitos itens
          </span>
        )}
      </div>

      <div
        onDragOver={(e) => onDragOver(e, status)}
        onDragLeave={onDragLeave}
        onDrop={() => onDrop(status)}
        className={`
          flex-1 flex flex-col gap-2.5 rounded-xl p-2 min-h-[200px] transition-colors duration-150
          ${isOver
            ? "bg-violet-50 border-2 border-dashed border-violet-300"
            : "bg-slate-50 border-2 border-transparent"
          }
        `}
      >
        {demandas.map((d) => (
          <DemandaCard
            key={d.id}
            demanda={d}
            isDragging={dragId === d.id}
            onDragStart={onDragStart}
            col={status}
          />
        ))}
        {demandas.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Icon size={18} strokeWidth={1.5} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {status === "ABERTA"
                ? "Nenhum item aguardando"
                : status === "EM_ANDAMENTO"
                ? "Arraste um item aqui para começar"
                : "Nenhum item em espera"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal de motivo ───────────────────────────────────────────────────────────

function MotivoPauseModal({ onConfirm, onCancel }: {
  onConfirm: (motivo: string) => void
  onCancel:  () => void
}) {
  const [motivo, setMotivo] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
            <PauseCircle size={18} strokeWidth={2} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Pausar para espera</h3>
            <p className="text-xs text-slate-400">Opcional — ajuda a lembrar o motivo depois</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-slate-600">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onConfirm(motivo) }}
          placeholder="Ex: aguardando resposta, falta informação..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
          maxLength={255}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={15} strokeWidth={2.5} />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Board principal ───────────────────────────────────────────────────────────

const TIPO_FILTROS: { valor: Tipo | "TODOS"; label: string }[] = [
  { valor: "TODOS",   label: "Todos" },
  { valor: "DEMANDA", label: "Demandas" },
  { valor: "TAREFA",  label: "Tarefas" },
  { valor: "IDEIA",   label: "Ideias" },
]

const ORDENACOES: { valor: Ordenacao; label: string }[] = [
  { valor: "PADRAO",      label: "Padrão (prioridade + prazo)" },
  { valor: "IMPORTANCIA", label: "Importância" },
  { valor: "VENCIMENTO",  label: "Vencimento (mais próximo)" },
  { valor: "CRIACAO",     label: "Criação (mais antigo)" },
]

export default function FocoBoard({ demandas: inicial }: { demandas: DemandaFoco[] }) {
  const router = useRouter()

  const [itens,         setItens]         = useState<DemandaFoco[]>(inicial)
  const [dragId,        setDragId]        = useState<number | null>(null)
  const [dragOver,      setDragOver]      = useState<Status | null>(null)
  const [loading,       setLoading]       = useState<number | null>(null)
  const [pendingEspera, setPendingEspera] = useState<{ id: number; de: Status } | null>(null)
  const [filtroTipo,    setFiltroTipo]    = useState<Tipo | "TODOS">("TODOS")
  const [ordenacao,     setOrdenacao]     = useState<Ordenacao>("PADRAO")

  const itensFiltrados = useMemo(() => {
    const filtrados = filtroTipo === "TODOS"
      ? itens
      : itens.filter((d) => d.tipo === filtroTipo)
    return aplicarOrdenacao(filtrados, ordenacao)
  }, [itens, filtroTipo, ordenacao])

  const aFazer   = itensFiltrados.filter((d) => d.status === "ABERTA")
  const emFoco   = itensFiltrados.filter((d) => d.status === "EM_ANDAMENTO")
  const emEspera = itensFiltrados.filter((d) => d.status === "EM_ESPERA")

  function onDragStart(e: React.DragEvent, id: number) {
    setDragId(id)
    e.dataTransfer.effectAllowed = "move"
  }
  function onDragOver(e: React.DragEvent, col: Status) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOver(col)
  }
  function onDragLeave() { setDragOver(null) }

  async function moverPara(id: number, novoStatus: Status, motivo?: string) {
    const demanda = itens.find((d) => d.id === id)
    if (!demanda || demanda.status === novoStatus) return
    const deStatus = demanda.status
    const agora    = new Date().toISOString()

    setItens((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status:           novoStatus,
              focoIniciadoEm:   novoStatus === "EM_ANDAMENTO" ? agora : null,
              focoMotivoEspera: novoStatus === "EM_ESPERA" ? (motivo ?? null) : d.focoMotivoEspera,
            }
          : d
      )
    )

    setLoading(id)
    try {
      const body: Record<string, unknown> = { status: novoStatus }
      if (novoStatus === "EM_ESPERA" && motivo !== undefined) body.focoMotivoEspera = motivo
      const res = await fetch(`/api/demandas/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
    } catch {
      setItens((prev) => prev.map((d) => d.id === id ? { ...d, status: deStatus } : d))
    } finally {
      setLoading(null)
      router.refresh()
    }
  }

  function onDrop(col: Status) {
    setDragOver(null)
    if (dragId === null) return
    const id = dragId
    setDragId(null)
    const demanda = itens.find((d) => d.id === id)
    if (!demanda || demanda.status === col) return
    if (col === "EM_ESPERA") { setPendingEspera({ id, de: demanda.status }); return }
    moverPara(id, col)
  }

  function confirmarEspera(motivo: string) {
    if (!pendingEspera) return
    moverPara(pendingEspera.id, "EM_ESPERA", motivo)
    setPendingEspera(null)
  }

  const totalVisiveis = itensFiltrados.length
  const totalGeral    = itens.length

  return (
    <div className="flex flex-col h-full p-4 md:p-8 max-w-7xl">

      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Foco</h1>
            <p className="text-sm text-slate-500 mt-1">
              Arraste os itens para organizar o que está fazendo agora
              {filtroTipo !== "TODOS" && (
                <span className="ml-1 text-violet-600 font-medium">
                  — mostrando {totalVisiveis} de {totalGeral}
                </span>
              )}
            </p>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown size={14} strokeWidth={2} className="text-slate-400" />
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
              className="text-xs font-medium text-gray-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer"
            >
              {ORDENACOES.map((o) => (
                <option key={o.valor} value={o.valor}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtro por tipo */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {TIPO_FILTROS.map(({ valor, label }) => {
            const ativo = filtroTipo === valor
            const corAtivo = valor === "TODOS"
              ? "bg-slate-800 text-white"
              : TIPO_ATIVO[valor as Tipo]
            return (
              <button
                key={valor}
                onClick={() => setFiltroTipo(valor)}
                className={`
                  inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full
                  border transition-all duration-150
                  ${ativo
                    ? `${corAtivo} border-transparent shadow-sm`
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }
                `}
              >
                {valor !== "TODOS" && (() => {
                  const Icon = TIPO_ICON[valor as Tipo]
                  return <Icon size={11} strokeWidth={2.5} />
                })()}
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {loading !== null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <Loader2 size={12} className="animate-spin" />
          Salvando...
        </div>
      )}

      {/* ── Três colunas ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
        <Coluna
          titulo="A Fazer"
          status="ABERTA"
          icon={Clock}
          cor="bg-slate-100 text-slate-500"
          demandas={aFazer}
          dragId={dragId}
          dragOver={dragOver}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
        <Coluna
          titulo="Em Foco"
          status="EM_ANDAMENTO"
          icon={PlayCircle}
          cor="bg-emerald-100 text-emerald-600"
          demandas={emFoco}
          dragId={dragId}
          dragOver={dragOver}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
        <Coluna
          titulo="Em Espera"
          status="EM_ESPERA"
          icon={PauseCircle}
          cor="bg-orange-100 text-orange-600"
          demandas={emEspera}
          dragId={dragId}
          dragOver={dragOver}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
      </div>

      {pendingEspera && (
        <MotivoPauseModal
          onConfirm={confirmarEspera}
          onCancel={() => { setPendingEspera(null); setDragId(null) }}
        />
      )}
    </div>
  )
}
