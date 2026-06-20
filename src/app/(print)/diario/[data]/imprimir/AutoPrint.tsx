"use client"

import { useEffect } from "react"

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
