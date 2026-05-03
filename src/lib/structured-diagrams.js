import { createElement } from "./element-store"

const COLORS = {
  text: "#E8E8E8",
  title: "#D4A843",
  muted: "#666666",
  wall: "#3F3F3F",
  cell: "#151515",
  grid: "#2E2E2E",
  active: "#5B9BF6",
  done: "#4A9E5C",
  path: "#D4A843",
  start: "#34D399",
  goal: "#FF6B6B",
  panel: "#171717",
}

function rect(x, y, width, height, fill = null, stroke = COLORS.text, strokeWidth = 1) {
  return createElement("rectangle", { x, y, width, height, fill, stroke, strokeWidth })
}

function circle(x, y, radius, fill = null, stroke = COLORS.text, strokeWidth = 2) {
  return createElement("circle", { x, y, radius, fill, stroke, strokeWidth })
}

function line(x1, y1, x2, y2, color = COLORS.muted, width = 2) {
  return createElement("line", { x1, y1, x2, y2, color, width })
}

function path(points, color = COLORS.path, width = 4) {
  return createElement("path", { points, color, width, closed: false, fill: null })
}

function text(x, y, value, fontSize = 14, color = COLORS.text, align = "left", baseline = "alphabetic") {
  return createElement("text", {
    x,
    y,
    text: String(value),
    fontSize,
    color,
    fontFamily: "Space Grotesk, sans-serif",
    align,
    baseline,
  })
}

function key(cell) {
  return `${cell.r},${cell.c}`
}

function normalizeCell(cell, fallback) {
  if (Array.isArray(cell)) return { r: cell[0], c: cell[1] }
  if (cell && typeof cell === "object") return { r: cell.r ?? cell.row ?? fallback.r, c: cell.c ?? cell.col ?? fallback.c }
  return fallback
}

function neighbors(cell, rows, cols, wallSet) {
  return [
    { r: cell.r - 1, c: cell.c },
    { r: cell.r, c: cell.c + 1 },
    { r: cell.r + 1, c: cell.c },
    { r: cell.r, c: cell.c - 1 },
  ].filter((n) => n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols && !wallSet.has(key(n)))
}

function manhattan(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c)
}

function reconstruct(parent, endKey) {
  const out = []
  let current = endKey
  while (current) {
    const [r, c] = current.split(",").map(Number)
    out.push({ r, c })
    current = parent.get(current)
  }
  return out.reverse()
}

function defaultWalls(rows, cols, start, goal) {
  const guaranteedPath = new Set()
  for (let c = start.c; c <= goal.c; c++) guaranteedPath.add(key({ r: start.r, c }))
  for (let r = start.r; r <= goal.r; r++) guaranteedPath.add(key({ r, c: goal.c }))
  guaranteedPath.add(key(start))
  guaranteedPath.add(key(goal))

  const walls = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellKey = key({ r, c })
      if (guaranteedPath.has(cellKey)) continue
      if ((r * 3 + c * 2) % 7 === 0 || (r + c * 4) % 11 === 0) walls.push({ r, c })
    }
  }
  return walls
}

function astar(rows, cols, start, goal, wallSet) {
  const startKey = key(start)
  const goalKey = key(goal)
  const open = new Map([[startKey, { ...start, g: 0, h: manhattan(start, goal), f: manhattan(start, goal) }]])
  const closed = new Set()
  const parent = new Map()
  const gScore = new Map([[startKey, 0]])
  const trace = []

  while (open.size > 0 && trace.length < rows * cols) {
    const current = [...open.values()].sort((a, b) => a.f - b.f || a.h - b.h)[0]
    const currentKey = key(current)
    open.delete(currentKey)
    closed.add(currentKey)

    const updated = []
    for (const n of neighbors(current, rows, cols, wallSet)) {
      const nKey = key(n)
      if (closed.has(nKey)) continue
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        parent.set(nKey, currentKey)
        const h = manhattan(n, goal)
        const item = { ...n, g: tentativeG, h, f: tentativeG + h }
        gScore.set(nKey, tentativeG)
        open.set(nKey, item)
        updated.push(item)
      }
    }

    trace.push({
      current,
      open: [...open.values()].sort((a, b) => a.f - b.f || a.h - b.h).slice(0, 5),
      closed: [...closed],
      updated,
    })

    if (currentKey === goalKey) {
      return { found: true, path: reconstruct(parent, goalKey), trace }
    }
  }

  return { found: false, path: [], trace }
}

