import { useState, useEffect, useRef } from "react"
import { ChevronDown, Loader2, Search, Zap } from "lucide-react"
import { fetchModels, EFFORT_LEVELS, DEFAULT_MODEL, DEFAULT_EFFORT } from "../lib/models"

export default function ModelSelector({ model, onModelChange, effort, onEffortChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [grouped, setGrouped] = useState(null)
  const [allModels, setAllModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    fetchModels()
      .then(({ all, grouped }) => {
        setAllModels(all)
        setGrouped(grouped)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
        setSearch("")
        setShowAll(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const currentModel = allModels.find((m) => m.id === model)
  const displayName = currentModel?.name || model.split("/").pop()

  const filteredModels = () => {
    if (search) {
      const q = search.toLowerCase()
      const hits = allModels
        .filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.id.toLowerCase().includes(q)
        )
        .filter((m) => m.supportsTools)
        .slice(0, 30)

      const groups = {}
      for (const m of hits) {
        let provider = m.id.split("/")[0].replace(/^~/, "")
        provider = provider.charAt(0).toUpperCase() + provider.slice(1)
        if (!groups[provider]) groups[provider] = []
        groups[provider].push(m)
      }
      return groups
    }
    if (showAll) {
      const toolModels = allModels.filter((m) => m.supportsTools).slice(0, 80)
      const groups = {}
      for (const m of toolModels) {
        let provider = m.id.split("/")[0].replace(/^~/, "")
        provider = provider.charAt(0).toUpperCase() + provider.slice(1)
        if (!groups[provider]) groups[provider] = []
        groups[provider].push(m)
      }
      return groups
    }
    return grouped
  }

  const groups = filteredModels()

  return (
    <div className="space-y-2">
      {/* Model Picker */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen((s) => !s)}
          className="w-full flex items-center justify-between py-2 text-sm text-[var(--text-primary)] cursor-pointer group"
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentModel?.supportsReasoning && (
              <Zap size={12} strokeWidth={1.5} className="text-[var(--accent-amber)] shrink-0" />
            )}
            <span className="font-[Space_Grotesk] truncate">{displayName}</span>
          </div>
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={`text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-all shrink-0 ml-2 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded-lg z-20 overflow-hidden max-h-[400px] flex flex-col">
            {/* Search */}
            <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-2">
              <Search size={13} strokeWidth={1.5} className="text-[var(--text-tertiary)] shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:outline-none font-[Space_Grotesk]"
              />
            </div>

            <div className="overflow-y-auto flex-1">
              {loading && (
                <div className="flex items-center gap-2 px-3 py-4 justify-center">
                  <Loader2 size={14} strokeWidth={1.5} className="text-[var(--text-tertiary)] animate-spin" />
                  <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--text-tertiary)]">
                    LOADING MODELS...
                  </span>
                </div>
              )}

              {error && (
                <div className="px-3 py-3 text-[12px] text-[var(--accent-red)]">[ERROR] {error}</div>
              )}

              {groups &&
                Object.entries(groups).map(([provider, models]) => (
                  <div key={provider}>
                    <div className="px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--text-tertiary)] bg-[var(--bg-inset)] sticky top-0">
                      {provider}
                    </div>
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onModelChange(m.id)
                          setOpen(false)
                          setSearch("")
                          setShowAll(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-[13px] cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                          m.id === model
                            ? "text-[var(--text-display)] bg-[var(--bg-raised)] border-l-2 border-l-[var(--accent-red)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] border-l-2 border-l-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {m.supportsReasoning && (
                            <Zap size={11} strokeWidth={1.5} className="text-[var(--accent-amber)] shrink-0" />
                          )}
                          <span className="font-[Space_Grotesk] truncate">{m.name}</span>
                        </div>
                        {m.pricing.prompt > 0 && (
                          <span className="font-mono text-[10px] text-[var(--text-disabled)] shrink-0">
                            ${(m.pricing.prompt * 1_000_000).toFixed(1)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}

              {!search && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full px-3 py-2.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-mono tracking-[0.04em] uppercase cursor-pointer transition-colors border-t border-[var(--border)]"
                >
                  SHOW ALL MODELS
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Effort Level */}
      {currentModel?.supportsReasoning && (
        <div>
          <span className="block font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--text-tertiary)] mb-1.5">
            REASONING EFFORT
          </span>
          <div className="flex border border-[var(--border-visible)] rounded overflow-hidden">
            {EFFORT_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => onEffortChange(level.value)}
                className={`flex-1 py-1.5 font-mono text-[11px] tracking-[0.06em] cursor-pointer transition-colors ${
                  effort === level.value
                    ? "bg-[var(--active-bg)] text-[var(--active-text)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
