import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Check, Zap, Users, Star, ArrowRight, MessageCircle } from "lucide-react"
import Link from "next/link"
import { hojeNoBrasil } from "@/lib/date"

// ─── Configuração visual de cada plano ────────────────────────────────────────

const PLAN_UI: Record<string, {
  emoji:       string
  color:       string
  badgeBg:     string
  badgeText:   string
  borderClass: string
  highlight:   boolean
  features:    string[]
  cta:         string
  ctaHref:     string
  ctaStyle:    string
}> = {
  free: {
    emoji:       "🌱",
    color:       "slate",
    badgeBg:     "bg-slate-100",
    badgeText:   "text-slate-600",
    borderClass: "border-slate-200",
    highlight:   false,
    features: [
      "20 capturas com IA",
      "1 usuário",
      "Captura por voz e texto",
      "Demandas, tarefas e ideias",
      "Calendário e export .ics",
    ],
    cta:      "Plano atual",
    ctaHref:  "#",
    ctaStyle: "bg-slate-100 text-slate-500 cursor-default",
  },
  trial: {
    emoji:       "⏳",
    color:       "blue",
    badgeBg:     "bg-blue-100",
    badgeText:   "text-blue-700",
    borderClass: "border-blue-200",
    highlight:   false,
    features: [
      "100 capturas com IA",
      "Até 5 usuários",
      "Acesso completo durante o trial",
      "Captura por voz e texto",
      "Demandas, tarefas e ideias",
      "Calendário e export .ics",
    ],
    cta:      "Período de teste ativo",
    ctaHref:  "#",
    ctaStyle: "bg-blue-100 text-blue-600 cursor-default",
  },
  basic: {
    emoji:       "🚀",
    color:       "violet",
    badgeBg:     "bg-violet-100",
    badgeText:   "text-violet-700",
    borderClass: "border-violet-300",
    highlight:   true,
    features: [
      "200 capturas com IA por mês",
      "Até 5 usuários",
      "Captura por voz e texto",
      "Demandas, tarefas e ideias",
      "Calendário e export .ics",
      "Delegação de demandas",
      "Suporte por e-mail",
    ],
    cta:      "Assinar Básico",
    ctaHref:  "#contato",
    ctaStyle: "bg-violet-600 text-white hover:bg-violet-700",
  },
  complete: {
    emoji:       "⭐",
    color:       "violet",
    badgeBg:     "bg-violet-900",
    badgeText:   "text-violet-100",
    borderClass: "border-violet-400",
    highlight:   false,
    features: [
      "500 capturas com IA por mês",
      "Até 20 usuários",
      "Captura por voz e texto",
      "Demandas, tarefas e ideias",
      "Calendário e export .ics",
      "Delegação de demandas",
      "Lembretes de prazo por e-mail",
      "Convite de equipe",
      "Suporte prioritário",
    ],
    cta:      "Assinar Completo",
    ctaHref:  "#contato",
    ctaStyle: "bg-violet-900 text-white hover:bg-violet-800",
  },
}

// Ordena slugs na exibição
const SLUG_ORDER = ["free", "basic", "complete"]

// ─── Componente principal ──────────────────────────────────────────────────────

