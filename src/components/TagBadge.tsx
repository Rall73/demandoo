import { Tag as TagIcon, X } from "lucide-react"

export function TagBadge({
  nome, onClick, onRemove, size = "sm",
}: {
  nome:      string
  onClick?:  () => void
  onRemove?: () => void
  size?:     "sm" | "xs"
}) {
  const sz = size === "xs" ? "text-[10px] px-1.5 py-0.5 gap-0.5" : "text-xs px-2 py-0.5 gap-1"
  const ico = size === "xs" ? 9 : 11
  return (
    <span
      onClick={onClick ? (e) => { e.preventDefault(); e.stopPropagation(); onClick() } : undefined}
      role={onClick ? "button" : undefined}
      className={`inline-flex items-center rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium ${sz} ${onClick ? "cursor-pointer hover:bg-violet-100 transition-colors" : ""}`}
    >
      <TagIcon size={ico} strokeWidth={2} />
      {nome}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 text-violet-400 hover:text-violet-700"
          title="Remover tag"
        >
          <X size={ico} strokeWidth={2.5} />
        </button>
      )}
    </span>
  )
}
