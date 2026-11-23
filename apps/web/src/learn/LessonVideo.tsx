import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  FastForward,
  Film,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useLang } from '../shell/i18n'
import { formatClock, RATES, type Rate } from './audio'
import { pick, type Lesson } from './content'
import { narrateScene, playSceneSound } from './videoAudio'
import { generateAndDownloadLessonVideo } from './videoGenerator'
import { buildLessonScenes, totalVideoDuration, type VideoScene } from './videoTypes'

interface LessonVideoProps {
  lesson: Lesson
}

/** Determines which scene is active based on continuous timeline in seconds. */
function getSceneAtTime(
  scenes: VideoScene[],
  time: number
): { scene: VideoScene; index: number; progress: number } {
  let accumulated = 0
  for (let i = 0; i < scenes.length; i++) {
    const start = accumulated
    const end = start + scenes[i].durationSec
    if (time < end || i === scenes.length - 1) {
      const progress = Math.min(1, Math.max(0, (time - start) / scenes[i].durationSec))
      return { scene: scenes[i], index: i, progress }
    }
    accumulated = end
  }
  return { scene: scenes[0], index: 0, progress: 0 }
}

export function LessonVideo({ lesson }: LessonVideoProps) {
  const { t, lang } = useLang()
  const scenes = useMemo(() => buildLessonScenes(lesson), [lesson])
  const totalDuration = useMemo(() => totalVideoDuration(scenes), [scenes])

  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [rate, setRate] = useState<Rate>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState(0)
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const videoContainerRef = useRef<HTMLDivElement>(null)
  const stopNarrationRef = useRef<(() => void) | null>(null)
  const lastActiveSceneIdx = useRef(-1)

  const { scene: currentScene, index: sceneIdx } = useMemo(
    () => getSceneAtTime(scenes, currentTime),
    [scenes, currentTime]
  )

  const cancelActiveNarration = useCallback(() => {
    if (stopNarrationRef.current) {
      stopNarrationRef.current()
      stopNarrationRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  // Continuous Master Clock Loop: smoothly plays through the entire video from 0 to totalDuration
  useEffect(() => {
    if (!isPlaying) return

    let lastTick = performance.now()
    const timer = setInterval(() => {
      const now = performance.now()
      const deltaSec = (now - lastTick) / 1000
      lastTick = now

      setCurrentTime((prev) => {
        const nextTime = prev + deltaSec * rate
        if (nextTime >= totalDuration) {
          setIsPlaying(false)
          return totalDuration
        }
        return nextTime
      })
    }, 50)

    return () => clearInterval(timer)
  }, [isPlaying, rate, totalDuration])

  // Synchronized voice narration and sound effects as the continuous timeline progresses
  useEffect(() => {
    if (!isPlaying) {
      cancelActiveNarration()
      return
    }

    // Trigger scene audio and narration when crossing into a new scene
    if (sceneIdx !== lastActiveSceneIdx.current) {
      lastActiveSceneIdx.current = sceneIdx
      cancelActiveNarration()

      if (audioEnabled) {
        playSceneSound(currentScene.kind)
        stopNarrationRef.current = narrateScene(currentScene, lang, rate)
      }
    }
  }, [isPlaying, sceneIdx, audioEnabled, rate, currentScene, lang, cancelActiveNarration])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelActiveNarration()
    }
  }, [cancelActiveNarration])

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const togglePlay = () => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0)
      lastActiveSceneIdx.current = -1
    }
    setIsPlaying((prev) => !prev)
  }

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, newTime))
    cancelActiveNarration()
    lastActiveSceneIdx.current = -1
    setCurrentTime(clamped)
  }

  const skipRelative = (delta: number) => {
    handleSeek(currentTime + delta)
  }

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const handleGenerateVideo = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setGenerateProgress(0)
    setDownloadSuccess(false)
    cancelActiveNarration()
    setIsPlaying(false)

    try {
      await generateAndDownloadLessonVideo(lesson, lang, (pct) => {
        setGenerateProgress(pct)
      })
      setDownloadSuccess(true)
      setTimeout(() => setDownloadSuccess(false), 5000)
    } catch {
      // Ignore generation error
    } finally {
      setIsGenerating(false)
    }
  }

  const isAtEnd = currentTime >= totalDuration

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border-2 border-line bg-white p-3 shadow-sm md:p-4"
      aria-label={t('learn.video.title')}
    >
      {/* Video Container (supports Fullscreen) */}
      <div
        ref={videoContainerRef}
        className="group relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-950 text-white shadow-xl select-none"
      >
        {/* Animated Background Gradients & Ambience */}
        <div
          className="absolute inset-0 transition-colors duration-1000 ease-in-out"
          style={{
            background:
              currentScene.kind === 'intro'
                ? 'radial-gradient(circle at 50% 30%, #1e3a8a 0%, #091124 80%)'
                : currentScene.kind === 'scenario'
                ? 'radial-gradient(circle at 50% 30%, #881337 0%, #091124 80%)'
                : currentScene.kind === 'signs'
                ? 'radial-gradient(circle at 50% 30%, #7c2d12 0%, #091124 80%)'
                : 'radial-gradient(circle at 50% 30%, #064e3b 0%, #091124 80%)',
          }}
        />

        {/* Ambient background particles & grid */}
        <div className="pointer-events-none absolute inset-0 opacity-15">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* Top Video Header / Branding */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-3 text-[12px] font-bold tracking-wider">
          <span className="flex items-center gap-1.5 text-blue-400 drop-shadow">
            🛡️ SURAKSHA • VIDEO SHIELD
          </span>
          <span
            className="rounded px-2 py-0.5 text-[11px] font-semibold text-white uppercase shadow transition-all duration-300"
            style={{ backgroundColor: currentScene.accentColor }}
          >
            {pick(currentScene.subheading, lang)}
          </span>
        </div>

        {/* Click-to-Play Video Stage */}
        <div
          onClick={togglePlay}
          className="relative z-10 flex flex-1 cursor-pointer items-center justify-center px-4 text-center"
        >
          {/* Intro Motion Scene */}
          {currentScene.kind === 'intro' && (
            <div className="flex max-w-lg flex-col items-center gap-2.5 animate-fadeIn">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/30 text-3xl shadow-xl ring-4 ring-blue-500/40">
                🛡️
              </div>
              <h3 className="text-xl font-extrabold text-white drop-shadow md:text-3xl">
                {pick(currentScene.heading, lang)}
              </h3>
              <p className="text-sm font-medium text-slate-300 md:text-base">
                {pick(currentScene.subheading, lang)}
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 backdrop-blur-sm">
                  🔒 {t('action.dont_share')}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 backdrop-blur-sm">
                  ⚡ 100% Offline
                </span>
              </div>
            </div>
          )}

          {/* Scam Scenario Motion Scene */}
          {currentScene.kind === 'scenario' && (
            <div className="w-full max-w-md rounded-2xl border-2 border-red-500/60 bg-slate-900/90 p-4 text-left shadow-2xl backdrop-blur-md animate-fadeIn">
              <div className="mb-2.5 flex items-center justify-between border-b border-red-500/30 pb-2">
                <span className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wide">
                  <span className="h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />
                  ⚠️ {pick(currentScene.heading, lang)}
                </span>
                <span className="rounded bg-red-950/80 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                  FRAUD TRIGGER
                </span>
              </div>
              <p className="text-sm font-semibold leading-relaxed text-slate-100 md:text-base">
                "{pick(currentScene.narration, lang)}"
              </p>
            </div>
          )}

          {/* Red Flags / Warning Signs Motion Scene */}
          {currentScene.kind === 'signs' && (
            <div className="flex w-full max-w-lg flex-col gap-2.5 text-left animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-2xl text-amber-400">🚨</span>
                <h4 className="text-base font-extrabold text-amber-400 drop-shadow md:text-xl">
                  {pick(currentScene.heading, lang)}
                </h4>
              </div>
              <div className="flex flex-col gap-2">
                {currentScene.details.slice(0, 3).map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-slate-900/85 px-3 py-2 text-xs font-semibold text-slate-200 shadow backdrop-blur-sm md:text-sm"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/30 text-xs font-extrabold text-amber-300">
                      {i + 1}
                    </span>
                    <span className="line-clamp-2">{pick(d, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Golden Safety Rule Motion Scene */}
          {currentScene.kind === 'todo' && (
            <div className="w-full max-w-lg rounded-2xl border-2 border-emerald-500/60 bg-slate-900/90 p-4 text-left shadow-2xl backdrop-blur-md animate-fadeIn">
              <div className="mb-2 flex items-center gap-2 text-emerald-400">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-extrabold text-slate-950 shadow">
                  ✓
                </span>
                <h4 className="text-sm font-extrabold tracking-wide uppercase md:text-base">
                  {pick(currentScene.heading, lang)}
                </h4>
              </div>
              <p className="text-base font-bold leading-snug text-white md:text-xl">
                {pick(currentScene.caption, lang)}
              </p>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-950/80 px-3.5 py-2 text-xs font-bold text-blue-200 border border-blue-500/30">
                <span>📞 Cyber Helpline: Dial 1930</span>
                <span>GovTech Chhattisgarh</span>
              </div>
            </div>
          )}

          {/* Big Center Play / Replay Overlay Button when paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/90 text-white shadow-2xl ring-4 ring-white/30 transition-transform hover:scale-110 active:scale-95">
                {isAtEnd ? <RotateCcw size={36} /> : <Play size={38} className="translate-x-0.5" />}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Subtitles Banner */}
        <div className="relative z-10 px-4 pb-1">
          <div className="mx-auto flex max-w-xl justify-center text-center">
            <p className="rounded-lg bg-black/80 px-3.5 py-1 text-xs font-semibold text-amber-200 shadow-lg md:text-sm">
              <span className="font-extrabold text-amber-400 mr-1.5">[CC]</span>
              {pick(currentScene.caption, lang)}
            </p>
          </div>
        </div>

        {/* Video Scrubber & Playback Controls Bar */}
        <div className="relative z-10 flex flex-col bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent px-4 pb-3 pt-2">
          {/* Continuous Interactive Scrubber Bar */}
          <div className="relative flex items-center py-1">
            <input
              type="range"
              min={0}
              max={totalDuration}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              aria-label="Seek video timeline"
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-brand hover:h-2.5 transition-all"
              style={{
                background: `linear-gradient(to right, ${currentScene.accentColor} 0%, ${
                  currentScene.accentColor
                } ${(currentTime / totalDuration) * 100}%, #334155 ${
                  (currentTime / totalDuration) * 100
                }%, #334155 100%)`,
              }}
            />
          </div>

          {/* Standard Media Controls */}
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            {/* Left: Play/Pause, Skip 5s, Time */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? t('learn.video.pause') : t('learn.video.play')}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => skipRelative(-5)}
                aria-label="Rewind 5 seconds"
                title="Rewind 5s"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 active:scale-95 transition-all"
              >
                <RotateCcw size={16} />
              </button>

              <button
                type="button"
                onClick={() => skipRelative(5)}
                aria-label="Fast forward 5 seconds"
                title="Forward 5s"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 active:scale-95 transition-all"
              >
                <FastForward size={16} />
              </button>

              <span className="font-mono text-xs font-semibold text-slate-300 ml-1">
                {formatClock(currentTime)} / {formatClock(totalDuration)}
              </span>
            </div>

            {/* Right: Audio Mute, Speed, Fullscreen */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAudioEnabled((prev) => !prev)}
                aria-label={t('learn.video.audio_narration')}
                title={audioEnabled ? 'Mute audio narration' : 'Unmute audio narration'}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-all ${
                  audioEnabled
                    ? 'bg-blue-600/30 text-blue-300 hover:bg-blue-600/40'
                    : 'bg-white/10 text-slate-400 hover:bg-white/20'
                }`}
              >
                {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span className="hidden sm:inline">
                  {audioEnabled ? t('learn.video.audio_narration') : 'Muted'}
                </span>
              </button>

              {/* Speed Buttons */}
              <div className="flex items-center rounded-lg bg-white/10 p-0.5">
                {RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRate(r)}
                    className={`rounded px-1.5 py-1 text-[11px] font-bold transition-all ${
                      rate === r ? 'bg-brand text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r}×
                  </button>
                ))}
              </div>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 active:scale-95 transition-all"
              >
                {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Generation / Offline Export Section */}
      <div className="rounded-xl border border-brand/20 bg-brand/5 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <Download size={16} className="text-brand" />
              <span>{t('learn.video.generate')}</span>
            </h3>
            <p className="text-xs text-muted">
              Creates a continuous offline-ready HD video with audio narration and subtitles.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateVideo}
            disabled={isGenerating}
            className="btn btn-primary !h-10 shrink-0 text-xs font-bold shadow-sm"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('learn.video.generating', { percent: generateProgress })}
              </span>
            ) : downloadSuccess ? (
              <span className="flex items-center gap-1.5 text-white">
                ✓ {t('learn.video.download_ready')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Film size={15} />
                <span>{t('learn.video.generate')}</span>
              </span>
            )}
          </button>
        </div>

        {/* Generation Progress Bar */}
        {isGenerating && (
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-soft">
            <div
              className="h-full bg-brand transition-all duration-200"
              style={{ width: `${generateProgress}%` }}
            />
          </div>
        )}
      </div>
    </section>
  )
}