function unweightedSearch(rows, cols, start, goal, wallSet, algorithm) {
  const startKey = key(start)
  const goalKey = key(goal)
  const frontier = [{ ...start, g: 0, h: manhattan(start, goal), f: 0 }]
  const seen = new Set([startKey])
  const closed = new Set()
  const parent = new Map()
  const distance = new Map([[startKey, 0]])
  const trace = []

  while (frontier.length > 0 && trace.length < rows * cols) {
    const current = algorithm === "dfs" ? frontier.pop() : frontier.shift()
    const currentKey = key(current)
    closed.add(currentKey)
    const updated = []

    if (currentKey === goalKey) return { found: true, path: reconstruct(parent, goalKey), trace: [...trace, { current, open: [...frontier], closed: [...closed], updated }] }

    for (const n of neighbors(current, rows, cols, wallSet)) {
      const nKey = key(n)
      if (seen.has(nKey)) continue
      seen.add(nKey)
      parent.set(nKey, currentKey)
      const g = (distance.get(currentKey) ?? 0) + 1
      distance.set(nKey, g)
      const item = { ...n, g, h: manhattan(n, goal), f: g }
      frontier.push(item)
      updated.push(item)
    }

    trace.push({
      current,
      open: [...frontier].slice(0, 5),
      closed: [...closed],
      updated,
    })
  }

  return { found: false, path: [], trace }
}

function runPathfindingAlgorithm(rows, cols, start, goal, wallSet, algorithm) {
  if (algorithm === "bfs" || algorithm === "dfs" || algorithm === "dijkstra") {
    return unweightedSearch(rows, cols, start, goal, wallSet, algorithm)
  }
  return astar(rows, cols, start, goal, wallSet)
}

function ensureReachableGrid(rows, cols, start, goal, requestedWalls = [], algorithm = "astar") {
  const cleanWalls = requestedWalls
    .map((w) => normalizeCell(w, null))
    .filter(Boolean)
    .filter((w) => w.r >= 0 && w.r < rows && w.c >= 0 && w.c < cols)
    .filter((w) => key(w) !== key(start) && key(w) !== key(goal))

  let wallSet = new Set(cleanWalls.map(key))
  let result = runPathfindingAlgorithm(rows, cols, start, goal, wallSet, algorithm)
  if (result.found) return { walls: cleanWalls, wallSet, result, repaired: false }

  const fallbackWalls = defaultWalls(rows, cols, start, goal)
  wallSet = new Set(fallbackWalls.map(key))
  result = runPathfindingAlgorithm(rows, cols, start, goal, wallSet, algorithm)
  return { walls: fallbackWalls, wallSet, result, repaired: true }
}

function cellCenter(originX, originY, cellSize, cell) {
  return {
    x: originX + cell.c * cellSize + cellSize / 2,
    y: originY + cell.r * cellSize + cellSize / 2,
  }
}

