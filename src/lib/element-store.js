let nextId = 1

export function createElement(type, props) {
  return {
    id: nextId++,
    type,
    ...props,
    visible: true,
    locked: false,
    createdAt: performance.now(),
  }
}

export function hitTest(element, px, py) {
  switch (element.type) {
    case "rectangle": {
      const { x, y, width, height } = element
      return px >= x && px <= x + width && py >= y && py <= y + height
    }
    case "circle": {
      const dx = px - element.x
      const dy = py - element.y
      return dx * dx + dy * dy <= element.radius * element.radius
    }
    case "text": {
      const fontSize = element.fontSize || 16
      const approxWidth = element.text.length * fontSize * 0.6
      const align = element.align || "left"
      let textX = element.x
      if (align === "center") textX = element.x - approxWidth / 2
      else if (align === "right") textX = element.x - approxWidth
      return (
        px >= textX &&
        px <= textX + approxWidth &&
        py >= element.y - fontSize &&
        py <= element.y
      )
    }
    case "line": {
      const { x1, y1, x2, y2 } = element
      const lineWidth = (element.width || 2) + 8
      const dx = x2 - x1
      const dy = y2 - y1
      const lenSq = dx * dx + dy * dy
      if (lenSq === 0) return Math.hypot(px - x1, py - y1) < lineWidth
      let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
      t = Math.max(0, Math.min(1, t))
      const projX = x1 + t * dx
      const projY = y1 + t * dy
      return Math.hypot(px - projX, py - projY) < lineWidth / 2
    }
    case "path": {
      if (!element.points || element.points.length < 2) return false
      const threshold = (element.width || 2) + 8
      for (let i = 0; i < element.points.length - 1; i++) {
        const p1 = element.points[i]
        const p2 = element.points[i + 1]
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const lenSq = dx * dx + dy * dy
        if (lenSq === 0) continue
        let t = ((px - p1.x) * dx + (py - p1.y) * dy) / lenSq
        t = Math.max(0, Math.min(1, t))
        const projX = p1.x + t * dx
        const projY = p1.y + t * dy
        if (Math.hypot(px - projX, py - projY) < threshold / 2) return true
      }
      return false
    }
    default:
      return false
  }
}

export function getBounds(element) {
  switch (element.type) {
    case "rectangle":
      return { x: element.x, y: element.y, w: element.width, h: element.height }
    case "circle":
      return {
        x: element.x - element.radius,
        y: element.y - element.radius,
        w: element.radius * 2,
        h: element.radius * 2,
      }
    case "text": {
      const fs = element.fontSize || 16
      const w = element.text.length * fs * 0.6
      const align = element.align || "left"
      let tx = element.x
      if (align === "center") tx = element.x - w / 2
      else if (align === "right") tx = element.x - w
      return { x: tx, y: element.y - fs, w, h: fs * 1.2 }
    }
    case "line":
      return {
        x: Math.min(element.x1, element.x2),
        y: Math.min(element.y1, element.y2),
        w: Math.abs(element.x2 - element.x1) || 1,
        h: Math.abs(element.y2 - element.y1) || 1,
      }
    case "path": {
      if (!element.points?.length) return { x: 0, y: 0, w: 0, h: 0 }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of element.points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
      return { x: minX, y: minY, w: maxX - minX || 1, h: maxY - minY || 1 }
    }
    default:
      return { x: 0, y: 0, w: 0, h: 0 }
  }
}
