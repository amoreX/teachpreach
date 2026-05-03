# App-Owned Diagram Engines Report

## Summary

The drawing system has been revamped so correctness-sensitive diagrams no longer depend on the model manually inventing coordinates, algorithm state, scales, or layouts.

The app now owns deterministic rendering for these structured domains:

- Grid pathfinding: A*, BFS, DFS, Dijkstra-style traversal.
- Graph algorithms: BFS, DFS, Dijkstra.
- Charts: bar and line charts with app-owned axes, ticks, and value placement.
- Trees: parent/child layout.
- Tables: row/column sizing and aligned cell text.
- Timelines: ordered event spacing.

Primitive drawing tools still remain for freeform sketches, conceptual flowcharts, annotations, and visual polish.

## Why This Was Needed

The previous system improved spatial awareness with grids, snapshots, collision checks, and screenshot QA, but the model was still allowed to draw a maze or algorithm trace by hand. That caused fundamental correctness failures:

- Start nodes placed in unreachable pockets.
- Goals disconnected from the start.
- A* open/closed list state invented instead of computed.
- Paths and explored cells that did not match the maze.
- Charts and structured layouts relying on guessed pixels.

Screenshots help the model notice visual problems, but screenshots do not generate valid algorithm state. The source of truth has to live in app code for diagrams where correctness matters.

## What Was Implemented

### 1. Deterministic Structured Diagram Module

Added `src/lib/structured-diagrams.js`.

This module creates complete batches of canvas elements from app-owned data and algorithms. It includes:

- `createPathfindingDemo`
- `createGraphAlgorithmDemo`
- `createChart`
- `createTreeDiagram`
- `createTable`
- `createTimeline`

Each function returns:

- Canvas elements to render.
- A structured text summary for the model.

### 2. Pathfinding Engine

Pathfinding demos now generate and validate real grid state.

Implemented behavior:

- Normalizes start, goal, wall cells, rows, columns, and cell size.
- Rejects walls that cover start or goal.
- Checks reachability.
- If the provided wall layout is disconnected, replaces it with a reachable generated layout.
- Runs the selected algorithm:
  - `astar`
  - `bfs`
  - `dfs`
  - `dijkstra`
- Produces real trace state: current cell, open/frontier cells, closed cells, and final path.
- Renders walls, start, goal, explored cells, final path, and trace panel from engine output.

Impact:

The model can no longer create a boxed-in start or fake an A* trace when it uses the semantic tool. Invalid pathfinding specs are repaired before anything reaches the canvas.

### 3. Graph Algorithm Engine

Graph algorithm demos now use app-owned graph state.

Implemented behavior:

- Accepts nodes, edges, weights, start node, and algorithm.
- Provides default graph data if the model does not specify one.
- Runs:
  - BFS traversal order.
  - DFS traversal order.
  - Dijkstra distances.
- Renders nodes, edges, weights, traversal state, and result panel deterministically.

Impact:

The model no longer needs to invent traversal order or shortest-path distances for graph demos.

### 4. Chart Renderer

Charts now use app-owned scales.

Implemented behavior:

- Supports bar charts and line charts.
- Computes max value.
- Draws axes, tick marks, grid lines, bars/points, labels, and values from data.

Impact:

Bars and points now correspond to actual values instead of approximate hand-drawn heights.

### 5. Tree Renderer

Trees now use app-owned parent/child layout.

Implemented behavior:

- Accepts nodes, root, and parent-child edges.
- Computes levels breadth-first.
- Places nodes by level with consistent spacing.
- Draws parent-child connectors and labels.

Impact:

Tree structure is no longer dependent on guessed node placement.

### 6. Table Renderer

Tables now use app-owned row and column sizing.

Implemented behavior:

- Accepts columns and rows.
- Computes consistent cell positions.
- Centers header and cell text.
- Supports configurable column width and row height.

Impact:

Tables, matrices, DP tables, and comparison grids are aligned by code rather than by the model eyeballing rectangles.

### 7. Timeline Renderer

Timelines now use app-owned event ordering and spacing.

Implemented behavior:

- Accepts ordered events.
- Spaces events evenly on a horizontal axis.
- Renders labels and optional details.

Impact:

Sequence diagrams and timeline explanations get stable ordering and spacing.

### 8. Semantic Tools

Extended `src/lib/tools.js` with app-owned structured tools:

- `create_pathfinding_demo`
- `create_graph_algorithm_demo`
- `create_chart`
- `create_tree_diagram`
- `create_table`
- `create_timeline`

