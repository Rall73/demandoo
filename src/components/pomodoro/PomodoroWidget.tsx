"use client"

import { useState } from "react"
import {
  Timer, Coffee, Pause, Play, SkipForward, RotateCcw,
  Settings, X, Minus, Check,
} from "lucide-react"
import { usePomodoro } from "./PomodoroProvider"

function mmss(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function PomodoroWidget() {
  const {
    fase, rodando, restanteSeg, totalSeg, ciclos, alerta, config,
    pausar, retomar, resetar, pular, fecharAlerta, setConfig,
  } = usePomodoro()

  const [minimizado, setMinimizado] = useState(false)
  const [configAberta, setConfigAberta] = useState(false)

  // Não renderiza nada quando parado e sem alerta pendente
  if (fase === "PARADO" && !alerta) return null

  const ehFoco   = fase === "FOCO"
  const progresso = totalSeg > 0 ? Math.min(100, ((totalSeg - restanteSeg) / totalSeg) * 100) : 0

  const cor = ehFoco
    ? { bg: "bg-violet-600", text: "text-violet-600", ring: "ring-violet-200", soft: "bg-violet-50 border-violet-200" }
    : { bg: "bg-emerald-600", text: "text-emerald-600", ring: "ring-emerald-200", soft: "bg-emerald-50 border-emerald-200" }

  const FaseIcon = ehFoco ? Timer : Coffee

  // ── Modal de alerta de fim de fase ──────────────────────────────────────────
  const alertaModal = alerta && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${alerta === "FIM_FOCO" ? "bg-emerald-100" : "bg-violet-100"}`}>
          {alerta === "FIM_FOCO"
            ? <Coffee size={26} strokeWidth={2} className="text-emerald-600" />
            : <Timer  size={26} strokeWidth={2} className="text-violet-600" />}
        </div>
        <h3 className="text-lg font-bold text-slate-800 mt-4">
          {alerta === "FIM_FOCO" ? "Hora da pausa!" : "Pausa encerrada"}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {alerta === "FIM_FOCO"
            ? `Bom trabalho. Pare por ${config.pausaMin} min — já iniciei sua pausa.`
            : "Descanso concluído. Pronto para o próximo ciclo de foco?"}
        </p>
        <button
          onClick={fecharAlerta}
          className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-colors"
        >
          Entendi
        </button>
      </div>
    </div>
  )

  // ── Estado minimizado: bolinha com o tempo ──────────────────────────────────
  if (minimizado && fase !== "PARADO") {
    return (
      <>
        <button
          onClick={() => setMinimizado(false)}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 ${cor.bg} text-white pl-3 pr-4 py-2.5 rounded-full shadow-lg hover:opacity-90 transition-opacity`}
          title="Abrir pomodoro"
        >
          <FaseIcon size={16} strokeWidth={2.5} />
          <span className="text-sm font-bold tabular-nums">{mmss(restanteSeg)}</span>
        </button>
        {alertaModal}
      </>
    )
  }

  return (
    <>
      {fase !== "PARADO" && (
        <div className="fixed bottom-6 right-6 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          {/* Cabeçalho */}
          <div className={`flex items-center gap-2 px-4 py-2.5 ${cor.bg} text-white`}>
            <FaseIcon size={16} strokeWidth={2.5} />
            <span className="text-sm font-semibold flex-1">{ehFoco ? "Foco" : "Pausa"}</span>
            <button onClick={() => setConfigAberta(true)} title="Configurar" className="opacity-80 hover:opacity-100">
              <Settings size={15} strokeWidth={2} />
            </button>
            <button onClick={() => setMinimizado(true)} title="Minimizar" className="opacity-80 hover:opacity-100">
              <Minus size={16} strokeWidth={2.5} />
            </button>
            <button onClick={resetar} title="Encerrar" className="opacity-80 hover:opacity-100">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Tempo */}
          <div className="px-4 pt-4 pb-3 text-center">
            <div className={`text-4xl font-bold tabular-nums ${rodando ? "text-slate-800" : "text-slate-400"}`}>
              {mmss(restanteSeg)}
            </div>
            {/* Barra de progresso */}
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${cor.bg} transition-all duration-300`} style={{ width: `${progresso}%` }} />
            </div>
            {ciclos > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                {ciclos} {ciclos === 1 ? "ciclo concluído" : "ciclos concluídos"}
              </p>
            )}
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2 px-4 pb-4">
            {rodando ? (
              <button
                onClick={pausar}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Pause size={15} strokeWidth={2.5} /> Pausar
              </button>
            ) : (
              <button
                onClick={retomar}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white ${cor.bg} hover:opacity-90 transition-opacity`}
              >
                <Play size={15} strokeWidth={2.5} /> Retomar
              </button>
            )}
            <button
              onClick={pular}
              title={ehFoco ? "Pular para a pausa" : "Pular pausa"}
              className="flex items-center justify-center p-2 rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <SkipForward size={15} strokeWidth={2.5} />
            </button>
            <button
              onClick={resetar}
              title="Reiniciar"
              className="flex items-center justify-center p-2 rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de configuração */}
      {configAberta && (
        <ConfigModal
          config={config}
          onSave={(patch) => { setConfig(patch); setConfigAberta(false) }}
          onClose={() => setConfigAberta(false)}
        />
      )}

      {alertaModal}
    </>
  )
}

// ── Modal de configuração ────────────────────────────────────────────────────────

function ConfigModal({
  config, onSave, onClose,
}: {
  config: import("./PomodoroProvider").PomodoroConfig
  onSave: (patch: Partial<import("./PomodoroProvider").PomodoroConfig>) => void
  onClose: () => void
}) {
  const [focoMin,     setFocoMin]     = useState(config.focoMin)
  const [pausaMin,    setPausaMin]    = useState(config.pausaMin)
  const [som,         setSom]         = useState(config.som)
  const [notificacao, setNotificacao] = useState(config.notificacao)

  function salvar() {
    onSave({
      focoMin:  Math.min(180, Math.max(1, Math.round(focoMin)  || 25)),
      pausaMin: Math.min(60,  Math.max(1, Math.round(pausaMin) || 5)),
      som,
      notificacao,
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <Settings size={18} strokeWidth={2} className="text-violet-600" />
          </div>
          <h3 className="text-base font-bold text-slate-800 flex-1">Configurar pomodoro</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-slate-600">Tempo de foco (min)</label>
            <input
              type="number" min={1} max={180}
              value={focoMin}
              onChange={(e) => setFocoMin(Number(e.target.value))}
              className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white text-center focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-slate-600">Tempo de pausa (min)</label>
            <input
              type="number" min={1} max={60}
              value={pausaMin}
              onChange={(e) => setPausaMin(Number(e.target.value))}
              className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white text-center focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-slate-600">Som ao terminar</span>
            <input type="checkbox" checked={som} onChange={(e) => setSom(e.target.checked)} className="w-4 h-4 accent-violet-600" />
          </label>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-slate-600">Notificação do navegador</span>
            <input type="checkbox" checked={notificacao} onChange={(e) => setNotificacao(e.target.checked)} className="w-4 h-4 accent-violet-600" />
          </label>
        </div>

        <button
          onClick={salvar}
          className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
        >
          <Check size={16} strokeWidth={2.5} /> Salvar
        </button>
      </div>
    </div>
  )
}
