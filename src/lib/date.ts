/**
 * Helpers de data para BRT (UTC-3).
 * O servidor roda em UTC — nunca use new Date() cru para "hoje".
 */

/** Retorna a data/hora atual em BRT como objeto Date (ainda em UTC internamente). */
export function agoraNoBrasil(): Date {
  return new Date(Date.now() - 3 * 60 * 60 * 1000)
}

/** Retorna um Date representando meia-noite BRT de hoje (= 03:00 UTC). */
export function hojeNoBrasil(): Date {
  const agora = agoraNoBrasil()
  const iso = agora.toISOString().slice(0, 10) // YYYY-MM-DD em BRT
  return new Date(`${iso}T03:00:00.000Z`)
}

/** Retorna YYYY-MM-DD em BRT para hoje. */
export function hojeISOBrasil(): string {
  return agoraNoBrasil().toISOString().slice(0, 10)
}

/** Dia da semana em BRT (0=Dom … 6=Sáb). */
export function diaSemanaHojeBRT(): number {
  return agoraNoBrasil().getUTCDay()
}

const DIAS_SEMANA_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]

export function diaSemanaHojePT(): string {
  return DIAS_SEMANA_PT[diaSemanaHojeBRT()]
}

/** Primeiro dia do mês corrente em BRT (meia-noite BRT = 03:00 UTC). */
export function inicioMesNoBrasil(): Date {
  const agora = agoraNoBrasil()
  const ano   = agora.getUTCFullYear()
  const mes   = agora.getUTCMonth() + 1
  return new Date(`${ano}-${String(mes).padStart(2, "0")}-01T03:00:00.000Z`)
}

/** Retorna YYYY-MM em BRT para o mês corrente. */
export function mesAtualISOBrasil(): string {
  return agoraNoBrasil().toISOString().slice(0, 7)
}

/** Soma (ou subtrai) n meses a uma string YYYY-MM. */
export function somarMesesISO(mesISO: string, n: number): string {
  const [ano, mes] = mesISO.split("-").map(Number)
  const total = ano * 12 + (mes - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`
}

/**
 * Intervalo [início, fim) de um mês YYYY-MM em BRT, pronto para filtro Prisma.
 * Início = meia-noite BRT do dia 1; fim = meia-noite BRT do dia 1 do mês seguinte.
 */
export function intervaloMesBRT(mesISO: string): { inicio: Date; fim: Date } {
  return {
    inicio: new Date(`${mesISO}-01T03:00:00.000Z`),
    fim:    new Date(`${somarMesesISO(mesISO, 1)}-01T03:00:00.000Z`),
  }
}

/** "2026-07" → "julho de 2026". */
export function mesExtensoBRT(mesISO: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  }).format(new Date(`${mesISO}-01T03:00:00.000Z`))
}

/**
 * Converte uma string YYYY-MM-DD (em BRT) para Date armazenável no banco
 * como meia-noite BRT (03:00 UTC).
 */
export function parseDateBRT(iso: string): Date {
  return new Date(`${iso}T03:00:00.000Z`)
}

/**
 * Converte um Date do banco (UTC) para string YYYY-MM-DD em BRT.
 */
export function toDateBRT(d: Date): string {
  return new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * Converte "YYYY-MM-DDTHH:mm" (horário BRT, de <input type="datetime-local">)
 * para Date armazenável no banco (UTC). BRT = UTC-3, então o offset -03:00
 * é aplicado explicitamente.
 */
export function parseDateTimeBRT(local: string): Date {
  const comSeg = local.length === 16 ? `${local}:00` : local
  return new Date(`${comSeg}-03:00`)
}

/**
 * Converte um Date do banco (UTC) para "YYYY-MM-DDTHH:mm" em BRT,
 * pronto para preencher um <input type="datetime-local">.
 */
export function toDateTimeLocalBRT(d: Date): string {
  return new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 16)
}
