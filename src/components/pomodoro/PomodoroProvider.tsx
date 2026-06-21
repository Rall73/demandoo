"use client"

import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from "react"

// ── Tipos ───────────────────────────────────────────────────────────────────────

export type PomodoroFase = "PARADO" | "FOCO" | "PAUSA"
export type PomodoroAlerta = "FIM_FOCO" | "FIM_PAUSA"

export interface PomodoroConfig {
  focoMin:     number
  pausaMin:    number
  som:         boolean
  notificacao: boolean
}

interface PomodoroContextValue {
  fase:        PomodoroFase
  rodando:     boolean        // true = contando; false = pausado ou parado
  restanteSeg: number         // segundos restantes na fase atual
  totalSeg:    number         // duração total da fase atual (para barra de progresso)
  ciclos:      number         // pomodoros de foco concluídos
  alerta:      PomodoroAlerta | null
  config:      PomodoroConfig
  start:       () => void
  pausar:      () => void
  retomar:     () => void
  resetar:     () => void
  pular:       () => void
  fecharAlerta: () => void
  setConfig:   (patch: Partial<PomodoroConfig>) => void
}

// ── Constantes ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "demandoo:pomodoro"

const CONFIG_PADRAO: PomodoroConfig = {
  focoMin:     25,
  pausaMin:    5,
  som:         true,
  notificacao: false,
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null)

// ── Helpers de efeito (som / notificação) ────────────────────────────────────────

function tocarBeep() {
  try {
    const ctx  = new AudioContext()
    const tocar = (delay: number) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.value = 880
      const t0 = ctx.currentTime + delay
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4)
      osc.start(t0)
      osc.stop(t0 + 0.42)
    }
    tocar(0)
    tocar(0.5)
    setTimeout(() => ctx.close(), 1500)
  } catch {
    /* AudioContext indisponível — silencioso */
  }
}

function notificar(titulo: string, corpo: string) {
  try {
    if (typeof Notification === "undefined") return
    if (Notification.permission === "granted") {
      new Notification(titulo, { body: corpo, icon: "/icon.svg" })
    }
  } catch {
    /* Notification indisponível — silencioso */
  }
}

