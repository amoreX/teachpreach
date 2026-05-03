import { createElement } from "./element-store"
import {
  formatPointFromGrid,
  formatSnapToGrid,
  getElementAnchor,
  routePathAroundObstacles,
  summarizeGrid,
  verifyLayout,
} from "./spatial-geometry"
import {
  createChart,
  createGraphAlgorithmDemo,
  createPathfindingDemo,
  createTable,
  createTimeline,
  createTreeDiagram,
} from "./structured-diagrams"

export function executeToolCall(toolCall, context = {}) {
  const { name, arguments: args } = toolCall.function
  const a = args || {}
  const elements = context.elements || []

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
    case "create_pathfinding_demo":
      return { __batch: true, ...createPathfindingDemo(a) }
    case "create_graph_algorithm_demo":
      return { __batch: true, ...createGraphAlgorithmDemo(a) }
    case "create_chart":
      return { __batch: true, ...createChart(a) }
    case "create_tree_diagram":
      return { __batch: true, ...createTreeDiagram(a) }
    case "create_table":
      return { __batch: true, ...createTable(a) }
    case "create_timeline":
      return { __batch: true, ...createTimeline(a) }
    case "define_grid":
      return { __spatial: true, content: summarizeGrid(a) }
    case "point_from_grid":
      return { __spatial: true, content: formatPointFromGrid(a) }
    case "snap_to_grid":
      return { __spatial: true, content: formatSnapToGrid(a) }
    case "get_anchor_point":
      return { __spatial: true, content: getElementAnchor(elements, a) }
    case "route_path_around_obstacles":
      return { __spatial: true, content: routePathAroundObstacles(elements, a) }
    case "verify_layout":
      return { __spatial: true, content: verifyLayout(elements) }
    case "get_canvas_screenshot":
      return { __screenshot: true }
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
