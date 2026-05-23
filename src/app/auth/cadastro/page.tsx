"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Inbox, Loader2, CheckCircle2 } from "lucide-react"

export default function CadastroPage() {
  const [name,          setName]          = useState("")
  const [email,         setEmail]         = useState("")
  const [password,      setPassword]      = useState("")
  const [lgpdConsent,   setLgpdConsent]   = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [success,       setSuccess]       = useState(false)

  async function handleGoogle() {
    setLoadingGoogle(true)
    setError(null)
    await signIn("google", { callbackUrl: "/app" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lgpdConsent) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade.")
      return
    }
    setLoading(true)
    setError(null)

    const res = await fetch("/api/auth/cadastro", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, password, lgpdConsent }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Erro ao criar conta. Tente novamente.")
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Verifique seu e-mail</h2>
          <p className="text-slate-500 text-sm">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Clique no link para ativar sua conta.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-violet-600 font-medium text-sm hover:underline"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-600 rounded-2xl mb-4">
            <Inbox size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Criar conta grátis</h1>
          <p className="text-slate-500 text-sm mt-1">15 capturas com IA incluídas</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* Botão Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loadingGoogle || loading}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 mb-4"
          >
            {loadingGoogle ? (
              <Loader2 size={18} className="animate-spin text-slate-400" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5L31.8 34c-2 1.4-4.6 2-7.8 2-5.2 0-9.6-3.4-11.3-8.1l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.4-2.4 4.4-4.5 5.8l6.7 5.2C41.3 35.3 44 30 44 24c0-1.3-.1-2.7-.4-4z"/>
              </svg>
            )}
            {loadingGoogle ? "Redirecionando…" : "Cadastrar com Google"}
          </button>

          {/* Divisor */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">ou cadastre com e-mail</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="sr-only">{/* form fields below */}</div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Seu nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="João Silva"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="mínimo 8 caracteres"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={lgpdConsent}
              onChange={(e) => setLgpdConsent(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-xs text-slate-600">
              Li e aceito os{" "}
              <Link href="/termos-de-uso" target="_blank" className="text-violet-600 underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/politica-de-privacidade" target="_blank" className="text-violet-600 underline">
                Política de Privacidade
              </Link>
              , incluindo o tratamento dos meus dados conforme a LGPD.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || loadingGoogle}
            className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Criando conta…" : "Criar conta grátis"}
          </button>
        </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Já tem conta?{" "}
          <Link href="/auth/login" className="text-violet-600 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
