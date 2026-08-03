import { auth } from "@/auth"
import { mesAtualISOBrasil, mesExtensoBRT } from "@/lib/date"
import { carregarResumoMes, formatMin } from "@/lib/resumo-mes"

type Ctx = { params: Promise<{ mes: string }> }

const TIPO_LABEL: Record<string, string> = {
  DEMANDA: "Demandas", TAREFA: "Tarefas", IDEIA: "Ideias",
}

const ENTRADA_LABEL: Record<string, string> = {
  TELEFONEMA: "Telefonemas", EMAIL: "E-mails", REUNIAO: "Reuniões", NOTA: "Notas",
}

/** Escapa texto vindo do usuário antes de injetar no HTML do Word. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function dataCurta(iso: string | null): string {
  if (!iso) return "&mdash;"
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo",
  })
}

const TR = 'style="border-bottom:1px solid #f1f5f9;"'

export async function GET(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return new Response("Não autorizado", { status: 401 })

    const { mes } = await params
    if (!/^\d{4}-\d{2}$/.test(mes) || mes > mesAtualISOBrasil())
      return new Response("Mês inválido", { status: 400 })

    const companyId   = session.user.companyId
    const userId      = Number(session.user.id)
    const nomeUsuario = session.user.name ?? ""

    const r = await carregarResumoMes(companyId, userId, mes)

    const entregues = r.prazos.noPrazo + r.prazos.comAtraso
    const taxaPrazo = entregues > 0 ? Math.round((r.prazos.noPrazo / entregues) * 100) : null

    const linha = (rotulo: string, valor: string) => `
      <tr ${TR}>
        <td style="color:#334155;">${rotulo}</td>
        <td align="right" style="color:#1e293b;font-weight:bold;white-space:nowrap;">${valor}</td>
      </tr>`

    const secNumeros = `
      <h2>N&uacute;meros do m&ecirc;s</h2>
      <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
        ${linha("Itens abertos no m&ecirc;s", String(r.totalCriadas))}
        ${linha("Itens conclu&iacute;dos no m&ecirc;s", String(r.totalConcluidas))}
        ${linha("Entregues no prazo", taxaPrazo === null ? "&mdash;" : `${taxaPrazo}% (${r.prazos.noPrazo} de ${entregues})`)}
        ${r.tempoMedioDias !== null
          ? linha("Tempo m&eacute;dio at&eacute; a conclus&atilde;o",
              r.tempoMedioDias < 1 ? "menos de 1 dia" : `${r.tempoMedioDias.toFixed(1)} dias`)
          : ""}
        ${linha("Tempo de foco",
          `${formatMin(r.focoTotalMin)}${r.focoDiasAtivos > 0 ? ` em ${r.focoDiasAtivos} ${r.focoDiasAtivos === 1 ? "dia" : "dias"}` : ""}`)}
        ${linha("M&ecirc;s anterior",
          `${r.anterior.criadas} abertas &middot; ${r.anterior.concluidas} conclu&iacute;das &middot; ${formatMin(r.anterior.focoTotalMin)}`)}
      </table>`

    const secMovimento = `
      <h2>Movimento por tipo</h2>
      <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="font-size:9pt;color:#64748b;">Tipo</td>
          <td align="right" style="font-size:9pt;color:#64748b;">Abertas</td>
          <td align="right" style="font-size:9pt;color:#64748b;">Conclu&iacute;das</td>
          <td align="right" style="font-size:9pt;color:#64748b;">Em aberto</td>
          <td align="right" style="font-size:9pt;color:#64748b;">Canceladas</td>
        </tr>
        ${r.movimento.map((m) => `
          <tr ${TR}>
            <td style="color:#1e293b;">${TIPO_LABEL[m.tipo]}</td>
            <td align="right">${m.criadas}</td>
            <td align="right">${m.concluidas}</td>
            <td align="right">${m.emAberto}</td>
            <td align="right" style="color:#94a3b8;">${m.canceladas}</td>
          </tr>
        `).join("")}
      </table>
      <p style="font-size:9pt;color:#94a3b8;margin:4pt 0 0 0;">
        &ldquo;Em aberto&rdquo; e &ldquo;canceladas&rdquo; referem-se aos itens abertos no m&ecirc;s, com a situa&ccedil;&atilde;o de hoje.
      </p>`

    const secPrazos = r.prazos.total === 0 ? "" : `
      <h2>Prazos que venciam no m&ecirc;s &mdash; ${r.prazos.total}</h2>
      <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
        ${linha("Entregues no prazo", String(r.prazos.noPrazo))}
        ${linha("Entregues com atraso", String(r.prazos.comAtraso))}
        ${linha("Vencidas e ainda em aberto", String(r.prazos.emAbertoVencido))}
        ${linha("A vencer", String(r.prazos.emAbertoAVencer))}
        ${linha("Canceladas", String(r.prazos.canceladas))}
      </table>`

    const secFoco = r.focoPorDemanda.length === 0 ? "" : `
      <h2>Tempo de foco &mdash; ${formatMin(r.focoTotalMin)} &middot; ${r.focoSessoes} ${r.focoSessoes === 1 ? "sess&atilde;o" : "sess&otilde;es"}</h2>
      <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
        ${r.focoPorDemanda.map((f) => `
          <tr ${TR}>
            <td style="color:#334155;">${esc(f.titulo)}</td>
            <td align="right" style="color:#475569;font-weight:bold;white-space:nowrap;">${formatMin(f.totalMin)}</td>
          </tr>
        `).join("")}
      </table>
      ${r.pomodoroCiclos > 0 ? `
      <p style="font-size:9pt;color:#64748b;margin:4pt 0 0 0;">
        Pomodoro: ${r.pomodoroCiclos} ${r.pomodoroCiclos === 1 ? "ciclo" : "ciclos"}${r.pomodoroMin > 0 ? ` &middot; ${formatMin(r.pomodoroMin)}` : ""} (contado &agrave; parte)
      </p>` : ""}`

    const secDiario = r.diarioPorTipo.length === 0 ? "" : `
      <h2>Di&aacute;rio &mdash; ${r.diarioDiasComRegistro} ${r.diarioDiasComRegistro === 1 ? "dia" : "dias"} com registro</h2>
      <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
        ${r.diarioPorTipo.map((e) => `
          <tr ${TR}>
            <td style="color:#334155;">${ENTRADA_LABEL[e.tipo]}</td>
            <td align="right" style="color:#1e293b;font-weight:bold;">${e.total}</td>
          </tr>
        `).join("")}
      </table>`

    const secTags = r.tags.length === 0 ? "" : `
      <h2>Tags mais usadas</h2>
      <p style="color:#334155;">${r.tags.map((t) => `#${esc(t.nome)} (${t.total})`).join("  &middot;  ")}</p>`

    const listaItens = (
      titulo: string,
      itens: { id: number; titulo: string; concluidoAt: string | null; prazo: string | null }[],
      campo: "concluidoAt" | "prazo",
      prefixo = "",
    ) => itens.length === 0 ? "" : `
      <h2>${titulo} &mdash; ${itens.length}</h2>
      <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
        ${itens.map((d) => `
          <tr ${TR}>
            <td style="color:#1e293b;">${esc(d.titulo)}</td>
            <td align="right" style="color:#94a3b8;font-size:9pt;white-space:nowrap;">
              ${prefixo}${dataCurta(campo === "concluidoAt" ? d.concluidoAt : d.prazo)}
            </td>
          </tr>
        `).join("")}
      </table>`

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <!--[if gte mso 9]><xml>
    <w:WordDocument><w:DoNotOptimizeForBrowser/></w:WordDocument>
  </xml><![endif]-->
  <style>
    @page Section1 { margin: 2cm 2cm 2cm 2cm; }
    div.Section1 { page: Section1; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1e293b; }
    .cabecalho { border-bottom: 2px solid #1e293b; padding-bottom: 10pt; margin-bottom: 18pt; }
    h1 { font-size: 18pt; margin: 0 0 4pt 0; text-transform: capitalize; }
    .subtitulo { font-size: 10pt; color: #64748b; margin: 0; }
    h2 {
      font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 1pt;
      border-bottom: 1px solid #e2e8f0; padding-bottom: 4pt; margin: 18pt 0 8pt 0;
      page-break-after: avoid;
    }
    table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
    tr    { page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="Section1">
    <div class="cabecalho">
      <h1>${mesExtensoBRT(mes)}</h1>
      <p class="subtitulo">Resumo do m&ecirc;s demandoo &mdash; ${esc(nomeUsuario)}${r.ehMesCorrente ? " &middot; parcial at&eacute; hoje" : ""}</p>
    </div>

    ${secNumeros}
    ${secMovimento}
    ${secPrazos}
    ${secFoco}
    ${secDiario}
    ${secTags}
    ${listaItens("Conclu&iacute;das no m&ecirc;s", r.concluidas, "concluidoAt")}
    ${listaItens("Vencidas e ainda em aberto", r.atrasadas, "prazo", "venceu ")}
  </div>
</body>
</html>`

    return new Response(html, {
      headers: {
        "Content-Type":        "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${mes} - Resumo do mês ${nomeUsuario}.doc"`,
      },
    })
  } catch (err) {
    console.error("[GET /api/resumo/exportar-doc]", err)
    return new Response("Erro interno", { status: 500 })
  }
}
