"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, ChevronRight, Printer,
  Phone, Mail, Users2, PenLine,
  Inbox, CheckSquare, Lightbulb,
  Clock, Trash2, Plus, Send, Loader2,
  AlertCircle, CheckCircle2, Timer,
  Pencil, X, Check,
} from "lucide-react"

// ── Tipos ─────────────────────────────────────────────────────────────────────

type EntradaTipo = "TELEFONEMA" | "EMAIL" | "REUNIAO" | "NOTA"

export type DemandaHoje = {
  id:         number
  titulo:     string
  tipo:       string
  status:     string
  prioridade: string
}

export type AcaoHoje = {
  id:        number
  descricao: string
  feita:     boolean
  demanda:   { id: number; titulo: string; tipo: string }
}

export type EntradaDiario = {
  id:        number
  conteudo:  string
  tipo:      string
  createdAt: string
}

export type ResumoTempo = {
  demandaId: number
  titulo:    string
  tipo:      string
  totalMin:  number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDias(iso: string, dias: number): string {
  const d = new Date(iso + "T12:00:00Z")
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

function formatMin(min: number): string {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatHoraBRT(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour:     "2-digit",
    minute:   "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}

// ── Constantes visuais ────────────────────────────────────────────────────────

const ENTRADA_CONFIG: Record<EntradaTipo, { label: string; icon: typeof Phone; cor: string; bg: string; pill: string }> = {
  TELEFONEMA: { label: "Telefonema", icon: Phone,   cor: "text-sky-700",     bg: "bg-sky-50    border-sky-200",     pill: "bg-sky-100    text-sky-700" },
  EMAIL:      { label: "E-mail",     icon: Mail,    cor: "text-violet-700",  bg: "bg-violet-50 border-violet-200",  pill: "bg-violet-100 text-violet-700" },
  REUNIAO:    { label: "Reunião",    icon: Users2,  cor: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",pill: "bg-emerald-100 text-emerald-700" },
  NOTA:       { label: "Nota",       icon: PenLine, cor: "text-amber-700",   bg: "bg-amber-50  border-amber-200",   pill: "bg-amber-100  text-amber-700" },
}

const TIPO_DEMANDA: Record<string, { icon: typeof Inbox; cor: string }> = {
  DEMANDA: { icon: Inbox,       cor: "bg-violet-100 text-violet-700" },
  TAREFA:  { icon: CheckSquare, cor: "bg-emerald-100 text-emerald-700" },
  IDEIA:   { icon: Lightbulb,   cor: "bg-amber-100 text-amber-700" },
}

const PRIO_DOT: Record<string, string> = {
  BAIXA: "bg-slate-300", MEDIA: "bg-yellow-400",
  ALTA:  "bg-orange-500", CRITICA: "bg-red-600",
}
const PRIO_COR: Record<string, string> = {
  BAIXA: "text-slate-400", MEDIA: "text-yellow-600",
  ALTA:  "text-orange-600", CRITICA: "text-red-600",
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DiarioClient({
  dataISO,
  dataFormatada,
  diarioId,
  prevData,
  ehUltimoDia,
  demandasHoje: demandasIniciais,
  acoesHoje:    acoesIniciais,
  comentariosIniciais,
  resumoTempo,
}: {
  dataISO:             string
  dataFormatada:       string
  diarioId:            number
  prevData:            string | null
  ehUltimoDia:         boolean
  demandasHoje:        DemandaHoje[]
  acoesHoje:           AcaoHoje[]
  comentariosIniciais: EntradaDiario[]
  resumoTempo:         ResumoTempo[]
}) {
  const router      = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editRef     = useRef<HTMLTextAreaElement>(null)

  const [entradas,    setEntradas]    = useState<EntradaDiario[]>(comentariosIniciais)
  const [acoes,       setAcoes]       = useState<AcaoHoje[]>(acoesIniciais)
  const [tipoNovo,    setTipoNovo]    = useState<EntradaTipo>("NOTA")
  const [textoNovo,   setTextoNovo]   = useState("")
  const [loadingAdd,  setLoadingAdd]  = useState(false)
  const [loadingDel,  setLoadingDel]  = useState<number | null>(null)
  const [loadingDem,  setLoadingDem]  = useState<number | null>(null)
  const [loadingAcao, setLoadingAcao] = useState<number | null>(null)

  // estado de edição
  const [editandoId,   setEditandoId]   = useState<number | null>(null)
  const [editTexto,    setEditTexto]    = useState("")
  const [loadingEdit,  setLoadingEdit]  = useState(false)

  const nextData     = addDias(dataISO, 1)
  const totalMinHoje = resumoTempo.reduce((acc, r) => acc + r.totalMin, 0)

  // foca no textarea de edição quando abre
  useEffect(() => { if (editandoId !== null) editRef.current?.focus() }, [editandoId])

  // scroll para o fim da timeline ao adicionar nova entrada
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [entradas.length])

  // ── Adicionar entrada ─────────────────────────────────────────────────────

  async function adicionarEntrada() {
    const texto = textoNovo.trim()
    if (!texto || loadingAdd) return

    const agora = new Date().toISOString()
    const temp: EntradaDiario = { id: -Date.now(), conteudo: texto, tipo: tipoNovo, createdAt: agora }
    setEntradas((prev) => [...prev, temp])
    setTextoNovo("")
    setLoadingAdd(true)

    try {
      const res  = await fetch(`/api/demandas/${diarioId}/comentarios`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ conteudo: texto, tipo: tipoNovo }),
      })
      const data = await res.json()
      if (res.ok && data.comentario) {
        setEntradas((prev) =>
          prev.map((e) =>
            e.id === temp.id
              ? { id: data.comentario.id, conteudo: data.comentario.conteudo, tipo: data.comentario.tipo, createdAt: data.comentario.createdAt }
              : e
          )
        )
      } else {
        setEntradas((prev) => prev.filter((e) => e.id !== temp.id))
      }
    } catch {
      setEntradas((prev) => prev.filter((e) => e.id !== temp.id))
    } finally {
      setLoadingAdd(false)
      textareaRef.current?.focus()
    }
  }

  // ── Iniciar edição ────────────────────────────────────────────────────────

  function iniciarEdicao(e: EntradaDiario) {
    setEditandoId(e.id)
    setEditTexto(e.conteudo)
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setEditTexto("")
  }

  async function salvarEdicao(id: number) {
    const texto = editTexto.trim()
    if (!texto || loadingEdit) return
    setLoadingEdit(true)
    // otimista
    setEntradas((prev) => prev.map((e) => e.id === id ? { ...e, conteudo: texto } : e))
    setEditandoId(null)
    try {
      const res = await fetch(`/api/demandas/${diarioId}/comentarios/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ conteudo: texto }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // reverte se falhou — rebusca o conteúdo original
      setEntradas(comentariosIniciais)
    } finally {
      setLoadingEdit(false)
    }
  }

  // ── Excluir entrada ───────────────────────────────────────────────────────

  async function excluirEntrada(id: number) {
    if (editandoId === id) cancelarEdicao()
    setLoadingDel(id)
    setEntradas((prev) => prev.filter((e) => e.id !== id))
    try {
      await fetch(`/api/demandas/${diarioId}/comentarios/${id}`, { method: "DELETE" })
    } catch {
      // já removido da UI
    } finally {
      setLoadingDel(null)
    }
  }

  // ── Criar demanda a partir de entrada ─────────────────────────────────────

  async function criarDemanda(entrada: EntradaDiario) {
    setLoadingDem(entrada.id)
    try {
      const res  = await fetch("/api/demandas", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ manual: true, titulo: entrada.conteudo.slice(0, 80), descricao: entrada.conteudo }),
      })
      const data = await res.json()
      if (res.ok) router.push(`/app/${data.demanda.id}`)
    } finally {
      setLoadingDem(null)
    }
  }

  // ── Toggle de ação ────────────────────────────────────────────────────────

  async function toggleAcao(acao: AcaoHoje) {
    setLoadingAcao(acao.id)
    setAcoes((prev) => prev.map((a) => a.id === acao.id ? { ...a, feita: !a.feita } : a))
    try {
      await fetch(`/api/demandas/${acao.demanda.id}/acoes/${acao.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ feita: !acao.feita }),
      })
    } catch {
      setAcoes((prev) => prev.map((a) => a.id === acao.id ? { ...a, feita: acao.feita } : a))
    } finally {
      setLoadingAcao(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full p-4 md:p-8 max-w-7xl">

      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Anterior — só exibe se houver dia com registro */}
          {prevData ? (
            <Link
              href={`/app/diario?data=${prevData}`}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              title="Dia anterior com registros"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </Link>
          ) : (
            <span className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-300 cursor-not-allowed">
              <ChevronLeft size={16} strokeWidth={2} />
            </span>
          )}

          <div>
            <h1 className="text-xl font-bold text-slate-900 capitalize">{dataFormatada}</h1>
            {ehUltimoDia && (
              <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                Hoje
              </span>
            )}
          </div>

          {/* Próximo — bloqueado se já é hoje */}
          {!ehUltimoDia ? (
            <Link
              href={`/app/diario?data=${nextData}`}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              title="Próximo dia"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </Link>
          ) : (
            <span className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-300 cursor-not-allowed" title="Você está no dia de hoje">
              <ChevronRight size={16} strokeWidth={2} />
            </span>
          )}
        </div>

        <Link
          href={`/diario/${dataISO}/imprimir`}
          target="_blank"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <Printer size={14} strokeWidth={2} />
          Imprimir
        </Link>
      </div>

      {/* ── Dois painéis ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-5 flex-1 min-h-0">

        {/* ── Painel esquerdo: compromissos ─────────────────────────────── */}
        <div className="md:w-2/5 flex flex-col gap-4 overflow-y-auto">

          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <Clock size={12} strokeWidth={2.5} />
              Vence hoje
            </h2>
            {demandasIniciais.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhum item com prazo hoje.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {demandasIniciais.map((d) => {
                  const cfg  = TIPO_DEMANDA[d.tipo] ?? TIPO_DEMANDA.DEMANDA
                  const Icon = cfg.icon
                  return (
                    <Link
                      key={d.id}
                      href={`/app/${d.id}`}
                      className="group flex items-start gap-2.5 bg-white border border-slate-200 rounded-xl p-3 hover:border-violet-300 hover:shadow-sm transition-all"
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md shrink-0 mt-0.5 ${cfg.cor}`}>
                        <Icon size={12} strokeWidth={2.5} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 group-hover:text-violet-700 leading-snug truncate">
                          {d.titulo}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${PRIO_DOT[d.prioridade] ?? "bg-slate-300"}`} />
                          <span className={`text-xs font-medium ${PRIO_COR[d.prioridade] ?? "text-slate-400"}`}>
                            {d.prioridade.charAt(0) + d.prioridade.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {acoes.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 size={12} strokeWidth={2.5} />
                Ações de hoje
              </h2>
              <div className="flex flex-col gap-2">
                {acoes.map((a) => {
                  const cfg  = TIPO_DEMANDA[a.demanda.tipo] ?? TIPO_DEMANDA.DEMANDA
                  const Icon = cfg.icon
                  return (
                    <div
                      key={a.id}
                      className={`flex items-start gap-2.5 bg-white border rounded-xl p-3 transition-all ${a.feita ? "border-slate-100 opacity-50" : "border-slate-200"}`}
                    >
                      <button
                        onClick={() => toggleAcao(a)}
                        disabled={loadingAcao === a.id}
                        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                          a.feita ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400"
                        }`}
                      >
                        {loadingAcao === a.id
                          ? <Loader2 size={10} className="animate-spin text-slate-400" />
                          : a.feita && <CheckCircle2 size={10} strokeWidth={2.5} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${a.feita ? "line-through text-slate-400" : "text-slate-800"}`}>
                          {a.descricao}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${cfg.cor}`}>
                          <Icon size={9} strokeWidth={2.5} />
                          {a.demanda.titulo.slice(0, 30)}{a.demanda.titulo.length > 30 ? "…" : ""}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {resumoTempo.length > 0 && (
            <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Timer size={12} strokeWidth={2.5} />
                Tempo de foco hoje
              </h2>
              <div className="text-2xl font-bold text-slate-800 mb-3">
                {formatMin(totalMinHoje)}
              </div>
              <div className="flex flex-col gap-2">
                {resumoTempo.map((r) => {
                  const pct  = totalMinHoje > 0 ? Math.round((r.totalMin / totalMinHoje) * 100) : 0
                  const cfg  = TIPO_DEMANDA[r.tipo] ?? TIPO_DEMANDA.DEMANDA
                  const Icon = cfg.icon
                  return (
                    <div key={r.demandaId} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`inline-flex items-center justify-center w-4 h-4 rounded shrink-0 ${cfg.cor}`}>
                            <Icon size={9} strokeWidth={2.5} />
                          </span>
                          <span className="text-xs text-slate-700 truncate">{r.titulo}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 shrink-0">{formatMin(r.totalMin)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── Painel direito: timeline ──────────────────────────────────── */}
        <div className="md:w-3/5 flex flex-col min-h-0 border border-slate-200 rounded-2xl overflow-hidden bg-white">

          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-700">Registros do dia</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {entradas.length === 0 ? "Nenhum registro ainda." : `${entradas.length} ${entradas.length === 1 ? "registro" : "registros"}`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {entradas.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <PenLine size={20} strokeWidth={1.5} className="text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">
                  Registre telefonemas, e-mails, reuniões e notas do dia.
                </p>
              </div>
            )}

            {entradas.map((e) => {
              const tipo      = (e.tipo in ENTRADA_CONFIG ? e.tipo : "NOTA") as EntradaTipo
              const cfg       = ENTRADA_CONFIG[tipo]
              const Icon      = cfg.icon
              const isPending = e.id < 0
              const isEditing = editandoId === e.id

              return (
                <div
                  key={e.id}
                  className={`group border rounded-xl p-3.5 transition-all ${cfg.bg} ${isPending ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cfg.pill}`}>
                      <Icon size={14} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-bold ${cfg.cor}`}>{cfg.label}</span>
                        <span className="text-xs text-slate-400">{formatHoraBRT(e.createdAt)}</span>
                      </div>

                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            ref={editRef}
                            value={editTexto}
                            onChange={(ev) => setEditTexto(ev.target.value)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) salvarEdicao(e.id)
                              if (ev.key === "Escape") cancelarEdicao()
                            }}
                            rows={3}
                            className="w-full resize-none border border-slate-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => salvarEdicao(e.id)}
                              disabled={!editTexto.trim() || loadingEdit}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors disabled:opacity-40"
                            >
                              {loadingEdit ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2.5} />}
                              Salvar
                            </button>
                            <button
                              onClick={cancelarEdicao}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
                            >
                              <X size={11} strokeWidth={2} />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                          {e.conteudo}
                        </p>
                      )}
                    </div>

                    {!isPending && !isEditing && (
                      <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => criarDemanda(e)}
                          disabled={loadingDem === e.id}
                          title="Criar demanda a partir deste registro"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-violet-600 hover:bg-white/60 transition-colors disabled:opacity-50"
                        >
                          {loadingDem === e.id ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} strokeWidth={2.5} />}
                          Demanda
                        </button>
                        <button
                          onClick={() => iniciarEdicao(e)}
                          title="Editar"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-violet-600 transition-colors"
                        >
                          <Pencil size={11} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => excluirEntrada(e.id)}
                          disabled={loadingDel === e.id}
                          title="Excluir"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {loadingDel === e.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} strokeWidth={2} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Formulário de nova entrada */}
          <div className="border-t border-slate-100 p-3">
            <div className="flex gap-1.5 mb-2.5 flex-wrap">
              {(Object.keys(ENTRADA_CONFIG) as EntradaTipo[]).map((t) => {
                const cfg  = ENTRADA_CONFIG[t]
                const Icon = cfg.icon
                const ativo = tipoNovo === t
                return (
                  <button
                    key={t}
                    onClick={() => setTipoNovo(t)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      ativo
                        ? `${cfg.pill} border-transparent shadow-sm`
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={10} strokeWidth={2.5} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={textoNovo}
                onChange={(e) => setTextoNovo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) adicionarEntrada() }}
                placeholder={`Registrar ${ENTRADA_CONFIG[tipoNovo].label.toLowerCase()}… (Ctrl+Enter para salvar)`}
                rows={2}
                className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 placeholder:text-slate-400"
              />
              <button
                onClick={adicionarEntrada}
                disabled={!textoNovo.trim() || loadingAdd}
                className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {loadingAdd ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={2} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
              Passe o mouse sobre um registro para editar, criar demanda ou excluir.
            </p>
          </div>
        </div>
      </div>

      {resumoTempo.length === 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <AlertCircle size={13} strokeWidth={2} className="shrink-0" />
          Nenhuma sessão de foco registrada hoje. Use a aba Foco para rastrear o tempo trabalhado em cada item.
        </div>
      )}
    </div>
  )
}
