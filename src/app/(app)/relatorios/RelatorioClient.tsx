"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search, X, ArrowUpDown, FileText,
  Inbox, CheckSquare, Lightbulb, CheckCircle2,
  Clock, PlayCircle, Ban, AlertTriangle, Printer, Sparkles,
} from "lucide-react"

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Tipo   = "DEMANDA" | "TAREFA" | "IDEIA"
type Status = "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA"
type Prio   = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"

export interface DemandaRelatorio {
  id:              number
  titulo:          string
  descricao:       string | null
  tipo:            Tipo
  status:          Status
  prioridade:      Prio
  prazo:           string | null
  solicitanteNome: string | null
  aiProcessado:    boolean
  acoes:           { id: number; feita: boolean; descricao: string }[]
  createdAt:       string
}

// ── Constantes visuais ────────────────────────────────────────────────────────
const STATUS_LABEL: Record<Status, string> = {
  ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento", CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
}
const STATUS_ICON = {
  ABERTA: Clock, EM_ANDAMENTO: PlayCircle, CONCLUIDA: CheckCircle2, CANCELADA: Ban,
} as const
const STATUS_COLOR: Record<Status, string> = {
  ABERTA:       "text-blue-600 bg-blue-50 border-blue-100",
  EM_ANDAMENTO: "text-amber-600 bg-amber-50 border-amber-100",
  CONCLUIDA:    "text-emerald-600 bg-emerald-50 border-emerald-100",
  CANCELADA:    "text-slate-400 bg-slate-50 border-slate-100",
}
const PRIO_LABEL: Record<Prio, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", CRITICA: "Crítica",
}
const PRIO_COR: Record<Prio, string> = {
  BAIXA: "text-slate-400", MEDIA: "text-yellow-600", ALTA: "text-orange-600", CRITICA: "text-red-600",
}

type Ordenacao = "PADRAO" | "PRAZO" | "PRIORIDADE" | "RECENTE"
const PRIO_ORDER: Record<Prio, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 }

function ordenar(lista: DemandaRelatorio[], ord: Ordenacao): DemandaRelatorio[] {
  const c = [...lista]
  if (ord === "PRAZO") {
    return c.sort((a, b) => {
      if (!a.prazo && !b.prazo) return 0
      if (!a.prazo) return 1
      if (!b.prazo) return -1
      return new Date(a.prazo).getTime() - new Date(b.prazo).getTime()
    })
  }
  if (ord === "PRIORIDADE") return c.sort((a, b) => PRIO_ORDER[a.prioridade] - PRIO_ORDER[b.prioridade])
  if (ord === "RECENTE")    return c.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return c
}

// ── Abas ──────────────────────────────────────────────────────────────────────
const TIPO_ABA = [
  { t: "DEMANDA" as Tipo, label: "Demandas", icon: Inbox,       cor: "bg-violet-600" },
  { t: "TAREFA"  as Tipo, label: "Tarefas",  icon: CheckSquare, cor: "bg-emerald-600" },
  { t: "IDEIA"   as Tipo, label: "Ideias",   icon: Lightbulb,   cor: "bg-amber-500" },
]

