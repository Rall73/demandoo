import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Check, Zap, Users, Star, ArrowRight, MessageCircle, User } from "lucide-react"
import { hojeNoBrasil } from "@/lib/date"

// ─── Configuração visual por slug ─────────────────────────────────────────────

interface PlanUI {
  emoji:       string
  badgeBg:     string
  badgeText:   string
  borderClass: string
  highlight:   boolean
  features:    string[]
  cta:         string
  ctaStyle:    string
}

const PLAN_UI: Record<string, PlanUI> = {
  free: {
    emoji: "🌱", badgeBg: "bg-slate-100", badgeText: "text-slate-600",
    borderClass: "border-slate-200", highlight: false,
    features: [
      "20 capturas com IA",
      "1 usuário",
      "Captura por voz e texto",
      "Demandas, tarefas e ideias",
      "Calendário e export .ics",
    ],
    cta: "Plano gratuito", ctaStyle: "bg-slate-100 text-slate-500 cursor-default",
  },
  basic: {
    emoji: "🚀", badgeBg: "bg-violet-100", badgeText: "text-violet-700",
    borderClass: "border-violet-200", highlight: false,
    features: [
      "200 capturas com IA por mês",
      "1 usuário",
      "Captura por voz e texto",
      "Demandas, tarefas e ideias",
      "Calendário e export .ics",
      "Delegação de demandas",
      "Suporte por e-mail",
    ],
    cta: "Assinar Básico", ctaStyle: "bg-violet-600 text-white hover:bg-violet-700",
  },
  complete: {
    emoji: "⭐", badgeBg: "bg-violet-900", badgeText: "text-violet-100",
    borderClass: "border-violet-400", highlight: true,
    features: [
      "500 capturas com IA por mês",
      "1 usuário",
      "Captura por voz e texto",
      "Demandas, tarefas e ideias",
      "Calendário e export .ics",
      "Delegação de demandas",
      "Lembretes de prazo por e-mail",
      "Suporte prioritário",
    ],
    cta: "Assinar Completo", ctaStyle: "bg-violet-900 text-white hover:bg-violet-800",
  },
  basic_equipe: {
    emoji: "👥", badgeBg: "bg-emerald-100", badgeText: "text-emerald-700",
    borderClass: "border-emerald-200", highlight: false,
    features: [
      "500 capturas com IA por mês",
      "Até 5 usuários",
      "Captura por voz e texto",
      "Demandas, tarefas e ideias",
      "Calendário e export .ics",
      "Convite e gestão de equipe",
      "Delegação entre membros",
      "Suporte por e-mail",
    ],
    cta: "Assinar Básico Equipe", ctaStyle: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  complete_equipe: {
    emoji: "🏢", badgeBg: "bg-emerald-800", badgeText: "text-emerald-100",
    borderClass: "border-emerald-400", highlight: true,
    features: [
      "1.500 capturas com IA por mês",
      "Até 20 usuários",
      "Captura por voz e texto",
      "Demandas, tarefas e ideias",
      "Calendário e export .ics",
      "Convite e gestão de equipe",
      "Delegação entre membros",
      "Lembretes de prazo por e-mail",
      "Suporte prioritário",
    ],
    cta: "Assinar Completo Equipe", ctaStyle: "bg-emerald-800 text-white hover:bg-emerald-700",
  },
}

const INDIVIDUAL_SLUGS = ["free", "basic", "complete"]
const EQUIPE_SLUGS     = ["basic_equipe", "complete_equipe"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number) {
  if (cents === 0) return { value: "Grátis", period: "" }
  return { value: `R$ ${(cents / 100).toFixed(0)}`, period: "/mês" }
}

// ─── Componente de card de plano ──────────────────────────────────────────────

function PlanCard({
  plan,
  ui,
  isCurrent,
}: {
  plan: { slug: string; name: string; priceCents: number; aiQuota: number | null; maxUsers: number }
  ui: PlanUI
  isCurrent: boolean
}) {
  const price = formatPrice(plan.priceCents)

  return (
    <div className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md ${
      ui.highlight ? "border-violet-400 shadow-md" : ui.borderClass
    }`}>
      {ui.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
            <Star size={11} fill="white" /> Mais popular
          </span>
        </div>
      )}

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

        <div className="mt-3 flex items-end gap-1">
          <p className="text-3xl font-bold text-slate-900">{price.value}</p>
          {price.period && <span className="text-slate-400 text-sm mb-1">{price.period}</span>}
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
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

      <ul className="space-y-2 flex-1">
        {ui.features.map(feat => (
          <li key={feat} className="flex items-start gap-2 text-sm text-slate-600">
            <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" strokeWidth={2.5} />
            {feat}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="w-full text-center py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-500">
          Plano atual
        </div>
      ) : plan.priceCents === 0 ? (
        <div className="w-full text-center py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-500">
          {ui.cta}
        </div>
      ) : (
        <a
          href="#contato"
          className={`w-full text-center py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${ui.ctaStyle}`}
        >
          {ui.cta} <ArrowRight size={14} />
        </a>
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

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

  const allSlugs = [...INDIVIDUAL_SLUGS, ...EQUIPE_SLUGS]
  const plans    = await prisma.plan.findMany({
    where:   { active: true, slug: { in: allSlugs } },
    orderBy: { id: "asc" },
  })

  function getPlans(slugs: string[]) {
    return slugs
      .map(slug => plans.find(p => p.slug === slug))
      .filter(Boolean) as typeof plans
  }

  const individualPlans = getPlans(INDIVIDUAL_SLUGS)
  const equipePlans     = getPlans(EQUIPE_SLUGS)

  return (
    <div className="p-4 md:p-8 max-w-5xl">

      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Planos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Escolha o plano ideal — individual ou para sua equipe.
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
          Seu período de teste{" "}
          {trialDias === 0 ? "expira hoje" : `expira em ${trialDias} dia${trialDias !== 1 ? "s" : ""}`}.
          {" "}Escolha um plano para continuar com acesso completo.
        </div>
      )}

      {/* ── Seção Individual ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-violet-500" strokeWidth={2} />
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Individual</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {individualPlans.map(plan => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              ui={PLAN_UI[plan.slug] ?? PLAN_UI.free}
              isCurrent={plan.slug === currentSlug}
            />
          ))}
        </div>
      </div>

      {/* ── Seção Equipe ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-emerald-500" strokeWidth={2} />
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Para equipes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
          {equipePlans.map(plan => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              ui={PLAN_UI[plan.slug] ?? PLAN_UI.basic_equipe}
              isCurrent={plan.slug === currentSlug}
            />
          ))}
        </div>
      </div>

      {/* Seção de contato */}
      <div id="contato" className="bg-violet-50 border border-violet-200 rounded-2xl p-6 md:p-8 text-center">
        <MessageCircle size={28} className="text-violet-500 mx-auto mb-3" strokeWidth={1.5} />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Quer fazer upgrade?</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
          O pagamento online estará disponível em breve. Por enquanto, fale conosco e ativamos seu plano manualmente.
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

      {/* O que conta como IA */}
      <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
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
