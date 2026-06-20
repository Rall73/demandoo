import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseDateBRT } from "@/lib/date"

type Ctx = { params: Promise<{ data: string }> }

function formatMin(min: number): string {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatHoraBRT(d: Date): string {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  })
}

const ENTRADA_LABEL: Record<string, string> = {
  TELEFONEMA: "Telefonemas",
  EMAIL:      "E-mails",
  REUNIAO:    "Reuniões",
  NOTA:       "Notas",
}

export async function GET(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return new Response("Não autorizado", { status: 401 })

    const { data: dataISO } = await params
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO))
      return new Response("Data inválida", { status: 400 })

    const companyId   = session.user.companyId
    const userId      = Number(session.user.id)
    const nomeUsuario = session.user.name ?? ""

    const inicioDia = parseDateBRT(dataISO)
    const fimDia    = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000)

    const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(inicioDia)

    const diario = await prisma.demanda.findFirst({
      where: { companyId, userId, tipo: "DIARIO",
               prazo: { gte: inicioDia, lt: fimDia }, deletedAt: null },
      select: { id: true },
    })

    const [demandasHoje, acoesHoje, comentarios, sessoesHoje] = await Promise.all([
      prisma.demanda.findMany({
        where:   { companyId, userId, deletedAt: null, tipo: { not: "DIARIO" },
                   status: { notIn: ["CONCLUIDA", "CANCELADA"] },
                   prazo:  { gte: inicioDia, lt: fimDia } },
        select:  { id: true, titulo: true, tipo: true },
        orderBy: [{ prioridade: "asc" }, { titulo: "asc" }],
      }),
      prisma.acaoDemanda.findMany({
        where:  { deletedAt: null, feita: false,
                  prazo:    { gte: inicioDia, lt: fimDia },
                  demanda:  { companyId, userId, deletedAt: null } },
        select: { id: true, descricao: true,
                  demanda: { select: { titulo: true } } },
      }),
      diario
        ? prisma.comentario.findMany({
            where:   { demandaId: diario.id, deletedAt: null, tipo: { notIn: ["STATUS"] } },
            orderBy: { createdAt: "asc" },
            select:  { id: true, conteudo: true, tipo: true, createdAt: true },
          })
        : Promise.resolve([]),
      prisma.sessaoFoco.findMany({
        where:   { companyId, userId, iniciadoEm: { gte: inicioDia, lt: fimDia } },
        include: { demanda: { select: { titulo: true } } },
      }),
    ])

    // Agrupa sessões por demanda
    const tempoMap = new Map<string, { titulo: string; totalMin: number }>()
    for (const s of sessoesHoje) {
      const ex = tempoMap.get(s.demanda.titulo)
      if (ex) ex.totalMin += s.duracaoMin
      else tempoMap.set(s.demanda.titulo, { titulo: s.demanda.titulo, totalMin: s.duracaoMin })
    }
    const resumoTempo = Array.from(tempoMap.values()).sort((a, b) => b.totalMin - a.totalMin)
    const totalMin = resumoTempo.reduce((acc, r) => acc + r.totalMin, 0)

    // ── Monta seções HTML ────────────────────────────────────────────────

    const secAgenda = demandasHoje.length === 0 ? "" : `
      <h2>Agenda do dia</h2>
      <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
        ${demandasHoje.map((d) => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="color:#1e293b;">${d.titulo}</td>
          </tr>
        `).join("")}
      </table>`

    const secAcoes = acoesHoje.length === 0 ? "" : `
      <h2>Ações de hoje</h2>
      <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
        ${acoesHoje.map((a) => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td width="20" style="color:#94a3b8;">&#9675;</td>
            <td>
              <div style="color:#1e293b;">${a.descricao}</div>
              <div style="font-size:9pt;color:#94a3b8;">${a.demanda.titulo}</div>
            </td>
          </tr>
        `).join("")}
      </table>`

    const secTempo = resumoTempo.length === 0 ? "" : `
      <h2>Tempo de foco &mdash; ${formatMin(totalMin)}</h2>
      <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
        ${resumoTempo.map((r) => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="color:#334155;">${r.titulo}</td>
            <td align="right" style="color:#475569;font-weight:bold;white-space:nowrap;">${formatMin(r.totalMin)}</td>
          </tr>
        `).join("")}
      </table>`

    const TIPOS = ["TELEFONEMA", "EMAIL", "REUNIAO", "NOTA"] as const
    const secRegistros = comentarios.length === 0 ? "" : `
      <h2>Registros do dia</h2>
      ${TIPOS.map((tipo) => {
        const itens = comentarios.filter((c) => c.tipo === tipo)
        if (itens.length === 0) return ""
        return `
          <h3>${ENTRADA_LABEL[tipo]}</h3>
          <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
            ${itens.map((c) => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td width="40" valign="top" style="color:#94a3b8;font-size:9pt;white-space:nowrap;">
                  ${formatHoraBRT(c.createdAt)}
                </td>
                <td style="color:#1e293b;">${c.conteudo.replace(/\n/g, "<br>")}</td>
              </tr>
            `).join("")}
          </table>`
      }).join("")}`

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #1e293b;
      margin: 2cm;
    }
    .cabecalho {
      border-bottom: 2px solid #1e293b;
      padding-bottom: 10pt;
      margin-bottom: 18pt;
    }
    h1 {
      font-size: 18pt;
      margin: 0 0 4pt 0;
      text-transform: capitalize;
    }
    .subtitulo { font-size: 10pt; color: #64748b; margin: 0; }
    h2 {
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1pt;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4pt;
      margin: 18pt 0 8pt 0;
      page-break-after: avoid;
    }
    h3 {
      font-size: 9pt;
      color: #64748b;
      margin: 12pt 0 4pt 0;
      page-break-after: avoid;
    }
    table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
    tr    { page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="cabecalho">
    <h1>${dataFormatada}</h1>
    <p class="subtitulo">Di&aacute;rio demandoo &mdash; ${nomeUsuario}</p>
  </div>

  ${secAgenda}
  ${secAcoes}
  ${secTempo}
  ${secRegistros}
</body>
</html>`

    return new Response(html, {
      headers: {
        "Content-Type":        "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dataISO} - Diário ${nomeUsuario}.doc"`,
      },
    })
  } catch (err) {
    console.error("[GET /api/diario/exportar-doc]", err)
    return new Response("Erro interno", { status: 500 })
  }
}
