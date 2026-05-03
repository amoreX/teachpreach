# Spatial Reasoning Implementation Report

## Summary

Implemented a general spatial reasoning layer for the drawing agent. The goal was to improve the agent's ability to create accurate diagrams across many diagram types without adding one-off tools for every possible user request.

Instead of only relying on prompt engineering, the app now gives the model reusable spatial helpers for grids, snapping, anchors, routing, and layout verification. These tools help the model compute exact geometry before drawing with primitive canvas tools.

## What Changed

### 1. Added General Spatial Geometry Helpers

Created `src/lib/spatial-geometry.js`.

This module provides reusable spatial operations:

- Grid coordinate conversion.
- Point snapping to grid centers or corners.
- Element anchor extraction.
- Collision and overlap detection.
- Path-obstacle intersection checks.
- Simple obstacle-aware orthogonal route suggestions.
- Rich canvas snapshot formatting.
- Layout verification summaries.

Why this was added:

The agent was previously expected to manually calculate pixel positions in text. That is fragile. Moving reusable geometry logic into app code gives the model deterministic helpers it can call before drawing.

How it improves the app:

- Maze paths, chart points, graph connectors, labels, and annotations can be based on exact coordinates.
- The model can get precise warnings when elements overlap or paths intersect filled obstacles.
- The same helpers work across many diagram types instead of only solving mazes.

### 2. Added New Spatial Tools

Extended `src/lib/tools.js` with these general-purpose tools:

- `define_grid`
- `point_from_grid`
- `snap_to_grid`
- `get_anchor_point`
- `route_path_around_obstacles`
- `verify_layout`
- `get_canvas_screenshot`

Why this was added:

The previous tool set only exposed low-level primitives like rectangles, circles, lines, text, and paths. Those are flexible, but they force the model to invent geometry directly. The new tools let the model ask the app for spatial calculations while still drawing with the existing primitives.

How it improves the app:

- The agent can define a grid before drawing grid-based diagrams.
- The agent can convert row/column positions into exact canvas coordinates.
- The agent can connect to exact element anchors instead of approximate centers.
- The agent can ask for routed paths around existing obstacles.
- The agent can verify the canvas before giving the final answer.
- The agent can request a rendered screenshot for vision-based QA.

### 3. Wired Spatial Tools Into Tool Execution

Updated `src/lib/canvas-executor.js`.

The executor now handles spatial tool calls that return structured text feedback instead of drawing new elements. Drawing tools still create canvas elements as before.

Why this was added:

Some tools should not draw directly. A tool like `snap_to_grid` or `verify_layout` is more useful when it returns precise coordinates or warnings that the model can use in its next drawing step.

How it improves the app:

- Spatial reasoning can happen inside the existing multi-round tool loop.
- The model can call a helper, read the result, then draw more accurately in the next round.
- The existing drawing model remains flexible and backward-compatible.

### 4. Improved Canvas Snapshots

Updated `src/App.jsx` to use the new `formatCanvasSnapshot` helper.

Canvas snapshots now include:

- Element bounds.
- Element centers.
- Existing text/fill/color metadata.
- Occupied canvas region.
- Free-space suggestions.
- Layout warnings.

Why this was added:

The old snapshot only listed basic bounds. It helped avoid large overlaps, but it did not tell the model whether a path intersected an obstacle or whether elements were already colliding.

How it improves the app:

- The model receives better spatial context before adding or repairing content.
- Layout problems are visible to the model as structured warnings.
- The same snapshot tool is now useful for both free-space planning and quality control.

### 5. Updated the System Prompt

Updated `src/lib/openrouter.js`.

The prompt now instructs the agent to:

- Use spatial tools before raw pixel drawing.
- Define grids for constrained layouts.
- Use grid point conversion and snapping for exact coordinates.
- Use anchors for connectors and labels.
- Route paths around obstacles.
- Run `verify_layout` after constrained drawings.
- Run `get_canvas_screenshot` for complex or visually dense drawings.
- Repair warnings before final explanation.

Why this was added:

Tools only help if the agent knows when to use them. The prompt now turns the tools into an expected workflow instead of optional utilities.

How it improves the app:

- The agent is guided toward a plan-then-draw loop.
- Spatial checks become part of diagram creation.
- Rendered visual QA becomes part of complex diagram creation.
- The model is less likely to finish with known geometry mistakes.

