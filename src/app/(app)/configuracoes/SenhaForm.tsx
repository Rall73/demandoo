"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"

interface Props {
  hasPassword: boolean
}

export default function SenhaForm({ hasPassword }: Props) {
  const [currentPassword,  setCurrentPassword]  = useState("")
  const [newPassword,      setNewPassword]      = useState("")
  const [confirmPassword,  setConfirmPassword]  = useState("")
  const [showCurrent,      setShowCurrent]      = useState(false)
  const [showNew,          setShowNew]          = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState<string | null>(null)
  const [done,             setDone]             = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }
    if (newPassword.length < 8) {
      setError("A nova senha deve ter ao menos 8 caracteres.")
      return
    }

    setLoading(true)

    try {
      const res  = await fetch("/api/configuracoes/senha", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Erro ao atualizar senha. Tente novamente.")
      } else {
        setDone(true)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-1">
        {hasPassword ? "Alterar senha" : "Criar senha"}
      </h2>
      {!hasPassword && (
        <p className="text-sm text-slate-500 mb-5">
          Sua conta usa login com Google. Você pode criar uma senha para também entrar com e-mail e senha.
        </p>
      )}
      {hasPassword && <div className="mb-5" />}

      {done ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
          <CheckCircle size={15} />
          {hasPassword ? "Senha alterada com sucesso." : "Senha criada! Agora você pode entrar com e-mail e senha."}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Senha atual — só para quem já tem senha */}
          {hasPassword && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha atual</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Nova senha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {hasPassword ? "Nova senha" : "Senha"}
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirmar nova senha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Repita a senha"
            />
          </div>

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
            {loading ? "Salvando…" : hasPassword ? "Alterar senha" : "Criar senha"}
          </button>
        </form>
      )}
    </div>
  )
}
