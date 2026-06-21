"use client"

import { useState, useEffect } from "react"
import { Tag as TagIcon } from "lucide-react"
import { TagBadge } from "./TagBadge"

// Normalização local espelhando src/lib/tags.ts (leve, sem import de server)
function norm(s: string): string {
  return s.replace(/^#+/, "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 50)
}

export default function TagInput({
  value, onChange, placeholder,
}: {
  value:        string[]
  onChange:     (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput]         = useState("")
  const [sugestoes, setSugestoes] = useState<{ nome: string; uso: number }[]>([])
  const [aberto, setAberto]       = useState(false)

  function addTag(raw: string) {
    const n = norm(raw)
    if (n && !value.includes(n)) onChange([...value, n])
    setInput("")
    setSugestoes([])
  }
  function removeTag(t: string) {
    onChange(value.filter((x) => x !== t))
  }

  // Autocomplete por empresa (debounce 200ms)
  useEffect(() => {
    const q = norm(input)
    if (!q) { setSugestoes([]); return }
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/tags?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        const data = await res.json()
        if (res.ok && Array.isArray(data.tags)) {
          setSugestoes(
            data.tags
              .filter((t: { nome: string }) => !value.includes(t.nome))
              .slice(0, 6),
          )
        }
      } catch { /* abort/erro silencioso */ }
    }, 200)
    return () => { clearTimeout(id); ctrl.abort() }
  }, [input, value])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      if (input.trim()) addTag(input)
    } else if (e.key === "Backspace" && !input && value.length) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 items-center border border-slate-200 rounded-lg px-2 py-2 bg-white focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-300">
        {value.map((t) => (
          <TagBadge key={t} nome={t} onRemove={() => removeTag(t)} />
        ))}
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setAberto(true) }}
          onKeyDown={onKeyDown}
          onFocus={() => setAberto(true)}
          onBlur={() => {
            // Confirma o texto pendente ao sair do campo (ex.: clicar em Salvar sem teclar Enter).
            // Clicar numa sugestão usa onMouseDown+preventDefault, então não dispara este blur.
            if (input.trim()) addTag(input)
            setTimeout(() => setAberto(false), 150)
          }}
          placeholder={value.length === 0 ? (placeholder ?? "Adicionar tags…") : ""}
          className="flex-1 min-w-[120px] outline-none text-sm text-gray-800 bg-white"
        />
      </div>

      {aberto && sugestoes.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {sugestoes.map((s) => (
            <button
              key={s.nome}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s.nome) }}
              className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-violet-50 flex items-center gap-2"
            >
              <TagIcon size={11} strokeWidth={2} className="text-violet-500" />
              {s.nome}
              <span className="ml-auto text-xs text-slate-400">{s.uso}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
