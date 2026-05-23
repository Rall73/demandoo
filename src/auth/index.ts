import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn:  "/auth/login",
    error:   "/auth/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "E-mail",  type: "email" },
        password: { label: "Senha",   type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
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
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string; companyId: number; companyName: string;
          planSlug: string; aiQuota: number | null; aiUsedTotal: number; role: string
        }
        token.id          = u.id
        token.companyId   = u.companyId
        token.companyName = u.companyName
        token.planSlug    = u.planSlug
        token.aiQuota     = u.aiQuota
        token.aiUsedTotal = u.aiUsedTotal
        token.role        = u.role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id          = token.id          as string
      session.user.companyId   = token.companyId   as number
      session.user.companyName = token.companyName as string
      session.user.planSlug    = token.planSlug    as string
      session.user.aiQuota     = token.aiQuota     as number | null
      session.user.aiUsedTotal = token.aiUsedTotal as number
      session.user.role        = token.role        as string
      return session
    },
  },
})
