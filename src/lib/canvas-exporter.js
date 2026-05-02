import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile } from "@ffmpeg/util"
import { getBounds } from "./element-store"
import { getThemeColors } from "./theme"

const VIDEO_W = 1920
const VIDEO_H = 1080
const ELEMENT_DELAY_MS = 350
const FADE_STEPS = 6
const HOLD_START_MS = 800
const HOLD_END_MS = 2000

function renderElementStatic(ctx, el, themeColors) {
  ctx.save()
  const defaultColor = themeColors.textPrimary || "#E8E8E8"

  switch (el.type) {
    case "rectangle": {
      if (el.fill) {
        ctx.fillStyle = el.fill
        ctx.fillRect(el.x, el.y, el.width, el.height)
      }
      if (el.stroke || !el.fill) {
        ctx.strokeStyle = el.stroke || defaultColor
        ctx.lineWidth = el.strokeWidth || 2
        ctx.strokeRect(el.x, el.y, el.width, el.height)
      }
      break
    }
    case "circle": {
      ctx.beginPath()
      ctx.arc(el.x, el.y, el.radius, 0, Math.PI * 2)
      if (el.fill) {
        ctx.fillStyle = el.fill
        ctx.fill()
      }
      if (el.stroke || !el.fill) {
        ctx.strokeStyle = el.stroke || defaultColor
        ctx.lineWidth = el.strokeWidth || 2
        ctx.stroke()
      }
      break
    }
    case "line": {
      ctx.beginPath()
      ctx.moveTo(el.x1, el.y1)
      ctx.lineTo(el.x2, el.y2)
      ctx.strokeStyle = el.color || defaultColor
      ctx.lineWidth = el.width || 2
      ctx.stroke()
      break
    }
    case "text": {
      ctx.fillStyle = el.color || defaultColor
      ctx.font = `${el.fontSize || 16}px ${el.fontFamily || "Space Grotesk, sans-serif"}`
      ctx.textAlign = el.align || "left"
      ctx.textBaseline = el.baseline || "alphabetic"
      ctx.fillText(el.text, el.x, el.y)
      ctx.textAlign = "left"
      ctx.textBaseline = "alphabetic"
      break
    }
    case "path": {
      if (!el.points || el.points.length < 2) break
      ctx.beginPath()
      ctx.moveTo(el.points[0].x, el.points[0].y)
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y)
      }
      if (el.closed) ctx.closePath()
      if (el.fill && el.closed) {
        ctx.fillStyle = el.fill
        ctx.fill()
      }
      ctx.strokeStyle = el.color || defaultColor
      ctx.lineWidth = el.width || 2
      ctx.stroke()
      break
    }
  }
  ctx.restore()
}

function computeTransform(elements, w, h) {
  const visible = elements.filter((e) => e.type !== "background" && e.visible !== false)
  if (visible.length === 0) return { x: 0, y: 0, scale: 1 }

  const allBounds = visible.map(getBounds)
  const minX = Math.min(...allBounds.map((b) => b.x))
  const minY = Math.min(...allBounds.map((b) => b.y))
  const maxX = Math.max(...allBounds.map((b) => b.x + b.w))
  const maxY = Math.max(...allBounds.map((b) => b.y + b.h))

  const contentW = maxX - minX
  const contentH = maxY - minY
  if (contentW === 0 || contentH === 0) return { x: 0, y: 0, scale: 1 }

  const pad = 60
  const scale = Math.min((w - pad * 2) / contentW, (h - pad * 2) / contentH, 2)
  const scaledW = contentW * scale
  const scaledH = contentH * scale
  const x = (w - scaledW) / 2 - minX * scale
  const y = (h - scaledH) / 2 - minY * scale

  return { x, y, scale }
}

function drawFrame(ctx, visible, bg, transform, themeColors, showCount, fadeT) {
  ctx.fillStyle = bg?.color || "#111111"
  ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)

  ctx.save()
  ctx.translate(transform.x, transform.y)
  ctx.scale(transform.scale, transform.scale)

  for (let j = 0; j < showCount; j++) {
    renderElementStatic(ctx, visible[j], themeColors)
  }

  if (showCount < visible.length && fadeT !== null) {
    ctx.globalAlpha = fadeT
    const el = visible[showCount]
    const bounds = getBounds(el)
    const cx = bounds.x + bounds.w / 2
    const cy = bounds.y + bounds.h / 2
    const s = 0.85 + 0.15 * fadeT
    ctx.translate(cx, cy)
    ctx.scale(s, s)
    ctx.translate(-cx, -cy)
    renderElementStatic(ctx, el, themeColors)
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function recordWebm(canvas, ctx, visible, bg, transform, themeColors, onProgress) {
  const stream = canvas.captureStream(30)
  const chunks = []

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
    ? "video/webm;codecs=vp8"
    : "video/webm"

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  })
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const recorderDone = new Promise((resolve) => {
    recorder.onstop = () => resolve()
  })

  recorder.start(100)

  const fadeDelayMs = ELEMENT_DELAY_MS / FADE_STEPS

  drawFrame(ctx, visible, bg, transform, themeColors, 0, null)
  await delay(HOLD_START_MS)
  onProgress?.(3)

  for (let i = 0; i < visible.length; i++) {
    for (let f = 0; f < FADE_STEPS; f++) {
      const t = (f + 1) / FADE_STEPS
      drawFrame(ctx, visible, bg, transform, themeColors, i, t)
      await delay(fadeDelayMs)
    }
    drawFrame(ctx, visible, bg, transform, themeColors, i + 1, null)
    onProgress?.(3 + Math.round(((i + 1) / visible.length) * 67))
  }

  drawFrame(ctx, visible, bg, transform, themeColors, visible.length, null)
  await delay(HOLD_END_MS)

  recorder.stop()
  await recorderDone

  return new Blob(chunks, { type: "video/webm" })
}

let ffmpegInstance = null

async function convertToMp4(webmBlob, onProgress) {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg()
    await ffmpegInstance.load()
  }
  const ffmpeg = ffmpegInstance

  const webmData = await fetchFile(webmBlob)
  await ffmpeg.writeFile("input.webm", webmData)

  onProgress?.(80)

  await ffmpeg.exec(["-i", "input.webm", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "output.mp4"])

  onProgress?.(95)

  const mp4Data = await ffmpeg.readFile("output.mp4")
  await ffmpeg.deleteFile("input.webm")
  await ffmpeg.deleteFile("output.mp4")

  return new Blob([mp4Data], { type: "video/mp4" })
}

export async function exportCanvasVideo(elements, onProgress) {
  const visible = elements.filter((e) => e.type !== "background" && e.visible !== false)
  const bg = elements.find((e) => e.type === "background")
  if (visible.length === 0) throw new Error("Nothing to export")

  const canvas = document.createElement("canvas")
  canvas.width = VIDEO_W
  canvas.height = VIDEO_H
  const ctx = canvas.getContext("2d")
  const transform = computeTransform(elements, VIDEO_W, VIDEO_H)
  const themeColors = getThemeColors()

  onProgress?.(1)

  const webmBlob = await recordWebm(canvas, ctx, visible, bg, transform, themeColors, onProgress)
  onProgress?.(75)

  const mp4Blob = await convertToMp4(webmBlob, onProgress)
  onProgress?.(100)

  const url = URL.createObjectURL(mp4Blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `teachpreach-${Date.now()}.mp4`
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
