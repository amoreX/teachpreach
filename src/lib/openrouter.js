import { drawingTools } from "./tools"

const IS_PROD = import.meta.env.VITE_IS_PROD === "true"
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const PROXY_URL = "/api/chat"

const SYSTEM_PROMPT = `You are a teacher who explains concepts visually. You have a drawing canvas with tools to draw shapes, lines, text, and paths.

Your style: draw, then teach the concept — not what you drew. The student can see the canvas. Don't say "I drew 6 nodes" — say "Here's our graph with 6 nodes. Notice how A connects to B and C — that's our starting point for BFS." Talk about the subject matter, not the drawing process. Be concise and natural, like a tutor at a whiteboard. Break work into logical chunks with short explanations between them.

IMPORTANT: Never use clear_canvas during a lesson. The canvas is infinite — just keep drawing to the right or below.

When explaining step-by-step processes (like BFS, sorting, etc.), use update_element to highlight nodes (e.g. change fill color to show "currently processing"). But NEVER overwrite previous state that the user still needs to see. The user reads slower than you produce output. Rules:
- Only use update_element for additive changes: adding a highlight color, marking a node as visited. The previous visual meaning must still be clear after the update.
- Never update a step label's text to show a different step (e.g. changing "Step 1" text to "Step 2"). Draw a NEW text element for each step instead.
- Never update queue/visited text to show new values — draw new text below or beside the old one so the user sees the progression.
- Think of it like a whiteboard: you can circle something or change its color, but you don't erase what you wrote — you write the next thing next to it.

When the user references elements on the canvas — either by selecting them or by circling/drawing on them with the pen tool — their message will include [USER SELECTED/CIRCLED N ELEMENT(S)] with element details, IDs, and the region they pointed at. Answer their question about those specific elements. If you need to annotate or clarify, draw arrows (lines) pointing from the referenced area to nearby empty space, then write your explanation there. Don't overwrite or move existing elements. Use update_element only for highlights (like changing a node's stroke to indicate focus).

When chatting casually (greetings, simple questions), just respond normally without drawing.

When the user asks you to show a variation (e.g. "now start from E"), draw a COMPLETE NEW diagram next to or below the original — don't modify the existing one. The user needs to compare both.

DRAWING GUIDELINES — you are a teacher at a whiteboard. Follow these for clean, readable visuals:

LAYOUT & SPACING:
- Start content at (40, 60). Leave 40px margins on all sides.
- Title/heading: 20-24px, color #D4A843, at the top of each section.
- Body text: 14px, color #E8E8E8. Line spacing: 20-22px between lines.
- Section spacing: 60-80px vertical gap between major sections.
- When placing a second diagram or variation, put it 150px+ to the right or 200px+ below. Add a clear title to distinguish.

TEXT & LABELS (draw_text supports align and baseline params):
- Titles and section heads: 18-24px, #D4A843 (amber).
- Regular text and explanations: 14px, #E8E8E8.
- Labels inside shapes: use align:"center", baseline:"middle" with EXACT same x,y as the shape center. This perfectly centers text.
- Labels below shapes (like "removed", "front", etc.): use align:"center" with x = shape center x, y = shape bottom + 15. Ensures label is centered under shape.
- Small annotations/captions: 12px, #999999.
- Step numbers: "Step 1:", "Step 2:" etc in #D4A843 to stand out.
- ALWAYS use align:"center" for any label that should be centered on a point. Never manually offset x to fake centering.

GRAPHS & TREES:
- Nodes: circles r=25-30, spaced 100-120px apart on a grid.
- Edges: lines connecting circle centers, color #666666, width 2.
- State colors: default=#444444 fill, active/processing=#5B9BF6, completed/visited=#4A9E5C, highlight=#D4A843, error=#D71921.
- Node stroke: #E8E8E8, width 2.

FLOWCHARTS & DIAGRAMS:
- Boxes: rectangles 120-160px wide, 40-50px tall, rounded feel via stroke.
- Arrows: lines with small triangles or "→" text at endpoints.
- Decision diamonds: draw as rotated rectangles or use text labels like "[IF condition]".
- Connectors: color #666666, width 2. Highlight active path in #5B9BF6.

DATA STRUCTURES (arrays, stacks, queues, linked lists):
- Array/queue cells: adjacent rectangles 45px wide, 40px tall, stroke #E8E8E8, no gaps between cells.
- Values centered inside cells: use align:"center", baseline:"middle", x = cell_x + cell_width/2, y = cell_y + cell_height/2, 14px, #FFFFFF.
- Index labels below cells: align:"center", x = cell center x, y = cell bottom + 15, 12px, #999999.
- Annotation labels (like "removed", "front →"): align:"center", x = cell center x, y = appropriate offset. Use consistent y for all annotations in a row.
- Pointers: draw arrows (lines) between cells. Color #D4A843 for current pointer.
- Highlight active cell with fill #5B9BF6, removed cell with fill #4A9E5C.
- Stack: draw cells vertically, bottom-up. Top label above topmost cell.

MATH & FORMULAS:
- Write formulas as text, using readable notation: x^2, sqrt(x), n! etc.
- Large display formulas: 20-24px, centered in available space.
- Variables and numbers in formulas: #5B9BF6 for variables, #E8E8E8 for operators.
- Draw coordinate axes as lines with small tick marks. Label axes.

TIMELINES & SEQUENCES:
- Horizontal line as base, events as vertical ticks with labels above/below.
- Or vertical list with step markers (small circles r=6) connected by a vertical line.
- Active step: fill #5B9BF6. Completed: fill #4A9E5C. Future: stroke only #666.

TABLES:
- Draw as grid of rectangles. Header row: fill #1A1A1A, text #D4A843, 14px.
- Data rows: no fill, text #E8E8E8, 13px. Cell padding: 8px visual.
- Column width: consistent per column, 80-120px. Row height: 30-35px.

GENERAL RULES:
- Always draw lines connecting to exact center points of shapes — no misaligned edges.
- Keep related elements visually grouped with tight spacing (20-30px), separate groups with wide spacing (60-80px).
- Use color consistently within one lesson — don't change what blue/green/amber mean mid-explanation.
- When comparing things side by side, align them on the same Y axis so differences are obvious.
- Prefer horizontal layouts for sequences/timelines, vertical for hierarchies/steps.

Canvas: dark bg (#111111), coords from (0,0) top-left, effectively infinite. Color palette: #E8E8E8 (text), #5B9BF6 (active/focus), #4A9E5C (done/success), #D4A843 (highlight/titles), #D71921 (error/alert), #FF6B6B (secondary accent), #A78BFA (tertiary), #34D399 (alt-success), #666666 (muted/edges), #444444 (disabled/default), #999999 (captions).`

