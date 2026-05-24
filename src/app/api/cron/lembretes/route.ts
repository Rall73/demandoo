import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendLembreteEmail } from "@/lib/email"
import { hojeNoBrasil } from "@/lib/date"

/**
 * GET /api/cron/lembretes
 *
 * Chamado diariamente por cron job externo (cron-job.org ou hPanel).
 * Envia e-mail de lembrete para demandas com prazo D-1 (amanhã) e D-0 (hoje).
 *
 * Autenticação: header Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  // ── Autenticação via secret ──────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error("[cron/lembretes] CRON_SECRET não configurado")
    return NextResponse.json({ error: "Cron não configurado." }, { status: 500 })
  }

  const authHeader = req.headers.get("authorization") ?? ""
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  // ── Calcula janelas de data em BRT ──────────────────────────────────────────
  const hoje   = hojeNoBrasil()
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)

  const fimHoje   = new Date(amanha)         // início de amanhã = fim de hoje
  const fimAmanha = new Date(amanha)
  fimAmanha.setDate(fimAmanha.getDate() + 1) // início de depois = fim de amanhã

  const statusAbertos = ["ABERTA", "EM_ANDAMENTO"] as ("ABERTA" | "EM_ANDAMENTO")[]

  // ── Busca demandas D-0 (hoje) e D-1 (amanhã) ────────────────────────────────
  const [demandasHoje, demandasAmanha] = await Promise.all([
    prisma.demanda.findMany({
      where: {
        prazo:              { gte: hoje, lt: fimHoje },
        status:             { in: statusAbertos },
        deletedAt:          null,
        lembreteD0EnviadoAt: null,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.demanda.findMany({
      where: {
        prazo:              { gte: amanha, lt: fimAmanha },
        status:             { in: statusAbertos },
        deletedAt:          null,
        lembreteD1EnviadoAt: null,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
  ])

  let enviados = 0
  const erros: string[] = []
  const agora = new Date()

  // ── Envia D-0 ────────────────────────────────────────────────────────────────
  for (const demanda of demandasHoje) {
    try {
      await sendLembreteEmail(
        demanda.user.email,
        demanda.user.name,
        demanda.titulo,
        demanda.id,
        "D-0"
      )
      await prisma.demanda.update({
        where: { id: demanda.id },
        data:  { lembreteD0EnviadoAt: agora },
      })
      enviados++
    } catch (err) {
      erros.push(`D-0 demanda ${demanda.id}: ${String(err)}`)
      console.error(`[cron/lembretes] Erro D-0 demanda ${demanda.id}:`, err)
    }
  }

  // ── Envia D-1 ────────────────────────────────────────────────────────────────
  for (const demanda of demandasAmanha) {
    try {
      await sendLembreteEmail(
        demanda.user.email,
        demanda.user.name,
        demanda.titulo,
        demanda.id,
        "D-1"
      )
      await prisma.demanda.update({
        where: { id: demanda.id },
        data:  { lembreteD1EnviadoAt: agora },
      })
      enviados++
    } catch (err) {
      erros.push(`D-1 demanda ${demanda.id}: ${String(err)}`)
      console.error(`[cron/lembretes] Erro D-1 demanda ${demanda.id}:`, err)
    }
  }

  console.log(`[cron/lembretes] Concluído: ${enviados} e-mails enviados, ${erros.length} erros`)

  return NextResponse.json({
    ok:              true,
    enviados,
    d0:              demandasHoje.length,
    d1:              demandasAmanha.length,
    erros:           erros.length > 0 ? erros : undefined,
    executadoEm:     agora.toISOString(),
  })
}
