"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Mic, Square, Send, Loader2, Trash2, Sparkles,
  MessageSquare, AlertTriangle, FileText, Check, Pencil, X,
} from "lucide-react"

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface ComentarioItem {
  id:        number
  conteudo:  string
  audioUrl:  string | null
  tipo:      "NOTA" | "AUDIO" | "STATUS"
  createdAt: string
  user:      { name: string }
}

interface Props {
  demandaId:         number
  initialComentarios: ComentarioItem[]
  relatorioGerado:   string | null
  relatorioGeradoAt: string | null
  aiBloqueado:       boolean
  tipo:              string
}

// ── Ícone e cor por tipo de comentário ────────────────────────────────────────
function TipoIcon({ tipo }: { tipo: string }) {
  if (tipo === "STATUS")
    return <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
      <AlertTriangle size={13} className="text-slate-400" strokeWidth={2} />
    </div>
  if (tipo === "AUDIO")
    return <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
      <Mic size={13} className="text-violet-500" strokeWidth={2} />
    </div>
  return <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
    <MessageSquare size={13} className="text-blue-500" strokeWidth={2} />
  </div>
}

function dataRelativa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return "agora"
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h  < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d  < 7)  return `há ${d} dia${d > 1 ? "s" : ""}`
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

// ── Markdown simples (negrito, itálico, listas, títulos) ──────────────────────
function MarkdownSimples({ texto }: { texto: string }) {
  const linhas = texto.split("\n")
  return (
    <div className="space-y-1.5">
      {linhas.map((linha, i) => {
        if (!linha.trim()) return <div key={i} className="h-2" />
        if (linha.startsWith("## "))
          return <h3 key={i} className="text-sm font-bold text-slate-800 mt-3 first:mt-0">{linha.replace("## ", "")}</h3>
        if (linha.startsWith("# "))
          return <h2 key={i} className="text-base font-bold text-slate-900 mt-3 first:mt-0">{linha.replace("# ", "")}</h2>
        if (linha.startsWith("- ") || linha.startsWith("* "))
          return (
            <div key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span dangerouslySetInnerHTML={{ __html: inlineFormato(linha.replace(/^[-*] /, "")) }} />
            </div>
          )
        return (
          <p key={i} className="text-sm text-slate-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: inlineFormato(linha) }} />
        )
      })}
    </div>
  )
}

