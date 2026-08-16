import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"
import { ipDaRequisicao, permitirPorIp, segundosParaLiberar } from "@/lib/rate-limit"
import crypto from "crypto"

/**
 * POST — reenvia o e-mail de verificação.
 *
 * Existe porque o token do cadastro vale 24h e não havia nenhuma forma de pedir
 * outro: quem perdia a janela ficava trancado para fora sem autoatendimento.
 *
 * Resposta é sempre `ok: true`, mesmo para e-mail inexistente ou já verificado —
 * responder diferente entregaria quais endereços têm conta.
 */
export async function POST(req: Request) {
  try {
    const ip    = ipDaRequisicao(req)
    const chave = `reenviar-verificacao:${ip}`

    // 3 reenvios por hora por IP: suficiente para quem errou, curto para bot
    if (!permitirPorIp(ip, "reenviar-verificacao", 3, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
        { status: 429, headers: { "Retry-After": String(segundosParaLiberar(chave)) } },
      )
    }

    const { email } = await req.json()
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }

    const normalizado = String(email).trim().toLowerCase()
    const user = await prisma.user.findUnique({ where: { email: normalizado } })

    // Silencioso quando não há o que fazer — não confirma existência da conta
    if (!user || user.deletedAt || user.emailVerified) {
      return NextResponse.json({ ok: true })
    }

    const token   = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // O identifier da verificação é o e-mail puro (sem prefixo), como no cadastro
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizado } })
    await prisma.verificationToken.create({
      data: { identifier: normalizado, token, expires },
    })

    sendVerificationEmail(normalizado, token).catch(console.error)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/auth/reenviar-verificacao]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