// Registra o ciclo de foco concluído no Diário de hoje (fire-and-forget)
function registrarCicloNoDiario(duracaoMin: number) {
  try {
    fetch("/api/diario/pomodoro", {
      method:    "POST",
      headers:   { "Content-Type": "application/json" },
      body:      JSON.stringify({ duracaoMin }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* offline — ignora */
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [fase,            setFase]            = useState<PomodoroFase>("PARADO")
  const [fimPrevisto,     setFimPrevisto]     = useState<number | null>(null)   // timestamp ms do fim da fase
  const [restantePausado, setRestantePausado] = useState<number | null>(null)   // ms congelados quando pausado
  const [ciclos,          setCiclos]          = useState(0)
  const [config,          setConfigState]     = useState<PomodoroConfig>(CONFIG_PADRAO)
  const [alerta,          setAlerta]          = useState<PomodoroAlerta | null>(null)
  const [agora,           setAgora]           = useState(() => Date.now())
  const [hidratado,       setHidratado]       = useState(false)

  // Evita transição dupla quando o tick e o efeito disparam juntos
  const transicionando = useRef(false)

  // ── Hidratação a partir do localStorage ──────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const s = JSON.parse(raw) as Partial<{
          fase: PomodoroFase; fimPrevisto: number | null
          restantePausado: number | null; ciclos: number; config: PomodoroConfig
        }>
        if (s.config) setConfigState({ ...CONFIG_PADRAO, ...s.config })
        if (s.ciclos) setCiclos(s.ciclos)

        if (s.fase && s.fase !== "PARADO") {
          if (s.restantePausado != null) {
            // estava pausado: retoma congelado
            setFase(s.fase)
            setRestantePausado(s.restantePausado)
          } else if (s.fimPrevisto != null && Date.now() < s.fimPrevisto) {
            // ainda dentro do tempo: retoma rodando
            setFase(s.fase)
            setFimPrevisto(s.fimPrevisto)
          }
          // se expirou enquanto ausente: permanece PARADO (não dispara som ao voltar)
        }
      }
    } catch {
      /* localStorage indisponível */
    }
    setHidratado(true)
  }, [])

  // ── Persistência ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hidratado) return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ fase, fimPrevisto, restantePausado, ciclos, config }),
      )
    } catch {
      /* localStorage indisponível */
    }
  }, [fase, fimPrevisto, restantePausado, ciclos, config, hidratado])

  // ── Tick de UI (re-render) — só quando contando ──────────────────────────────
  useEffect(() => {
    if (fase === "PARADO" || restantePausado !== null) return
    const iv = setInterval(() => setAgora(Date.now()), 250)
    return () => clearInterval(iv)
  }, [fase, restantePausado])

  // ── Transição automática quando a fase chega a zero ──────────────────────────
  useEffect(() => {
    if (fase === "PARADO" || restantePausado !== null || fimPrevisto === null) return
    if (agora < fimPrevisto || transicionando.current) return

    transicionando.current = true

    if (fase === "FOCO") {
      setCiclos((c) => c + 1)
      registrarCicloNoDiario(config.focoMin)   // só ciclos completos contam
      setAlerta("FIM_FOCO")
      if (config.som) tocarBeep()
      if (config.notificacao) notificar("Hora da pausa ☕", `Foco concluído. Descanse ${config.pausaMin} min.`)
      setFase("PAUSA")
      setFimPrevisto(Date.now() + config.pausaMin * 60_000)
    } else {
      setAlerta("FIM_PAUSA")
      if (config.som) tocarBeep()
      if (config.notificacao) notificar("Pausa encerrada", "Pronto para focar de novo?")
      setFase("PARADO")
      setFimPrevisto(null)
    }

    // libera o trava-transição no próximo frame
    setTimeout(() => { transicionando.current = false }, 0)
  }, [agora, fase, restantePausado, fimPrevisto, config])

  // ── Ações ────────────────────────────────────────────────────────────────────

  const pedirPermissaoNotif = useCallback(() => {
    try {
      if (
        config.notificacao &&
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission()
      }
    } catch {
      /* ignore */
    }
  }, [config.notificacao])

  const start = useCallback(() => {
    pedirPermissaoNotif()
    // Se já está rodando ou pausado, apenas mantém — não reinicia o progresso
    setFase((f) => {
      if (f !== "PARADO") return f
      setFimPrevisto(Date.now() + config.focoMin * 60_000)
      setRestantePausado(null)
      setAlerta(null)
      return "FOCO"
    })
  }, [config.focoMin, pedirPermissaoNotif])

  const pausar = useCallback(() => {
    setRestantePausado((rp) => {
      if (rp !== null || fimPrevisto === null) return rp
      return Math.max(0, fimPrevisto - Date.now())
    })
  }, [fimPrevisto])

  const retomar = useCallback(() => {
    setRestantePausado((rp) => {
      if (rp === null) return rp
      setFimPrevisto(Date.now() + rp)
      return null
    })
  }, [])

  const resetar = useCallback(() => {
    setFase("PARADO")
    setFimPrevisto(null)
    setRestantePausado(null)
    setAlerta(null)
    transicionando.current = false
  }, [])

  // Pula para a próxima fase manualmente (FOCO→PAUSA, PAUSA→PARADO)
  const pular = useCallback(() => {
    setFase((f) => {
      if (f === "FOCO") {
        setCiclos((c) => c + 1)
        setFimPrevisto(Date.now() + config.pausaMin * 60_000)
        setRestantePausado(null)
        return "PAUSA"
      }
      setFimPrevisto(null)
      setRestantePausado(null)
      return "PARADO"
    })
  }, [config.pausaMin])

  const fecharAlerta = useCallback(() => setAlerta(null), [])

  const setConfig = useCallback((patch: Partial<PomodoroConfig>) => {
    setConfigState((c) => ({ ...c, ...patch }))
  }, [])

  // ── Valores derivados ────────────────────────────────────────────────────────
  const rodando  = fase !== "PARADO" && restantePausado === null
  const totalSeg = (fase === "PAUSA" ? config.pausaMin : config.focoMin) * 60
  const restanteMs =
    restantePausado !== null
      ? restantePausado
      : fimPrevisto !== null
        ? Math.max(0, fimPrevisto - agora)
        : 0
  const restanteSeg = Math.ceil(restanteMs / 1000)

  return (
    <PomodoroContext.Provider
      value={{
        fase, rodando, restanteSeg, totalSeg, ciclos, alerta, config,
        start, pausar, retomar, resetar, pular, fecharAlerta, setConfig,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────────────────────────

export function usePomodoro(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error("usePomodoro deve ser usado dentro de <PomodoroProvider>")
  return ctx
}