function inlineFormato(t: string): string {
  return t
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ComentariosSection({
  demandaId,
  initialComentarios,
  relatorioGerado,
  relatorioGeradoAt,
  aiBloqueado,
  tipo,
}: Props) {
  const router = useRouter()

  // Comentários
  const [comentarios,    setComentarios]    = useState<ComentarioItem[]>(initialComentarios)
  const [novoTexto,      setNovoTexto]      = useState("")
  const [salvando,       setSalvando]       = useState(false)
  const [deletandoId,    setDeletandoId]    = useState<number | null>(null)

  // Gravação de áudio
  const [gravando,       setGravando]       = useState(false)
  const [processandoAudio, setProcessandoAudio] = useState(false)
  const [tempo,          setTempo]          = useState(0)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<NodeJS.Timeout | null>(null)
  const mimeRef   = useRef<string>("audio/webm")

  // Relatório IA
  const [relatorio,      setRelatorio]      = useState<string | null>(relatorioGerado)
  const [relatorioAt,    setRelatorioAt]    = useState<string | null>(relatorioGeradoAt)
  const [gerandoRel,     setGerandoRel]     = useState(false)
  const [editandoRel,    setEditandoRel]    = useState(false)
  const [tmpRelatorio,   setTmpRelatorio]   = useState("")
  const [salvandoRel,    setSalvandoRel]    = useState(false)
  const [relatorioErro,  setRelatorioErro]  = useState<string | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // ── Adicionar nota de texto ───────────────────────────────────────────────
  async function enviarTexto() {
    const texto = novoTexto.trim()
    if (!texto) return
    setSalvando(true)
    setNovoTexto("")

    const res  = await fetch(`/api/demandas/${demandaId}/comentarios`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ conteudo: texto, tipo: "NOTA" }),
    })
    const data = await res.json()
    if (data.comentario) {
      setComentarios((prev) => [...prev, data.comentario])
    }
    setSalvando(false)
    router.refresh()
  }

  // ── Gravação de áudio ─────────────────────────────────────────────────────
  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime   = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
      mimeRef.current = mime
      const rec    = new MediaRecorder(stream, { mimeType: mime })
      mediaRef.current  = rec
      chunksRef.current = []

      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop          = finalizarGravacao
      rec.start()
      setGravando(true)
      setTempo(0)
      timerRef.current = setInterval(() => setTempo((t) => t + 1), 1000)
    } catch {
      alert("Não foi possível acessar o microfone.")
    }
  }

  function pararGravacao() {
    mediaRef.current?.stop()
    mediaRef.current?.stream?.getTracks().forEach((t) => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    setGravando(false)
    setProcessandoAudio(true)
  }

  const finalizarGravacao = useCallback(async () => {
    const blob = new Blob(chunksRef.current, { type: mimeRef.current })
    if (blob.size < 1000) { setProcessandoAudio(false); return }

    const formData = new FormData()
    formData.append("audio", blob, "audio.webm")

    const uploadRes = await fetch("/api/upload/audio", { method: "POST", body: formData })
    const { url }   = await uploadRes.json()
    if (!url) { setProcessandoAudio(false); return }

    const res  = await fetch(`/api/demandas/${demandaId}/comentarios`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ audioUrl: url, tipo: "AUDIO" }),
    })
    const data = await res.json()
    if (data.comentario) {
      setComentarios((prev) => [...prev, data.comentario])
    }
    setProcessandoAudio(false)
    router.refresh()
  }, [demandaId, router])

  // ── Excluir comentário ────────────────────────────────────────────────────
  async function excluir(id: number) {
    setDeletandoId(id)
    await fetch(`/api/demandas/${demandaId}/comentarios/${id}`, { method: "DELETE" })
    setComentarios((prev) => prev.filter((c) => c.id !== id))
    setDeletandoId(null)
    router.refresh()
  }

  // ── Gerar relatório IA ────────────────────────────────────────────────────
  async function gerarRelatorio() {
    setGerandoRel(true)
    setRelatorioErro(null)
    const res  = await fetch(`/api/demandas/${demandaId}/relatorio`, { method: "POST" })
    const data = await res.json()
    if (res.ok && data.relatorio) {
      setRelatorio(data.relatorio)
      setRelatorioAt(new Date().toISOString())
    } else if (data.error === "Quota de IA esgotada") {
      setRelatorioErro("Quota de IA esgotada. Faça upgrade do plano para gerar relatórios.")
    } else {
      setRelatorioErro("Erro ao gerar relatório. Tente novamente.")
    }
    setGerandoRel(false)
  }

  // ── Salvar edição do relatório ────────────────────────────────────────────
  async function salvarRelatorio() {
    setSalvandoRel(true)
    await fetch(`/api/demandas/${demandaId}/relatorio`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ relatorioGerado: tmpRelatorio }),
    })
    setRelatorio(tmpRelatorio)
    setEditandoRel(false)
    setSalvandoRel(false)
  }

  const tempoStr = `${Math.floor(tempo / 60).toString().padStart(2, "0")}:${(tempo % 60).toString().padStart(2, "0")}`

  return (
    <>
      {/* ── Histórico de comentários ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <p className="text-sm font-semibold text-slate-700 mb-4">Histórico</p>

        {/* Timeline */}
        {comentarios.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Nenhuma atualização ainda. Adicione uma nota abaixo.
          </p>
        ) : (
          <div className="space-y-3 mb-4">
            {comentarios.map((c) => (
              <div key={c.id} className="flex gap-3 group">
                <TipoIcon tipo={c.tipo} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-slate-600">{c.user.name}</span>
                    <span className="text-xs text-slate-400">{dataRelativa(c.createdAt)}</span>
                    {c.tipo === "STATUS" && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        status
                      </span>
                    )}
                    {c.tipo === "AUDIO" && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-500">
                        áudio
                      </span>
                    )}
                  </div>

                  <p className={`text-sm leading-snug ${
                    c.tipo === "STATUS" ? "text-slate-500 italic" : "text-slate-700"
                  }`}>
                    {c.conteudo}
                  </p>

                  {c.audioUrl && (
                    <audio
                      controls
                      src={c.audioUrl}
                      className="mt-1.5 h-8 w-full max-w-xs"
                    />
                  )}
                </div>

                {/* Excluir (só NOTA e AUDIO, não STATUS) */}
                {c.tipo !== "STATUS" && (
                  <button
                    onClick={() => excluir(c.id)}
                    disabled={deletandoId === c.id}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all disabled:opacity-40 mt-0.5"
                    title="Excluir"
                  >
                    {deletandoId === c.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} strokeWidth={2} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Input de nova nota ────────────────────────────────────────────── */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex gap-2 items-end">
            <textarea
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviarTexto()
              }}
              placeholder="Adicionar observação… (Ctrl+Enter para enviar)"
              rows={2}
              disabled={gravando || processandoAudio}
              className="flex-1 resize-none text-sm text-gray-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-50"
            />

            <div className="flex flex-col gap-1.5">
              {/* Enviar texto */}
              <button
                onClick={enviarTexto}
                disabled={!novoTexto.trim() || salvando || gravando || processandoAudio}
                className="p-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Enviar nota (Ctrl+Enter)"
              >
                {salvando
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Send size={15} strokeWidth={2} />}
              </button>

              {/* Gravar áudio */}
              {!gravando && !processandoAudio && (
                <button
                  onClick={iniciarGravacao}
                  disabled={salvando}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300 transition-colors disabled:opacity-40"
                  title="Gravar nota de voz"
                >
                  <Mic size={15} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* Estado de gravação */}
          {(gravando || processandoAudio) && (
            <div className="mt-2 flex items-center gap-3">
              {gravando ? (
                <>
                  <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Gravando {tempoStr}
                  </div>
                  <button
                    onClick={pararGravacao}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Square size={11} strokeWidth={2.5} fill="currentColor" />
                    Parar
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Loader2 size={13} className="animate-spin" />
                  Transcrevendo áudio…
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Relatório IA ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-violet-600" strokeWidth={2} />
            <p className="text-sm font-semibold text-slate-700">Relatório</p>
          </div>
          {relatorioAt && !editandoRel && (
            <span className="text-xs text-slate-400">
              gerado {dataRelativa(relatorioAt)}
            </span>
          )}
        </div>

        {/* Erro */}
        {relatorioErro && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
            {relatorioErro}
          </p>
        )}

        {/* Relatório gerado — visualização */}
        {relatorio && !editandoRel && (
          <div className="mt-3">
            <div className="bg-slate-50 rounded-xl p-4 mb-3 border border-slate-100">
              <MarkdownSimples texto={relatorio} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setTmpRelatorio(relatorio); setEditandoRel(true) }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 transition-colors"
              >
                <Pencil size={12} strokeWidth={2} />
                Editar
              </button>
              <a
                href={`/relatorios/imprimir?ids=${demandaId}&tipo=${tipo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 transition-colors"
              >
                <FileText size={12} strokeWidth={2} />
                Imprimir
              </a>
              <button
                onClick={gerarRelatorio}
                disabled={gerandoRel || aiBloqueado}
                className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 transition-colors disabled:opacity-40"
                title="Gerar novo relatório (substitui o atual)"
              >
                {gerandoRel
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Sparkles size={12} strokeWidth={2} />}
                Regenerar
              </button>
            </div>
          </div>
        )}

        {/* Editor de relatório */}
        {editandoRel && (
          <div className="mt-3">
            <textarea
              value={tmpRelatorio}
              onChange={(e) => setTmpRelatorio(e.target.value)}
              rows={16}
              className="w-full text-sm text-gray-800 bg-white border border-violet-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono leading-relaxed"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={salvarRelatorio}
                disabled={salvandoRel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {salvandoRel
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Check size={12} strokeWidth={2.5} />}
                Salvar
              </button>
              <button
                onClick={() => { setEditandoRel(false); setTmpRelatorio("") }}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X size={12} strokeWidth={2} className="inline mr-1" />
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Sem relatório ainda */}
        {!relatorio && !editandoRel && (
          <div className="mt-3">
            <p className="text-sm text-slate-400 mb-3">
              A IA vai analisar o histórico completo — abertura, atualizações, ações e status — e gerar um relatório editável.
            </p>
            <button
              onClick={gerarRelatorio}
              disabled={gerandoRel || aiBloqueado}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                aiBloqueado
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-violet-600 text-white hover:bg-violet-700"
              }`}
            >
              {gerandoRel
                ? <><Loader2 size={15} className="animate-spin" /> Gerando…</>
                : <><Sparkles size={15} strokeWidth={2} /> Gerar relatório com IA</>}
            </button>
            {aiBloqueado && (
              <p className="text-xs text-slate-400 mt-1.5">
                Quota de IA esgotada.{" "}
                <a href="/planos" className="text-violet-600 hover:underline">Fazer upgrade</a>
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
