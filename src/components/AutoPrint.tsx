"use client"

import { useEffect } from "react"

/**
 * Dispara window.print() ao montar, definindo document.title antes —
 * o Chrome usa o título como nome sugerido do PDF.
 */
export default function AutoPrint({ title }: { title: string }) {
  useEffect(() => {
    const prev  = document.title
    document.title = title
    const t = setTimeout(() => {
      window.print()
      document.title = prev
    }, 600)
    return () => clearTimeout(t)
  }, [title])
  return null
}