// ── Componente ────────────────────────────────────────────────────────────────
export default function RelatorioClient({
  demandas,
  tipo,
  counts,
}: {
  demandas:  DemandaRelatorio[]
  tipo:      Tipo
  counts:    Record<string, number>   // { DEMANDA: n, TAREFA: n, IDEIA: n }
}) {
  const router = useRouter()

  const [busca,        setBusca]        = useState("")
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS")
  const [filtroPrio,   setFiltroPrio]   = useState<string>("TODAS")
  const [ordenacao,    setOrdenacao]    = useState<Ordenacao>("PADRAO")
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())

  const hojeInicio = new Date(); hojeInicio.setHours(0, 0, 0, 0)
  const isVencida = (d: DemandaRelatorio) => {
    if (!d.prazo || d.status === "CONCLUIDA" || d.status === "CANCELADA") return false
    const prazoDia = new Date(d.prazo); prazoDia.setHours(0, 0, 0, 0)
    return prazoDia < hojeInicio
  }

  const filtradas = useMemo(() => ordenar(
    demandas.filter((d) => {
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
    }),
    ordenacao
  ), [demandas, filtroStatus, filtroPrio, busca, ordenacao])

  // Seleção
  const todosSelecionados = filtradas.length > 0 && filtradas.every((d) => selecionados.has(d.id))
  const algunsSelecionados = filtradas.some((d) => selecionados.has(d.id))

  function toggleAll() {
    if (todosSelecionados) {
      // desseleciona todos os filtrados, mantém os de outras páginas
      const novos = new Set(selecionados)
      filtradas.forEach((d) => novos.delete(d.id))
      setSelecionados(novos)
    } else {
      const novos = new Set(selecionados)
      filtradas.forEach((d) => novos.add(d.id))
      setSelecionados(novos)
    }
  }

  function toggleItem(id: number) {
    const novos = new Set(selecionados)
    if (novos.has(id)) novos.delete(id)
    else               novos.add(id)
    setSelecionados(novos)
  }

  // IDs selecionados que ainda existem na lista filtrada
  const idsSelecionados  = filtradas.filter((d) => selecionados.has(d.id)).map((d) => d.id)
  const totalSelecionado = selecionados.size

  const printUrl = `/relatorios/imprimir?ids=${Array.from(selecionados).join(",")}&tipo=${tipo}`

  const temFiltros = !!(busca.trim() || filtroStatus !== "TODOS" || filtroPrio !== "TODAS" || ordenacao !== "PADRAO")

  function limparFiltros() {
    setBusca("")
    setFiltroStatus("TODOS")
    setFiltroPrio("TODAS")
    setOrdenacao("PADRAO")
  }

  const EmptyIcon = tipo === "DEMANDA" ? Inbox : tipo === "TAREFA" ? CheckSquare : Lightbulb

  return (
    <div className="pb-32">

      {/* ── Abas de tipo ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1">
        {TIPO_ABA.map(({ t, label, icon: Icon, cor }) => (
          <button
            key={t}
            onClick={() => {
              setSelecionados(new Set())
              router.push(`/relatorios?tipo=${t}`)
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tipo === t
                ? `${cor} text-white`
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={15} strokeWidth={2} />
            {label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${
              tipo === t ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {counts[t] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar…"
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

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

        <div className="relative">
          <ArrowUpDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
            className="pl-7 pr-2.5 py-2 border border-slate-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="PADRAO">Padrão</option>
            <option value="PRAZO">Prazo mais próximo</option>
            <option value="PRIORIDADE">Prioridade</option>
            <option value="RECENTE">Mais recente</option>
          </select>
        </div>

        {temFiltros && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-500 bg-white hover:bg-slate-50 transition-colors"
          >
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      {/* ── Barra de seleção ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={toggleAll}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
              todosSelecionados
                ? "bg-violet-600 border-violet-600"
                : algunsSelecionados
                ? "bg-violet-200 border-violet-400"
                : "border-slate-300 hover:border-violet-400"
            }`}
          >
            {(todosSelecionados || algunsSelecionados) && (
              <span className="text-white text-[9px] font-bold leading-none">
                {todosSelecionados ? "✓" : "–"}
              </span>
            )}
          </div>
          <span className="text-sm text-slate-500">
            {todosSelecionados
              ? "Desselecionar todos"
              : `Selecionar todos (${filtradas.length})`}
          </span>
        </label>

        {totalSelecionado > 0 && (
          <button
            onClick={() => setSelecionados(new Set())}
            className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={11} strokeWidth={2} />
            Limpar seleção
          </button>
        )}
      </div>

      {/* Contador */}
      <p className="text-xs text-slate-400 mb-4">
        {filtradas.length} {filtradas.length === 1 ? "item" : "itens"}
        {filtradas.length !== demandas.length && ` de ${demandas.length}`}
        {totalSelecionado > 0 && (
          <span className="ml-2 text-violet-600 font-medium">· {totalSelecionado} selecionado{totalSelecionado !== 1 ? "s" : ""}</span>
        )}
      </p>

      {/* ── Lista vazia ──────────────────────────────────────────────────────── */}
      {filtradas.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <EmptyIcon size={36} className="mx-auto mb-3 opacity-30" strokeWidth={1.5} />
          {temFiltros ? (
            <>
              <p className="font-medium text-sm">Nenhum resultado para esses filtros</p>
              <button onClick={limparFiltros} className="text-xs mt-1 text-violet-600 hover:underline">Limpar filtros</button>
            </>
          ) : (
            <p className="font-medium text-sm">Nenhum item encontrado</p>
          )}
        </div>
      )}

      {/* ── Lista de itens ────────────────────────────────────────────────────── */}
      {filtradas.length > 0 && (
        <div className="space-y-2">
          {filtradas.map((d) => {
            const selecionado = selecionados.has(d.id)
            const vencida     = isVencida(d)
            const StatusIcon  = STATUS_ICON[d.status]
            const acoesFrac   = d.acoes.length > 0
              ? `${d.acoes.filter((a) => a.feita).length}/${d.acoes.length}`
              : null

            return (
              <div
                key={d.id}
                onClick={() => toggleItem(d.id)}
                className={`flex items-start gap-3 bg-white border rounded-xl px-4 py-3 cursor-pointer select-none transition-all ${
                  selecionado
                    ? "border-violet-400 bg-violet-50 shadow-sm"
                    : vencida
                    ? "border-red-200 hover:border-red-300"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Checkbox */}
                <div className={`shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  selecionado ? "bg-violet-600 border-violet-600" : "border-slate-300"
                }`}>
                  {selecionado && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{d.titulo}</p>

                  {d.descricao && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{d.descricao}</p>
                  )}

                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[d.status]}`}>
                      <StatusIcon size={10} strokeWidth={2.5} />
                      {STATUS_LABEL[d.status]}
                    </span>

                    <span className={`text-xs font-medium ${PRIO_COR[d.prioridade]}`}>
                      {PRIO_LABEL[d.prioridade]}
                    </span>

                    {vencida && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle size={10} strokeWidth={2.5} />
                        Prazo vencido
                      </span>
                    )}

                    {d.prazo && !vencida && (
                      <span className="text-xs text-slate-400">
                        {new Date(d.prazo).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </span>
                    )}

                    {acoesFrac && (
                      <span className="text-xs text-slate-400">✓ {acoesFrac} ações</span>
                    )}

                    {d.solicitanteNome && (
                      <span className="text-xs text-slate-400">por {d.solicitanteNome}</span>
                    )}

                    {d.aiProcessado && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-violet-500">
                        <Sparkles size={10} strokeWidth={2} /> IA
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Barra inferior fixa ──────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-20 border-t shadow-lg transition-all duration-200 ${
          totalSelecionado > 0
            ? "translate-y-0 bg-white"
            : "translate-y-full bg-white"
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-violet-600" strokeWidth={2} />
            <span className="text-sm font-medium text-slate-700">
              {totalSelecionado} {totalSelecionado === 1 ? "item selecionado" : "itens selecionados"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSelecionados(new Set())}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <a
              href={printUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Printer size={15} strokeWidth={2} />
              Gerar relatório
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
