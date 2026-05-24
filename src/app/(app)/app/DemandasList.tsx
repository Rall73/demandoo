"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Search, X, CheckCircle2, Clock, PlayCircle, Ban,
  AlertTriangle, ChevronRight, Inbox, CheckSquare, Lightbulb, Loader2,
} from "lucide-react"

// ── Tipos ──────────────────────────────────────────────────────────────────────
type Tipo   = "DEMANDA" | "TAREFA" | "IDEIA"
type Status = "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA"
type Prio   = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"

export interface DemandaItem {
  id:             number
  titulo:         string
  descricao:      string | null
  tipo:           Tipo
  status:         Status
  prioridade:     Prio
  prazo:          string | null   // ISO string (serializado pelo server)
  solicitanteNome: string | null
  acoes:          { id: number; feita: boolean; descricao: string }[]
  createdAt:      string
}

// ── Constantes visuais ────────────────────────────────────────────────────────
const STATUS_LABEL: Record<Status, string> = {
  ABERTA:       "Aberta",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA:    "Concluída",
  CANCELADA:    "Cancelada",
}

const STATUS_ICON = {
  ABERTA:       Clock,
  EM_ANDAMENTO: PlayCircle,
  CONCLUIDA:    CheckCircle2,
  CANCELADA:    Ban,
} as const

const STATUS_COLOR: Record<Status, string> = {
  ABERTA:       "text-blue-600 bg-blue-50 border-blue-100",
  EM_ANDAMENTO: "text-amber-600 bg-amber-50 border-amber-100",
  CONCLUIDA:    "text-emerald-600 bg-emerald-50 border-emerald-100",
  CANCELADA:    "text-slate-400 bg-slate-50 border-slate-100",
}

const PRIO_BADGE: Record<Prio, { label: string; cls: string } | null> = {
  CRITICA: { label: "▲ Crítica", cls: "text-red-600" },
  ALTA:    { label: "▲ Alta",    cls: "text-orange-600" },
  MEDIA:   null,
  BAIXA:   { label: "▼ Baixa",  cls: "text-slate-400" },
}

