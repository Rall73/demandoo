/**
 * Limite de frequência por IP, em memória.
 *
 * ⚠️ Limitação consciente: o estado vive no processo. Reiniciou o app, zerou;
 * se o Passenger subir mais de um processo, cada um tem a própria contagem.
 * Não serve como controle rígido — serve para **cortar rajada**, que é o caso
 * que machuca: bot disparando dezenas de e-mails em segundos pelo endpoint de
 * recuperação de senha e queimando a reputação do SMTP.
 *
 * Um limitador de verdade exigiria tabela no banco ou Redis. Se o volume um dia
 * justificar, o lugar de trocar é aqui — a interface pública não muda.
 */

type Registro = { contagem: number; janelaAte: number }

const memoria = new Map<string, Registro>()

/** Remove chaves vencidas para a memória não crescer sem limite. */
function limpar(agora: number) {
  if (memoria.size < 500) return
  for (const [chave, reg] of memoria) {
    if (reg.janelaAte <= agora) memoria.delete(chave)
  }
}

/**
 * Extrai o IP do cliente. Na Hostinger o app roda atrás de proxy reverso,
 * então `x-forwarded-for` é a fonte real — o primeiro da lista é o cliente.
 *
 * Devolve `null` quando não dá para identificar. É importante que seja null e
 * não um valor fixo tipo "desconhecido": todo mundo cairia no mesmo balde e o
 * limite passaria a valer para o app inteiro, não por pessoa.
 */
export function ipDaRequisicao(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const primeiro = xff.split(",")[0].trim()
    if (primeiro) return primeiro
  }
  return req.headers.get("x-real-ip")
}

/**
 * Consome uma tentativa. Retorna `false` quando o limite foi estourado.
 *
 * **Falha aberto:** sem IP identificável, libera. Rate limit é defesa de melhor
 * esforço contra rajada — barrar gente real por não saber de onde ela veio é um
 * estrago maior do que o que se está evitando.
 *
 * @param ip       IP do cliente, ou null quando desconhecido
 * @param rota     nome da rota, para separar os baldes
 * @param limite   tentativas permitidas na janela
 * @param janelaMs duração da janela
 */
export function permitirPorIp(
  ip: string | null, rota: string, limite: number, janelaMs: number,
): boolean {
  if (!ip) return true

  const ok = permitir(`${rota}:${ip}`, limite, janelaMs)

  // Log só no bloqueio: além de registrar abuso, é o que revela se o IP
  // detectado é o do cliente ou o do proxy. Se aparecerem bloqueios legítimos
  // sempre com o MESMO ip, é sinal de que o proxy da Hostinger está
  // sobrescrevendo o x-forwarded-for e todos caem no mesmo balde — nesse caso o
  // limite precisa ser afrouxado ou trocado por outra chave.
  if (!ok) console.warn(`[rate-limit] bloqueado ${rota} ip=${ip}`)

  return ok
}

export function permitir(chave: string, limite: number, janelaMs: number): boolean {
  const agora = Date.now()
  limpar(agora)

  const reg = memoria.get(chave)

  if (!reg || reg.janelaAte <= agora) {
    memoria.set(chave, { contagem: 1, janelaAte: agora + janelaMs })
    return true
  }

  if (reg.contagem >= limite) return false

  reg.contagem++
  return true
}

/** Segundos que faltam para a janela reabrir — usado no header Retry-After. */
export function segundosParaLiberar(chave: string): number {
  const reg = memoria.get(chave)
  if (!reg) return 0
  return Math.max(0, Math.ceil((reg.janelaAte - Date.now()) / 1000))
}
