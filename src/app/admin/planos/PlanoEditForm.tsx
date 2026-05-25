"use client"

import { useState } from "react"
import { Pencil, Check, X, Loader2 } from "lucide-react"

interface Plano {
  id: number
  slug: string
  name: string
  priceCents: number
  aiQuota: number | null
  maxUsers: number
  active: boolean
}

export default function PlanoEditForm({ plano }: { plano: Plano }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:       plano.name,
    priceCents: String(plano.priceCents),
    aiQuota:    plano.aiQuota === null ? "" : String(plano.aiQuota),
    maxUsers:   String(plano.maxUsers),
    active:     plano.active,
  })
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch(`/api/admin/planos/${plano.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:       form.name.trim(),
          priceCents: Number(form.priceCents),
          aiQuota:    form.aiQuota === "" ? null : Number(form.aiQuota),
          maxUsers:   Number(form.maxUsers),
          active:     form.active,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? "Erro ao salvar")
      }
      setEditing(false)
      window.location.reload()
    } catch (e) {
      setErro(String(e))
    } finally {
      setLoading(false)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
        title="Editar plano"
      >
        <Pencil size={14} strokeWidth={2} />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-sm shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Editar plano <span className="text-violet-600">{plano.slug}</span></h2>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-700">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Preço (centavos)</label>
              <input
                type="number" min="0"
                value={form.priceCents}
                onChange={(e) => setForm((f) => ({ ...f, priceCents: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-400 mt-0.5">
                R$ {(Number(form.priceCents) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max usuários</label>
              <input
                type="number" min="1"
                value={form.maxUsers}
                onChange={(e) => setForm((f) => ({ ...f, maxUsers: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Quota IA <span className="text-slate-400">(vazio = ilimitada)</span>
            </label>
            <input
              type="number" min="0"
              value={form.aiQuota}
              onChange={(e) => setForm((f) => ({ ...f, aiQuota: e.target.value }))}
              placeholder="ilimitada"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`active-${plano.id}`}
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 rounded text-violet-600"
            />
            <label htmlFor={`active-${plano.id}`} className="text-sm text-slate-600">Plano ativo</label>
          </div>
        </div>

        {erro && <p className="text-xs text-red-500">{erro}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={salvar}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
            Salvar
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
