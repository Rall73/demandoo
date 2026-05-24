"use client"

import { useState } from "react"
import Link from "next/link"
import { Inbox, Loader2, ArrowLeft } from "lucide-react"

export default function EsqueciSenhaForm() {
  const [email,   setEmail]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/esqueci-senha", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Erro ao enviar. Tente novamente.")
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-600 rounded-2xl mb-4">
            <Inbox size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">demandoo</h1>
          <p className="text-slate-500 text-sm mt-1">Recuperar acesso</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {sent ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-slate-700">
                Se existe uma conta com esse e-mail, você receberá um link para redefinir sua senha em instantes.
              </p>
              <p className="text-xs text-slate-400">Verifique também a pasta de spam.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <p className="text-sm text-slate-600 mb-4">
                Digite seu e-mail e enviaremos um link para criar uma nova senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="seu@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? "Enviando…" : "Enviar link de recuperação"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link href="/auth/login" className="inline-flex items-center gap-1 text-violet-600 hover:underline">
            <ArrowLeft size={14} />
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
