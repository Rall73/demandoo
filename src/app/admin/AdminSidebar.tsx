"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Building2, Users, CreditCard,
  BarChart2, Inbox, ArrowLeft,
} from "lucide-react"

const NAV = [
  { href: "/admin",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/empresas",  label: "Empresas",   icon: Building2 },
  { href: "/admin/usuarios",  label: "Usuários",   icon: Users },
  { href: "/admin/planos",    label: "Planos",     icon: CreditCard },
  { href: "/admin/consumo",   label: "Consumo",    icon: BarChart2 },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-slate-900 min-h-screen flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <Inbox size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">demandoo</p>
            <p className="text-slate-400 text-xs mt-0.5">Painel Admin</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Voltar ao app */}
      <div className="px-3 py-4 border-t border-slate-800">
        <Link
          href="/app"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Voltar ao app
        </Link>
      </div>
    </aside>
  )
}
