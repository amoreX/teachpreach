import { useRef, useEffect, useCallback, useState } from "react"
import { renderCanvas } from "../lib/canvas-renderer"
import { hitTest, getBounds } from "../lib/element-store"
import { getThemeColors, useTheme } from "../lib/theme"
import { ZoomIn, ZoomOut, Maximize, MousePointer, Pen, Undo2, Redo2, Grid3x3, Circle, Minus, Download } from "lucide-react"
import { exportCanvasVideo } from "../lib/canvas-exporter"

export default function Canvas({
  canvasRef,
  elements,
  selectedIds,
  onSelect,
  transform,
  onTransformChange,
  penStrokes,
  onPenStroke,
  onPenUndo,
  onPenRedo,
  penRedoCount,
  activeTool,
  onToolChange,
}) {
  const { theme } = useTheme()
  const isMac = navigator.platform.toUpperCase().includes("MAC")
  const containerRef = useRef(null)
  const isPanning = useRef(false)
  const isDragSelecting = useRef(false)
  const isDrawing = useRef(false)
  const currentStroke = useRef([])
  const panStart = useRef({ x: 0, y: 0 })
  const dragStart = useRef(null)
  const [selectionBox, setSelectionBox] = useState(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [gridMode, setGridMode] = useState(() => localStorage.getItem("tp_grid") || "dot")
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
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
    const themeColors = getThemeColors()
    const hasAnimating = renderCanvas(ctx, elements, transform, selectedIds, w, h, penStrokes, currentStroke.current, themeColors)
    if (hasAnimating) {
      rafRef.current = requestAnimationFrame(render)
    }
  }, [canvasRef, elements, transform, selectedIds, getCanvasSize, penStrokes, theme])

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

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom on trackpad (or ctrl+scroll)
        const rect = containerRef.current.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95
        const newScale = Math.min(10, Math.max(0.1, transform.scale * zoomFactor))
        onTransformChange({
          x: mx - ((mx - transform.x) / transform.scale) * newScale,
          y: my - ((my - transform.y) / transform.scale) * newScale,
          scale: newScale,
        })
      } else {
        // Two-finger swipe / scroll wheel → pan
        onTransformChange({
          ...transform,
          x: transform.x - e.deltaX,
          y: transform.y - e.deltaY,
        })
      }
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
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey && e.target === document.body) {
        e.preventDefault()
        onPenUndo()
      }
      if (((e.key === "z" && e.shiftKey) || e.key === "y") && (e.metaKey || e.ctrlKey) && e.target === document.body) {
        e.preventDefault()
        onPenRedo()
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
  }, [activeTool, onToolChange, onSelect, onPenUndo, onPenRedo])

  const cycleGrid = useCallback(() => {
    setGridMode((prev) => {
      const next = prev === "dot" ? "grid" : prev === "grid" ? "none" : "dot"
      localStorage.setItem("tp_grid", next)
      return next
    })
  }, [])

  const handleExport = useCallback(async () => {
    if (exporting) return
    const visible = elements.filter((e) => e.type !== "background" && e.visible !== false)
    if (visible.length === 0) return
    setExporting(true)
    setExportProgress(0)
    try {
      await exportCanvasVideo(elements, setExportProgress)
    } catch (err) {
      console.error("[export]", err)
    }
    setExporting(false)
  }, [elements, exporting])

  const selCount = selectedIds.length
  const cursor = spaceHeld
    ? "cursor-grab"
    : activeTool === "pen"
      ? "cursor-crosshair"
      : "cursor-default"

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 min-w-0 bg-[var(--canvas-bg)] ${cursor}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {gridMode !== "none" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={gridMode === "dot" ? {
            backgroundImage: "radial-gradient(circle, var(--dot-grid) 0.5px, transparent 0.5px)",
            backgroundSize: "12px 12px",
            opacity: 0.4,
          } : {
            backgroundImage: "linear-gradient(var(--dot-grid) 1px, transparent 1px), linear-gradient(90deg, var(--dot-grid) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.15,
          }}
        />
      )}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {selectionBox && selectionBox.w > 2 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.w,
            height: selectionBox.h,
            border: "1px solid color-mix(in srgb, var(--interactive) 50%, transparent)",
            background: "color-mix(in srgb, var(--interactive) 8%, transparent)",
          }}
        />
      )}

      {selCount > 0 && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded px-2.5 py-1.5">
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--interactive)]">
            {selCount} SELECTED
          </span>
        </div>
      )}

      {penStrokes.length > 0 && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-[var(--bg-surface)] rounded px-2.5 py-1.5" style={{ borderWidth: 1, borderStyle: "solid", borderColor: "color-mix(in srgb, var(--accent-red) 40%, transparent)" }}>
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--accent-red)]">
            {penStrokes.length} ANNOTATION{penStrokes.length > 1 ? "S" : ""}
          </span>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">send to ask about them</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute top-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => onToolChange("select")}
          className={`p-2 border rounded transition-colors cursor-pointer ${
            activeTool === "select"
              ? "bg-[var(--active-bg)] border-[var(--active-bg)] text-[var(--active-text)]"
              : "bg-[var(--bg-surface)] border-[var(--border-visible)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]"
          }`}
          title="Select (V)"
        >
          <MousePointer size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => onToolChange(activeTool === "pen" ? "select" : "pen")}
          className={`p-2 border rounded transition-colors cursor-pointer ${
            activeTool === "pen"
              ? "bg-[var(--accent-red)] border-[var(--accent-red)] text-white"
              : "bg-[var(--bg-surface)] border-[var(--border-visible)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]"
          }`}
          title="Pen (P)"
        >
          <Pen size={14} strokeWidth={1.5} />
        </button>
        {activeTool === "pen" && (
          <>
            <button
              onClick={onPenUndo}
              disabled={penStrokes.length === 0}
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default mt-1"
              title={`Undo (${isMac ? "⌘Z" : "Ctrl+Z"})`}
            >
              <Undo2 size={14} strokeWidth={1.5} />
            </button>
            <button
              onClick={onPenRedo}
              disabled={penRedoCount === 0}
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
              title={`Redo (${isMac ? "⌘⇧Z" : "Ctrl+Shift+Z"})`}
            >
              <Redo2 size={14} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1">
        <button onClick={zoomOut} className="p-1.5 bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors cursor-pointer">
          <ZoomOut size={14} strokeWidth={1.5} />
        </button>
        <button onClick={resetView} className="px-2 py-1 bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded font-mono text-[10px] tracking-[0.06em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors cursor-pointer">
          {Math.round(transform.scale * 100)}%
        </button>
        <button onClick={zoomIn} className="p-1.5 bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors cursor-pointer">
          <ZoomIn size={14} strokeWidth={1.5} />
        </button>
        <button onClick={resetView} className="p-1.5 bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors cursor-pointer ml-1">
          <Maximize size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={cycleGrid}
          className="p-1.5 bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors cursor-pointer ml-1"
          title={`Grid: ${gridMode}`}
        >
          {gridMode === "dot" ? <Circle size={14} strokeWidth={1.5} /> : gridMode === "grid" ? <Grid3x3 size={14} strokeWidth={1.5} /> : <Minus size={14} strokeWidth={1.5} />}
        </button>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        {exporting && (
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--accent-amber)]">
            EXPORTING {exportProgress}%
          </span>
        )}
        {elements.filter((e) => e.type !== "background").length > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="p-1.5 bg-[var(--bg-surface)] border border-[var(--border-visible)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
            title="Export video"
          >
            <Download size={14} strokeWidth={1.5} />
          </button>
        )}
        <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--text-disabled)]">
          {elements.filter((e) => e.type !== "background").length} ELEMENTS
        </span>
      </div>
    </div>
  )
}
