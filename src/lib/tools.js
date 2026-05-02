export const drawingTools = [
  {
    type: "function",
    function: {
      name: "draw_rectangle",
      description: "Draw a rectangle on the canvas",
      parameters: {
        type: "object",
        properties: {
          x: { type: "number", description: "X coordinate of top-left corner" },
          y: { type: "number", description: "Y coordinate of top-left corner" },
          width: { type: "number", description: "Width in pixels" },
          height: { type: "number", description: "Height in pixels" },
          fill: { type: "string", description: "Fill color (hex or CSS color)" },
          stroke: { type: "string", description: "Stroke color" },
          strokeWidth: { type: "number", description: "Stroke width in pixels" },
        },
        required: ["x", "y", "width", "height"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draw_circle",
      description: "Draw a circle on the canvas",
      parameters: {
        type: "object",
        properties: {
          x: { type: "number", description: "Center X coordinate" },
          y: { type: "number", description: "Center Y coordinate" },
          radius: { type: "number", description: "Radius in pixels" },
          fill: { type: "string", description: "Fill color" },
          stroke: { type: "string", description: "Stroke color" },
          strokeWidth: { type: "number", description: "Stroke width" },
        },
        required: ["x", "y", "radius"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draw_line",
      description: "Draw a line on the canvas",
      parameters: {
        type: "object",
        properties: {
          x1: { type: "number", description: "Start X" },
          y1: { type: "number", description: "Start Y" },
          x2: { type: "number", description: "End X" },
          y2: { type: "number", description: "End Y" },
          color: { type: "string", description: "Line color" },
          width: { type: "number", description: "Line width" },
        },
        required: ["x1", "y1", "x2", "y2"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draw_text",
      description: "Draw text on the canvas. Use align to center text on a point (e.g. center a label inside a shape).",
      parameters: {
        type: "object",
        properties: {
          x: { type: "number", description: "X coordinate" },
          y: { type: "number", description: "Y coordinate" },
          text: { type: "string", description: "Text content" },
          fontSize: { type: "number", description: "Font size in pixels" },
          color: { type: "string", description: "Text color" },
          fontFamily: { type: "string", description: "Font family" },
          align: { type: "string", enum: ["left", "center", "right"], description: "Horizontal text alignment relative to x. Default: left" },
          baseline: { type: "string", enum: ["top", "middle", "bottom", "alphabetic"], description: "Vertical text baseline relative to y. Default: alphabetic" },
        },
        required: ["x", "y", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_canvas",
      description: "Clear the entire canvas",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_background",
      description: "Set the canvas background color",
      parameters: {
        type: "object",
        properties: {
          color: { type: "string", description: "Background color" },
        },
        required: ["color"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draw_path",
      description: "Draw a freeform path from a series of points",
      parameters: {
        type: "object",
        properties: {
          points: {
            type: "array",
            items: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
              },
            },
            description: "Array of {x, y} points",
          },
          color: { type: "string", description: "Stroke color" },
          width: { type: "number", description: "Stroke width" },
          closed: { type: "boolean", description: "Whether to close the path" },
          fill: { type: "string", description: "Fill color if closed" },
        },
        required: ["points"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_canvas_snapshot",
      description: "Get a snapshot of all elements currently on the canvas with their positions and bounds. Call this before adding content near existing drawings to avoid overlaps, or to find free space for new content.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_element",
      description: "Update properties of an existing element by ID. Use this to change colors, positions, sizes, or text of elements you previously drew. Every draw tool returns an element ID you can reference here.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "Element ID (returned from draw calls)" },
          fill: { type: "string", description: "New fill color" },
          stroke: { type: "string", description: "New stroke color" },
          color: { type: "string", description: "New color (for lines, text, paths)" },
          strokeWidth: { type: "number", description: "New stroke width" },
          x: { type: "number", description: "New X position" },
          y: { type: "number", description: "New Y position" },
          width: { type: "number", description: "New width (rectangles)" },
          height: { type: "number", description: "New height (rectangles)" },
          radius: { type: "number", description: "New radius (circles)" },
          text: { type: "string", description: "New text content" },
          fontSize: { type: "number", description: "New font size" },
          align: { type: "string", enum: ["left", "center", "right"], description: "Text alignment" },
          baseline: { type: "string", enum: ["top", "middle", "bottom", "alphabetic"], description: "Text baseline" },
        },
        required: ["id"],
      },
    },
  },
]
