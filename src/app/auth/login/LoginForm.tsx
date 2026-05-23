"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Inbox, Eye, EyeOff, Loader2 } from "lucide-react"

export default function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/app"

  const [email,      setEmail]      = useState("")
  const [password,   setPassword]   = useState("")
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleGoogle() {
    setLoadingGoogle(true)
    setError(null)
    await signIn("google", { callbackUrl })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)

    if (!res?.ok) {
      if (res?.error === "EMAIL_NOT_VERIFIED") {
        setError("Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.")
      } else if (res?.error === "ACCOUNT_INACTIVE") {
        setError("Conta inativa. Entre em contato com o suporte.")
      } else if (res?.error === "COMPANY_SUSPENDED") {
        setError("Conta suspensa. Entre em contato com o suporte.")
      } else {
        setError("E-mail ou senha incorretos.")
      }
      return
    }

    router.push(callbackUrl)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-600 rounded-2xl mb-4">
            <Inbox size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">demandoo</h1>
          <p className="text-slate-500 text-sm mt-1">Entre na sua conta</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Botão Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loadingGoogle || loading}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
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
            {loadingGoogle ? "Redirecionando…" : "Entrar com Google"}
          </button>

          {/* Divisor */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">ou</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Formulário e-mail/senha */}
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <div className="text-right mt-1">
                <Link href="/auth/esqueci-senha" className="text-xs text-violet-600 hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || loadingGoogle}
              className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Não tem conta?{" "}
          <Link href="/auth/cadastro" className="text-violet-600 font-medium hover:underline">
            Criar grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