export function createPathfindingDemo(args = {}) {
  const rows = Math.max(5, Math.min(args.rows || 8, 14))
  const cols = Math.max(5, Math.min(args.cols || 10, 16))
  const start = normalizeCell(args.start, { r: 0, c: 0 })
  const goal = normalizeCell(args.goal, { r: rows - 1, c: cols - 1 })
  const originX = args.x ?? 40
  const originY = args.y ?? 70
  const cellSize = args.cellSize || 34
  const algorithm = (args.algorithm || "astar").toLowerCase()
  const { walls, wallSet, result, repaired } = ensureReachableGrid(rows, cols, start, goal, args.walls || [], algorithm)
  const elements = []

  elements.push(text(originX, originY - 34, `${algorithm.toUpperCase()} Pathfinding Demo`, 22, COLORS.title))
  elements.push(rect(originX, originY, cols * cellSize, rows * cellSize, null, COLORS.text, 2))

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = originX + c * cellSize
      const y = originY + r * cellSize
      elements.push(rect(x, y, cellSize, cellSize, COLORS.cell, COLORS.grid, 1))
    }
  }

  for (const wall of walls) {
    elements.push(rect(originX + wall.c * cellSize, originY + wall.r * cellSize, cellSize, cellSize, COLORS.wall, COLORS.wall, 1))
  }

  const explored = new Set(result.trace.flatMap((s) => s.closed).filter((k) => k !== key(start) && k !== key(goal)))
  for (const item of [...explored].slice(0, 24)) {
    const [r, c] = item.split(",").map(Number)
    if (wallSet.has(item)) continue
    elements.push(rect(originX + c * cellSize + 5, originY + r * cellSize + 5, cellSize - 10, cellSize - 10, "rgba(91,155,246,0.25)", null, 0))
  }

  if (result.path.length > 1) {
    elements.push(path(result.path.map((cell) => cellCenter(originX, originY, cellSize, cell)), COLORS.path, 5))
  }

  const startPoint = cellCenter(originX, originY, cellSize, start)
  const goalPoint = cellCenter(originX, originY, cellSize, goal)
  elements.push(circle(startPoint.x, startPoint.y, 12, COLORS.start, COLORS.text, 2))
  elements.push(text(startPoint.x, startPoint.y + 1, "S", 12, "#111111", "center", "middle"))
  elements.push(circle(goalPoint.x, goalPoint.y, 12, COLORS.goal, COLORS.text, 2))
  elements.push(text(goalPoint.x, goalPoint.y + 1, "G", 12, "#111111", "center", "middle"))

  const panelX = originX + cols * cellSize + 70
  let panelY = originY
  elements.push(text(panelX, panelY - 34, "Algorithm Trace", 20, COLORS.title))
  const traceSteps = result.trace.slice(0, 6)
  const scoreLabel = algorithm === "astar" ? "f" : "d"
  for (let i = 0; i < traceSteps.length; i++) {
    const step = traceSteps[i]
    elements.push(text(panelX, panelY, `Step ${i + 1}: expand (${step.current.r},${step.current.c})`, 13, COLORS.title))
    elements.push(rect(panelX, panelY + 10, 260, 58, COLORS.panel, COLORS.muted, 1))
    elements.push(text(panelX + 10, panelY + 30, `Open: ${step.open.map((n) => `(${n.r},${n.c}) ${scoreLabel}=${n.f}`).join("  ") || "[]"}`, 11, COLORS.text))
    elements.push(text(panelX + 10, panelY + 48, `Closed: ${step.closed.slice(-5).join("  ") || "[]"}`, 11, COLORS.text))
    panelY += 82
  }

  const summary = [
    `[PATHFINDING DEMO] ${algorithm.toUpperCase()} rendered by deterministic engine.`,
    `grid: ${rows}x${cols}, start: (${start.r},${start.c}), goal: (${goal.r},${goal.c}), walls: ${walls.length}`,
    `reachable: ${result.found}, path length: ${result.path.length}`,
    repaired ? "input walls were disconnected or invalid, so a reachable maze was generated instead." : "input grid was valid.",
  ].join("\n")

  return { elements, content: summary }
}

function defaultGraph() {
  return {
    nodes: ["A", "B", "C", "D", "E", "F"],
    edges: [
      ["A", "B", 2],
      ["A", "C", 4],
      ["B", "D", 1],
      ["B", "E", 7],
      ["C", "E", 3],
      ["D", "F", 5],
      ["E", "F", 1],
    ],
    start: "A",
  }
}

