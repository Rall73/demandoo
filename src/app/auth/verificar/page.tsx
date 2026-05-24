import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { CheckCircle, XCircle, Inbox } from "lucide-react"

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return <Result ok={false} message="Link inválido ou incompleto." />
  }

  const vt = await prisma.verificationToken.findUnique({ where: { token } })

  if (!vt) {
    return <Result ok={false} message="Link inválido ou já utilizado." />
  }

  if (vt.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null)
    return (
      <Result
        ok={false}
        message="Este link expirou (validade de 24h)."
        extra={
          <p className="text-sm text-slate-500 mt-2">
            Faça um novo{" "}
            <Link href="/auth/cadastro" className="text-violet-600 hover:underline">
              cadastro
            </Link>{" "}
            para receber um novo link.
          </p>
        }
      />
    )
  }

  // Verifica e atualiza em transação
  await prisma.$transaction([
    prisma.user.update({
      where: { email: vt.identifier },
      data:  { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ])

  return (
    <Result
      ok
      message="E-mail confirmado com sucesso!"
      extra={
        <Link
          href="/auth/login"
          className="mt-4 inline-block bg-violet-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-violet-700 transition-colors"
        >
          Entrar agora
        </Link>
      }
    />
  )
}

function Result({
  ok,
  message,
  extra,
}: {
  ok: boolean
  message: string
  extra?: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-600 rounded-2xl mb-6">
          <Inbox size={24} className="text-white" strokeWidth={2.5} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          {ok ? (
            <CheckCircle size={40} className="mx-auto mb-4 text-emerald-500" strokeWidth={1.5} />
          ) : (
            <XCircle size={40} className="mx-auto mb-4 text-red-400" strokeWidth={1.5} />
          )}
          <p className="font-semibold text-slate-800">{message}</p>
          {extra}
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link href="/" className="text-violet-600 hover:underline">
            Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  )
}
