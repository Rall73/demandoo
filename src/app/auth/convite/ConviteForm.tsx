"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Users } from "lucide-react"

interface Props {
  token:       string
  email:       string
  companyName: string
}

export default function ConviteForm({ token, email, companyName }: Props) {
  const router = useRouter()

  const [name,     setName]     = useState("")
  const [password, setPassword] = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }
    if (password.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.")
      return
    }

    setLoading(true)
    try {
      const res  = await fetch("/api/auth/aceitar-convite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, name, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Erro ao aceitar convite.")
      } else {
        router.push("/auth/login?convite=aceito")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {/* Banner da empresa */}
      <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-5">
        <Users size={18} className="text-violet-600 shrink-0" strokeWidth={2} />
        <div>
          <p className="text-sm font-medium text-violet-800">Você foi convidado!</p>
          <p className="text-sm text-violet-700">
            Entre para a equipe <strong>{companyName}</strong>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* E-mail (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
          <div className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-500 bg-slate-50">
            {email}
          </div>
        </div>

        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Seu nome</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            minLength={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Nome completo"
          />
        </div>

        {/* Senha */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Criar senha</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Mínimo 8 caracteres"
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

        {/* Confirmar senha */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar senha</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
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
          className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? "Criando conta…" : "Entrar na equipe"}
        </button>
      </form>

      <p className="text-xs text-slate-400 text-center mt-4">
        Ao aceitar, você concorda com os termos de uso do demandoo.
      </p>
    </div>
  )
}
