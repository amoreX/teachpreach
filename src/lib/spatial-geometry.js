import { getBounds } from "./element-store"

const MAX_WARNINGS = 12

function round(n) {
  return Math.round(n * 10) / 10
}

function inflateBounds(b, padding = 0) {
  return {
    x: b.x - padding,
    y: b.y - padding,
    w: b.w + padding * 2,
    h: b.h + padding * 2,
  }
}

function boundsOverlap(a, b, padding = 0) {
  const aa = inflateBounds(a, padding)
  const bb = inflateBounds(b, padding)
  return aa.x < bb.x + bb.w && aa.x + aa.w > bb.x && aa.y < bb.y + bb.h && aa.y + aa.h > bb.y
}

function pointInBounds(p, b) {
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h
}

function orientation(a, b, c) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
  if (Math.abs(value) < 0.0001) return 0
  return value > 0 ? 1 : 2
}

function onSegment(a, b, c) {
  return (
    b.x <= Math.max(a.x, c.x) &&
    b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) &&
    b.y >= Math.min(a.y, c.y)
  )
}

function segmentsIntersect(p1, q1, p2, q2) {
  const o1 = orientation(p1, q1, p2)
  const o2 = orientation(p1, q1, q2)
  const o3 = orientation(p2, q2, p1)
  const o4 = orientation(p2, q2, q1)

  if (o1 !== o2 && o3 !== o4) return true
  if (o1 === 0 && onSegment(p1, p2, q1)) return true
  if (o2 === 0 && onSegment(p1, q2, q1)) return true
  if (o3 === 0 && onSegment(p2, p1, q2)) return true
  if (o4 === 0 && onSegment(p2, q1, q2)) return true
  return false
}

function segmentIntersectsBounds(a, b, bounds) {
  if (pointInBounds(a, bounds) || pointInBounds(b, bounds)) return true

  const topLeft = { x: bounds.x, y: bounds.y }
  const topRight = { x: bounds.x + bounds.w, y: bounds.y }
  const bottomRight = { x: bounds.x + bounds.w, y: bounds.y + bounds.h }
  const bottomLeft = { x: bounds.x, y: bounds.y + bounds.h }

  return (
    segmentsIntersect(a, b, topLeft, topRight) ||
    segmentsIntersect(a, b, topRight, bottomRight) ||
    segmentsIntersect(a, b, bottomRight, bottomLeft) ||
    segmentsIntersect(a, b, bottomLeft, topLeft)
  )
}

function pathIsClear(points, obstacles) {
  for (let i = 0; i < points.length - 1; i++) {
    for (const obstacle of obstacles) {
      if (segmentIntersectsBounds(points[i], points[i + 1], obstacle.bounds)) return false
    }
  }
  return true
}

function isLabelInsideShape(a, aBounds, b, bBounds) {
  if (a.type !== "text" && b.type !== "text") return false
  const textBounds = a.type === "text" ? aBounds : bBounds
  const shapeBounds = a.type === "text" ? bBounds : aBounds
  const textCenter = {
    x: textBounds.x + textBounds.w / 2,
    y: textBounds.y + textBounds.h / 2,
  }
  return pointInBounds(textCenter, shapeBounds)
}

function compactPoints(points) {
  const compact = []
  for (const p of points) {
    const prev = compact[compact.length - 1]
    if (!prev || prev.x !== p.x || prev.y !== p.y) compact.push(p)
  }
  return compact
}

