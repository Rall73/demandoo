import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendInviteEmail } from "@/lib/email"
import crypto from "crypto"

/** Envia convite para um novo membro. */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Apenas administradores podem convidar membros." }, { status: 403 })

    const companyId = session.user.companyId
    const { email } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Busca empresa e plano para verificar limite
    const company = await prisma.company.findUnique({
      where:   { id: companyId },
      include: { plan: { select: { maxUsers: true } } },
    })
    if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 })

    // Conta membros ativos
    const memberCount = await prisma.user.count({
      where: { companyId, deletedAt: null },
    })

    // Conta convites pendentes (não expirados)
    const pendingCount = await prisma.verificationToken.count({
      where: {
        identifier: { startsWith: `invite:${companyId}:` },
        expires:    { gt: new Date() },
      },
    })

    const maxUsers = company.plan.maxUsers
    if (memberCount + pendingCount >= maxUsers) {
      return NextResponse.json({
        error: `Seu plano permite até ${maxUsers} usuário${maxUsers !== 1 ? "s" : ""}. Faça upgrade para convidar mais membros.`,
      }, { status: 403 })
    }

    // Verifica se o e-mail já é membro da empresa
    const alreadyMember = await prisma.user.findFirst({
      where: { email: normalizedEmail, companyId, deletedAt: null },
    })
    if (alreadyMember) {
      return NextResponse.json({ error: "Este e-mail já é membro da equipe." }, { status: 409 })
    }

    // Verifica se o e-mail já tem conta em outra empresa
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (existingUser) {
      return NextResponse.json({ error: "Este e-mail já possui uma conta no demandoo em outra empresa." }, { status: 409 })
    }

    // Remove convite anterior para este e-mail nesta empresa, se houver
    await prisma.verificationToken.deleteMany({
      where: { identifier: `invite:${companyId}:${normalizedEmail}` },
    })

    const token   = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias

    await prisma.verificationToken.create({
      data: {
        identifier: `invite:${companyId}:${normalizedEmail}`,
        token,
        expires,
      },
    })

    // Envia e-mail de convite
    sendInviteEmail(normalizedEmail, token, company.name, session.user.name).catch(console.error)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/equipe/convite]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
