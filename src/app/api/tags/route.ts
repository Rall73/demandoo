import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tags?q=  — lista as tags da empresa (autocomplete), com contagem de uso
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const companyId = session.user.companyId
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") ?? "").trim().toLowerCase()

    const tags = await prisma.tag.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(q ? { nome: { contains: q } } : {}),
      },
      select: {
        id:   true,
        nome: true,
        cor:  true,
        _count: { select: { demandas: true } },
      },
      orderBy: { nome: "asc" },
      take: 50,
    })

    return NextResponse.json({
      tags: tags.map((t) => ({ id: t.id, nome: t.nome, cor: t.cor, uso: t._count.demandas })),
    })
  } catch (err) {
    console.error("[GET /api/tags]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
