import type { Lang } from '../shell/i18n'
import { pick, type Lesson } from './content'
import { playSceneSound } from './videoAudio'
import { buildLessonScenes, type VideoScene } from './videoTypes'

/** Helper to wrap text into lines fitting within maxWidth on a 2D canvas. */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = words[0] || ''

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = ctx.measureText(`${currentLine} ${word}`).width
    if (width < maxWidth) {
      currentLine += ` ${word}`
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

/** Draws a rounded rectangle. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/**
 * Generates an HD (1280x720) video with synchronized audio and subtitles for a lesson,
 * and triggers an automatic browser download.
 */
export async function generateAndDownloadLessonVideo(
  lesson: Lesson,
  lang: Lang,
  onProgress?: (percent: number) => void
): Promise<Blob | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 720
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Setup Web Audio recording destination
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  let audioCtx: AudioContext | null = null
  let audioDest: MediaStreamAudioDestinationNode | null = null

  if (AudioCtx) {
    try {
      audioCtx = new AudioCtx()
      audioDest = audioCtx.createMediaStreamDestination()
    } catch {
      // Audio capture fallback
    }
  }

  // Setup Canvas capture stream
  const canvasStream = canvas.captureStream ? canvas.captureStream(30) : null
  if (!canvasStream) return null

  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()]
  if (audioDest) {
    tracks.push(...audioDest.stream.getAudioTracks())
  }
  const combinedStream = new MediaStream(tracks)

  // Choose supported mimeType
  const mimeType = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ].find((m) => MediaRecorder.isTypeSupported?.(m)) || ''

  let recorder: MediaRecorder
  try {
    recorder = mimeType ? new MediaRecorder(combinedStream, { mimeType }) : new MediaRecorder(combinedStream)
  } catch {
    return null
  }

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  const scenes = buildLessonScenes(lesson)
  const fps = 30
  const sceneDurationFrames = 120 // ~4 seconds per scene for generated video summary

  recorder.start()

  for (let sIdx = 0; sIdx < scenes.length; sIdx++) {
    const scene = scenes[sIdx]

    // Play scene chime into recorded audio
    if (audioCtx && audioDest) {
      playSceneSound(scene.kind, audioCtx, audioDest)
    }

    for (let f = 0; f < sceneDurationFrames; f++) {
      // Render Frame
      drawVideoFrame(ctx, scene, sIdx, scenes.length, f, sceneDurationFrames, lang)

      const overallProgress = Math.round(
        ((sIdx * sceneDurationFrames + f) / (scenes.length * sceneDurationFrames)) * 100
      )
      onProgress?.(overallProgress)

      // Yield frame rate (approx 33ms)
      await new Promise((r) => setTimeout(r, 33))
    }
  }

  onProgress?.(100)

  // Finish recording
  return new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
      // Auto download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${lesson.id}_${lang}_video.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {})
      }
      resolve(blob)
    }
    recorder.stop()
  })
}