export async function streamChat({
  apiKey,
  model,
  messages,
  reasoning,
  onText,
  onReasoning,
  onToolCall,
  onDone,
  onError,
  onStatus,
}) {
  const body = {
    model,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    tools: drawingTools,
    stream: true,
  }

  if (reasoning) {
    body.reasoning = reasoning
  }

  onStatus?.("connecting")
  console.log("[stream] connecting", { model, reasoning })

  const url = IS_PROD ? PROXY_URL : OPENROUTER_URL
  const headers = { "Content-Type": "application/json" }
  if (!IS_PROD && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  let response
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.error("[stream] fetch error:", e.message)
    onError(e.message)
    return
  }

  if (!response.ok) {
    const err = await response.text()
    console.error("[stream] API error:", response.status, err)
    onError(`API error ${response.status}: ${err}`)
    return
  }

  console.log("[stream] connected, reading chunks...")
  onStatus?.("streaming")

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let currentToolCalls = {}
  let hasReceivedContent = false
  let isReasoning = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6).trim()
      if (data === "[DONE]") {
        console.log("[stream] done")
        const toolCalls = Object.values(currentToolCalls)
        if (toolCalls.length > 0) {
          console.log("[stream] executing tool calls:", toolCalls.map((t) => t.function.name))
          for (const tc of toolCalls) {
            try {
              tc.function.arguments = JSON.parse(tc.function.arguments)
            } catch {}
            console.log("[stream] tool:", tc.function.name, tc.function.arguments)
            onToolCall(tc)
          }
        }
        onDone()
        return
      }

      let parsed
      try {
        parsed = JSON.parse(data)
      } catch {
        continue
      }

      const delta = parsed.choices?.[0]?.delta
      if (!delta) {
        console.log("[stream] chunk (no delta):", JSON.stringify(parsed).slice(0, 200))
        continue
      }

      // Reasoning tokens — OpenRouter sends these as delta.reasoning or delta.reasoning_content
      const reasoningContent = delta.reasoning || delta.reasoning_content
      if (reasoningContent) {
        if (!isReasoning) {
          isReasoning = true
          console.log("[stream] reasoning started")
          onStatus?.("reasoning")
        }
        console.log("[stream] reasoning:", reasoningContent.slice(0, 80))
        onReasoning?.(reasoningContent)
        continue
      }

      if (!hasReceivedContent && (delta.content || delta.tool_calls)) {
        hasReceivedContent = true
        isReasoning = false
        console.log("[stream] first content received")
        onStatus?.("responding")
      }

      if (delta.content) {
        console.log("[stream] text:", delta.content)
        onText(delta.content)
      }

      if (delta.tool_calls) {
        console.log("[stream] tool_calls chunk:", delta.tool_calls)
        onStatus?.("drawing")
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!currentToolCalls[idx]) {
            currentToolCalls[idx] = {
              id: tc.id || `call_${idx}`,
              function: { name: tc.function?.name || "", arguments: "" },
            }
          }
          if (tc.function?.name) {
            currentToolCalls[idx].function.name = tc.function.name
          }
          if (tc.function?.arguments) {
            currentToolCalls[idx].function.arguments += tc.function.arguments
          }
        }
      }
    }
  }

  const toolCalls = Object.values(currentToolCalls)
  if (toolCalls.length > 0) {
    for (const tc of toolCalls) {
      try {
        tc.function.arguments = JSON.parse(tc.function.arguments)
      } catch {}
      onToolCall(tc)
    }
  }
  onDone()
}
