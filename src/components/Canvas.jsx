import { useRef, useEffect, useCallback, useState } from "react"
import { renderCanvas } from "../lib/canvas-renderer"
import { hitTest, getBounds } from "../lib/element-store"
import { ZoomIn, ZoomOut, Maximize, MousePointer, Pen } from "lucide-react"

export default function Canvas({
  canvasRef,
  elements,
  selectedIds,
  onSelect,
  transform,
  onTransformChange,
  penStrokes,
  onPenStroke,
  activeTool,
  onToolChange,
}) {
  const containerRef = useRef(null)
  const isPanning = useRef(false)
  const isDragSelecting = useRef(false)
  const isDrawing = useRef(false)
  const currentStroke = useRef([])
  const panStart = useRef({ x: 0, y: 0 })
  const dragStart = useRef(null)
  const [selectionBox, setSelectionBox] = useState(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const spaceRef = useRef(false)
  const rafRef = useRef(null)

  const getCanvasSize = useCallback(() => {
    const container = containerRef.current
    if (!container) return { w: 800, h: 600 }
    const rect = container.getBoundingClientRect()
    return { w: rect.width, h: rect.height }
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const { w, h } = getCanvasSize()
    const hasAnimating = renderCanvas(ctx, elements, transform, selectedIds, w, h, penStrokes, currentStroke.current)
    if (hasAnimating) {
      rafRef.current = requestAnimationFrame(render)
    }
  }, [canvasRef, elements, transform, selectedIds, getCanvasSize, penStrokes])

  const scheduleRender = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(render)
  }, [render])

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    scheduleRender()
  }, [canvasRef, scheduleRender])

  useEffect(() => {
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [resize])

  useEffect(() => {
    scheduleRender()
  }, [scheduleRender])

  const screenToCanvas = useCallback(
    (sx, sy) => ({
      x: (sx - transform.x) / transform.scale,
      y: (sy - transform.y) / transform.scale,
    }),
    [transform]
  )

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault()
      const rect = containerRef.current.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
      const newScale = Math.min(10, Math.max(0.1, transform.scale * zoomFactor))
      onTransformChange({
        x: mx - ((mx - transform.x) / transform.scale) * newScale,
        y: my - ((my - transform.y) / transform.scale) * newScale,
        scale: newScale,
      })
    },
    [transform, onTransformChange]
  )

  const handleMouseDown = useCallback(
    (e) => {
      const rect = containerRef.current.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if (e.button === 1 || e.button === 2 || (e.button === 0 && (e.altKey || spaceRef.current))) {
        isPanning.current = true
        panStart.current = { x: sx - transform.x, y: sy - transform.y }
        e.preventDefault()
        return
      }

      if (e.button === 0 && activeTool === "pen") {
        isDrawing.current = true
        const { x, y } = screenToCanvas(sx, sy)
        currentStroke.current = [{ x, y }]
        scheduleRender()
        return
      }

      if (e.button === 0) {
        const { x, y } = screenToCanvas(sx, sy)

        let hit = null
        for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i]
          if (el.type === "background" || !el.visible) continue
          if (hitTest(el, x, y)) {
            hit = el.id
            break
          }
        }

        if (hit) {
          if (e.shiftKey) {
            onSelect((prev) => {
              const set = new Set(prev)
              if (set.has(hit)) set.delete(hit)
              else set.add(hit)
              return [...set]
            })
          } else {
            onSelect([hit])
          }
          return
        }

        isDragSelecting.current = true
        dragStart.current = { sx, sy, cx: x, cy: y }
        if (!e.shiftKey) onSelect([])
      }
    },
    [elements, transform, screenToCanvas, onSelect, activeTool, scheduleRender]
  )

  const handleMouseMove = useCallback(
    (e) => {
      const rect = containerRef.current.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if (isPanning.current) {
        onTransformChange({
          ...transform,
          x: sx - panStart.current.x,
          y: sy - panStart.current.y,
        })
        return
      }

      if (isDrawing.current) {
        const { x, y } = screenToCanvas(sx, sy)
        currentStroke.current.push({ x, y })
        scheduleRender()
        return
      }

      if (isDragSelecting.current && dragStart.current) {
        setSelectionBox({
          x: Math.min(dragStart.current.sx, sx),
          y: Math.min(dragStart.current.sy, sy),
          w: Math.abs(sx - dragStart.current.sx),
          h: Math.abs(sy - dragStart.current.sy),
        })
      }
    },
    [transform, onTransformChange, screenToCanvas, scheduleRender]
  )

  const handleMouseUp = useCallback(
    (e) => {
      if (isDrawing.current) {
        isDrawing.current = false
        if (currentStroke.current.length > 1) {
          onPenStroke([...currentStroke.current])
        }
        currentStroke.current = []
        scheduleRender()
        return
      }

      if (isDragSelecting.current && dragStart.current && selectionBox && selectionBox.w > 5 && selectionBox.h > 5) {
        const rect = containerRef.current.getBoundingClientRect()
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top
        const c1 = screenToCanvas(Math.min(dragStart.current.sx, sx), Math.min(dragStart.current.sy, sy))
        const c2 = screenToCanvas(Math.max(dragStart.current.sx, sx), Math.max(dragStart.current.sy, sy))

        const hits = []
        for (const el of elements) {
          if (el.type === "background" || !el.visible) continue
          const b = getBounds(el)
          const elCx = b.x + b.w / 2
          const elCy = b.y + b.h / 2
          if (elCx >= c1.x && elCx <= c2.x && elCy >= c1.y && elCy <= c2.y) hits.push(el.id)
        }

        if (hits.length > 0) {
          if (e.shiftKey) onSelect((prev) => [...new Set([...prev, ...hits])])
          else onSelect(hits)
        }
      }

      isPanning.current = false
      isDragSelecting.current = false
      dragStart.current = null
      setSelectionBox(null)
    },
    [elements, screenToCanvas, onSelect, selectionBox, onPenStroke, scheduleRender]
  )

  const resetView = useCallback(() => {
    onTransformChange({ x: 0, y: 0, scale: 1 })
  }, [onTransformChange])

  const zoomIn = useCallback(() => {
    const { w, h } = getCanvasSize()
    const newScale = Math.min(10, transform.scale * 1.3)
    const cx = w / 2
    const cy = h / 2
    onTransformChange({
      x: cx - ((cx - transform.x) / transform.scale) * newScale,
      y: cy - ((cy - transform.y) / transform.scale) * newScale,
      scale: newScale,
    })
  }, [transform, onTransformChange, getCanvasSize])

  const zoomOut = useCallback(() => {
    const { w, h } = getCanvasSize()
    const newScale = Math.max(0.1, transform.scale * 0.7)
    const cx = w / 2
    const cy = h / 2
    onTransformChange({
      x: cx - ((cx - transform.x) / transform.scale) * newScale,
      y: cy - ((cy - transform.y) / transform.scale) * newScale,
      scale: newScale,
    })
  }, [transform, onTransformChange, getCanvasSize])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space" && !e.repeat && e.target === document.body) {
        e.preventDefault()
        spaceRef.current = true
        setSpaceHeld(true)
      }
      if (e.key === "p" && e.target === document.body) {
        onToolChange(activeTool === "pen" ? "select" : "pen")
      }
      if (e.key === "v" && e.target === document.body) {
        onToolChange("select")
      }
      if (e.key === "Escape" && e.target === document.body) {
        onToolChange("select")
        onSelect([])
      }
    }
    const onKeyUp = (e) => {
      if (e.code === "Space") {
        spaceRef.current = false
        setSpaceHeld(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [activeTool, onToolChange, onSelect])

  const selCount = selectedIds.length
  const cursor = spaceHeld
    ? "cursor-grab"
    : activeTool === "pen"
      ? "cursor-crosshair"
      : "cursor-default"

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 min-w-0 bg-[#111] ${cursor}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #222 0.5px, transparent 0.5px)",
          backgroundSize: "12px 12px",
          opacity: 0.4,
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {selectionBox && selectionBox.w > 2 && (
        <div
          className="absolute border border-[#5B9BF6]/50 bg-[#5B9BF6]/8 pointer-events-none"
          style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.w, height: selectionBox.h }}
        />
      )}

      {selCount > 0 && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-[#111] border border-[#333] rounded px-2.5 py-1.5">
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#5B9BF6]">
            {selCount} SELECTED
          </span>
        </div>
      )}

      {penStrokes.length > 0 && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-[#111] border border-[#D71921]/40 rounded px-2.5 py-1.5">
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#D71921]">
            {penStrokes.length} ANNOTATION{penStrokes.length > 1 ? "S" : ""}
          </span>
          <span className="font-mono text-[10px] text-[#666]">send to ask about them</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute top-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => onToolChange("select")}
          className={`p-2 border rounded transition-colors cursor-pointer ${
            activeTool === "select"
              ? "bg-[#e8e8e8] border-[#e8e8e8] text-black"
              : "bg-[#111] border-[#333] text-[#999] hover:text-[#e8e8e8] hover:border-[#666]"
          }`}
          title="Select (V)"
        >
          <MousePointer size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => onToolChange(activeTool === "pen" ? "select" : "pen")}
          className={`p-2 border rounded transition-colors cursor-pointer ${
            activeTool === "pen"
              ? "bg-[#D71921] border-[#D71921] text-white"
              : "bg-[#111] border-[#333] text-[#999] hover:text-[#e8e8e8] hover:border-[#666]"
          }`}
          title="Pen (P)"
        >
          <Pen size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1">
        <button onClick={zoomOut} className="p-1.5 bg-[#111] border border-[#333] rounded text-[#999] hover:text-[#e8e8e8] hover:border-[#666] transition-colors cursor-pointer">
          <ZoomOut size={14} strokeWidth={1.5} />
        </button>
        <button onClick={resetView} className="px-2 py-1 bg-[#111] border border-[#333] rounded font-mono text-[10px] tracking-[0.06em] text-[#999] hover:text-[#e8e8e8] hover:border-[#666] transition-colors cursor-pointer">
          {Math.round(transform.scale * 100)}%
        </button>
        <button onClick={zoomIn} className="p-1.5 bg-[#111] border border-[#333] rounded text-[#999] hover:text-[#e8e8e8] hover:border-[#666] transition-colors cursor-pointer">
          <ZoomIn size={14} strokeWidth={1.5} />
        </button>
        <button onClick={resetView} className="p-1.5 bg-[#111] border border-[#333] rounded text-[#999] hover:text-[#e8e8e8] hover:border-[#666] transition-colors cursor-pointer ml-1">
          <Maximize size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div className="absolute bottom-4 right-4 font-mono text-[10px] tracking-[0.08em] uppercase text-[#444]">
        {elements.filter((e) => e.type !== "background").length} ELEMENTS
      </div>
    </div>
  )
}
