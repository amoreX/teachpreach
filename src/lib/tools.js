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
      name: "create_pathfinding_demo",
      description: "Create a logically valid pathfinding diagram and trace from app-owned grid/algorithm state. Use this for A*, BFS, DFS, Dijkstra, maze solving, shortest path, or grid pathfinding demos instead of manually drawing maze walls and trace text.",
      parameters: {
        type: "object",
        properties: {
          algorithm: { type: "string", enum: ["astar", "bfs", "dfs", "dijkstra"], description: "Pathfinding algorithm to demonstrate on the grid." },
          rows: { type: "number" },
          cols: { type: "number" },
          start: { type: "array", items: { type: "number" }, description: "[row, col]" },
          goal: { type: "array", items: { type: "number" }, description: "[row, col]" },
          walls: {
            type: "array",
            items: { type: "array", items: { type: "number" } },
            description: "Optional wall cells as [row, col]. If invalid or disconnected, the app will generate a reachable grid.",
          },
          x: { type: "number" },
          y: { type: "number" },
          cellSize: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_graph_algorithm_demo",
      description: "Create a graph algorithm diagram from app-owned graph state. Use for BFS, DFS, or Dijkstra demos instead of manually inventing traversal state.",
      parameters: {
        type: "object",
        properties: {
          algorithm: { type: "string", enum: ["bfs", "dfs", "dijkstra"] },
          nodes: { type: "array", items: { type: "string" } },
          edges: {
            type: "array",
            items: { type: "array" },
            description: "Edges as [from, to, weight]. Weight is optional except for Dijkstra.",
          },
          start: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_chart",
      description: "Create a chart with app-owned scales, axes, ticks, and data placement. Use for bar or line charts instead of drawing axes and bars manually.",
      parameters: {
        type: "object",
        properties: {
          chartType: { type: "string", enum: ["bar", "line"] },
          title: { type: "string" },
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "number" },
              },
            },
          },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_tree_diagram",
      description: "Create a tree diagram with app-owned parent/child layout. Use for binary trees, hierarchy diagrams, recursion trees, heaps, and parse trees.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          nodes: { type: "array", items: { type: "string" } },
          edges: {
            type: "array",
            items: { type: "array" },
            description: "Parent-child edges as [parent, child].",
          },
          root: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_table",
      description: "Create a table with app-owned row/column sizing and aligned cell text. Use for matrices, DP tables, comparisons, and structured data.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          columns: { type: "array", items: { type: "string" } },
          rows: { type: "array", items: { type: "array" } },
          x: { type: "number" },
          y: { type: "number" },
          colWidth: { type: "number" },
          rowHeight: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_timeline",
      description: "Create a timeline with app-owned ordering and spacing. Use for sequences, histories, lifecycle flows, and step progressions.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                detail: { type: "string" },
              },
            },
          },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "define_grid",
      description: "Define a reusable grid coordinate system for precise layouts. Use this before drawing mazes, charts, tables, coordinate systems, or any diagram where elements must align.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short name for the grid" },
          originX: { type: "number", description: "Grid origin X, top-left corner" },
          originY: { type: "number", description: "Grid origin Y, top-left corner" },
          rows: { type: "number", description: "Number of rows" },
          cols: { type: "number", description: "Number of columns" },
          cellSize: { type: "number", description: "Uniform cell size in pixels" },
          cellWidth: { type: "number", description: "Cell width in pixels if cells are not square" },
          cellHeight: { type: "number", description: "Cell height in pixels if cells are not square" },
        },
        required: ["originX", "originY", "rows", "cols"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "point_from_grid",
      description: "Convert a grid row/column into an exact canvas coordinate. Use the returned point for labels, nodes, walls, data points, and path waypoints.",
      parameters: {
        type: "object",
        properties: {
          originX: { type: "number" },
          originY: { type: "number" },
          row: { type: "number" },
          col: { type: "number" },
          cellSize: { type: "number" },
          cellWidth: { type: "number" },
          cellHeight: { type: "number" },
          anchor: {
            type: "string",
            enum: ["center", "topLeft", "topRight", "bottomLeft", "bottomRight"],
            description: "Which point inside the cell to return. Default: center.",
          },
        },
        required: ["originX", "originY", "row", "col"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "snap_to_grid",
      description: "Snap an arbitrary point to the nearest grid center or corner. Use this to repair approximate coordinates before drawing.",
      parameters: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" },
          originX: { type: "number" },
          originY: { type: "number" },
          cellSize: { type: "number" },
          cellWidth: { type: "number" },
          cellHeight: { type: "number" },
          mode: { type: "string", enum: ["center", "corner"], description: "Snap target. Default: center." },
        },
        required: ["x", "y", "originX", "originY"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_anchor_point",
      description: "Get an exact anchor point from an existing element, such as its center, top, bottom, left, or right. Use this to connect lines and align annotations precisely.",
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "number", description: "Existing element ID" },
          anchor: {
            type: "string",
            enum: ["center", "top", "bottom", "left", "right", "topLeft", "topRight", "bottomLeft", "bottomRight"],
          },
        },
        required: ["elementId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "route_path_around_obstacles",
      description: "Calculate a collision-aware polyline between two points. Use this before drawing paths, flowchart connectors, annotation arrows, or graph edges that must avoid existing elements.",
      parameters: {
        type: "object",
        properties: {
          start: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
            },
            required: ["x", "y"],
          },
          end: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
            },
            required: ["x", "y"],
          },
          obstacleIds: {
            type: "array",
            items: { type: "number" },
            description: "Optional list of element IDs to avoid. If omitted, the router avoids visible rectangles, circles, and text.",
          },
          ignoreIds: {
            type: "array",
            items: { type: "number" },
            description: "Optional element IDs to ignore while routing.",
          },
          padding: { type: "number", description: "Extra space around obstacles. Default: 16." },
        },
        required: ["start", "end"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_layout",
      description: "Check the current canvas for overlaps and path-obstacle intersections. Call this after constrained drawings and repair any warnings before final explanation.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_canvas_screenshot",
      description: "Capture the rendered visible canvas viewport for visual QA. Use this after complex diagrams to inspect the actual image for clutter, unreadable text, bad hierarchy, overlaps, or spatial mistakes that structured geometry may miss.",
      parameters: {
        type: "object",
        properties: {},
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
