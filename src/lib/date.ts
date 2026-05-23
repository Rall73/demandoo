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