Existing low-level tools remain available:

- `draw_rectangle`
- `draw_circle`
- `draw_line`
- `draw_text`
- `draw_path`
- spatial helpers
- screenshot QA

### 9. Tool Execution Support

Updated `src/lib/canvas-executor.js`.

The executor now supports semantic tools that return a batch of canvas elements instead of one element.

Updated `src/App.jsx`.

The app now handles `__batch` tool results by appending all returned elements to the canvas and returning a structured summary to the model.

### 10. Prompt Routing

Updated `src/lib/openrouter.js`.

The system prompt now tells the model:

- Use `create_pathfinding_demo` for pathfinding, mazes, A*, BFS, DFS, and Dijkstra on grids.
- Use `create_graph_algorithm_demo` for graph BFS, DFS, and Dijkstra.
- Use `create_chart` for charts and plots.
- Use `create_tree_diagram` for trees and hierarchies.
- Use `create_table` for tables, matrices, and DP tables.
- Use `create_timeline` for timelines and ordered sequences.
- Use primitive tools for freeform sketches, annotations, flowcharts, and concept visuals.

## Architecture

```text
User request
-> Model chooses intent and semantic tool
-> App validates data / runs algorithm / computes layout
-> App returns deterministic canvas elements
-> Screenshot QA checks visual output
-> Model explains or annotates
```

This separates responsibilities:

```text
Model owns:
- Intent
- Teaching language
- High-level composition
- Optional annotations

App owns:
- Algorithm state
- Coordinates
- Layout constraints
- Scales and ticks
- Parent/child placement
- Row/column alignment
```

## Verification

### Production Build

Ran:

```text
npm run build
```

Result:

```text
✓ built successfully
```

### Runtime Engine Checks

Loaded the source modules through Vite SSR and exercised every semantic renderer.

Checked:

- A* pathfinding.
- BFS grid pathfinding.
- DFS grid pathfinding.
- Dijkstra grid pathfinding.
- Graph BFS.
- Graph DFS.
- Graph Dijkstra.
- Bar chart.
- Line chart.
- Tree diagram.
- Table.
- Timeline.

The pathfinding check intentionally passed an invalid wall layout that boxed in the start. The engine repaired it and reported a reachable grid for all four grid algorithms.

Observed runtime output:

```text
astar: reachable
bfs: reachable
dfs: reachable
dijkstra: reachable
pathfinding: elements produced
graph-bfs: elements produced
graph-dfs: elements produced
graph-dijkstra: elements produced
bar-chart: elements produced
line-chart: elements produced
tree: elements produced
table: elements produced
timeline: elements produced
```

## Current Behavior

Structured/correctness-sensitive diagrams now have app-owned paths:

- Pathfinding requests should use deterministic grid rendering.
- Graph algorithm requests should use deterministic graph state.
- Chart requests should use deterministic scales and axes.
- Tree requests should use deterministic parent-child layout.
- Table requests should use deterministic cell layout.
- Timeline requests should use deterministic event spacing.

Freeform diagrams still use normal drawing tools:

- Flowcharts.
- Concept sketches.
- Visual metaphors.
- Informal process diagrams.
- Extra annotations on top of semantic diagrams.

## Limitations

This is a strong first app-owned layer, but not a full design system for every possible diagram.

Current limitations:

- Pathfinding grids are rendered as compact demos, not a fully interactive step player.
- Graph layout uses a simple circular layout.
- Tree layout uses level-based spacing.
- Charts support bar and line charts only.
- Timeline layout is horizontal only.
- Geometry diagrams with theorem-level constraints are not yet a dedicated engine.

## Next Improvements

Recommended next steps:

- Add explicit `create_geometry_diagram` for angles, triangles, measurements, intersections, and proofs.
- Add graph layout options such as layered, force-like, or manual positions.
- Add chart variants like scatter, stacked bar, and area.
- Add step-by-step rendering controls for pathfinding and graph algorithms.
- Add semantic repair commands so the model can ask for “simpler maze,” “more spacing,” or “larger labels” without redrawing from primitives.

## Bottom Line

The app now has a real hybrid architecture:

- Deterministic engines for diagrams where correctness matters.
- Primitive tools for flexible visual teaching.
- Screenshot QA for perceptual review.

This should prevent the kind of invalid maze and fake A* trace failures that were happening before, as long as the model follows the semantic tool routing in the prompt.

