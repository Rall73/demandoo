"use client"

import { useState } from "react"
import { Loader2, UserMinus, X, Send, UserCheck, Clock, Users } from "lucide-react"
import Image from "next/image"

interface Member {
  id:        number
  name:      string
  email:     string
  role:      string
  avatarUrl: string | null
  createdAt: string
}

interface Invite {
  token:   string
  email:   string
  expires: string
}

interface Props {
  members:       Member[]
  pendingInvites: Invite[]
  maxUsers:      number
  currentUserId: number
}

function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  const initials = name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
  return url ? (
    <div className="relative rounded-full overflow-hidden bg-violet-100 shrink-0" style={{ width: size, height: size }}>
      <Image src={url} alt={name} fill className="object-cover" />
    </div>
  ) : (
    <div
      className="rounded-full bg-violet-100 text-violet-700 font-semibold flex items-center justify-center text-xs shrink-0"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}

export default function EquipeClient({ members: initial, pendingInvites: initialInvites, maxUsers, currentUserId }: Props) {
  const [members,  setMembers]  = useState<Member[]>(initial)
  const [invites,  setInvites]  = useState<Invite[]>(initialInvites)
  const [email,    setEmail]    = useState("")
  const [sending,  setSending]  = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const [canceling, setCanceling] = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  const totalSlots = members.length + invites.filter(i => new Date(i.expires) > new Date()).length
  const canInvite  = totalSlots < maxUsers

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSending(true)

    try {
      const res  = await fetch("/api/equipe/convite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Erro ao enviar convite.")
      } else {
        setSuccess(`Convite enviado para ${email}.`)
        setEmail("")
        // Recarrega dados
        const refreshed = await fetch("/api/equipe").then(r => r.json())
        setMembers(refreshed.members)
        setInvites(refreshed.pendingInvites)
      }
    } catch {
      setError("Erro de conexão.")
    } finally {
      setSending(false)
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!confirm("Remover este membro da equipe?")) return
    setRemoving(userId)
    try {
      const res = await fetch(`/api/equipe/${userId}`, { method: "DELETE" })
      if (res.ok) setMembers(prev => prev.filter(m => m.id !== userId))
      else {
        const data = await res.json()
        setError(data.error ?? "Erro ao remover membro.")
      }
    } finally {
      setRemoving(null)
    }
  }

  async function handleCancelInvite(token: string) {
    setCanceling(token)
    try {
      const res = await fetch(`/api/equipe/convite/${token}`, { method: "DELETE" })
      if (res.ok) setInvites(prev => prev.filter(i => i.token !== token))
    } finally {
      setCanceling(null)
    }
  }

  const activeInvites = invites.filter(i => new Date(i.expires) > new Date())

  return (
    <div className="space-y-6">
      {/* Resumo de slots */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Users size={15} className="text-violet-400" />
        <span>
          <strong className="text-slate-700">{members.length}</strong> de{" "}
          <strong className="text-slate-700">{maxUsers}</strong>{" "}
          {maxUsers === 1 ? "usuário" : "usuários"} utilizados
          {activeInvites.length > 0 && ` · ${activeInvites.length} convite${activeInvites.length !== 1 ? "s" : ""} pendente${activeInvites.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Formulário de convite */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Convidar membro</h2>

        {!canInvite ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3">
            Limite de {maxUsers} usuário{maxUsers !== 1 ? "s" : ""} atingido.{" "}
            <a href="/planos" className="font-medium underline">Faça upgrade</a> para convidar mais membros.
          </div>
        ) : (
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="email@exemplo.com"
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-violet-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-2 shrink-0"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? "Enviando…" : "Convidar"}
            </button>
          </form>
        )}

        {error   && <p className="text-red-600 text-sm mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-emerald-700 text-sm mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}
      </div>

      {/* Lista de membros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Membros ativos</h2>
        <ul className="space-y-3">
          {members.map(m => (
            <li key={m.id} className="flex items-center gap-3">
              <Avatar name={m.name} url={m.avatarUrl} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
                <p className="text-xs text-slate-400 truncate">{m.email}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                m.role === "ADMIN"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {m.role === "ADMIN" ? "Admin" : "Membro"}
              </span>
              {m.id !== currentUserId && m.role !== "ADMIN" && (
                <button
                  onClick={() => handleRemoveMember(m.id)}
                  disabled={removing === m.id}
                  className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
                  title="Remover membro"
                >
                  {removing === m.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : <UserMinus size={14} />
                  }
                </button>
              )}
              {m.id === currentUserId && (
                <span className="text-xs text-slate-400 shrink-0">você</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Convites pendentes */}
      {activeInvites.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Convites pendentes</h2>
          <ul className="space-y-3">
            {activeInvites.map(inv => (
              <li key={inv.token} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Clock size={14} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{inv.email}</p>
                  <p className="text-xs text-slate-400">
                    Expira em {new Date(inv.expires).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                  Aguardando
                </span>
                <button
                  onClick={() => handleCancelInvite(inv.token)}
                  disabled={canceling === inv.token}
                  className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
                  title="Cancelar convite"
                >
                  {canceling === inv.token
                    ? <Loader2 size={14} className="animate-spin" />
                    : <X size={14} />
                  }
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {members.length === 1 && activeInvites.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm">
          <UserCheck size={32} className="mx-auto mb-2 opacity-40" strokeWidth={1.5} />
          Você ainda não convidou nenhum membro. Convide sua equipe acima!
        </div>
      )}
    </div>
  )
}
