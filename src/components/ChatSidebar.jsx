import { useState, useRef, useEffect } from "react"
import { Send, Settings, Sun, Moon, Plus, Trash2, ChevronDown } from "lucide-react"
import Markdown from "react-markdown"
import ModelSelector from "./ModelSelector"
import PropertiesPanel from "./PropertiesPanel"
import { useTheme } from "../lib/theme"
import { useConvoStore } from "../lib/store"

function collapseMessages(messages) {
  const filtered = messages.filter((m) => m.role !== "system")
  const result = []

  for (const msg of filtered) {
    if (msg.role === "tool") {
      if (msg.content.startsWith("[ERROR]") || msg.content.startsWith("[WARN]")) {
        result.push(msg)
      }
      continue
    }

    // Merge tool-call-only assistant messages into previous tool-call-only message
    if (msg.role === "assistant" && msg.toolCalls?.length) {
      const prev = result[result.length - 1]
      if (!msg.content && prev?.role === "assistant" && prev._toolOnly) {
        prev.toolCalls = [...prev.toolCalls, ...msg.toolCalls]
        continue
      }
      if (!msg.content) {
        result.push({ ...msg, _toolOnly: true })
        continue
      }
      // Has both content and tool calls — check if previous was tool-only, merge tools into this
      if (prev?.role === "assistant" && prev._toolOnly) {
        const merged = {
          ...msg,
          toolCalls: [...prev.toolCalls, ...msg.toolCalls],
        }
        result[result.length - 1] = merged
        continue
      }
    }

    result.push({ ...msg })
  }

  return result
}

