import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter:   PrismaAdapter(prisma),
  session:   { strategy: "jwt" },
  trustHost: true, // necessário na Hostinger (proxy reverso)
  pages: {
    signIn: "/auth/login",
    error:  "/auth/login",
  },
  providers: [
    // ─── Google OAuth ────────────────────────────────────────────────────────
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // ─── E-mail + Senha ───────────────────────────────────────────────────────
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "E-mail", type: "email" },
        password: { label: "Senha",  type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where:   { email: String(credentials.email) },
          include: { company: { include: { plan: true } } },
        })

        if (!user || !user.passwordHash) return null
        if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED")
        if (!user.active || user.deletedAt) throw new Error("ACCOUNT_INACTIVE")
        if (!user.company.active) throw new Error("COMPANY_SUSPENDED")

        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash)
        if (!valid) return null

        return {
          id:          String(user.id),
          name:        user.name,
          email:       user.email,
          companyId:   user.companyId,
          companyName: user.company.name,
          planSlug:    user.company.plan.slug,
          aiQuota:     user.company.plan.aiQuota,
          aiUsedTotal: user.company.aiUsedTotal,
          role:        user.role,
        }
      },
    }),
  ],

  callbacks: {
    // ─── signIn: garante que usuário Google tem empresa criada ────────────────
    async signIn({ user, account }) {
      // Só executa para OAuth (Google). Credentials é tratado no authorize().
      if (account?.provider !== "google") return true
      if (!user.email) return false

      try {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        })

        if (!existing) {
          // Primeiro acesso via Google → cria empresa + usuário
          const nomeEmpresa = user.name ?? user.email.split("@")[0]
          const baseSlug    = nomeEmpresa.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 50)
          const slugFinal   = `${baseSlug}-${Date.now()}`

          await prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
              data: {
                name:   nomeEmpresa,
                slug:   slugFinal,
                email:  user.email!,
                planId: 1,
              },
            })

            await tx.user.create({
              data: {
                companyId:     company.id,
                name:          user.name ?? nomeEmpresa,
                email:         user.email!,
                emailVerified: new Date(), // Google já verificou
                role:          "ADMIN",
                lgpdConsentAt: new Date(),
              },
            })
          })
        }

        return true
      } catch (err) {
        console.error("[signIn Google]", err)
        return false
      }
    },

    // ─── JWT: carrega dados do banco para o token ─────────────────────────────
    async jwt({ token, user, account, trigger, session: updateData }) {
      // Refresh via useSession().update() — merge dados recebidos no token
      if (trigger === "update" && updateData) {
        return { ...token, ...updateData }
      }

      // Na primeira autenticação, `user` ou `account` vêm populados
      if (user || account) {
        const dbUser = await prisma.user.findUnique({
          where:   { email: token.email! },
          include: { company: { include: { plan: true } } },
        })

        if (dbUser) {
          token.id            = String(dbUser.id)
          token.avatarUrl     = dbUser.avatarUrl ?? null
          token.companyId     = dbUser.companyId
          token.companyName   = dbUser.company.name
          token.planSlug      = dbUser.company.plan.slug
          token.planExpiresAt = dbUser.company.planExpiresAt?.toISOString() ?? null
          token.aiQuota       = dbUser.company.plan.aiQuota
          token.aiUsedTotal   = dbUser.company.aiUsedTotal
          token.role          = dbUser.role
        }
      }
      return token
    },

    // ─── Session: expõe dados do token para o cliente ─────────────────────────
    async session({ session, token }) {
      session.user.id            = token.id            as string
      session.user.avatarUrl     = token.avatarUrl     as string | null
      session.user.companyId     = token.companyId     as number
      session.user.companyName   = token.companyName   as string
      session.user.planSlug      = token.planSlug      as string
      session.user.planExpiresAt = token.planExpiresAt as string | null
      session.user.aiQuota       = token.aiQuota       as number | null
      session.user.aiUsedTotal   = token.aiUsedTotal   as number
      session.user.role          = token.role          as string
      return session
    },
  },
})
