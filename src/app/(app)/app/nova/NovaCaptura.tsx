"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Mic, MicOff, Square, ArrowLeft, Loader2, PenLine, Send, Zap } from "lucide-react"
import { useSession } from "next-auth/react"

type Modo = "voz" | "texto"
type Tipo = "DEMANDA" | "TAREFA" | "IDEIA"

const TIPO_LABEL: Record<Tipo, string> = {
  DEMANDA: "Demanda",
  TAREFA:  "Tarefa",
  IDEIA:   "Ideia",
}

export default function NovaCaptura() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const tipoParam = (searchParams.get("tipo") ?? "DEMANDA") as Tipo
  const modoParam = searchParams.get("modo") === "texto" ? "texto" : "voz"

  const [modo,      setModo]      = useState<Modo>(modoParam)
  const [tipo,      setTipo]      = useState<Tipo>(tipoParam)
  const [descricao, setDescricao] = useState("")
  const [gravando,  setGravando]  = useState(false)
  const [audioUrl,  setAudioUrl]  = useState<string | null>(null)
  const [tempo,     setTempo]     = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState<string | null>(null)

  const mediaRef    = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const timerRef    = useRef<NodeJS.Timeout | null>(null)

  // Quota de IA
  const aiQuota    = session?.user?.aiQuota ?? null
  const aiUsed     = session?.user?.aiUsedTotal ?? 0
  const aiBloqueado = aiQuota !== null && aiUsed >= aiQuota

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function iniciarGravacao() {
    setErro(null)
    setAudioUrl(null)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        await uploadAudio(blob)
      }
      mr.start()
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

  async function uploadAudio(blob: Blob) {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("audio", blob, "audio.webm")
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!audioUrl && !descricao.trim()) {
      setErro("Grave um áudio ou escreva algo primeiro.")
      return
    }
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch("/api/demandas", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ audioUrl, descricao: descricao || undefined, tipo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/app/${data.demanda.id}`)
    } catch (e) {
      setErro(String(e) || "Erro ao criar. Tente novamente.")
      setLoading(false)
    }
  }

  const minutos = String(Math.floor(tempo / 60)).padStart(2, "0")
  const segundos = String(tempo % 60).padStart(2, "0")

  return (
    <div className="p-4 md:p-8 max-w-xl">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
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

        {/* Tipo */}
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
                  : "bg-amber-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {TIPO_LABEL[t]}
            </button>
          ))}
        </div>

        {/* Toggle modo */}
        {!aiBloqueado && (
          <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setModo("voz"); setDescricao(""); setAudioUrl(null) }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                modo === "voz" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Mic size={15} strokeWidth={2} /> Voz
            </button>
            <button
              type="button"
              onClick={() => { setModo("texto"); setAudioUrl(null) }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                modo === "texto" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <PenLine size={15} strokeWidth={2} /> Texto
            </button>
          </div>
        )}

        {/* Voz */}
        {modo === "voz" && !aiBloqueado && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4">
            {!audioUrl && !loading && (
              <>
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-colors ${
                  gravando ? "bg-red-100 animate-pulse" : "bg-violet-100"
                }`}>
                  {gravando
                    ? <Square size={28} className="text-red-600" strokeWidth={2} />
                    : <Mic size={28} className="text-violet-600" strokeWidth={2} />
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

        {/* Texto */}
        {(modo === "texto" || aiBloqueado) && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {aiBloqueado ? "Descreva manualmente" : "O que precisa registrar?"}
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={5}
              placeholder={
                tipo === "IDEIA"
                  ? "Ex: E se a gente criasse um dashboard de métricas por cliente..."
                  : tipo === "TAREFA"
                  ? "Ex: Ligar para o banco para verificar o extrato da conta"
                  : "Ex: João pediu para enviar o relatório mensal até sexta com urgência"
              }
              className="w-full text-sm text-gray-800 bg-white resize-none focus:outline-none placeholder:text-slate-300"
            />
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || gravando || (!audioUrl && !descricao.trim())}
          className="w-full bg-violet-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Analisando com IA…</>
            : <><Send size={16} strokeWidth={2} /> Criar {TIPO_LABEL[tipo]}</>
          }
        </button>
      </form>
    </div>
  )
}