function graphTrace(nodes, edges, start, algorithm) {
  const adj = new Map(nodes.map((n) => [n, []]))
  for (const [a, b, w = 1] of edges) {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a).push({ to: b, w })
    adj.get(b).push({ to: a, w })
  }

  if (algorithm === "dfs") {
    const seen = new Set()
    const order = []
    const stack = [start]
    while (stack.length) {
      const n = stack.pop()
      if (seen.has(n)) continue
      seen.add(n)
      order.push(n)
      for (const e of [...(adj.get(n) || [])].reverse()) if (!seen.has(e.to)) stack.push(e.to)
    }
    return { order, distances: null }
  }

  if (algorithm === "dijkstra") {
    const dist = new Map(nodes.map((n) => [n, Infinity]))
    const visited = new Set()
    dist.set(start, 0)
    while (visited.size < nodes.length) {
      const current = nodes.filter((n) => !visited.has(n)).sort((a, b) => dist.get(a) - dist.get(b))[0]
      if (!current || dist.get(current) === Infinity) break
      visited.add(current)
      for (const e of adj.get(current) || []) {
        dist.set(e.to, Math.min(dist.get(e.to), dist.get(current) + e.w))
      }
    }
    return { order: [...visited], distances: Object.fromEntries(dist) }
  }

  const seen = new Set([start])
  const order = []
  const queue = [start]
  while (queue.length) {
    const n = queue.shift()
    order.push(n)
    for (const e of adj.get(n) || []) {
      if (!seen.has(e.to)) {
        seen.add(e.to)
        queue.push(e.to)
      }
    }
  }
  return { order, distances: null }
}

