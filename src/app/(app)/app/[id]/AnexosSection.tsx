"use client"

import { useRef, useState } from "react"
import { Paperclip, FileText, Image as ImageIcon, Table, File, Upload, Trash2, Download, Loader2 } from "lucide-react"

export type AnexoItem = {
  id:        number
  url:       string
  nome:      string
  tipo:      string
  tamanho:   number
  createdAt: string
  userId:    number
  user:      { name: string }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AnexoIcon({ tipo, className }: { tipo: string; className?: string }) {
  if (tipo.startsWith("image/"))            return <ImageIcon  size={16} strokeWidth={2} className={className} />
  if (tipo === "application/pdf")           return <FileText   size={16} strokeWidth={2} className={className} />
  if (tipo.includes("spreadsheet") || tipo.includes("excel")) return <Table size={16} strokeWidth={2} className={className} />
  if (tipo.includes("word") || tipo.includes("document"))     return <FileText size={16} strokeWidth={2} className={className} />
  return <File size={16} strokeWidth={2} className={className} />
}

const TIPOS_ACEITOS = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
].join(",")

export default function AnexosSection({
  demandaId,
  sessionUserId,
  initialAnexos,
}: {
  demandaId:     number
  sessionUserId: number
  initialAnexos: AnexoItem[]
}) {
  const [anexos,    setAnexos]    = useState<AnexoItem[]>(initialAnexos)
  const [uploading, setUploading] = useState(false)
  const [erro,      setErro]      = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // reset para permitir selecionar o mesmo arquivo novamente
    e.target.value = ""

    setErro(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)

      const res  = await fetch(`/api/demandas/${demandaId}/anexos`, { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? "Erro no upload."); return }

      setAnexos(prev => [...prev, data.anexo])
    } catch {
      setErro("Erro de rede ao enviar o arquivo.")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(anexo: AnexoItem) {
    if (!confirm(`Remover "${anexo.nome}"?`)) return
    const res = await fetch(`/api/demandas/${demandaId}/anexos/${anexo.id}`, { method: "DELETE" })
    if (res.ok) setAnexos(prev => prev.filter(a => a.id !== anexo.id))
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Paperclip size={15} strokeWidth={2} className="text-slate-400" />
          Anexos
          {anexos.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-normal">
              {anexos.length}
            </span>
          )}
        </h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium disabled:opacity-50 transition-colors"
        >
          {uploading
            ? <Loader2 size={13} strokeWidth={2} className="animate-spin" />
            : <Upload size={13} strokeWidth={2} />}
          {uploading ? "Enviando…" : "Adicionar arquivo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_ACEITOS}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Lista */}
      <div className="px-5 py-4">
        {erro && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{erro}</p>
        )}

        {anexos.length === 0 && !uploading ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Nenhum anexo. Adicione imagens, PDFs ou documentos.
          </p>
        ) : (
          <div className="space-y-2">
            {anexos.map(anexo => (
              <div
                key={anexo.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50 group"
              >
                {/* Thumbnail ou ícone */}
                {anexo.tipo.startsWith("image/") ? (
                  <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={anexo.url}
                      alt={anexo.nome}
                      className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                    />
                  </a>
                ) : (
                  <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                    <AnexoIcon tipo={anexo.tipo} className="text-slate-500" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{anexo.nome}</p>
                  <p className="text-xs text-slate-400">
                    {formatBytes(anexo.tamanho)} · {anexo.user.name} ·{" "}
                    {new Date(anexo.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={anexo.url}
                    download={anexo.nome}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    title="Baixar"
                  >
                    <Download size={14} strokeWidth={2} />
                  </a>
                  {anexo.userId === sessionUserId && (
                    <button
                      onClick={() => handleDelete(anexo)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tipos aceitos */}
        <p className="text-xs text-slate-300 mt-3">
          Aceita imagens, PDF, Word, Excel e TXT · máx. 10 MB por arquivo
        </p>
      </div>
    </div>
  )
}