const TIPO_NOME: Record<Tipo, string> = {
  DEMANDA: "demandas",
  TAREFA:  "tarefas",
  IDEIA:   "ideias",
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function DemandasList({ demandas, tipo }: { demandas: DemandaItem[]; tipo: Tipo }) {
  const router = useRouter()

  const [busca,        setBusca]        = useState("")
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS")
  const [filtroPrio,   setFiltroPrio]   = useState<string>("TODAS")
  const [toggling,     setToggling]     = useState<number | null>(null)

  // Prazo vencido: compara data em UTC com now() (só p/ display — ok no client)
  const hoje = new Date()
  const isVencida = (d: DemandaItem) =>
    !!d.prazo &&
    new Date(d.prazo) < hoje &&
    d.status !== "CONCLUIDA" &&
    d.status !== "CANCELADA"

  // Filtragem
  const filtradas = demandas.filter((d) => {
    if (filtroStatus !== "TODOS" && d.status     !== filtroStatus) return false
    if (filtroPrio   !== "TODAS" && d.prioridade !== filtroPrio)   return false
    if (busca.trim()) {
      const q = busca.toLowerCase()
      if (
        !d.titulo.toLowerCase().includes(q) &&
        !(d.descricao ?? "").toLowerCase().includes(q) &&
        !(d.solicitanteNome ?? "").toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const temFiltros = !!(busca.trim() || filtroStatus !== "TODOS" || filtroPrio !== "TODAS")

  function limparFiltros() {
    setBusca("")
    setFiltroStatus("TODOS")
    setFiltroPrio("TODAS")
  }

  // Toggle TAREFA ABERTA ↔ CONCLUIDA com 1 clique
  async function toggleTarefa(id: number, statusAtual: Status) {
    setToggling(id)
    const novoStatus = statusAtual === "CONCLUIDA" ? "ABERTA" : "CONCLUIDA"
    await fetch(`/api/demandas/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: novoStatus }),
    })
    router.refresh()
    setToggling(null)
  }

  // Ícone de empty state por tipo
  const EmptyIcon = tipo === "DEMANDA" ? Inbox : tipo === "TAREFA" ? CheckSquare : Lightbulb

  return (
    <div className="space-y-3">

      {/* ── Controles de filtro ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {/* Busca */}
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar ${TIPO_NOME[tipo]}…`}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Status */}
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="TODOS">Todos os status</option>
          <option value="ABERTA">Aberta</option>
          <option value="EM_ANDAMENTO">Em andamento</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="CANCELADA">Cancelada</option>
        </select>

        {/* Prioridade (oculto para TAREFA) */}
        {tipo !== "TAREFA" && (
          <select
            value={filtroPrio}
            onChange={(e) => setFiltroPrio(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="TODAS">Todas as prioridades</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        )}

        {/* Limpar filtros */}
        {temFiltros && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-500 bg-white hover:bg-slate-50 transition-colors"
          >
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      {/* Contador */}
      <p className="text-xs text-slate-400">
        {filtradas.length}{" "}
        {TIPO_NOME[tipo]}
        {filtradas.length !== demandas.length && ` de ${demandas.length}`}
      </p>

      {/* ── Lista vazia ─────────────────────────────────────────────────────── */}
      {filtradas.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <EmptyIcon size={36} className="mx-auto mb-3 opacity-30" strokeWidth={1.5} />
          {temFiltros ? (
            <>
              <p className="font-medium text-sm">Nenhum resultado para esses filtros</p>
              <p className="text-xs mt-1">
                <button onClick={limparFiltros} className="text-violet-600 hover:underline">Limpar filtros</button>
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-sm">
                {tipo === "DEMANDA" && "Nenhuma demanda ainda"}
                {tipo === "TAREFA"  && "Nenhuma tarefa ainda"}
                {tipo === "IDEIA"   && "Nenhuma ideia capturada"}
              </p>
              <p className="text-xs mt-1">
                {tipo === "IDEIA"
                  ? "Use Texto + IA ou Manual para registrar sua primeira ideia."
                  : "Use Captura por voz ou Digitar para criar o primeiro registro."}
              </p>
            </>
          )}
        </div>
      )}

      {/* ── MODO TAREFA (checkbox inline) ───────────────────────────────────── */}
      {filtradas.length > 0 && tipo === "TAREFA" && (
        <div className="space-y-1.5">
          {filtradas.map((d) => {
            const concluida = d.status === "CONCLUIDA"
            const cancelada = d.status === "CANCELADA"
            const vencida   = isVencida(d)

            return (
              <div
                key={d.id}
                className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 transition-colors ${
                  vencida ? "border-red-200" : "border-slate-200"
                }`}
              >
                {/* Checkbox círculo */}
                <button
                  onClick={() => toggleTarefa(d.id, d.status)}
                  disabled={toggling === d.id || cancelada}
                  className="shrink-0 disabled:opacity-40"
                  title={concluida ? "Reabrir" : "Marcar como feita"}
                >
                  {toggling === d.id ? (
                    <Loader2 size={20} className="animate-spin text-slate-400" />
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      concluida
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-300 hover:border-emerald-400"
                    }`}>
                      {concluida && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                  )}
                </button>

                {/* Título + meta */}
                <Link href={`/app/${d.id}`} className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${
                    concluida || cancelada ? "line-through text-slate-400" : "text-slate-800"
                  }`}>
                    {d.titulo}
                  </p>
                  {(vencida || d.prazo) && (
                    <p className={`text-xs mt-0.5 ${vencida ? "text-red-500" : "text-slate-400"}`}>
                      {vencida
                        ? "⚠ Prazo vencido"
                        : `Prazo: ${new Date(d.prazo!).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}
                    </p>
                  )}
                </Link>

                <ChevronRight size={14} className="shrink-0 text-slate-300" />
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODO DEMANDA / IDEIA (cards completos) ──────────────────────────── */}
      {filtradas.length > 0 && tipo !== "TAREFA" && (
        <div className="space-y-2">
          {filtradas.map((d) => {
            const inativa   = d.status === "CONCLUIDA" || d.status === "CANCELADA"
            const vencida   = isVencida(d)
            const StatusIcon = STATUS_ICON[d.status]
            const prioBadge  = PRIO_BADGE[d.prioridade]
            const acoesTotal = d.acoes.length
            const acoesFrac  = acoesTotal > 0
              ? `${d.acoes.filter(a => a.feita).length}/${acoesTotal}`
              : null

            return (
              <Link
                key={d.id}
                href={`/app/${d.id}`}
                className={`block bg-white border rounded-xl px-4 py-3 hover:shadow-sm transition-all ${
                  tipo === "IDEIA"
                    ? "border-amber-200 hover:border-amber-300 bg-amber-50/30"
                    : vencida
                    ? "border-red-200 hover:border-red-300"
                    : "border-slate-200 hover:border-violet-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Título */}
                    <p className={`text-sm font-medium truncate ${
                      inativa ? "line-through text-slate-400" : "text-slate-800"
                    }`}>
                      {d.titulo}
                    </p>

                    {/* Descrição truncada */}
                    {d.descricao && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {d.descricao}
                      </p>
                    )}

                    {/* Rodapé do card */}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                      {/* Status */}
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[d.status]}`}>
                        <StatusIcon size={10} strokeWidth={2.5} />
                        {STATUS_LABEL[d.status]}
                      </span>

                      {/* Prioridade (não para IDEIA) */}
                      {tipo !== "IDEIA" && prioBadge && (
                        <span className={`text-xs font-medium ${prioBadge.cls}`}>
                          {prioBadge.label}
                        </span>
                      )}

                      {/* Prazo vencido */}
                      {vencida && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertTriangle size={10} strokeWidth={2.5} />
                          Prazo vencido
                        </span>
                      )}

                      {/* Prazo normal */}
                      {d.prazo && !vencida && !inativa && (
                        <span className="text-xs text-slate-400">
                          📅 {new Date(d.prazo).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </span>
                      )}

                      {/* Ações */}
                      {acoesFrac && (
                        <span className={`text-xs ${
                          d.acoes.every(a => a.feita) ? "text-emerald-600 font-medium" : "text-slate-400"
                        }`}>
                          ✓ {acoesFrac} ações
                        </span>
                      )}

                      {/* Solicitante */}
                      {d.solicitanteNome && (
                        <span className="text-xs text-slate-400">por {d.solicitanteNome}</span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={14} className="shrink-0 text-slate-300 mt-1" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
