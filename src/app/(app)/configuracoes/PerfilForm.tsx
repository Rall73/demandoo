"use client"

import { useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Camera, Loader2, CheckCircle, User } from "lucide-react"
import Image from "next/image"

interface Props {
  initialName:      string
  initialAvatarUrl: string | null
}

export default function PerfilForm({ initialName, initialAvatarUrl }: Props) {
  const { update } = useSession()

  const [name,      setName]      = useState(initialName)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [preview,   setPreview]   = useState<string | null>(null)
  const [pending,   setPending]   = useState<File | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem (JPG, PNG, etc.).")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.")
      return
    }
    setError(null)
    setPending(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      let finalAvatarUrl = avatarUrl

      // Upload do avatar se houver arquivo pendente
      if (pending) {
        const fd = new FormData()
        fd.append("avatar", pending)
        const res  = await fetch("/api/upload/avatar", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Falha no upload da imagem.")
        finalAvatarUrl = data.url
        setAvatarUrl(data.url)
        setPreview(null)
        setPending(null)
      }

      // Atualiza nome
      const res  = await fetch("/api/configuracoes/perfil", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar.")

      // Atualiza o token JWT sem forçar logout
      await update({ name: data.name, avatarUrl: finalAvatarUrl })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const displaySrc = preview ?? avatarUrl
  const initials   = name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-5">Perfil</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative shrink-0 w-16 h-16 rounded-full overflow-hidden bg-violet-100 ring-2 ring-violet-200 hover:ring-violet-400 transition-all group"
            title="Trocar foto"
          >
            {displaySrc ? (
              <Image src={displaySrc} alt="Avatar" fill className="object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-violet-700 font-semibold text-lg">
                {initials || <User size={24} />}
              </span>
            )}
            <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </span>
          </button>
          <div>
            <p className="text-sm font-medium text-slate-700">Foto de perfil</p>
            <p className="text-xs text-slate-400 mt-0.5">JPG ou PNG, máx. 5 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            minLength={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Seu nome completo"
          />
        </div>

        {/* Feedback */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
            <CheckCircle size={15} />
            Perfil atualizado com sucesso.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? "Salvando…" : "Salvar perfil"}
        </button>
      </form>
    </div>
  )
}