export function createGraphAlgorithmDemo(args = {}) {
  const defaults = defaultGraph()
  const nodes = (args.nodes?.length ? args.nodes : defaults.nodes).map((n) => typeof n === "string" ? n : n.id)
  const edges = args.edges?.length ? args.edges.map((e) => Array.isArray(e) ? e : [e.from, e.to, e.weight || 1]) : defaults.edges
  const start = args.start || defaults.start
  const algorithm = (args.algorithm || "bfs").toLowerCase()
  const originX = args.x ?? 60
  const originY = args.y ?? 90
  const radius = args.radius || 120
  const centerX = originX + 150
  const centerY = originY + 150
  const trace = graphTrace(nodes, edges, start, algorithm)
  const positions = new Map()
  const elements = []

  elements.push(text(originX, originY - 42, `${algorithm.toUpperCase()} Graph Demo`, 22, COLORS.title))
  nodes.forEach((node, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / nodes.length
    positions.set(node, { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius })
  })

  for (const [a, b, w = 1] of edges) {
    const p1 = positions.get(a)
    const p2 = positions.get(b)
    if (!p1 || !p2) continue
    elements.push(line(p1.x, p1.y, p2.x, p2.y, COLORS.muted, 2))
    if (algorithm === "dijkstra") elements.push(text((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 5, w, 11, COLORS.title, "center"))
  }

  nodes.forEach((node) => {
    const p = positions.get(node)
    const idx = trace.order.indexOf(node)
    const fill = node === start ? COLORS.start : idx >= 0 ? COLORS.active : "#444444"
    elements.push(circle(p.x, p.y, 24, fill, COLORS.text, 2))
    elements.push(text(p.x, p.y + 1, node, 14, "#111111", "center", "middle"))
  })

  const panelX = originX + 340
  elements.push(text(panelX, originY - 42, "Traversal State", 20, COLORS.title))
  elements.push(rect(panelX, originY, 260, 150, COLORS.panel, COLORS.muted, 1))
  elements.push(text(panelX + 14, originY + 30, `Start: ${start}`, 13))
  elements.push(text(panelX + 14, originY + 55, `Order: ${trace.order.join(" -> ")}`, 13))
  if (trace.distances) {
    elements.push(text(panelX + 14, originY + 82, `Distances:`, 13, COLORS.title))
    elements.push(text(panelX + 14, originY + 107, Object.entries(trace.distances).map(([k, v]) => `${k}:${v}`).join("  "), 12))
  }

  return {
    elements,
    content: `[GRAPH DEMO] ${algorithm.toUpperCase()} rendered from app-owned graph state. Order: ${trace.order.join(" -> ")}`,
  }
}

function normalizeData(data = []) {
  if (!data.length) {
    return [
      { label: "A", value: 12 },
      { label: "B", value: 20 },
      { label: "C", value: 15 },
      { label: "D", value: 28 },
    ]
  }
  return data.map((d, i) => typeof d === "number" ? { label: String(i + 1), value: d } : { label: d.label ?? String(i + 1), value: Number(d.value ?? 0) })
}

export function createChart(args = {}) {
  const data = normalizeData(args.data)
  const chartType = args.chartType || "bar"
  const x = args.x ?? 60
  const y = args.y ?? 90
  const width = args.width || 420
  const height = args.height || 260
  const max = Math.max(...data.map((d) => d.value), 1)
  const elements = [text(x, y - 38, args.title || "Chart", 22, COLORS.title)]
  const plotX = x + 45
  const plotY = y + 20
  const plotW = width - 70
  const plotH = height - 70
  elements.push(line(plotX, plotY, plotX, plotY + plotH, COLORS.text, 2))
  elements.push(line(plotX, plotY + plotH, plotX + plotW, plotY + plotH, COLORS.text, 2))

  for (let i = 0; i <= 4; i++) {
    const ty = plotY + plotH - (i / 4) * plotH
    elements.push(line(plotX - 4, ty, plotX + plotW, ty, "#2A2A2A", 1))
    elements.push(text(plotX - 10, ty + 4, Math.round((max * i) / 4), 10, COLORS.text, "right"))
  }

  if (chartType === "line") {
    const points = data.map((d, i) => ({
      x: plotX + (i / Math.max(data.length - 1, 1)) * plotW,
      y: plotY + plotH - (d.value / max) * plotH,
    }))
    elements.push(path(points, COLORS.active, 3))
    points.forEach((p, i) => {
      elements.push(circle(p.x, p.y, 5, COLORS.active, COLORS.text, 1))
      elements.push(text(p.x, plotY + plotH + 18, data[i].label, 10, COLORS.text, "center"))
    })
  } else {
    const gap = 12
    const barW = (plotW - gap * (data.length - 1)) / data.length
    data.forEach((d, i) => {
      const barH = (d.value / max) * plotH
      const bx = plotX + i * (barW + gap)
      const by = plotY + plotH - barH
      elements.push(rect(bx, by, barW, barH, COLORS.active, null, 0))
      elements.push(text(bx + barW / 2, by - 6, d.value, 10, COLORS.text, "center"))
      elements.push(text(bx + barW / 2, plotY + plotH + 18, d.label, 10, COLORS.text, "center"))
    })
  }

  return { elements, content: `[CHART] ${chartType} chart rendered with app-owned scales, axes, ticks, and values.` }
}

export function createTreeDiagram(args = {}) {
  const nodes = args.nodes?.length ? args.nodes : ["A", "B", "C", "D", "E", "F", "G"]
  const edges = args.edges?.length ? args.edges.map((e) => Array.isArray(e) ? e : [e.parent, e.child]) : [["A", "B"], ["A", "C"], ["B", "D"], ["B", "E"], ["C", "F"], ["C", "G"]]
  const root = args.root || nodes[0]
  const children = new Map(nodes.map((n) => [n, []]))
  for (const [p, c] of edges) children.get(p)?.push(c)
  const levels = [[root]]
  const seen = new Set([root])
  for (let i = 0; i < levels.length; i++) {
    const next = []
    for (const n of levels[i]) for (const c of children.get(n) || []) if (!seen.has(c)) { seen.add(c); next.push(c) }
    if (next.length) levels.push(next)
  }

  const x = args.x ?? 60
  const y = args.y ?? 90
  const width = args.width || 520
  const levelGap = args.levelGap || 90
  const positions = new Map()
  levels.forEach((level, depth) => {
    level.forEach((node, i) => {
      positions.set(node, { x: x + ((i + 1) * width) / (level.length + 1), y: y + depth * levelGap })
    })
  })

  const elements = [text(x, y - 42, args.title || "Tree Diagram", 22, COLORS.title)]
  for (const [p, c] of edges) {
    const a = positions.get(p)
    const b = positions.get(c)
    if (a && b) elements.push(line(a.x, a.y + 22, b.x, b.y - 22, COLORS.muted, 2))
  }
  for (const [node, p] of positions) {
    elements.push(circle(p.x, p.y, 24, COLORS.active, COLORS.text, 2))
    elements.push(text(p.x, p.y + 1, node, 14, "#111111", "center", "middle"))
  }
  return { elements, content: "[TREE] rendered with app-owned parent/child layout." }
}

export function createTable(args = {}) {
  const columns = args.columns?.length ? args.columns : ["Name", "Value", "Status"]
  const rows = args.rows?.length ? args.rows : [["A", "12", "Open"], ["B", "20", "Closed"], ["C", "15", "Open"]]
  const x = args.x ?? 60
  const y = args.y ?? 90
  const colW = args.colWidth || 110
  const rowH = args.rowHeight || 34
  const elements = [text(x, y - 36, args.title || "Table", 22, COLORS.title)]

  columns.forEach((col, c) => {
    elements.push(rect(x + c * colW, y, colW, rowH, COLORS.panel, COLORS.text, 1))
    elements.push(text(x + c * colW + colW / 2, y + rowH / 2, col, 13, COLORS.title, "center", "middle"))
  })
  rows.forEach((row, r) => {
    columns.forEach((_, c) => {
      const value = Array.isArray(row) ? row[c] : row[columns[c]]
      elements.push(rect(x + c * colW, y + (r + 1) * rowH, colW, rowH, null, COLORS.muted, 1))
      elements.push(text(x + c * colW + colW / 2, y + (r + 1) * rowH + rowH / 2, value ?? "", 12, COLORS.text, "center", "middle"))
    })
  })
  return { elements, content: `[TABLE] rendered with app-owned row/column sizing (${columns.length} columns, ${rows.length} rows).` }
}

export function createTimeline(args = {}) {
  const events = (args.events?.length ? args.events : [
    { label: "Start", detail: "Initial state" },
    { label: "Explore", detail: "Process candidates" },
    { label: "Update", detail: "Record best values" },
    { label: "Finish", detail: "Return result" },
  ]).map((e, i) => typeof e === "string" ? { label: e, detail: "" } : { label: e.label ?? `Event ${i + 1}`, detail: e.detail ?? e.date ?? "" })
  const x = args.x ?? 60
  const y = args.y ?? 150
  const width = args.width || 560
  const elements = [text(x, y - 70, args.title || "Timeline", 22, COLORS.title)]
  elements.push(line(x, y, x + width, y, COLORS.text, 2))
  events.forEach((event, i) => {
    const px = x + (i / Math.max(events.length - 1, 1)) * width
    elements.push(circle(px, y, 8, i === 0 ? COLORS.start : i === events.length - 1 ? COLORS.goal : COLORS.active, COLORS.text, 2))
    elements.push(text(px, y - 22, event.label, 13, COLORS.title, "center"))
    if (event.detail) elements.push(text(px, y + 34, event.detail, 11, COLORS.text, "center"))
  })
  return { elements, content: `[TIMELINE] rendered with app-owned ordering and spacing for ${events.length} events.` }
}

