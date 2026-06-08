import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendLembreteListaEmail } from "@/lib/email"
import { hojeNoBrasil } from "@/lib/date"

/**
 * GET /api/cron/lembretes-listas
 *
 * Verifica itens de lista com dataVencimento e lembrarAntesDias configurados.
 * Dispara e-mail quando faltam exatamente lembrarAntesDias dias (ou 0 = hoje).
 * Para itens recorrentes (aniversários), reseta lembreteEnviadoAt após o envio.
 *
 * Autenticação: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error("[cron/lembretes-listas] CRON_SECRET não configurado")
    return NextResponse.json({ error: "Cron não configurado." }, { status: 500 })
  }

  const authHeader = req.headers.get("authorization") ?? ""
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const hoje = hojeNoBrasil() // meia-noite BRT em UTC

  // Busca itens com data de vencimento + dias de lembrete configurados, não concluídos
  const itens = await prisma.itemLista.findMany({
    where: {
      deletedAt:        null,
      concluido:        false,
      dataVencimento:   { not: null },
      lembrarAntesDias: { not: null },
      lembreteEnviadoAt: null,
    },
    include: {
      lista: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  })

  let enviados = 0
  const erros: string[] = []

  for (const item of itens) {
    try {
      const vencimento     = item.dataVencimento!
      const diasRestantes  = Math.round((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      const deveLembrar    = diasRestantes === item.lembrarAntesDias || diasRestantes === 0

      if (!deveLembrar) continue

      const user = item.lista.user
      if (!user.email) continue

      const dataFormatada = vencimento.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })

      await sendLembreteListaEmail(
        user.email,
        user.name,
        item.lista.id,
        item.lista.titulo,
        item.texto,
        dataFormatada,
        diasRestantes,
      )

      // Para itens recorrentes: reseta o lembrete (disparará novamente no próximo ano)
      // Para itens normais: marca como enviado definitivamente
      await prisma.itemLista.update({
        where: { id: item.id },
        data:  { lembreteEnviadoAt: item.recorrente ? null : new Date() },
      })

      enviados++
    } catch (err) {
      console.error(`[cron/lembretes-listas] item ${item.id}:`, err)
      erros.push(String(item.id))
    }
  }

  return NextResponse.json({
    ok:       true,
    enviados,
    erros:    erros.length,
    ids_erro: erros,
  })
}
