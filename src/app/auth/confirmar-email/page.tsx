import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Inbox, CheckCircle, XCircle } from "lucide-react"
import { prisma } from "@/lib/prisma"

interface Props {
  searchParams: Promise<{ token?: string }>
}

async function ConfirmarEmailContent({ token }: { token: string | undefined }) {
  if (!token) {
    return <ErrorCard message="Link inválido ou ausente." />
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } })

  if (!record) {
    return <ErrorCard message="Link inválido ou já utilizado." />
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null)
    return <ErrorCard message="Este link expirou. Solicite uma nova troca de e-mail nas configurações." />
  }

  // identifier = "email-change:userId:newEmail"
  const parts = record.identifier.split(":")
  if (parts.length < 3 || parts[0] !== "email-change") {
    return <ErrorCard message="Link inválido." />
  }

  const userId   = Number(parts[1])
  const newEmail = parts.slice(2).join(":") // e-mail pode conter ":"

  if (!userId || !newEmail) {
    return <ErrorCard message="Link malformado." />
  }

  // Verifica se o e-mail já foi tomado por outro usuário
  const emailTaken = await prisma.user.findFirst({
    where: { email: newEmail, id: { not: userId } },
  })
  if (emailTaken) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null)
    return <ErrorCard message="Este e-mail já está em uso por outra conta. Solicite uma nova troca nas configurações." />
  }

  // Atualiza o e-mail e marca como verificado
  await prisma.user.update({
    where: { id: userId },
    data:  { email: newEmail, emailVerified: new Date() },
  })

  await prisma.verificationToken.delete({ where: { token } }).catch(() => null)

  redirect("/configuracoes?emailAtualizado=true")
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4">
      <XCircle size={40} className="text-red-500 mx-auto" strokeWidth={1.5} />
      <p className="text-sm text-slate-700">{message}</p>
      <Link
        href="/configuracoes"
        className="inline-block text-sm text-violet-600 hover:underline font-medium"
      >
        Ir para Configurações
      </Link>
    </div>
  )
}

export default async function ConfirmarEmailPage({ searchParams }: Props) {
  const { token } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-600 rounded-2xl mb-4">
            <Inbox size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">demandoo</h1>
          <p className="text-slate-500 text-sm mt-1">Confirmação de e-mail</p>
        </div>

        <Suspense
          fallback={
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-500">Verificando…</p>
            </div>
          }
        >
          <ConfirmarEmailContent token={token} />
        </Suspense>
      </div>
    </div>
  )
}