export default function ChatSidebar({
  messages,
  onSend,
  isLoading,
  status,
  reasoningText,
  elapsed,
  model,
  onModelChange,
  effort,
  onEffortChange,
  apiKey,
  onApiKeyChange,
  selectedElements,
  penStrokeCount,
  onUpdateElement,
  onDeleteElement,
}) {
  const isProd = import.meta.env.VITE_IS_PROD === "true"
  const [input, setInput] = useState("")
  const [showSettings, setShowSettings] = useState(!isProd && !apiKey)
  const messagesEndRef = useRef(null)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    onSend(text)
    setInput("")
  }

  const statusLabel = {
    connecting: "CONNECTING",
    streaming: "RECEIVING",
    reasoning: "REASONING",
    responding: "RESPONDING",
    drawing: "DRAWING",
  }

  const { convos, order, activeId, newConvo, switchConvo, deleteConvo } = useConvoStore()
  const [showConvos, setShowConvos] = useState(false)

  return (
    <div className="w-[380px] min-w-[380px] border-l border-[var(--border)] bg-[var(--bg-page)] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <button
          onClick={() => setShowConvos((s) => !s)}
          className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <span className="truncate max-w-[160px]">{convos[activeId]?.title || "CHAT"}</span>
          <ChevronDown size={12} strokeWidth={1.5} className={`transition-transform ${showConvos ? "rotate-180" : ""}`} />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { newConvo(); setShowConvos(false) }}
            className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="New chat"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          </button>
          {!isProd && (
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Settings size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      {showConvos && (
        <div className="border-b border-[var(--border)] max-h-[240px] overflow-y-auto">
          {order.map((id) => {
            const c = convos[id]
            if (!c) return null
            const isActive = id === activeId
            return (
              <div
                key={id}
                className={`flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors ${
                  isActive
                    ? "bg-[var(--bg-raised)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                }`}
                onClick={() => { switchConvo(id); setShowConvos(false) }}
              >
                <span className="flex-1 truncate text-[13px]">{c.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConvo(id) }}
                  className="p-0.5 text-[var(--text-disabled)] hover:text-[var(--accent-red)] transition-colors cursor-pointer"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Settings */}
      {!isProd && showSettings && (
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--text-tertiary)] mb-1.5">
            OPENROUTER API KEY
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-or-..."
            className="w-full bg-transparent border-b border-[var(--border-visible)] text-[var(--text-primary)] text-sm font-mono py-1.5 px-0 placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
          />
        </div>
      )}

      {/* Model Selector */}
      {!isProd && (
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <ModelSelector
            model={model}
            onModelChange={onModelChange}
            effort={effort}
            onEffortChange={onEffortChange}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--text-disabled)]">
              NO MESSAGES
            </span>
            <span className="text-[13px] text-[var(--text-tertiary)] text-center leading-relaxed max-w-[240px]">
              Ask the AI to draw something on the canvas.
            </span>
          </div>
        )}
        {collapseMessages(messages).map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Live status */}
        {isLoading && (
          <div className="py-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <StatusDot status={status} />
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-[var(--text-tertiary)]">
                {statusLabel[status] || "THINKING"}
              </span>
              {elapsed > 0 && (
                <span className="font-mono text-[10px] text-[var(--text-disabled)] ml-auto">
                  {elapsed}s
                </span>
              )}
            </div>
            {status === "reasoning" && reasoningText && (
              <div className="text-[12px] text-[var(--text-tertiary)] leading-relaxed max-h-[120px] overflow-y-auto whitespace-pre-wrap border-l-2 border-[var(--border-visible)] pl-2">
                {reasoningText.slice(-500)}
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Properties Panel — show for single selection */}
      {selectedElements.length === 1 && (
        <PropertiesPanel
          element={selectedElements[0]}
          onUpdate={onUpdateElement}
          onDelete={onDeleteElement}
        />
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-[var(--border)]">
        {(selectedElements.length > 0 || penStrokeCount > 0) && (
          <div className={`mb-2 font-mono text-[10px] tracking-[0.08em] uppercase ${penStrokeCount > 0 ? "text-[var(--accent-red)]" : "text-[var(--interactive)]"}`}>
            {penStrokeCount > 0
              ? `${penStrokeCount} annotation${penStrokeCount > 1 ? "s" : ""} — ask about circled area`
              : `${selectedElements.length} element${selectedElements.length > 1 ? "s" : ""} selected — ask about them`
            }
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              !isProd && !apiKey
                ? "Set API key first"
                : penStrokeCount > 0
                  ? "Ask about circled area..."
                  : selectedElements.length > 0
                  ? "Ask about selected elements..."
                  : "Describe what to draw..."
            }
            disabled={(!isProd && !apiKey) || isLoading}
            className="flex-1 bg-transparent text-[var(--text-primary)] text-sm placeholder:text-[var(--text-disabled)] focus:outline-none disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || (!isProd && !apiKey)}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:text-[var(--text-tertiary)] transition-colors cursor-pointer disabled:cursor-default"
          >
            <Send size={16} strokeWidth={1.5} />
          </button>
        </div>
      </form>
    </div>
  )
}

function StatusDot({ status }) {
  const colors = {
    connecting: "var(--text-tertiary)",
    streaming: "var(--accent-amber)",
    reasoning: "var(--accent-purple)",
    responding: "var(--interactive)",
    drawing: "var(--accent-green)",
  }
  const color = colors[status] || "var(--text-tertiary)"

  return (
    <span className="relative flex h-2 w-2">
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ backgroundColor: color }}
      />
    </span>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === "user"
  const isToolResult = message.role === "tool"

  if (isToolResult) {
    const isError = message.content.startsWith("[ERROR]")
    const isWarn = message.content.startsWith("[WARN]")
    if (!isError && !isWarn) return null
    return (
      <div
        className={`font-mono text-[11px] tracking-[0.04em] px-2.5 py-1.5 rounded ${
          isError ? "text-[var(--accent-red)]" : "text-[var(--accent-amber)]"
        }`}
        style={{
          backgroundColor: isError
            ? "color-mix(in srgb, var(--accent-red) 10%, transparent)"
            : "color-mix(in srgb, var(--accent-amber) 10%, transparent)",
        }}
      >
        {message.content}
      </div>
    )
  }

  if (message.toolCalls && message.toolCalls.length > 0) {
    return (
      <div className="space-y-1.5">
        {message.content && <MarkdownContent content={message.content} />}
        <ToolCallSummary toolCalls={message.toolCalls} />
      </div>
    )
  }

  if (isUser) {
    return (
      <div className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--text-tertiary)] block mb-1">
          YOU
          {message._selectionCount > 0 && (
            <span className="text-[var(--interactive)] ml-2">
              [{message._selectionCount} SELECTED]
            </span>
          )}
          {message._penCount > 0 && (
            <span className="text-[var(--accent-red)] ml-2">
              [ANNOTATED]
            </span>
          )}
        </span>
        {message.content}
      </div>
    )
  }

  return <MarkdownContent content={message.content} />
}

function MarkdownContent({ content }) {
  if (!content) return null
  return (
    <div className="prose-chat text-[14px] leading-relaxed text-[var(--text-primary)]">
      <Markdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="text-[var(--text-display)] font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-[var(--text-faint)] italic">{children}</em>,
          code: ({ children }) => (
            <code className="font-mono text-[13px] text-[var(--accent-amber)] px-1 py-0.5 rounded" style={{ backgroundColor: "color-mix(in srgb, var(--accent-amber) 10%, transparent)" }}>
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="font-mono text-[12px] text-[var(--text-faint)] bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded px-3 py-2 my-2 overflow-x-auto">
              {children}
            </pre>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-[var(--text-faint)]">{children}</li>,
          h1: ({ children }) => <h1 className="text-[18px] font-semibold text-[var(--text-display)] mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[16px] font-semibold text-[var(--text-display)] mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[15px] font-medium text-[var(--text-display)] mb-1">{children}</h3>,
          hr: () => <hr className="border-[var(--border-visible)] my-2" />,
          a: ({ href, children }) => (
            <a href={href} className="text-[var(--interactive)] hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  )
}

function ToolCallSummary({ toolCalls }) {
  const [expanded, setExpanded] = useState(false)
  const count = toolCalls.length
  const names = [...new Set(toolCalls.map((tc) => tc.function.name))]

  return (
    <button
      onClick={() => setExpanded((e) => !e)}
      className="w-full text-left font-mono text-[11px] tracking-[0.02em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer py-1"
    >
      <span className="text-[var(--text-disabled)]">
        {count} tool call{count > 1 ? "s" : ""}: {names.join(", ")}
        <span className="ml-1.5 text-[var(--text-subtle)]">{expanded ? "[-]" : "[+]"}</span>
      </span>
      {expanded && (
        <div className="mt-1.5 space-y-0.5 text-[10px] text-[var(--text-muted)]">
          {toolCalls.map((tc, i) => (
            <div key={i} className="truncate">
              {tc.function.name}({JSON.stringify(tc.function.arguments || {}).slice(0, 60)})
            </div>
          ))}
        </div>
      )}
    </button>
  )
}