/** Draws a single video frame onto the 1280x720 canvas. */
function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  scene: VideoScene,
  sceneIndex: number,
  totalScenes: number,
  frame: number,
  totalFrames: number,
  lang: Lang
) {
  const w = 1280
  const h = 720

  // 1. Dark modern gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h)
  bgGrad.addColorStop(0, '#091124')
  bgGrad.addColorStop(0.5, '#101d3f')
  bgGrad.addColorStop(1, '#050b18')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  // 2. Subtle background geometric accents
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
  ctx.lineWidth = 1
  for (let x = 60; x < w; x += 120) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }

  // 3. Top Banner: Suraksha Chhattisgarh
  ctx.fillStyle = '#1e293b'
  roundRect(ctx, 40, 24, w - 80, 52, 12)
  ctx.fill()

  ctx.fillStyle = '#60a5fa'
  ctx.font = 'bold 20px "Noto Sans Devanagari", sans-serif'
  ctx.fillText('🛡️ SURAKSHA • SCAM SHIELD CHHATTISGARH', 60, 57)

  // Scene indicator pill
  const scenePill = `SCENE ${sceneIndex + 1} OF ${totalScenes}`
  ctx.fillStyle = '#334155'
  roundRect(ctx, w - 240, 32, 180, 36, 8)
  ctx.fill()
  ctx.fillStyle = '#e2e8f0'
  ctx.font = 'bold 16px sans-serif'
  ctx.fillText(scenePill, w - 215, 56)

  // 4. Main Stage Content Card
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  roundRect(ctx, 40, 96, w - 80, 480, 20)
  ctx.fill()

  // Scene Accent Bar
  ctx.fillStyle = scene.accentColor
  roundRect(ctx, 40, 96, w - 80, 10, 5)
  ctx.fill()

  // Category & Subheading
  ctx.fillStyle = scene.accentColor
  ctx.font = 'bold 22px "Noto Sans Devanagari", sans-serif'
  ctx.fillText(pick(scene.subheading, lang).toUpperCase(), 75, 145)

  // Main Heading
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 42px "Noto Sans Devanagari", sans-serif'
  ctx.fillText(pick(scene.heading, lang), 75, 200)

  // 5. Visual Centerpiece according to scene kind
  if (scene.kind === 'intro') {
    // Shield & Padlock visual
    ctx.fillStyle = 'rgba(23, 71, 196, 0.2)'
    ctx.beginPath()
    ctx.arc(w / 2, 340, 80, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = '72px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🛡️', w / 2, 365)
    ctx.textAlign = 'left'

    // Details box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    roundRect(ctx, 160, 440, w - 320, 100, 12)
    ctx.fill()

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '22px "Noto Sans Devanagari", sans-serif'
    scene.details.forEach((d, i) => {
      ctx.fillText(`• ${pick(d, lang)}`, 190, 475 + i * 36)
    })
  } else if (scene.kind === 'scenario') {
    // Smartphone Mockup showing scam trigger
    const phoneX = 140
    const phoneY = 240
    const phoneW = w - 280
    const phoneH = 290

    ctx.fillStyle = '#0f172a'
    roundRect(ctx, phoneX, phoneY, phoneW, phoneH, 16)
    ctx.fill()
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3
    roundRect(ctx, phoneX, phoneY, phoneW, phoneH, 16)
    ctx.stroke()

    // Alert Header
    ctx.fillStyle = '#ef4444'
    roundRect(ctx, phoneX + 24, phoneY + 20, 200, 36, 8)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('⚠️ SUSPICIOUS TRIGGER', phoneX + 40, phoneY + 44)

    // Message Content
    ctx.fillStyle = '#f8fafc'
    ctx.font = '24px "Noto Sans Devanagari", sans-serif'
    const exampleLines = wrapCanvasText(ctx, `"${pick(scene.narration, lang)}"`, phoneW - 80)
    exampleLines.slice(0, 4).forEach((line, i) => {
      ctx.fillText(line, phoneX + 40, phoneY + 105 + i * 38)
    })
  } else if (scene.kind === 'signs') {
    // Red Flags list
    const startY = 240
    scene.details.slice(0, 3).forEach((item, idx) => {
      const boxY = startY + idx * 80
      ctx.fillStyle = 'rgba(230, 81, 0, 0.15)'
      roundRect(ctx, 75, boxY, w - 150, 68, 12)
      ctx.fill()

      ctx.fillStyle = '#fb923c'
      ctx.font = 'bold 26px sans-serif'
      ctx.fillText(`🚨 FLAG ${idx + 1}:`, 100, boxY + 42)

      ctx.fillStyle = '#ffffff'
      ctx.font = '22px "Noto Sans Devanagari", sans-serif'
      const line = pick(item, lang)
      ctx.fillText(line.length > 55 ? `${line.slice(0, 55)}…` : line, 250, boxY + 42)
    })
  } else if (scene.kind === 'todo') {
    // Golden Safety Action
    ctx.fillStyle = 'rgba(14, 138, 22, 0.18)'
    roundRect(ctx, 75, 230, w - 150, 180, 16)
    ctx.fill()
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 2
    roundRect(ctx, 75, 230, w - 150, 180, 16)
    ctx.stroke()

    ctx.fillStyle = '#4ade80'
    ctx.font = 'bold 28px "Noto Sans Devanagari", sans-serif'
    ctx.fillText('✅ SAFE ACTION TO TAKE:', 110, 280)

    ctx.fillStyle = '#ffffff'
    ctx.font = '24px "Noto Sans Devanagari", sans-serif'
    const todoLines = wrapCanvasText(ctx, pick(scene.caption, lang), w - 250)
    todoLines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, 110, 330 + i * 38)
    })

    // Helpline Badge
    ctx.fillStyle = '#1e3a8a'
    roundRect(ctx, 75, 430, w - 150, 64, 12)
    ctx.fill()
    ctx.fillStyle = '#93c5fd'
    ctx.font = 'bold 24px sans-serif'
    ctx.fillText('📞 CYBER FRAUD HELPLINE: DIAL 1930 IMMEDIATELY', 110, 471)
  }

  // 6. Subtitles & Caption Bar at the bottom
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
  roundRect(ctx, 40, 590, w - 80, 80, 12)
  ctx.fill()

  ctx.fillStyle = '#facc15'
  ctx.font = 'bold 16px sans-serif'
  ctx.fillText('SUBTITLES / उपशीर्षक:', 60, 620)

  ctx.fillStyle = '#ffffff'
  ctx.font = '20px "Noto Sans Devanagari", sans-serif'
  const capText = pick(scene.caption, lang)
  ctx.fillText(capText.length > 85 ? `${capText.slice(0, 85)}…` : capText, 60, 650)

  // 7. Timeline Progress Bar
  const overallFr = sceneIndex * totalFrames + frame
  const totalFr = totalScenes * totalFrames
  const barWidth = ((w - 80) * overallFr) / totalFr

  ctx.fillStyle = '#334155'
  ctx.fillRect(40, 685, w - 80, 8)

  ctx.fillStyle = scene.accentColor
  ctx.fillRect(40, 685, barWidth, 8)
}
