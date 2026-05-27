import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deleteCloudinaryAsset, cloudinaryResourceType } from "@/lib/cloudinary"

type Ctx = { params: Promise<{ id: string; anexoId: string }> }

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id, anexoId } = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    const anexo = await prisma.anexo.findFirst({
      where: {
        id:        Number(anexoId),
        demandaId: Number(id),
        companyId,
        userId,        // só o uploader pode excluir
        deletedAt:  null,
      },
      select: { id: true, url: true, tipo: true },
    })
    if (!anexo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    await prisma.anexo.update({
      where: { id: Number(anexoId) },
      data:  { deletedAt: new Date(), deletedBy: userId },
    })

    // Remove do Cloudinary (best-effort)
    deleteCloudinaryAsset(anexo.url, cloudinaryResourceType(anexo.tipo)).catch(console.error)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/demandas/[id]/anexos/[anexoId]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
