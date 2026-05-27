"use client"

import { useEffect, useState } from "react"
import { Download, Share, X } from "lucide-react"

const STORAGE_KEY = "demandoo_install_dismissed"

type Platform = "android" | "ios" | null

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null

  // Já instalado como PWA
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (isStandalone) return null

  // Dispensou anteriormente
  if (localStorage.getItem(STORAGE_KEY) === "1") return null

  const ua = navigator.userAgent.toLowerCase()

  // iOS Safari (não Chrome no iOS)
  const isIos = /iphone|ipad|ipod/.test(ua)
  const isIosSafari = isIos && !/(crios|fxios|opios|mercury)/.test(ua)
  if (isIosSafari) return "ios"

  return null // Android tratado via beforeinstallprompt no useEffect
}

export default function InstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void } | null>(null)
  const [showAndroid, setShowAndroid] = useState(false)

  useEffect(() => {
    // Detecta iOS logo na montagem
    const p = detectPlatform()
    setPlatform(p)

    // Captura o evento do Chrome/Android
    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      // Checa se já foi dispensado
      if (localStorage.getItem(STORAGE_KEY) === "1") return
      setDeferredPrompt(e as Event & { prompt: () => void })
      setShowAndroid(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1")
    setPlatform(null)
    setShowAndroid(false)
    setDeferredPrompt(null)
  }

  async function installAndroid() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    setShowAndroid(false)
    setDeferredPrompt(null)
  }

  // iOS banner
  if (platform === "ios") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg px-4 py-3 flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center mt-0.5">
          <span className="text-white text-sm font-bold">d</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Instale o demandoo</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Toque em{" "}
            <span className="inline-flex items-center gap-0.5 font-medium text-slate-700">
              <Share size={12} strokeWidth={2} className="inline" /> Compartilhar
            </span>
            {" "}e depois em{" "}
            <span className="font-medium text-slate-700">&quot;Adicionar à Tela de Início&quot;</span>
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Fechar"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
    )
  }

  // Android / Chrome banner
  if (showAndroid) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
          <span className="text-white text-sm font-bold">d</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Instale o demandoo</p>
          <p className="text-xs text-slate-500">Acesso rápido direto da tela inicial</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={dismiss}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1"
          >
            Não mostrar
          </button>
          <button
            onClick={installAndroid}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download size={13} strokeWidth={2} />
            Instalar
          </button>
        </div>
      </div>
    )
  }

  return null
}
