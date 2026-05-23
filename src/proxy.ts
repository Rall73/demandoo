import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rotas públicas que não precisam de autenticação
const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/cadastro",
  "/auth/verificar",
  "/auth/esqueci-senha",
  "/auth/nova-senha",
  "/politica-de-privacidade",
  "/termos-de-uso",
]

export default auth((req: NextRequest & { auth: { user?: { id?: string } } | null }) => {
  const { pathname } = req.nextUrl

  // Permite assets estáticos e rotas de API de auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|svg|ico|webp|woff2?)$/)
  ) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )

  if (!req.auth?.user?.id && !isPublic) {
    const loginUrl = new URL("/auth/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
