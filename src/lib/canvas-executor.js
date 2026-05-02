import { createElement } from "./element-store"

export function executeToolCall(toolCall) {
  const { name, arguments: args } = toolCall.function
  const a = args || {}

  switch (name) {
    case "draw_rectangle":
      return createElement("rectangle", {
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        fill: a.fill || null,
        stroke: a.stroke || null,
        strokeWidth: a.strokeWidth || 2,
      })
    case "draw_circle":
      return createElement("circle", {
        x: a.x,
        y: a.y,
        radius: a.radius,
        fill: a.fill || null,
        stroke: a.stroke || null,
        strokeWidth: a.strokeWidth || 2,
      })
    case "draw_line":
      return createElement("line", {
        x1: a.x1,
        y1: a.y1,
        x2: a.x2,
        y2: a.y2,
        color: a.color || "#E8E8E8",
        width: a.width || 2,
      })
    case "draw_text":
      return createElement("text", {
        x: a.x,
        y: a.y,
        text: a.text,
        fontSize: a.fontSize || 16,
        color: a.color || "#E8E8E8",
        fontFamily: a.fontFamily || "Space Grotesk, sans-serif",
        align: a.align || "left",
        baseline: a.baseline || "alphabetic",
      })
    case "clear_canvas":
      return { __clear: true }
    case "set_background":
      return createElement("background", { color: a.color })
    case "draw_path":
      return createElement("path", {
        points: a.points || [],
        color: a.color || "#E8E8E8",
        width: a.width || 2,
        closed: a.closed || false,
        fill: a.fill || null,
      })
    case "get_canvas_snapshot":
      return { __snapshot: true }
    case "update_element": {
      const { id, ...updates } = a
      return { __update: true, id, updates }
    }
    default:
      return null
  }
}
