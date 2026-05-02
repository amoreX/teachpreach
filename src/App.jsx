import { useState, useRef, useCallback, useEffect } from "react"
import Canvas from "./components/Canvas"
import ChatSidebar from "./components/ChatSidebar"
import { streamChat } from "./lib/openrouter"
import { executeToolCall } from "./lib/canvas-executor"
import { DEFAULT_MODEL, DEFAULT_EFFORT } from "./lib/models"
import { getBounds } from "./lib/element-store"
import { useConvoStore } from "./lib/store"

const MAX_TOOL_ROUNDS = 50

function describeElement(el) {
  switch (el.type) {
    case "rectangle":
      return `rectangle(id:${el.id}, x:${el.x}, y:${el.y}, ${el.width}x${el.height}, fill:${el.fill || "none"}, stroke:${el.stroke || "none"})`
    case "circle":
      return `circle(id:${el.id}, x:${el.x}, y:${el.y}, r:${el.radius}, fill:${el.fill || "none"}, stroke:${el.stroke || "none"})`
    case "text":
      return `text(id:${el.id}, x:${el.x}, y:${el.y}, "${el.text}", size:${el.fontSize}, color:${el.color})`
    case "line":
      return `line(id:${el.id}, ${el.x1},${el.y1} → ${el.x2},${el.y2}, color:${el.color})`
    case "path":
      return `path(id:${el.id}, ${el.points?.length || 0} points, color:${el.color})`
    default:
      return `${el.type}(id:${el.id})`
  }
}

function getStrokeBounds(strokes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const stroke of strokes) {
    for (const p of stroke) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  return { x: minX, y: minY, x2: maxX, y2: maxY, w: maxX - minX, h: maxY - minY }
}

function findElementsInRegion(elements, bounds, padding = 20) {
  const hits = []
  for (const el of elements) {
    if (el.type === "background" || !el.visible) continue
    const b = getBounds(el)
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    if (
      cx >= bounds.x - padding &&
      cx <= bounds.x2 + padding &&
      cy >= bounds.y - padding &&
      cy <= bounds.y2 + padding
    ) {
      hits.push(el)
    }
  }
  return hits
}

