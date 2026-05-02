import { useState, useRef, useEffect } from "react"
import { Send, Settings } from "lucide-react"
import Markdown from "react-markdown"
import ModelSelector from "./ModelSelector"
import PropertiesPanel from "./PropertiesPanel"

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
  onUpdateElement,
  onDeleteElement,
}) {
  const [input, setInput] = useState("")
  const [showSettings, setShowSettings] = useState(!apiKey)
  const messagesEndRef = useRef(null)

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

  return (
    <div className="w-[380px] min-w-[380px] border-l border-[#222] bg-black flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-[#999]">
          CHAT
        </span>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="p-1.5 rounded text-[#666] hover:text-[#e8e8e8] transition-colors cursor-pointer"
        >
          <Settings size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-[#222]">
          <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-[#666] mb-1.5">
            OPENROUTER API KEY
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-or-..."
            className="w-full bg-transparent border-b border-[#333] text-[#e8e8e8] text-sm font-mono py-1.5 px-0 placeholder:text-[#444] focus:outline-none focus:border-[#e8e8e8] transition-colors"
          />
        </div>
      )}

      {/* Model Selector */}
      <div className="px-4 py-2 border-b border-[#222]">
        <ModelSelector
          model={model}
          onModelChange={onModelChange}
          effort={effort}
          onEffortChange={onEffortChange}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-[#444]">
              NO MESSAGES
            </span>
            <span className="text-[13px] text-[#666] text-center leading-relaxed max-w-[240px]">
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
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-[#666]">
                {statusLabel[status] || "THINKING"}
              </span>
              {elapsed > 0 && (
                <span className="font-mono text-[10px] text-[#444] ml-auto">
                  {elapsed}s
                </span>
              )}
            </div>
            {status === "reasoning" && reasoningText && (
              <div className="text-[12px] text-[#666] leading-relaxed max-h-[120px] overflow-y-auto whitespace-pre-wrap border-l-2 border-[#333] pl-2">
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
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-[#222]">
        {selectedElements.length > 0 && (
          <div className="mb-2 font-mono text-[10px] tracking-[0.08em] uppercase text-[#5B9BF6]">
            {selectedElements.length} element{selectedElements.length > 1 ? "s" : ""} selected — ask about them
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              !apiKey
                ? "Set API key first"
                : selectedElements.length > 0
                  ? "Ask about selected elements..."
                  : "Describe what to draw..."
            }
            disabled={!apiKey || isLoading}
            className="flex-1 bg-transparent text-[#e8e8e8] text-sm placeholder:text-[#444] focus:outline-none disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !apiKey}
            className="p-2 text-[#666] hover:text-[#e8e8e8] disabled:opacity-30 disabled:hover:text-[#666] transition-colors cursor-pointer disabled:cursor-default"
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
    connecting: "#666",
    streaming: "#D4A843",
    reasoning: "#A78BFA",
    responding: "#5B9BF6",
    drawing: "#4A9E5C",
  }
  const color = colors[status] || "#666"

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
          isError
            ? "text-[#D71921] bg-[#D71921]/10"
            : "text-[#D4A843] bg-[#D4A843]/10"
        }`}
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
      <div className="text-[14px] leading-relaxed text-[#999]">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#666] block mb-1">
          YOU
          {message._selectionCount > 0 && (
            <span className="text-[#5B9BF6] ml-2">
              [{message._selectionCount} SELECTED]
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
    <div className="prose-chat text-[14px] leading-relaxed text-[#e8e8e8]">
      <Markdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-[#ccc] italic">{children}</em>,
          code: ({ children }) => (
            <code className="font-mono text-[13px] text-[#D4A843] bg-[#D4A843]/10 px-1 py-0.5 rounded">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="font-mono text-[12px] text-[#ccc] bg-[#111] border border-[#333] rounded px-3 py-2 my-2 overflow-x-auto">
              {children}
            </pre>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-[#ccc]">{children}</li>,
          h1: ({ children }) => <h1 className="text-[18px] font-semibold text-white mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[16px] font-semibold text-white mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[15px] font-medium text-white mb-1">{children}</h3>,
          hr: () => <hr className="border-[#333] my-2" />,
          a: ({ href, children }) => (
            <a href={href} className="text-[#5B9BF6] hover:underline" target="_blank" rel="noopener noreferrer">
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
      className="w-full text-left font-mono text-[11px] tracking-[0.02em] text-[#666] hover:text-[#999] transition-colors cursor-pointer py-1"
    >
      <span className="text-[#444]">
        {count} tool call{count > 1 ? "s" : ""}: {names.join(", ")}
        <span className="ml-1.5 text-[#333]">{expanded ? "[-]" : "[+]"}</span>
      </span>
      {expanded && (
        <div className="mt-1.5 space-y-0.5 text-[10px] text-[#555]">
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
