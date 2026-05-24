import Link from "next/link"
import { Zap, ArrowUpRight, Clock } from "lucide-react"
import { hojeNoBrasil } from "@/lib/date"

interface Props {
  planSlug:      string
  planName:      string
  aiQuota:       number | null
  aiUsedTotal:   number
  planExpiresAt: Date | null
}

const PLAN_CONFIG: Record<string, { label: string; badgeClass: string; desc: string }> = {
  free:     { label: "Gratuito",         badgeClass: "bg-slate-100 text-slate-600",         desc: "Acesso básico com quota de IA limitada." },
  trial:    { label: "Período de Teste", badgeClass: "bg-blue-100 text-blue-700",           desc: "Acesso completo durante o período de avaliação." },
  basic:    { label: "Plano Básico",     badgeClass: "bg-violet-100 text-violet-700",       desc: "Plano pago com quota de IA ampliada." },
  complete: { label: "Plano Completo",   badgeClass: "bg-violet-900 text-violet-100",       desc: "Acesso completo a todas as funcionalidades." },
}

export default function PlanoCard({ planSlug, planName, aiQuota, aiUsedTotal, planExpiresAt }: Props) {
  const config = PLAN_CONFIG[planSlug] ?? {
    label:      planName,
    badgeClass: "bg-slate-100 text-slate-600",
    desc:       "",
  }

  // Dias restantes para trial
  let diasRestantes: number | null = null
  if (planSlug === "trial" && planExpiresAt) {
    const hoje = hojeNoBrasil()
    const diff = Math.ceil((planExpiresAt.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000))
    diasRestantes = Math.max(0, diff)
  }

  // Quota de IA
  const aiRestante   = aiQuota !== null ? Math.max(0, aiQuota - aiUsedTotal) : null
  const aiPercUsado  = aiQuota !== null ? Math.min(100, Math.round((aiUsedTotal / aiQuota) * 100)) : 0
  const aiBloqueado  = aiQuota !== null && aiUsedTotal >= aiQuota

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-5">Seu plano</h2>

      <div className="space-y-4">
        {/* Badge do plano */}
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.badgeClass}`}>
            {config.label}
          </span>
          {planSlug === "trial" && diasRestantes !== null && (
            <span className={`flex items-center gap-1 text-xs font-medium ${diasRestantes <= 3 ? "text-red-600" : "text-blue-600"}`}>
              <Clock size={12} />
              {diasRestantes === 0 ? "Expira hoje" : `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""}`}
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500">{config.desc}</p>

        {/* Quota de IA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Zap size={14} className="text-violet-500" />
              Quota de IA
            </span>
            {aiQuota === null ? (
              <span className="text-emerald-600 font-medium text-xs">Ilimitada</span>
            ) : (
              <span className={`text-xs font-medium ${aiBloqueado ? "text-red-600" : "text-slate-500"}`}>
                {aiUsedTotal} / {aiQuota} usados
              </span>
            )}
          </div>

          {aiQuota !== null && (
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  aiBloqueado ? "bg-red-500" : aiPercUsado >= 70 ? "bg-amber-500" : "bg-violet-500"
                }`}
                style={{ width: `${aiPercUsado}%` }}
              />
            </div>
          )}

          {aiBloqueado && (
            <p className="text-xs text-red-600">Quota esgotada. Faça upgrade para continuar usando IA.</p>
          )}
          {!aiBloqueado && aiRestante !== null && aiRestante <= Math.ceil((aiQuota ?? 0) * 0.3) && (
            <p className="text-xs text-amber-600">{aiRestante} créditos restantes. Considere fazer upgrade.</p>
          )}
        </div>

        {/* CTA upgrade */}
        {planSlug !== "complete" && (
          <Link
            href="/planos"
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 font-medium hover:underline mt-1"
          >
            Ver planos e fazer upgrade
            <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
    </div>
  )
}