### 6. Added Multimodal Visual QA Loop

Updated `src/App.jsx`, `src/lib/canvas-executor.js`, and `src/lib/store.js`.

The app now supports a `get_canvas_screenshot` tool. When the model calls it:

1. The app renders the current element store into an offscreen canvas and captures it with `toDataURL("image/jpeg")`.
2. The tool call is satisfied with a text result, keeping the tool-call protocol valid.
3. The screenshot is appended to the next model round as a user image message.
4. The model can inspect the actual rendered diagram and repair visual issues with more tool calls.

The app also sends automatic screenshot feedback after drawing/update rounds. This means the model no longer has to remember to call the screenshot tool manually after each iteration. If it draws a maze step, updates a path, or adds labels, the next model round includes the rendered viewport as visual context.

Why this was added:

Structured geometry catches exact intersections and overlaps, but it cannot judge all perceptual problems. The screenshot example showed issues such as cluttered labels, visual ambiguity, awkward hierarchy, and a diagram that still did not read cleanly even after grid-aware tooling.

How it improves the app:

- Haiku 4.5 and Sonnet 4.5 can inspect the rendered canvas as vision models.
- The agent can catch what structured metadata misses.
- Complex diagrams can go through a critique-and-repair loop before the final explanation.
- The model sees the same visual output the user sees, not just element coordinates.
- The agent gets visual feedback after every drawing round, reducing the chance that it continues building on a bad intermediate diagram.
- Screenshot images are stripped from persisted chat history so localStorage does not fill up with base64 image data.

## Design Decision

I did not implement a special `draw_maze` tool.

That would solve the screenshot example, but it would not solve the broader problem. Users can ask for many constrained visuals: graphs, charts, grids, timelines, circuits, tables, geometry diagrams, and more. A one-off tool for each would not scale.

The implemented approach gives the agent general spatial primitives:

```text
Define coordinate system
Compute exact points
Snap approximate points
Use anchors
Route around obstacles
Verify layout
Repair warnings
Draw with primitives
```

This keeps the drawing system flexible while making it more spatially reliable.

## Screenshot / Vision QA Notes

The multimodal loop is now implemented as a secondary review pass on top of deterministic geometry.

The screenshot is not returned directly as a tool message. Instead, the app first returns a normal text tool result, then appends the screenshot as a separate image-bearing user message for the next round. This keeps the tool-call protocol valid while still giving vision-capable models access to the rendered viewport.

The image message exists in the live chat history for the current model loop. When conversations are persisted, the image payload is replaced with a short text placeholder to avoid storing large data URLs.

For drawing rounds, screenshots are attached automatically. The screenshot renderer uses the current element state rather than trusting the live DOM canvas, so the model should receive the latest diagram even if the visible canvas has not finished repainting yet. Manual `get_canvas_screenshot` remains available for explicit visual QA checkpoints.

This is useful because:

- Geometry checks are deterministic and catch exact failures.
- Screenshot QA catches perceptual failures.
- The two systems complement each other instead of competing.

## Verification

Ran the production build:

```text
npm run build
```

Result:

```text
✓ built successfully
```

Also attempted a direct Node sanity check for the geometry helpers. That check failed because Node could not resolve the app's Vite-style extensionless import from `spatial-geometry.js` to `element-store`. The production Vite build resolved the imports correctly, so this is not an app build failure.

After adding screenshot QA, ran the production build again:

```text
npm run build
```

Result:

```text
✓ built successfully
```

## Expected Impact

This should make the agent better at diagrams where spatial correctness matters:

- Maze and pathfinding diagrams should use grid centers and verify path-obstacle intersections.
- Flowchart connectors can be routed around boxes.
- Graph edges can use exact node anchors.
- Charts can place values from coordinate systems instead of visual guessing.
- Labels and annotations can be checked for overlap.
- The agent can repair mistakes using structured warnings.
- The agent can inspect a screenshot and repair perceptual visual issues before finalizing.

The biggest improvement is that the app now helps the model reason spatially instead of relying only on model-side mental math.

## Remaining Follow-Up

The screenshot QA loop captures the visible viewport. A later enhancement could add full-diagram screenshot framing by temporarily fitting all elements into view before capture, or by rendering an offscreen canvas that contains the complete occupied region.

