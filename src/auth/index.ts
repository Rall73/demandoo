import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

/**
 * Erros de login que a tela precisa distinguir.
 *
 * `throw new Error("X")` cru NÃO funciona aqui: o Auth.js v5 embrulha qualquer
 * exceção do `authorize()` num CallbackRouteError e a URL vira `?error=Configuration`,
 * perdendo o motivo. Só `CredentialsSignin` propaga o `code` para a URL —
 * e ele chega no parâmetro `code`, não em `error`.
 *
 * Expor o motivo é seguro porque a senha já foi conferida antes destes erros:
 * quem chega aqui provou a posse da conta.
 */
class EmailNaoVerificado extends CredentialsSignin { code = "EMAIL_NOT_VERIFIED" }
class ContaInativa      extends CredentialsSignin { code = "ACCOUNT_INACTIVE" }
class EmpresaSuspensa   extends CredentialsSignin { code = "COMPANY_SUSPENDED" }

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

        // A senha é conferida ANTES de qualquer aviso sobre o estado da conta.
        // Na ordem inversa, uma senha errada qualquer já revelava se o e-mail
        // tem conta aqui — enumeração de usuários de graça.
        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash)
        if (!valid) return null

        // Daqui para baixo a posse da senha está provada: os avisos específicos
        // são úteis para o dono da conta e não entregam nada a estranho.
        if (!user.emailVerified) throw new EmailNaoVerificado()
        if (!user.active || user.deletedAt) throw new ContaInativa()
        if (!user.company.active) throw new EmpresaSuspensa()

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

      // ⚠️ NÃO consultar o banco aqui fora do login. Tentado na v1.10 e revertido
      // no mesmo dia, em produção, com perda de trabalho de usuário.
      //
      // O `middleware.ts` envolve `auth()` com matcher que pega quase toda
      // requisição, e `auth()` executa este callback. Uma consulta ao banco aqui
      // vira consulta ao banco em CADA navegação — e se ela falhar (limite de
      // recursos da Hostinger, pool de conexão, timeout), o callback lança, a
      // sessão não resolve e o middleware manda a pessoa para o login no meio do
      // trabalho, perdendo o que estava sendo digitado.
      //
      // Consequência aceita: mudança de empresa, papel ou plano só chega ao
      // usuário no próximo login. Quem alterar isso no banco precisa avisar a
      // pessoa a sair e entrar. Se um dia valer a pena resolver, o caminho NÃO é
      // por aqui — seria revalidar em rota de página (fora do middleware), com
      // try/catch, jamais deixando falha de banco derrubar sessão.
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