export default async function PlanosPage() {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  const currentSlug = session.user.planSlug

  // Trial: calcula dias restantes
  let trialDias: number | null = null
  if (currentSlug === "trial" && session.user.planExpiresAt) {
    const hoje = hojeNoBrasil()
    const diff = Math.ceil(
      (new Date(session.user.planExpiresAt).getTime() - hoje.getTime()) / 86400000
    )
    trialDias = Math.max(0, diff)
  }

  // Busca planos do banco
  const plans = await prisma.plan.findMany({
    where:   { active: true, slug: { in: SLUG_ORDER } },
    orderBy: { id: "asc" },
  })

  // Ordena conforme SLUG_ORDER
  const sortedPlans = SLUG_ORDER
    .map(slug => plans.find(p => p.slug === slug))
    .filter(Boolean) as typeof plans

  return (
    <div className="p-4 md:p-8 max-w-5xl">

      {/* Cabeçalho */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-2xl font-bold text-slate-900">Planos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Escolha o plano ideal para você e sua equipe.
        </p>
      </div>

      {/* Banner trial ativo */}
      {currentSlug === "trial" && trialDias !== null && (
        <div className={`mb-8 rounded-xl border px-5 py-4 flex items-center gap-4 text-sm ${
          trialDias <= 3
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-blue-50 border-blue-200 text-blue-700"
        }`}>
          <Zap size={18} className="shrink-0" />
          <span>
            Seu período de teste{" "}
            {trialDias === 0
              ? "expira hoje"
              : `expira em ${trialDias} dia${trialDias !== 1 ? "s" : ""}`}.{" "}
            Escolha um plano para continuar com acesso completo.
          </span>
        </div>
      )}

      {/* Cards dos planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sortedPlans.map(plan => {
          const ui         = PLAN_UI[plan.slug] ?? PLAN_UI.free
          const isCurrent  = plan.slug === currentSlug ||
                             (currentSlug === "trial" && plan.slug === "free")
          const isHighlight = ui.highlight

          return (
            <div
              key={plan.slug}
              className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col gap-5 transition-shadow hover:shadow-md ${
                isHighlight ? "border-violet-400 shadow-violet-100 shadow-md" : ui.borderClass
              }`}
            >
              {/* Badge popular */}
              {isHighlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={11} fill="white" />
                    Mais popular
                  </span>
                </div>
              )}

              {/* Cabeçalho do card */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ui.badgeBg} ${ui.badgeText}`}>
                    {ui.emoji} {plan.name}
                  </span>
                  {isCurrent && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Plano atual
                    </span>
                  )}
                </div>

                {/* Preço */}
                <div className="mt-4">
                  {plan.priceCents === 0 ? (
                    <p className="text-3xl font-bold text-slate-900">
                      Grátis
                    </p>
                  ) : (
                    <div className="flex items-end gap-1">
                      <p className="text-3xl font-bold text-slate-900">
                        R$ {(plan.priceCents / 100).toFixed(0).replace(".", ",")}
                      </p>
                      <span className="text-slate-400 text-sm mb-1">/mês</span>
                    </div>
                  )}
                </div>

                {/* Destaques rápidos */}
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Zap size={12} className="text-violet-400" />
                    {plan.aiQuota === null ? "IA ilimitada" : `${plan.aiQuota} IA/mês`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-violet-400" />
                    {plan.maxUsers === 1 ? "1 usuário" : `Até ${plan.maxUsers} usuários`}
                  </span>
                </div>
              </div>

              {/* Funcionalidades */}
              <ul className="space-y-2 flex-1">
                {ui.features.map(feat => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" strokeWidth={2.5} />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className={`w-full text-center py-2.5 rounded-xl text-sm font-medium ${ui.ctaStyle}`}>
                  {ui.cta}
                </div>
              ) : (
                <a
                  href={ui.ctaHref}
                  className={`w-full text-center py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${ui.ctaStyle}`}
                >
                  {ui.cta}
                  <ArrowRight size={14} />
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* Seção de contato / billing futuro */}
      <div id="contato" className="mt-12 bg-violet-50 border border-violet-200 rounded-2xl p-6 md:p-8 text-center">
        <MessageCircle size={28} className="text-violet-500 mx-auto mb-3" strokeWidth={1.5} />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Quer fazer upgrade?</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
          O pagamento online estará disponível em breve. Por enquanto, fale conosco diretamente
          e ativamos o seu plano manualmente.
        </p>
        <a
          href="mailto:contato@demandoo.net"
          className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <MessageCircle size={15} />
          Falar com a equipe demandoo
        </a>
        <p className="text-xs text-slate-400 mt-3">contato@demandoo.net</p>
      </div>

      {/* Comparação de quota de IA */}
      <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Zap size={15} className="text-violet-500" />
          O que conta como captura com IA?
        </h2>
        <ul className="space-y-1.5 text-sm text-slate-500">
          <li className="flex items-center gap-2"><Check size={13} className="text-emerald-500" strokeWidth={2.5} /> Captura por voz (transcrição + estruturação)</li>
          <li className="flex items-center gap-2"><Check size={13} className="text-emerald-500" strokeWidth={2.5} /> Captura por texto com IA (estruturação automática)</li>
          <li className="flex items-center gap-2 text-slate-400"><span className="w-3.5 text-center">—</span> Captura manual não consome quota de IA</li>
        </ul>
      </div>

      <p className="text-xs text-slate-400 text-center mt-6">
        Precisa de algo diferente?{" "}
        <a href="mailto:contato@demandoo.net" className="text-violet-500 hover:underline">
          Fale conosco
        </a>{" "}
        e montamos um plano personalizado.
      </p>
    </div>
  )
}
