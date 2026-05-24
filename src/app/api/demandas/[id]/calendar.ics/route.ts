import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

// RFC 5545: formato UTC YYYYMMDDTHHmmssZ
function fmtIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

// Escapa caracteres especiais iCal
function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

// Quebra linhas em 75 octets (RFC 5545 §3.1)
function foldIcs(line: string): string {
  const MAX = 75
  if (Buffer.byteLength(line, "utf8") <= MAX) return line
  const result: string[] = []
  let current = ""
  for (const char of [...line]) {
    if (Buffer.byteLength(current + char, "utf8") > MAX) {
      result.push(current)
      current = " " + char
    } else {
      current += char
    }
  }
  if (current) result.push(current)
  return result.join("\r\n")
}

export async function GET(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return new NextResponse("Não autorizado", { status: 401 })

    const { id } = await params

    const demanda = await prisma.demanda.findFirst({
      where:  { id: Number(id), companyId: session.user.companyId, deletedAt: null },
      select: { id: true, titulo: true, descricao: true, prazo: true },
    })

    if (!demanda) return new NextResponse("Não encontrado", { status: 404 })
    if (!demanda.prazo) return new NextResponse("Esta demanda não tem prazo definido.", { status: 400 })

    // Evento de 1h começando às 09:00 BRT (= 12:00 UTC) no dia do prazo
    const prazoBrt = new Date(demanda.prazo.getTime() - 3 * 3600000)
    const dtstart  = new Date(Date.UTC(
      prazoBrt.getUTCFullYear(),
      prazoBrt.getUTCMonth(),
      prazoBrt.getUTCDate(),
      12, 0, 0,   // 12:00 UTC = 09:00 BRT
    ))
    const dtend = new Date(dtstart.getTime() + 3600000) // +1h

    const now = new Date()
    const slug = demanda.titulo.slice(0, 40).replace(/[^a-z0-9]/gi, "-").toLowerCase()

    const linhas: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//demandoo.net//demandoo//PT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:demanda-${demanda.id}@demandoo.net`,
      `DTSTAMP:${fmtIcsUtc(now)}`,
      `DTSTART:${fmtIcsUtc(dtstart)}`,
      `DTEND:${fmtIcsUtc(dtend)}`,
      foldIcs(`SUMMARY:${escapeIcs(demanda.titulo)}`),
      ...(demanda.descricao ? [foldIcs(`DESCRIPTION:${escapeIcs(demanda.descricao)}`)] : []),
      foldIcs(`URL:https://demandoo.net/app/${demanda.id}`),
      "END:VEVENT",
      "END:VCALENDAR",
    ]

    return new NextResponse(linhas.join("\r\n"), {
      headers: {
        "Content-Type":        "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="demandoo-${slug}.ics"`,
        "Cache-Control":       "no-store",
      },
    })
  } catch (err) {
    console.error("[GET /api/demandas/[id]/calendar.ics]", err)
    return new NextResponse("Erro interno", { status: 500 })
  }
}