function App() {
  const canvasRef = useRef(null)

  const activeId = useConvoStore((s) => s.activeId)
  const updateConvo = useConvoStore((s) => s.updateConvo)
  const setConvoTitle = useConvoStore((s) => s.setTitle)

  const initConvo = useConvoStore.getState().convos[activeId]
  const prevIdRef = useRef(activeId)
  const elementsRef = useRef(initConvo?.elements || [])
  const messagesRef = useRef(initConvo?.messages || [])
  const chatHistoryRef = useRef(initConvo?.chatHistory || [])
  const transformRef = useRef(initConvo?.transform || { x: 0, y: 0, scale: 1 })

  function loadConvo(id) {
    const c = useConvoStore.getState().convos[id]
    if (!c) return
    elementsRef.current = c.elements
    messagesRef.current = c.messages
    chatHistoryRef.current = c.chatHistory
    transformRef.current = c.transform
    setElements(c.elements)
    setMessages(c.messages)
    setChatHistory(c.chatHistory)
    setTransform(c.transform)
    setSelectedIds([])
    setPenStrokes([])
    setPenRedoStack([])
    setActiveTool("select")
  }

  function saveCurrentToStore() {
    const id = prevIdRef.current
    if (!useConvoStore.getState().convos[id]) return
    updateConvo(id, {
      elements: elementsRef.current,
      messages: messagesRef.current,
      chatHistory: chatHistoryRef.current,
      transform: transformRef.current,
    })
  }

  const [elements, _setElements] = useState(elementsRef.current)
  const setElements = useCallback((v) => {
    _setElements((prev) => {
      const next = typeof v === "function" ? v(prev) : v
      elementsRef.current = next
      return next
    })
  }, [])

  const [messages, _setMessages] = useState(messagesRef.current)
  const setMessages = useCallback((v) => {
    _setMessages((prev) => {
      const next = typeof v === "function" ? v(prev) : v
      messagesRef.current = next
      return next
    })
  }, [])

  const [chatHistory, _setChatHistory] = useState(chatHistoryRef.current)
  const setChatHistory = useCallback((v) => {
    _setChatHistory((prev) => {
      const next = typeof v === "function" ? v(prev) : v
      chatHistoryRef.current = next
      return next
    })
  }, [])

  const [transform, _setTransform] = useState(transformRef.current)
  const setTransform = useCallback((v) => {
    _setTransform((prev) => {
      const next = typeof v === "function" ? v(prev) : v
      transformRef.current = next
      return next
    })
  }, [])

  const [selectedIds, setSelectedIds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [reasoningText, setReasoningText] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const [model, setModel] = useState(() => localStorage.getItem("tp_model") || DEFAULT_MODEL)
  const [effort, setEffort] = useState(() => localStorage.getItem("tp_effort") || DEFAULT_EFFORT)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("openrouter_key") || "")
  const [penStrokes, setPenStrokes] = useState([])
  const [penRedoStack, setPenRedoStack] = useState([])
  const [activeTool, setActiveTool] = useState("select")
  const timerRef = useRef(null)

  // Switch conversations: save old, load new
  useEffect(() => {
    if (prevIdRef.current !== activeId) {
      saveCurrentToStore()
      loadConvo(activeId)
      prevIdRef.current = activeId
    }
  }, [activeId])

  // Persist on beforeunload, unmount, and periodically
  useEffect(() => {
    const onBeforeUnload = () => saveCurrentToStore()
    window.addEventListener("beforeunload", onBeforeUnload)
    const interval = setInterval(() => saveCurrentToStore(), 3000)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      clearInterval(interval)
      saveCurrentToStore()
    }
  }, [])

  // Sync to store after each send completes
  const syncToStore = useCallback(() => {
    const id = useConvoStore.getState().activeId
    if (!useConvoStore.getState().convos[id]) return
    updateConvo(id, {
      elements: elementsRef.current,
      messages: messagesRef.current,
      chatHistory: chatHistoryRef.current,
      transform: transformRef.current,
    })
    // Auto-title
    const c = useConvoStore.getState().convos[id]
    if (c && c.title === "New Chat" && messagesRef.current.length > 0) {
      const first = messagesRef.current.find((m) => m.role === "user")
      if (first) {
        const title = first.content.slice(0, 40) + (first.content.length > 40 ? "..." : "")
        setConvoTitle(id, title)
      }
    }
  }, [updateConvo, setConvoTitle])

  const handleApiKeyChange = useCallback((key) => {
    setApiKey(key)
    localStorage.setItem("openrouter_key", key)
  }, [])

  const handleModelChange = useCallback((id) => {
    setModel(id)
    localStorage.setItem("tp_model", id)
  }, [])

  const handleEffortChange = useCallback((level) => {
    setEffort(level)
    localStorage.setItem("tp_effort", level)
  }, [])

  const handleUpdateElement = useCallback((id, updates) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    )
  }, [])

  const handleDeleteElement = useCallback(
    (id) => {
      setElements((prev) => prev.filter((el) => el.id !== id))
      setSelectedIds((prev) => prev.filter((sid) => sid !== id))
    },
    []
  )

  const handleSelect = useCallback((idsOrFn) => {
    if (typeof idsOrFn === "function") {
      setSelectedIds((prev) => idsOrFn(prev))
    } else {
      setSelectedIds(idsOrFn)
    }
  }, [])

  const handlePenStroke = useCallback((points) => {
    setPenStrokes((prev) => [...prev, points])
    setPenRedoStack([])
  }, [])

  const handlePenUndo = useCallback(() => {
    setPenStrokes((prev) => {
      if (prev.length === 0) return prev
      setPenRedoStack((redo) => [...redo, prev[prev.length - 1]])
      return prev.slice(0, -1)
    })
  }, [])

  const handlePenRedo = useCallback(() => {
    setPenRedoStack((redo) => {
      if (redo.length === 0) return redo
      setPenStrokes((prev) => [...prev, redo[redo.length - 1]])
      return redo.slice(0, -1)
    })
  }, [])

  const startTimer = useCallback(() => {
    setElapsed(0)
    const start = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - start) / 1000))
    }, 500)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopTimer()
  }, [stopTimer])

  const applyToolCall = useCallback((tc) => {
    const result = executeToolCall(tc)
    if (!result) return null
    if (result.__clear) {
      setElements([])
      return null
    }
    if (result.__update) {
      setElements((prev) =>
        prev.map((el) =>
          el.id === result.id
            ? { ...el, ...result.updates, createdAt: performance.now() }
            : el
        )
      )
      return result.id
    }
    setElements((prev) => {
      if (result.type === "background") {
        const without = prev.filter((e) => e.type !== "background")
        return [result, ...without]
      }
      return [...prev, result]
    })
    return result.id
  }, [])

  const handleSend = useCallback(
    async (text) => {
      const currentElements = elementsRef.current
      const currentStrokes = penStrokes

      const selected = selectedIds
        .map((id) => currentElements.find((e) => e.id === id))
        .filter(Boolean)

      let circledElements = []
      let strokeBounds = null
      if (currentStrokes.length > 0) {
        strokeBounds = getStrokeBounds(currentStrokes)
        circledElements = findElementsInRegion(currentElements, strokeBounds)
      }

      const allReferenced = [...selected]
      const existingIds = new Set(selected.map((e) => e.id))
      for (const el of circledElements) {
        if (!existingIds.has(el.id)) {
          allReferenced.push(el)
          existingIds.add(el.id)
        }
      }

      setSelectedIds([])
      setPenStrokes([])
      setPenRedoStack([])

      let userContent = text
      const hasPen = currentStrokes.length > 0
      const hasSel = selected.length > 0
      if (allReferenced.length > 0) {
        const desc = allReferenced.map(describeElement).join("\n")
        const allBounds = allReferenced.map(getBounds)
        const region = {
          x: Math.min(...allBounds.map((b) => b.x)),
          y: Math.min(...allBounds.map((b) => b.y)),
          x2: Math.max(...allBounds.map((b) => b.x + b.w)),
          y2: Math.max(...allBounds.map((b) => b.y + b.h)),
        }
        const method = hasPen ? "CIRCLED/POINTED AT" : "SELECTED"
        userContent = `[USER ${method} ${allReferenced.length} ELEMENT(S) ON CANVAS — region roughly (${Math.round(region.x)},${Math.round(region.y)}) to (${Math.round(region.x2)},${Math.round(region.y2)})]\n${desc}\n\n[USER'S QUESTION]: ${text}`
      }

      const refCount = allReferenced.length
      const userMsg = { role: "user", content: userContent }
      const displayMsg = { role: "user", content: text, _selectionCount: hasSel ? selected.length : 0, _penCount: hasPen ? currentStrokes.length : 0 }
      setMessages((prev) => [...prev, displayMsg])
      let runningHistory = [...chatHistory, userMsg]
      setChatHistory(runningHistory)
      setIsLoading(true)
      setStatus(null)
      setReasoningText("")
      startTimer()

      let round = 0

      const runRound = async (history) => {
        return new Promise((resolve) => {
          let assistantText = ""
          let toolCalls = []

          streamChat({
            apiKey,
            model,
            messages: history,
            reasoning: effort === "low" ? undefined : { effort },
            onStatus: (s) => setStatus(s),
            onReasoning: (chunk) => {
              setReasoningText((prev) => prev + chunk)
            },
            onText: (chunk) => {
              assistantText += chunk
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant" && !last.toolCalls?.length) {
                  updated[updated.length - 1] = { ...last, content: assistantText }
                } else {
                  updated.push({ role: "assistant", content: assistantText })
                }
                return updated
              })
            },
            onToolCall: (tc) => {
              const elementId = applyToolCall(tc)
              toolCalls.push({ ...tc, _elementId: elementId })
            },
            onDone: () => {
              resolve({ assistantText, toolCalls })
            },
            onError: (err) => {
              resolve({ assistantText: "", toolCalls: [], error: err })
            },
          })
        })
      }

      while (round < MAX_TOOL_ROUNDS) {
        round++
        console.log(`[agent] round ${round}`)
        const { assistantText, toolCalls, error } = await runRound(runningHistory)

        if (error) {
          setMessages((prev) => [
            ...prev,
            { role: "tool", content: `[ERROR] ${error}` },
          ])
          break
        }

        if (toolCalls.length > 0) {
          const assistantMsg = {
            role: "assistant",
            content: assistantText,
            toolCalls,
          }

          setMessages((prev) => {
            const withoutStreaming = prev.filter(
              (m, i) =>
                !(
                  m.role === "assistant" &&
                  i === prev.length - 1 &&
                  !m.toolCalls?.length
                )
            )
            return [
              ...withoutStreaming,
              assistantMsg,
              {
                role: "tool",
                content: `[OK] ${toolCalls.length} tool${toolCalls.length > 1 ? "s" : ""}: ${toolCalls.map((t) => t.function.name).join(", ")}`,
              },
            ]
          })

          const assistantHistoryMsg = {
            role: "assistant",
            content: assistantText || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: {
                name: tc.function.name,
                arguments: JSON.stringify(tc.function.arguments),
              },
            })),
          }

          const toolResults = toolCalls.map((tc) => ({
            role: "tool",
            tool_call_id: tc.id,
            content: tc._elementId
              ? `[OK] ${tc.function.name} — element_id: ${tc._elementId}`
              : `[OK] ${tc.function.name} executed`,
          }))

          runningHistory = [...runningHistory, assistantHistoryMsg, ...toolResults]
          setChatHistory(runningHistory)

          console.log(`[agent] round ${round} done, ${toolCalls.length} tools called, looping...`)
          setReasoningText("")
          continue
        }

        if (assistantText) {
          setChatHistory((prev) => [
            ...prev,
            { role: "assistant", content: assistantText },
          ])
        }
        break
      }

      if (round >= MAX_TOOL_ROUNDS) {
        console.warn(`[agent] hit max rounds (${MAX_TOOL_ROUNDS})`)
        setMessages((prev) => [
          ...prev,
          { role: "tool", content: `[WARN] Stopped after ${MAX_TOOL_ROUNDS} rounds` },
        ])
      }

      stopTimer()
      setIsLoading(false)
      setStatus(null)
      syncToStore()
    },
    [apiKey, model, effort, chatHistory, selectedIds, penStrokes, startTimer, stopTimer, applyToolCall, syncToStore]
  )

  const selectedElements = selectedIds
    .map((id) => elements.find((e) => e.id === id))
    .filter(Boolean)

  return (
    <div className="h-screen w-screen bg-[var(--bg-page)] flex overflow-hidden">
      <Canvas
        canvasRef={canvasRef}
        elements={elements}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        transform={transform}
        onTransformChange={setTransform}
        penStrokes={penStrokes}
        onPenStroke={handlePenStroke}
        onPenUndo={handlePenUndo}
        onPenRedo={handlePenRedo}
        penRedoCount={penRedoStack.length}
        activeTool={activeTool}
        onToolChange={setActiveTool}
      />
      <ChatSidebar
        messages={messages}
        onSend={handleSend}
        isLoading={isLoading}
        status={status}
        reasoningText={reasoningText}
        elapsed={elapsed}
        model={model}
        onModelChange={handleModelChange}
        effort={effort}
        onEffortChange={handleEffortChange}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        selectedElements={selectedElements}
        penStrokeCount={penStrokes.length}
        onUpdateElement={handleUpdateElement}
        onDeleteElement={handleDeleteElement}
      />
    </div>
  )
}

export default App
