"use client"

import Link from "next/link"
import type { DemandaTipo, DemandaStatus, DemandaPrioridade } from "@prisma/client"

interface Item {
  id:        number
  titulo:    string
  tipo:      DemandaTipo
  status:    DemandaStatus
  prioridade: DemandaPrioridade
  diaBrt:    string
}

const DOT_COLOR: Record<DemandaTipo, string> = {
  DEMANDA: "bg-violet-500",
  TAREFA:  "bg-emerald-500",
  IDEIA:   "bg-amber-500",
  DIARIO:  "bg-slate-400",
}
const PILL_CLASS: Record<DemandaTipo, string> = {
  DEMANDA: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
  TAREFA:  "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  IDEIA:   "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  DIARIO:  "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
}
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function CalendarioGrid({ ano, mes, items }: { ano: number; mes: number; items: Item[] }) {
  const primeiroDia  = new Date(Date.UTC(ano, mes - 1, 1))
  const ultimoDia    = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const startWeekday = primeiroDia.getUTCDay()

  const byDay: Record<string, Item[]> = {}
  for (const it of items) {
    if (!byDay[it.diaBrt]) byDay[it.diaBrt] = []
    byDay[it.diaBrt].push(it)
  }

  const hojeBrt = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)

  const cells: { day: number | null; key: string; iso: string | null }[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, key: `b-${i}`, iso: null })
  for (let d = 1; d <= ultimoDia; d++) {
    const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    cells.push({ day: d, key: iso, iso })
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, key: `e-${cells.length}`, iso: null })

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {DIAS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c) => {
          const dayItems = c.iso ? byDay[c.iso] ?? [] : []
          const isToday  = c.iso === hojeBrt
          return (
            <div key={c.key} className={`min-h-[90px] border-r border-b border-slate-100 p-1.5 ${
              c.day === null ? "bg-slate-50/40" : ""} ${isToday ? "bg-violet-50/50" : ""}`}>
              {c.day !== null && (
                <>
                  <div className={`text-xs font-semibold mb-1 ${isToday ? "text-violet-700" : "text-slate-500"}`}>
                    {c.day}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map((it) => (
                      <Link key={it.id} href={`/app/${it.id}`}
                        className={`block text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate transition-colors ${PILL_CLASS[it.tipo]} ${
                          it.status === "CONCLUIDA" || it.status === "CANCELADA" ? "line-through opacity-50" : ""}`}
                        title={it.titulo}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${DOT_COLOR[it.tipo]}`} />
                        {it.titulo}
                      </Link>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-[10px] text-slate-400 pl-1">+{dayItems.length - 3} mais</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Demanda</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Tarefa</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Ideia</span>
      </div>
    </div>
  )
}
