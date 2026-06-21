"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Mic, Square, ArrowLeft, Loader2, PenLine, Send, Zap, Sparkles,
  Plus, Trash2, X,
} from "lucide-react"
import { useSession } from "next-auth/react"
import TagInput from "@/components/TagInput"

type Modo = "voz" | "texto" | "manual"
type Tipo = "DEMANDA" | "TAREFA" | "IDEIA"
type Prio = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"

const TIPO_LABEL: Record<Tipo, string> = {
  DEMANDA: "Demanda",
  TAREFA:  "Tarefa",
  IDEIA:   "Ideia",
}

const PRIO_OPTS: { value: Prio; label: string }[] = [
  { value: "CRITICA", label: "Crítica" },
  { value: "ALTA",    label: "Alta"    },
  { value: "MEDIA",   label: "Média"   },
  { value: "BAIXA",   label: "Baixa"   },
]

export default function NovaCaptura() {
  const router             = useRouter()
  const searchParams       = useSearchParams()
  const { data: session }  = useSession()

  const tipoParam  = (searchParams.get("tipo") ?? "DEMANDA") as Tipo
  const modoParam  = searchParams.get("modo")

  // Quota de IA
  const aiQuota     = session?.user?.aiQuota ?? null
  const aiUsed      = session?.user?.aiUsedTotal ?? 0
  const aiBloqueado = aiQuota !== null && aiUsed >= aiQuota

  // Modo inicial: se AI bloqueada → manual; senão respeita URL param
  const modoInicial: Modo = aiBloqueado
    ? "manual"
    : modoParam === "manual" ? "manual"
    : modoParam === "texto"  ? "texto"
    : "voz"

  const [modo,      setModo]      = useState<Modo>(modoInicial)
  const [tipo,      setTipo]      = useState<Tipo>(tipoParam)

  // ── Campos comuns (voz/texto) ──────────────────────────────────────────────
  const [descricao, setDescricao] = useState("")
  const [gravando,  setGravando]  = useState(false)
  const [audioUrl,  setAudioUrl]  = useState<string | null>(null)
  const [tempo,     setTempo]     = useState(0)

  // ── Campos exclusivos do modo manual ──────────────────────────────────────
  const [titulo,         setTitulo]         = useState("")
  const [descManual,     setDescManual]     = useState("")
  const [manualPrio,     setManualPrio]     = useState<Prio>("MEDIA")
  const [manualPrazo,    setManualPrazo]    = useState("")
  const [manualSolic,    setManualSolic]    = useState("")
  const [manualDeleg,    setManualDeleg]    = useState("")
  const [manualAcoes,    setManualAcoes]    = useState<string[]>([])
  const [novaAcao,       setNovaAcao]       = useState("")
  const [tagsCaptura,    setTagsCaptura]    = useState<string[]>([])

  // ── Estado geral ──────────────────────────────────────────────────────────
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState<string | null>(null)

  const mediaRef     = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const timerRef     = useRef<NodeJS.Timeout | null>(null)
  const mimeRef      = useRef<string>("audio/webm")
  const inputAcaoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function trocaModo(novoModo: Modo) {
    setModo(novoModo)
    setTitulo("")
    setDescricao("")
    setDescManual("")
    setAudioUrl(null)
    setErro(null)
    setManualPrio("MEDIA")
    setManualPrazo("")
    setManualSolic("")
    setManualDeleg("")
    setManualAcoes([])
    setNovaAcao("")
    setTagsCaptura([])
  }

  // ── Ações manuais inline ──────────────────────────────────────────────────
  function adicionarAcao() {
    const t = novaAcao.trim()
    if (!t) return
    setManualAcoes((prev) => [...prev, t])
    setNovaAcao("")
    inputAcaoRef.current?.focus()
  }

  function removerAcao(idx: number) {
    setManualAcoes((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Gravação de voz ───────────────────────────────────────────────────────
  async function iniciarGravacao() {
    setErro(null)
    setAudioUrl(null)
    chunksRef.current = []
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4"
      mimeRef.current = mimeType

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        await uploadAudio(blob, mimeType)
      }
      mr.start(1000)
      setGravando(true)
      setTempo(0)
      timerRef.current = setInterval(() => setTempo((t) => t + 1), 1000)
    } catch {
      setErro("Permissão de microfone negada. Verifique as configurações do navegador.")
    }
  }

  function pararGravacao() {
    if (mediaRef.current && gravando) {
      mediaRef.current.stop()
      setGravando(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  async function uploadAudio(blob: Blob, mimeType: string) {
    setLoading(true)
    try {
      const ext = mimeType.includes("mp4") ? "mp4" : "webm"
      const fd  = new FormData()
      fd.append("audio", blob, `audio.${ext}`)
      const res  = await fetch("/api/upload/audio", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAudioUrl(data.url)
    } catch (e) {
      setErro("Erro ao enviar áudio. Tente novamente.")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // ── Submissão ─────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (modo === "manual") {
      if (!titulo.trim()) { setErro("Informe o título."); return }
    } else {
      if (!audioUrl && !descricao.trim()) { setErro("Grave um áudio ou escreva algo primeiro."); return }
    }

    setLoading(true)
    try {
      const body = modo === "manual"
        ? {
            manual:          true,
            titulo:          titulo.trim(),
            descricao:       descManual.trim() || undefined,
            tipo,
            prioridade:      manualPrio,
            prazo:           manualPrazo || null,
            solicitanteNome: manualSolic.trim() || null,
            delegadoNome:    manualDeleg.trim() || null,
            acoes:           manualAcoes,
            tags:            tagsCaptura,
          }
        : { audioUrl, descricao: descricao.trim() || undefined, tipo, tags: tagsCaptura }

      const res  = await fetch("/api/demandas", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/app/${data.demanda.id}`)
    } catch (e) {
      setErro(String(e) || "Erro ao criar. Tente novamente.")
      setLoading(false)
    }
  }

  const minutos  = String(Math.floor(tempo / 60)).padStart(2, "0")
  const segundos = String(tempo % 60).padStart(2, "0")

  const submitDisabled =
    loading || gravando ||
    (modo === "manual" ? !titulo.trim() : (!audioUrl && !descricao.trim()))

  return (
    <div className="p-4 md:p-8 max-w-xl">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/app"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Nova captura</h1>
      </div>

      {/* Banner IA bloqueada */}
      {aiBloqueado && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-amber-700">
          <Zap size={16} strokeWidth={2} className="shrink-0" />
          <span>Suas capturas com IA acabaram. Somente inserção manual disponível.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Seletor de tipo — só no modo manual (voz/texto: a IA classifica) */}
        {modo === "manual" && (
          <div className="flex gap-2">
            {(["DEMANDA", "TAREFA", "IDEIA"] as Tipo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tipo === t
                    ? t === "DEMANDA" ? "bg-violet-600 text-white"
                    : t === "TAREFA"  ? "bg-emerald-600 text-white"
                    :                   "bg-amber-500 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>
        )}

        {/* Toggle de modo (escondido quando IA bloqueada — só sobra manual) */}
        {!aiBloqueado && (
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            <ModoBtn
              ativo={modo === "voz"}
              onClick={() => trocaModo("voz")}
              icon={<Mic size={14} strokeWidth={2} />}
              label="Voz"
            />
            <ModoBtn
              ativo={modo === "texto"}
              onClick={() => trocaModo("texto")}
              icon={<Sparkles size={14} strokeWidth={2} />}
              label="Texto + IA"
            />
            <ModoBtn
              ativo={modo === "manual"}
              onClick={() => trocaModo("manual")}
              icon={<PenLine size={14} strokeWidth={2} />}
              label="Manual"
            />
          </div>
        )}

        {/* ── MODO VOZ ──────────────────────────────────────────────────────── */}
        {modo === "voz" && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4">
            {!audioUrl && !loading && (
              <>
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-colors ${
                  gravando ? "bg-red-100 animate-pulse" : "bg-violet-100"
                }`}>
                  {gravando
                    ? <Square size={28} className="text-red-600" strokeWidth={2} />
                    : <Mic    size={28} className="text-violet-600" strokeWidth={2} />
                  }
                </div>
                {gravando && (
                  <p className="text-red-600 font-mono text-lg font-bold">{minutos}:{segundos}</p>
                )}
                <p className="text-sm text-slate-500">
                  {gravando ? "Gravando… clique para parar" : "Clique para gravar"}
                </p>
                <button
                  type="button"
                  onClick={gravando ? pararGravacao : iniciarGravacao}
                  className={`px-6 py-2.5 rounded-xl font-medium text-sm text-white transition-colors ${
                    gravando ? "bg-red-500 hover:bg-red-600" : "bg-violet-600 hover:bg-violet-700"
                  }`}
                >
                  {gravando ? "Parar gravação" : "Iniciar gravação"}
                </button>
              </>
            )}

            {loading && !audioUrl && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 size={28} className="animate-spin text-violet-500" />
                <p className="text-sm text-slate-500">Enviando áudio…</p>
              </div>
            )}

            {audioUrl && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-emerald-600">✓ Áudio gravado</p>
                <audio controls src={audioUrl} className="w-full" />
                <button
                  type="button"
                  onClick={() => { setAudioUrl(null); setTempo(0) }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Regravar
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MODO TEXTO + IA ───────────────────────────────────────────────── */}
        {modo === "texto" && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descreva livremente — a IA vai estruturar
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={5}
              placeholder={
                tipo === "IDEIA"   ? "Ex: E se a gente criasse um dashboard de métricas por cliente..." :
                tipo === "TAREFA"  ? "Ex: Ligar para o banco para verificar o extrato da conta" :
                                    "Ex: João pediu para enviar o relatório mensal até sexta com urgência"
              }
              className="w-full text-sm text-gray-800 bg-white resize-none focus:outline-none placeholder:text-slate-300"
            />
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Sparkles size={11} />
              A IA extrai título, prioridade, prazo e próximas ações automaticamente.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Tags <span className="text-slate-400 font-normal">(opcional — a IA também sugere)</span>
              </label>
              <TagInput value={tagsCaptura} onChange={setTagsCaptura} placeholder="Ex.: financeiro, cliente joão…" />
            </div>
          </div>
        )}

        {/* ── MODO MANUAL ───────────────────────────────────────────────────── */}
        {(modo === "manual" || aiBloqueado) && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">

            {/* Título */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={500}
                required
                placeholder={
                  tipo === "IDEIA"  ? "Nome da ideia…" :
                  tipo === "TAREFA" ? "O que precisa fazer?" :
                                     "Resumo da demanda…"
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Descrição{" "}
                <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={descManual}
                onChange={(e) => setDescManual(e.target.value)}
                rows={3}
                placeholder="Contexto, observações, detalhes relevantes…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-300"
              />
            </div>

            {/* Prioridade + Prazo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Prioridade</label>
                <select
                  value={manualPrio}
                  onChange={(e) => setManualPrio(e.target.value as Prio)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {PRIO_OPTS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Prazo{" "}
                  <span className="text-slate-400 font-normal">(opcional)</span>
                  {manualPrazo && (
                    <button
                      type="button"
                      onClick={() => setManualPrazo("")}
                      className="text-slate-400 hover:text-red-500 ml-1.5"
                    >
                      <X size={10} className="inline" />
                    </button>
                  )}
                </label>
                <input
                  type="date"
                  value={manualPrazo}
                  onChange={(e) => setManualPrazo(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Solicitante + Delegado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Solicitante{" "}
                  <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={manualSolic}
                  onChange={(e) => setManualSolic(e.target.value)}
                  maxLength={200}
                  placeholder="Quem pediu…"
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Delegado para{" "}
                  <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={manualDeleg}
                  onChange={(e) => setManualDeleg(e.target.value)}
                  maxLength={200}
                  placeholder="Quem vai executar…"
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Próximas ações */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Próximas ações{" "}
                <span className="text-slate-400 font-normal">(opcional)</span>
              </label>

              {/* Lista das ações já adicionadas */}
              {manualAcoes.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {manualAcoes.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <div className="w-3.5 h-3.5 shrink-0 rounded border border-slate-300 mt-0.5" />
                      <span className="flex-1 text-sm text-slate-700 leading-snug">{a}</span>
                      <button
                        type="button"
                        onClick={() => removerAcao(idx)}
                        className="shrink-0 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remover"
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input para nova ação */}
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 shrink-0 rounded border border-slate-200 mt-0.5" />
                <input
                  ref={inputAcaoRef}
                  type="text"
                  value={novaAcao}
                  onChange={(e) => setNovaAcao(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); adicionarAcao() }
                  }}
                  maxLength={1000}
                  placeholder="Descreva uma ação e pressione Enter…"
                  className="flex-1 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={adicionarAcao}
                  disabled={!novaAcao.trim()}
                  className="shrink-0 p-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-40 transition-colors"
                  title="Adicionar ação"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Tags <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <TagInput value={tagsCaptura} onChange={setTagsCaptura} placeholder="Ex.: financeiro, cliente joão…" />
            </div>

          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={submitDisabled}
          className="w-full bg-violet-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {modo === "manual" ? "Salvando…" : "Analisando com IA…"}
            </>
          ) : (
            <>
              <Send size={16} strokeWidth={2} />
              Criar {TIPO_LABEL[tipo]}
            </>
          )}
        </button>

      </form>
    </div>
  )
}

// ── Botão de modo ─────────────────────────────────────────────────────────────
function ModoBtn({
  ativo, onClick, icon, label,
}: {
  ativo: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
        ativo ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
