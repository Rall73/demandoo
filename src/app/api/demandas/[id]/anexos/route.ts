import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import cloudinary, { cloudinaryResourceType } from "@/lib/cloudinary"

type Ctx = { params: Promise<{ id: string }> }

const TIPOS_PERMITIDOS = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
])

const TAMANHO_MAX = 10 * 1024 * 1024 // 10 MB

export async function GET(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id } = await params
    const demanda = await prisma.demanda.findFirst({
      where: { id: Number(id), companyId: session.user.companyId, deletedAt: null },
      select: { id: true },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const anexos = await prisma.anexo.findMany({
      where:   { demandaId: Number(id), companyId: session.user.companyId, deletedAt: null },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ anexos })
  } catch (err) {
    console.error("[GET /api/demandas/[id]/anexos]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    // Verifica que a demanda pertence à empresa
    const demanda = await prisma.demanda.findFirst({
      where:  { id: Number(id), companyId, deletedAt: null },
      select: { id: true },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })

    if (!TIPOS_PERMITIDOS.has(file.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não permitido." }, { status: 400 })
    }
    if (file.size > TAMANHO_MAX) {
      return NextResponse.json({ error: "Arquivo maior que 10 MB." }, { status: 400 })
    }

    const buffer       = Buffer.from(await file.arrayBuffer())
    const resourceType = cloudinaryResourceType(file.type)

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        `demandoo/anexos/${companyId}/${id}`,
          resource_type: resourceType,
          public_id:     `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
          use_filename:  false,
        },
        (err, res) => {
          if (err || !res) return reject(err ?? new Error("Upload falhou"))
          resolve(res)
        }
      )
      stream.end(buffer)
    })

    const anexo = await prisma.anexo.create({
      data: {
        demandaId: Number(id),
        userId,
        companyId,
        url:     result.secure_url,
        nome:    file.name,
        tipo:    file.type,
        tamanho: file.size,
      },
      include: { user: { select: { name: true } } },
    })

    return NextResponse.json({ anexo }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/demandas/[id]/anexos]", err)
    return NextResponse.json({ error: "Erro no upload do anexo." }, { status: 500 })
  }
}
