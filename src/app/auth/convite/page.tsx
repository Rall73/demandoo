import { Suspense } from "react"
import { Inbox, XCircle } from "lucide-react"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import ConviteForm from "./ConviteForm"

interface Props {
  searchParams: Promise<{ token?: string }>
}

async function ConviteContent({ token }: { token: string | undefined }) {
  if (!token) return <ErrorCard message="Link de convite inválido." />

  const record = await prisma.verificationToken.findUnique({ where: { token } })

  if (!record || !record.identifier.startsWith("invite:")) {
    return <ErrorCard message="Convite inválido ou já utilizado." />
  }
  if (record.expires < new Date()) {
    return <ErrorCard message="Este convite expirou. Peça ao administrador que envie um novo." />
  }

  const parts     = record.identifier.split(":")
  const companyId = Number(parts[1])
  const email     = parts.slice(2).join(":")

  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { name: true },
  })
  if (!company) return <ErrorCard message="Empresa não encontrada." />

  // Verifica se o e-mail já tem conta
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
        <p className="text-sm text-slate-700">
          O e-mail <strong>{email}</strong> já possui uma conta no demandoo.
          Faça login e entre em contato com o administrador de <strong>{company.name}</strong> para adicionar seu acesso.
        </p>
        <Link
          href="/auth/login"
          className="inline-block bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700"
        >
          Ir para o login
        </Link>
      </div>
    )
  }

  return <ConviteForm token={token} email={email} companyName={company.name} />
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4">
      <XCircle size={40} className="text-red-500 mx-auto" strokeWidth={1.5} />
      <p className="text-sm text-slate-700">{message}</p>
      <Link href="/auth/login" className="text-sm text-violet-600 hover:underline font-medium">
        Ir para o login
      </Link>
    </div>
  )
}

export default async function ConvitePage({ searchParams }: Props) {
  const { token } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-600 rounded-2xl mb-4">
            <Inbox size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">demandoo</h1>
          <p className="text-slate-500 text-sm mt-1">Convite de equipe</p>
        </div>

        <Suspense fallback={
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">Verificando convite…</p>
          </div>
        }>
          <ConviteContent token={token} />
        </Suspense>
      </div>
    </div>
  )
}
