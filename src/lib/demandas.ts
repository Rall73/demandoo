import type { DemandaTipo } from "@prisma/client"

export const TIPO_LABEL: Record<DemandaTipo, string> = {
  DEMANDA: "Demandas",
  TAREFA:  "Tarefas",
  IDEIA:   "Ideias",
}

export const TIPO_LABEL_SINGULAR: Record<DemandaTipo, string> = {
  DEMANDA: "Demanda",
  TAREFA:  "Tarefa",
  IDEIA:   "Ideia",
}

export const TIPO_CHIP: Record<DemandaTipo, string> = {
  DEMANDA: "bg-violet-100 text-violet-700 border border-violet-200",
  TAREFA:  "bg-emerald-100 text-emerald-700 border border-emerald-200",
  IDEIA:   "bg-amber-100 text-amber-700 border border-amber-200",
}

export const TIPO_ACCENT: Record<DemandaTipo, {
  text: string
  bg: string
  bgHover: string
  bgLight: string
  border: string
  ring: string
  iconText: string
}> = {
  DEMANDA: {
    text:     "text-violet-700",
    bg:       "bg-violet-600",
    bgHover:  "hover:bg-violet-700",
    bgLight:  "bg-violet-50",
    border:   "border-violet-200",
    ring:     "ring-violet-500",
    iconText: "text-violet-500",
  },
  TAREFA: {
    text:     "text-emerald-700",
    bg:       "bg-emerald-600",
    bgHover:  "hover:bg-emerald-700",
    bgLight:  "bg-emerald-50",
    border:   "border-emerald-200",
    ring:     "ring-emerald-500",
    iconText: "text-emerald-500",
  },
  IDEIA: {
    text:     "text-amber-700",
    bg:       "bg-amber-500",
    bgHover:  "hover:bg-amber-600",
    bgLight:  "bg-amber-50",
    border:   "border-amber-200",
    ring:     "ring-amber-500",
    iconText: "text-amber-500",
  },
}
