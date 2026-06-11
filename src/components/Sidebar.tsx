"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Inbox, CheckSquare, Lightbulb, Calendar, Plus, Menu, X, LogOut, Zap, Settings, Users, Home, FileText, HelpCircle, ListChecks, Target } from "lucide-react"
import { signOut } from "next-auth/react"

interface User {
  name: string
  email: string
  role: string
  planSlug: string
  aiQuota: number | null
  aiUsedTotal: number
}

const NAV = [
  { href: "/app",                    label: "Início",        icon: Home,        tipo: null },
  { href: "/app/foco",               label: "Foco",          icon: Target,      tipo: null },
  { href: "/app/lista?tipo=DEMANDA", label: "Demandas",      icon: Inbox,       tipo: "DEMANDA" },
  { href: "/app/lista?tipo=TAREFA",  label: "Tarefas",       icon: CheckSquare, tipo: "TAREFA" },
  { href: "/app/lista?tipo=IDEIA",   label: "Ideias",        icon: Lightbulb,   tipo: "IDEIA" },
  { href: "/app/listas",             label: "Listas",        icon: ListChecks,  tipo: null },
  { href: "/app/calendario",         label: "Calendário",    icon: Calendar,    tipo: null },
  { href: "/relatorios",             label: "Relatórios",    icon: FileText,    tipo: null },
  { href: "/app/nova",               label: "Nova captura",  icon: Plus,        tipo: null },
  { href: "/configuracoes",          label: "Configurações", icon: Settings,    tipo: null },
]

function isActive(pathname: string, currentTipo: string | null, href: string): boolean {
  const [hPath, hQuery] = href.split("?")
  const hTipo = hQuery ? new URLSearchParams(hQuery).get("tipo") : null

  // /app (Início) — match exato, sem qualquer query
  if (hPath === "/app" && !hTipo) {
    return pathname === "/app"
  }

  // /app/lista?tipo=X — match por tipo na query
  if (hPath === "/app/lista") {
    if (pathname !== "/app/lista") return false
    return (currentTipo ?? "DEMANDA") === (hTipo ?? "DEMANDA")
  }

  // Outras rotas — prefix match
  return pathname === hPath || pathname.startsWith(hPath + "/")
}

export default function Sidebar({ user }: { user: User }) {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const currentTipo  = searchParams.get("tipo")
  const [open, setOpen] = useState(false)

  const aiRestante   = user.aiQuota !== null ? user.aiQuota - user.aiUsedTotal : null
  const aiBloqueado  = user.aiQuota !== null && user.aiUsedTotal >= user.aiQuota

  const isAdmin = user.role === "ADMIN"

  const navItems = [
    ...NAV,
    ...(isAdmin ? [{ href: "/equipe", label: "Equipe", icon: Users, tipo: null }] : []),
  ]

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex-1 px-2 py-3 space-y-0.5">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, currentTipo, href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-violet-700 text-white"
                : "text-violet-300 hover:bg-violet-800 hover:text-white"
            }`}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  const PlanBadge = () => (
    <div className="px-3 pb-2">
      {aiBloqueado ? (
        <Link
          href="/planos"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
        >
          <Zap size={13} strokeWidth={2.5} />
          Upgrade — IA esgotada
        </Link>
      ) : user.aiQuota !== null && aiRestante !== null && aiRestante <= Math.ceil(user.aiQuota * 0.3) ? (
        <div className="px-3 py-2 rounded-lg bg-violet-800 text-violet-300 text-xs">
          {aiRestante} captura{aiRestante === 1 ? "" : "s"} com IA restante{aiRestante === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  )

  const Footer = ({ onClick }: { onClick?: () => void }) => (
    <div className="border-t border-violet-800 p-3 space-y-1">
      <div className="px-3 py-1">
        <p className="text-xs font-medium text-white truncate">{user.name}</p>
        <p className="text-xs text-violet-400 truncate">{user.email}</p>
      </div>
      <div className="flex items-center gap-1">
        <Link
          href="/como-funciona"
          target="_blank"
          onClick={onClick}
          className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg text-xs text-violet-400 hover:text-white hover:bg-violet-800 transition-colors"
          title="Como funciona"
        >
          <HelpCircle size={13} strokeWidth={2} />
          Como funciona
        </Link>
        <button
          onClick={() => { onClick?.(); signOut({ callbackUrl: "/auth/login" }) }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-violet-400 hover:text-white hover:bg-violet-800 transition-colors"
          title="Sair"
        >
          <LogOut size={13} strokeWidth={2} />
          Sair
        </button>
      </div>
    </div>
  )

  const Header = ({ onClick }: { onClick?: () => void }) => (
    <div className="p-4 border-b border-violet-800">
      <Link href="/app" className="flex items-center gap-2.5" onClick={onClick}>
        <div className="w-7 h-7 bg-violet-500 rounded-lg flex items-center justify-center">
          <Inbox size={15} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">demandoo</p>
          <p className="text-xs text-violet-400 capitalize">{user.planSlug}</p>
        </div>
      </Link>
    </div>
  )

  return (
    <>
      {/* Top bar mobile */}
      <div className="md:hidden sticky top-0 z-30 bg-violet-950 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link href="/app" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-500 rounded flex items-center justify-center">
            <Inbox size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-white">demandoo</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md text-violet-200 hover:bg-violet-800 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-56 shrink-0 bg-violet-950 flex-col h-screen sticky top-0">
        <Header />
        <NavList />
        <PlanBadge />
        <Footer />
      </aside>

      {/* Drawer mobile */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-violet-950 z-50 flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-violet-800">
              <Header onClick={() => setOpen(false)} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-violet-200 hover:bg-violet-800 transition-colors"
                aria-label="Fechar menu"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <NavList onClick={() => setOpen(false)} />
            <PlanBadge />
            <Footer onClick={() => setOpen(false)} />
          </aside>
        </>
      )}
    </>
  )
}
