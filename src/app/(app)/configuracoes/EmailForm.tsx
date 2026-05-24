"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"

interface Props {
  currentEmail: string
  hasPassword:  boolean
}

export default function EmailForm({ currentEmail, hasPassword }: Props) {
  const [newEmail,  setNewEmail]  = useState("")
  const [password,  setPassword]  = useState("")
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [sent,      setSent]      = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch("/api/configuracoes/email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ newEmail, password: hasPassword ? password : undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Erro ao solicitar troca. Tente novamente.")
      } else {
        setSent(true)
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-5">E-mail</h2>

      {sent ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <CheckCircle size={18} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-sm font-medium text-blue-800">Verifique sua caixa de entrada</p>
              <p className="text-sm text-blue-700 mt-1">
                Enviamos um link de confirmação para <strong>{newEmail}</strong>. Clique nele para concluir a troca.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400">Verifique também a pasta de spam. O link expira em 24 horas.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-mail atual */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail atual</label>
            <div className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-500 bg-slate-50">
              {currentEmail}
            </div>
          </div>

          {/* Novo e-mail */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Novo e-mail</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="novo@email.com"
            />
          </div>

          {/* Senha atual (só para contas com senha) */}
          {hasPassword && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirme sua senha atual</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Enviando…" : "Solicitar troca de e-mail"}
          </button>
        </form>
      )}
    </div>
  )
}
