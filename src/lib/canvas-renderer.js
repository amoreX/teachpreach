import { getBounds } from "./element-store"

const ANIM_DURATION = 350
const EASE_OUT = (t) => 1 - (1 - t) * (1 - t) * (1 - t)

function getAnimProgress(el) {
  if (!el.createdAt) return 1
  const age = performance.now() - el.createdAt
  if (age < 0 || age >= ANIM_DURATION) return 1
  return EASE_OUT(age / ANIM_DURATION)
}

export function renderCanvas(ctx, elements, transform, selectedIds, canvasWidth, canvasHeight, penStrokes = [], activeStroke = [], themeColors = {}) {
  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const bg = elements.find((e) => e.type === "background")
  if (bg) {
    ctx.fillStyle = bg.color
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  }

  ctx.save()
  ctx.translate(transform.x, transform.y)
  ctx.scale(transform.scale, transform.scale)

  let hasAnimating = false

  for (const el of elements) {
    if (!el.visible || el.type === "background") continue
    const t = getAnimProgress(el)
    if (t < 1) hasAnimating = true
    renderElement(ctx, el, t, themeColors)
  }

  if (selectedIds?.length > 0) {
    const idSet = new Set(selectedIds)
    for (const el of elements) {
      if (idSet.has(el.id)) renderSelection(ctx, el, transform.scale, themeColors)
    }
  }

  // Pen strokes
  const allStrokes = [...penStrokes]
  if (activeStroke.length > 1) allStrokes.push(activeStroke)

  for (const stroke of allStrokes) {
    if (stroke.length < 2) continue
    ctx.beginPath()
    ctx.moveTo(stroke[0].x, stroke[0].y)
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y)
    }
    ctx.strokeStyle = themeColors.penStroke || "#D71921"
    ctx.lineWidth = 2.5 / transform.scale
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.globalAlpha = 0.7
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  ctx.restore()

  return hasAnimating
}

function renderElement(ctx, el, t, themeColors = {}) {
  ctx.save()
  ctx.globalAlpha = t

  const bounds = getBounds(el)
  const cx = bounds.x + bounds.w / 2
  const cy = bounds.y + bounds.h / 2
  const scale = 0.85 + 0.15 * t
  const defaultColor = themeColors.textPrimary || "#E8E8E8"

  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.translate(-cx, -cy)

  switch (el.type) {
    case "rectangle": {
      if (el.fill) {
        ctx.fillStyle = el.fill
        ctx.fillRect(el.x, el.y, el.width, el.height)
      }
      if (el.stroke || !el.fill) {
        ctx.strokeStyle = el.stroke || defaultColor
        ctx.lineWidth = el.strokeWidth || 2
        ctx.strokeRect(el.x, el.y, el.width, el.height)
      }
      break
    }
    case "circle": {
      ctx.beginPath()
      ctx.arc(el.x, el.y, el.radius, 0, Math.PI * 2)
      if (el.fill) {
        ctx.fillStyle = el.fill
        ctx.fill()
      }
      if (el.stroke || !el.fill) {
        ctx.strokeStyle = el.stroke || defaultColor
        ctx.lineWidth = el.strokeWidth || 2
        ctx.stroke()
      }
      break
    }
    case "line": {
      ctx.beginPath()
      ctx.moveTo(el.x1, el.y1)
      ctx.lineTo(el.x2, el.y2)
      ctx.strokeStyle = el.color || defaultColor
      ctx.lineWidth = el.width || 2
      ctx.stroke()
      break
    }
    case "text": {
      ctx.fillStyle = el.color || defaultColor
      ctx.font = `${el.fontSize || 16}px ${el.fontFamily || "Space Grotesk, sans-serif"}`
      ctx.textAlign = el.align || "left"
      ctx.textBaseline = el.baseline || "alphabetic"
      ctx.fillText(el.text, el.x, el.y)
      ctx.textAlign = "left"
      ctx.textBaseline = "alphabetic"
      break
    }
    case "path": {
      if (!el.points || el.points.length < 2) break
      ctx.beginPath()
      ctx.moveTo(el.points[0].x, el.points[0].y)
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y)
      }
      if (el.closed) ctx.closePath()
      if (el.fill && el.closed) {
        ctx.fillStyle = el.fill
        ctx.fill()
      }
      ctx.strokeStyle = el.color || defaultColor
      ctx.lineWidth = el.width || 2
      ctx.stroke()
      break
    }
  }

  ctx.restore()
}

function renderSelection(ctx, el, scale, themeColors = {}) {
  const bounds = getBounds(el)
  const pad = 6 / scale
  const handleSize = 6 / scale
  const lineWidth = 1.5 / scale
  const selColor = themeColors.selectionBg || "#5B9BF6"

  ctx.strokeStyle = selColor
  ctx.lineWidth = lineWidth
  ctx.setLineDash([4 / scale, 4 / scale])
  ctx.strokeRect(
    bounds.x - pad,
    bounds.y - pad,
    bounds.w + pad * 2,
    bounds.h + pad * 2
  )
  ctx.setLineDash([])

  ctx.fillStyle = selColor
  const corners = [
    [bounds.x - pad, bounds.y - pad],
    [bounds.x + bounds.w + pad, bounds.y - pad],
    [bounds.x - pad, bounds.y + bounds.h + pad],
    [bounds.x + bounds.w + pad, bounds.y + bounds.h + pad],
  ]
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
  }
}