export function getAnchors(bounds) {
  const center = { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 }
  return {
    center,
    top: { x: center.x, y: bounds.y },
    bottom: { x: center.x, y: bounds.y + bounds.h },
    left: { x: bounds.x, y: center.y },
    right: { x: bounds.x + bounds.w, y: center.y },
    topLeft: { x: bounds.x, y: bounds.y },
    topRight: { x: bounds.x + bounds.w, y: bounds.y },
    bottomLeft: { x: bounds.x, y: bounds.y + bounds.h },
    bottomRight: { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
  }
}

export function getGridPoint({ originX = 0, originY = 0, cellSize, cellWidth, cellHeight, row = 0, col = 0, anchor = "center" }) {
  const w = cellWidth || cellSize || 40
  const h = cellHeight || cellSize || 40
  const x = originX + col * w
  const y = originY + row * h

  if (anchor === "topLeft") return { x, y }
  if (anchor === "topRight") return { x: x + w, y }
  if (anchor === "bottomLeft") return { x, y: y + h }
  if (anchor === "bottomRight") return { x: x + w, y: y + h }
  return { x: x + w / 2, y: y + h / 2 }
}

export function snapToGrid({ x, y, originX = 0, originY = 0, cellSize, cellWidth, cellHeight, mode = "center" }) {
  const w = cellWidth || cellSize || 40
  const h = cellHeight || cellSize || 40
  const col = Math.round((x - originX) / w)
  const row = Math.round((y - originY) / h)

  if (mode === "corner") {
    return { x: originX + col * w, y: originY + row * h, row, col }
  }

  const centerCol = Math.round((x - originX - w / 2) / w)
  const centerRow = Math.round((y - originY - h / 2) / h)
  return {
    x: originX + centerCol * w + w / 2,
    y: originY + centerRow * h + h / 2,
    row: centerRow,
    col: centerCol,
  }
}

export function summarizeGrid(args) {
  const { name = "grid", originX = 0, originY = 0, rows, cols, cellSize, cellWidth, cellHeight } = args
  const w = cellWidth || cellSize || 40
  const h = cellHeight || cellSize || 40
  const bounds = { x: originX, y: originY, w: cols * w, h: rows * h }
  return [
    `[SPATIAL GRID] ${name}`,
    `origin: (${originX}, ${originY}), rows: ${rows}, cols: ${cols}, cell: ${w}x${h}`,
    `bounds: (${round(bounds.x)},${round(bounds.y)}) to (${round(bounds.x + bounds.w)},${round(bounds.y + bounds.h)})`,
    `cell center formula: x = originX + col*cellWidth + cellWidth/2; y = originY + row*cellHeight + cellHeight/2`,
  ].join("\n")
}

export function formatPointFromGrid(args) {
  const point = getGridPoint(args)
  return `[GRID POINT] row:${args.row ?? 0}, col:${args.col ?? 0}, anchor:${args.anchor || "center"} -> (${round(point.x)}, ${round(point.y)})`
}

export function formatSnapToGrid(args) {
  const snapped = snapToGrid(args)
  return `[SNAP TO GRID] input: (${round(args.x)}, ${round(args.y)}) -> (${round(snapped.x)}, ${round(snapped.y)}) at row:${snapped.row}, col:${snapped.col}`
}

export function getElementAnchor(elements, { elementId, anchor = "center" }) {
  const element = elements.find((el) => el.id === elementId)
  if (!element) return `[ANCHOR ERROR] element ${elementId} was not found.`
  const bounds = getBounds(element)
  const anchors = getAnchors(bounds)
  const point = anchors[anchor] || anchors.center
  return `[ANCHOR POINT] element ${elementId} ${anchor}: (${round(point.x)}, ${round(point.y)})`
}

export function routePathAroundObstacles(elements, args) {
  const start = args.start || { x: args.x1, y: args.y1 }
  const end = args.end || { x: args.x2, y: args.y2 }
  const padding = args.padding ?? 16
  const obstacleIds = new Set(args.obstacleIds || [])
  const candidates = []

  let obstacles = elements
    .filter((el) => el.type !== "background" && el.visible !== false)
    .filter((el) => obstacleIds.size === 0 ? ["rectangle", "circle", "text"].includes(el.type) : obstacleIds.has(el.id))
    .map((el) => ({ id: el.id, bounds: inflateBounds(getBounds(el), padding) }))
    .filter((obstacle) => !pointInBounds(start, obstacle.bounds) && !pointInBounds(end, obstacle.bounds))

  if (args.ignoreIds?.length) {
    const ignore = new Set(args.ignoreIds)
    obstacles = obstacles.filter((obstacle) => !ignore.has(obstacle.id))
  }

  candidates.push([start, end])
  candidates.push([start, { x: end.x, y: start.y }, end])
  candidates.push([start, { x: start.x, y: end.y }, end])

  for (const obstacle of obstacles) {
    const b = obstacle.bounds
    const detours = [
      b.x - padding,
      b.x + b.w + padding,
    ]
    for (const x of detours) {
      candidates.push([start, { x, y: start.y }, { x, y: end.y }, end])
    }

    const yDetours = [
      b.y - padding,
      b.y + b.h + padding,
    ]
    for (const y of yDetours) {
      candidates.push([start, { x: start.x, y }, { x: end.x, y }, end])
    }
  }

  const clear = candidates.map(compactPoints).find((points) => pathIsClear(points, obstacles))
  const points = clear || compactPoints(candidates[0])
  const status = clear ? "clear" : "blocked"
  const pointText = points.map((p) => `(${round(p.x)},${round(p.y)})`).join(" -> ")
  const warning = clear ? "" : "\nwarning: no collision-free orthogonal route found with current obstacles; consider moving elements or adding manual waypoints."

  return `[ROUTED PATH] status:${status}\npoints: ${pointText}${warning}`
}

export function detectLayoutWarnings(elements) {
  const drawable = elements.filter((el) => el.type !== "background" && el.visible !== false)
  const warnings = []

  for (let i = 0; i < drawable.length; i++) {
    const a = drawable[i]
    if (["line", "path"].includes(a.type)) continue
    const aBounds = getBounds(a)

    for (let j = i + 1; j < drawable.length; j++) {
      const b = drawable[j]
      if (["line", "path"].includes(b.type)) continue
      const bBounds = getBounds(b)
      if (isLabelInsideShape(a, aBounds, b, bBounds)) continue
      if (boundsOverlap(aBounds, bBounds, 0)) {
        warnings.push(`overlap: ${a.type} ${a.id} overlaps ${b.type} ${b.id}`)
        if (warnings.length >= MAX_WARNINGS) return warnings
      }
    }
  }

  const obstacles = drawable
    .filter((el) => ["rectangle", "circle"].includes(el.type) && el.fill)
    .map((el) => ({ id: el.id, type: el.type, bounds: getBounds(el) }))

  for (const el of drawable) {
    const points = el.type === "path"
      ? el.points || []
      : el.type === "line"
        ? [{ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }]
        : []

    if (points.length < 2) continue

    for (let i = 0; i < points.length - 1; i++) {
      for (const obstacle of obstacles) {
        const first = points[0]
        const last = points[points.length - 1]
        if (pointInBounds(first, obstacle.bounds) || pointInBounds(last, obstacle.bounds)) continue
        if (segmentIntersectsBounds(points[i], points[i + 1], obstacle.bounds)) {
          warnings.push(`${el.type} ${el.id} intersects filled ${obstacle.type} ${obstacle.id}`)
          if (warnings.length >= MAX_WARNINGS) return warnings
        }
      }
    }
  }

  return warnings
}

export function formatCanvasSnapshot(elements) {
  const current = elements.filter((e) => e.type !== "background" && e.visible !== false)
  const snapshot = current.map((el) => {
    const b = getBounds(el)
    const anchors = getAnchors(b)
    return [
      `id:${el.id}`,
      `type:${el.type}`,
      `bounds:(${round(b.x)},${round(b.y)},${round(b.w)}x${round(b.h)})`,
      `center:(${round(anchors.center.x)},${round(anchors.center.y)})`,
      el.text ? `text:"${el.text}"` : null,
      el.fill ? `fill:${el.fill}` : null,
      el.color ? `color:${el.color}` : null,
    ].filter(Boolean).join(" ")
  })

  const allBounds = current.map(getBounds)
  let occupied = "empty canvas"
  if (allBounds.length > 0) {
    const minX = Math.min(...allBounds.map((b) => b.x))
    const minY = Math.min(...allBounds.map((b) => b.y))
    const maxX = Math.max(...allBounds.map((b) => b.x + b.w))
    const maxY = Math.max(...allBounds.map((b) => b.y + b.h))
    occupied = `occupied region: (${round(minX)},${round(minY)}) to (${round(maxX)},${round(maxY)}). Free space: right of x=${round(maxX + 40)}, below y=${round(maxY + 40)}`
  }

  const warnings = detectLayoutWarnings(elements)
  const warningText = warnings.length
    ? `\n[LAYOUT WARNINGS]\n${warnings.map((warning) => `- ${warning}`).join("\n")}`
    : "\n[LAYOUT WARNINGS]\nnone"

  return `[CANVAS SNAPSHOT] ${current.length} elements. ${occupied}\n${snapshot.join("\n")}${warningText}`
}

export function verifyLayout(elements) {
  const warnings = detectLayoutWarnings(elements)
  if (warnings.length === 0) return "[LAYOUT VERIFICATION] no overlaps or path-obstacle intersections detected."
  return `[LAYOUT VERIFICATION] ${warnings.length} warning${warnings.length === 1 ? "" : "s"}:\n${warnings.map((warning) => `- ${warning}`).join("\n")}`
}
