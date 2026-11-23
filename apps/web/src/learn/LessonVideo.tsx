import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playableUrl, videoNarrationUrl } from './offline'
import {
  Download,
  FastForward,
  Film,
  Languages,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useLang, type Lang } from '../shell/i18n'
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
  time: number,
  totalDur: number
): { scene: VideoScene; index: number; progress: number } {
  const durPerScene = totalDur / scenes.length
  let accumulated = 0

  for (let i = 0; i < scenes.length; i++) {
    const end = accumulated + durPerScene
    if (time < end || i === scenes.length - 1) {
      const progress = Math.min(1, Math.max(0, (time - accumulated) / durPerScene))
      return { scene: scenes[i], index: i, progress }
    }
    accumulated = end
  }
  return { scene: scenes[0], index: 0, progress: 0 }
}

export function LessonVideo({ lesson }: LessonVideoProps) {
  const { t, lang } = useLang()
  const scenes = useMemo(() => buildLessonScenes(lesson), [lesson])
  const defaultDuration = useMemo(() => totalVideoDuration(scenes), [scenes])

  // Audio track language: defaults to current app language
  const [audioLang, setAudioLang] = useState<Lang>(lang)
  useEffect(() => {
    setAudioLang(lang)
  }, [lang])

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(defaultDuration)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [rate, setRate] = useState<Rate>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState(0)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [audioError, setAudioError] = useState(false)

  // The narration file: the downloaded copy when there is one (it plays with no internet), otherwise the normal address.
  const narrationUrl = videoNarrationUrl(lesson.id, audioLang)
  const [narrationSrc, setNarrationSrc] = useState(narrationUrl)
  useEffect(() => {
    let alive = true
    const made: { url: string | null } = { url: null }
    setNarrationSrc(narrationUrl)
    setAudioError(false)
    playableUrl(narrationUrl, typeof caches !== 'undefined' ? caches : undefined, (b) => (made.url = URL.createObjectURL(b))).then((r) => { if (alive) setNarrationSrc(r.src) })
    return () => { alive = false; if (made.url) URL.revokeObjectURL(made.url) }
  }, [narrationUrl])

  const videoContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const stopNarrationRef = useRef<(() => void) | null>(null)
  const lastActiveSceneIdx = useRef(-1)

  const { scene: currentScene, index: sceneIdx } = useMemo(
    () => getSceneAtTime(scenes, currentTime, duration),
    [scenes, currentTime, duration]
  )

  const cancelFallbackNarration = useCallback(() => {
    if (stopNarrationRef.current) {
      stopNarrationRef.current()
      stopNarrationRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  // Sync Audio playback rate and volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [rate, volume, isMuted])

  // Sync Play / Pause state with audio element
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    if (isPlaying) {
      const playPromise = el.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser blocked audio autoplay or file failed, fallback to synth
          setAudioError(true)
        })
      }
    } else {
      el.pause()
    }
  }, [isPlaying])

  // Fallback timer when audio element cannot play
  useEffect(() => {
    if (!isPlaying || !audioError) return

    let lastTick = performance.now()
    const timer = setInterval(() => {
      const now = performance.now()
      const deltaSec = (now - lastTick) / 1000
      lastTick = now

      setCurrentTime((prev) => {
        const nextTime = prev + deltaSec * rate
        if (nextTime >= duration) {
          setIsPlaying(false)
          return duration
        }
        return nextTime
      })
    }, 50)

    return () => clearInterval(timer)
  }, [isPlaying, audioError, rate, duration])

  // Scene transition sound cue
  useEffect(() => {
    if (isPlaying && sceneIdx !== lastActiveSceneIdx.current) {
      lastActiveSceneIdx.current = sceneIdx
      if (!isMuted) {
        playSceneSound(currentScene.kind)
      }
      if (audioError) {
        cancelFallbackNarration()
        stopNarrationRef.current = narrateScene(currentScene, audioLang, rate)
      }
    }
  }, [isPlaying, sceneIdx, isMuted, currentScene, audioError, audioLang, rate, cancelFallbackNarration])

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelFallbackNarration()
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [cancelFallbackNarration])

  const togglePlay = () => {
    if (currentTime >= duration) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
      }
      setCurrentTime(0)
      lastActiveSceneIdx.current = -1
    }
    setIsPlaying((prev) => !prev)
  }

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(duration, newTime))
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      audioRef.current.currentTime = clamped
    }
    setCurrentTime(clamped)
    lastActiveSceneIdx.current = -1
  }

  const skipRelative = (delta: number) => {
    handleSeek(currentTime + delta)
  }

  const handleAudioLangChange = (newLang: Lang) => {
    setAudioLang(newLang)
    setAudioError(false)
    cancelFallbackNarration()
    // When changing language, preserve relative timeline position
    const savedTime = currentTime
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = savedTime
        if (isPlaying) {
          audioRef.current.play().catch(() => {})
        }
      }
    }, 50)
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
    cancelFallbackNarration()
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
    }

    try {
      await generateAndDownloadLessonVideo(
        lesson,
        audioLang,
        (pct) => {
          setGenerateProgress(pct)
        },
        {
          sceneOf: (current, total) => t('learn.video.scene_of', { current, total }),
          trigger: t('learn.video.gen_trigger'),
          flag: (n) => t('learn.video.gen_flag', { n }),
          safe: t('learn.video.gen_safe'),
          helpline: t('learn.video.gen_helpline'),
          captions: t('learn.video.subtitles'),
        }
      )
      setDownloadSuccess(true)
      setTimeout(() => setDownloadSuccess(false), 5000)
    } catch {
      // Ignore generation error
    } finally {
      setIsGenerating(false)
    }
  }

  const isAtEnd = currentTime >= duration

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border-2 border-line bg-white p-3 shadow-sm md:p-4"
      aria-label={t('learn.video.title')}
    >
      {/* Hidden audio element with the narration in the chosen language */}
      <audio
        ref={audioRef}
        src={narrationSrc}
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
            if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
              setDuration(audioRef.current.duration)
            }
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
            setDuration(audioRef.current.duration)
          }
        }}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(duration)
        }}
        onError={() => {
          setAudioError(true)
        }}
      />

      {audioLang === 'cg' && <p className="px-1 pb-2 text-xs text-muted" data-testid="video-voice-note">{t('learn.video.audio_note')}</p>}

      {/* Main Video Viewport (supports Fullscreen) */}
      <div
        ref={videoContainerRef}
        onDoubleClick={toggleFullscreen}
        className={`group relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-950 text-white shadow-xl select-none ${
          isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none' : ''
        }`}
      >
        {/* Animated Cinematic Background Gradients */}
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

        {/* Subtle grid background pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-15">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* Top Watermark & Scene Tag */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-3 text-[12px] font-bold tracking-wider">
          <span className="flex items-center gap-1.5 text-blue-400 drop-shadow">
            🛡️ SURAKSHA
          </span>
          <span
            className="rounded px-2.5 py-0.5 text-[11px] font-bold text-white uppercase shadow transition-all duration-300"
            style={{ backgroundColor: currentScene.accentColor }}
          >
            {pick(currentScene.subheading, audioLang)}
          </span>
        </div>

        {/* Center Stage Presentation - Click to Play / Pause */}
        <div
          onClick={togglePlay}
          className="relative z-10 flex flex-1 cursor-pointer items-center justify-center px-4 text-center"
        >
          {/* Scene 1: Intro */}
          {currentScene.kind === 'intro' && (
            <div className="flex max-w-lg flex-col items-center gap-2.5 animate-fadeIn">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/30 text-3xl shadow-xl ring-4 ring-blue-500/40">
                🛡️
              </div>
              <h3 className="text-xl font-extrabold text-white drop-shadow md:text-3xl">
                {pick(currentScene.heading, audioLang)}
              </h3>
              <p className="text-sm font-medium text-slate-300 md:text-base">
                {pick(currentScene.subheading, audioLang)}
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 backdrop-blur-sm">
                  🔒 {t('action.dont_share')}
                </span>
              </div>
            </div>
          )}

          {/* Scene 2: Scenario Simulation */}
          {currentScene.kind === 'scenario' && (
            <div className="w-full max-w-md rounded-2xl border-2 border-red-500/60 bg-slate-900/90 p-4 text-left shadow-2xl backdrop-blur-md animate-fadeIn">
              <div className="mb-2.5 flex items-center justify-between border-b border-red-500/30 pb-2">
                <span className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wide">
                  <span className="h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />
                  ⚠️ {pick(currentScene.heading, audioLang)}
                </span>
                <span className="rounded bg-red-950/80 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                  SCAM ALERT
                </span>
              </div>
              <p className="text-sm font-semibold leading-relaxed text-slate-100 md:text-base">
                "{pick(currentScene.narration, audioLang)}"
              </p>
            </div>
          )}

          {/* Scene 3: Warning Red Flags */}
          {currentScene.kind === 'signs' && (
            <div className="flex w-full max-w-lg flex-col gap-2 text-left animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-2xl text-amber-400">🚨</span>
                <h4 className="text-base font-extrabold text-amber-400 drop-shadow md:text-xl">
                  {pick(currentScene.heading, audioLang)}
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
                    <span className="line-clamp-2">{pick(d, audioLang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scene 4: Safe Action */}
          {currentScene.kind === 'todo' && (
            <div className="w-full max-w-lg rounded-2xl border-2 border-emerald-500/60 bg-slate-900/90 p-4 text-left shadow-2xl backdrop-blur-md animate-fadeIn">
              <div className="mb-2 flex items-center gap-2 text-emerald-400">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-extrabold text-slate-950 shadow">
                  ✓
                </span>
                <h4 className="text-sm font-extrabold tracking-wide uppercase md:text-base">
                  {pick(currentScene.heading, audioLang)}
                </h4>
              </div>
              <p className="text-base font-bold leading-snug text-white md:text-xl">
                {pick(currentScene.caption, audioLang)}
              </p>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-950/80 px-3.5 py-2 text-xs font-bold text-blue-200 border border-blue-500/30">
                <span>📞 Cyber Helpline: Dial 1930</span>
                <span>GovTech Chhattisgarh</span>
              </div>
            </div>
          )}

          {/* Big Center Play / Replay Overlay Button when paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px] transition-all">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/95 text-white shadow-2xl ring-4 ring-white/30 transition-transform hover:scale-110 active:scale-95">
                {isAtEnd ? <RotateCcw size={36} /> : <Play size={38} className="translate-x-0.5" />}
              </div>
            </div>
          )}
        </div>

        {/* Pinned Closed Captions [CC] Banner */}
        <div className="relative z-10 px-4 pb-1">
          <div className="mx-auto flex max-w-xl justify-center text-center">
            <p className="rounded-lg bg-black/85 px-3.5 py-1 text-xs font-semibold text-amber-200 shadow-lg md:text-sm">
              {pick(currentScene.caption, audioLang)}
            </p>
          </div>
        </div>

        {/* Progress Bar Line on video bottom */}
        <div className="relative z-10 h-1.5 w-full bg-slate-800">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${(currentTime / duration) * 100}%`,
              backgroundColor: currentScene.accentColor,
            }}
          />
        </div>
      </div>

      {/* Basic Video Controls Bar */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-soft p-3">
        {/* Timeline Scrubber Slider */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            aria-label={t('learn.video.seek')}
            className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand transition-all"
            style={{
              background: `linear-gradient(to right, #1747c4 0%, #1747c4 ${
                (currentTime / duration) * 100
              }%, #cbd5e1 ${(currentTime / duration) * 100}%, #cbd5e1 100%)`,
            }}
          />
          <span className="font-mono text-xs font-bold text-muted whitespace-nowrap min-w-[75px] text-right">
            {formatClock(currentTime)} / {formatClock(duration)}
          </span>
        </div>

        {/* Controls Toolbar: Play, Skip, Audio Language, Volume, Speed, Fullscreen */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/60">
          {/* Left Controls: Play/Pause, -10s, +10s */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? t('learn.video.pause') : t('learn.video.play')}
              className="btn btn-primary !h-10 !px-4 gap-2 font-bold shadow-sm"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
              <span>{isPlaying ? t('learn.video.pause') : t('learn.video.play')}</span>
            </button>

            <button
              type="button"
              onClick={() => skipRelative(-10)}
              aria-label={t('learn.video.rewind')}
              title={t('learn.video.rewind')}
              className="btn btn-secondary !h-10 !w-10 !p-0"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={() => skipRelative(10)}
              aria-label={t('learn.video.forward')}
              title={t('learn.video.forward')}
              className="btn btn-secondary !h-10 !w-10 !p-0"
            >
              <FastForward size={16} />
            </button>
          </div>

          {/* Center: Audio Language Switcher (Hindi, Chhattisgarhi, English) */}
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white p-1 shadow-sm">
            <span className="flex items-center gap-1 pl-1 text-[11px] font-bold text-muted">
              <Languages size={14} className="text-brand" />
              <span className="hidden sm:inline">{t('learn.video.audio_lang')}:</span>
            </span>
            <button
              type="button"
              onClick={() => handleAudioLangChange('hi')}
              aria-pressed={audioLang === 'hi'}
              className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                audioLang === 'hi'
                  ? 'bg-brand text-white shadow'
                  : 'text-muted hover:text-ink hover:bg-soft'
              }`}
            >
              हिन्दी
            </button>
            <button
              type="button"
              onClick={() => handleAudioLangChange('cg')}
              aria-pressed={audioLang === 'cg'}
              className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                audioLang === 'cg'
                  ? 'bg-brand text-white shadow'
                  : 'text-muted hover:text-ink hover:bg-soft'
              }`}
            >
              छत्तीसगढ़ी
            </button>
            <button
              type="button"
              onClick={() => handleAudioLangChange('en')}
              aria-pressed={audioLang === 'en'}
              className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                audioLang === 'en'
                  ? 'bg-brand text-white shadow'
                  : 'text-muted hover:text-ink hover:bg-soft'
              }`}
            >
              English
            </button>
          </div>

          {/* Right Controls: Volume, Speed, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Volume Control */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                aria-label={isMuted ? t('learn.video.unmute') : t('learn.video.mute')}
                title={isMuted ? t('learn.video.unmute') : t('learn.video.mute')}
                className="btn btn-secondary !h-10 !w-10 !p-0"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={17} />
                ) : volume < 0.5 ? (
                  <Volume1 size={17} />
                ) : (
                  <Volume2 size={17} />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value))
                  setIsMuted(false)
                }}
                aria-label={t('learn.video.volume')}
                className="h-1.5 w-16 cursor-pointer accent-brand"
              />
            </div>

            {/* Playback Speed */}
            <div className="flex items-center rounded-lg border border-line bg-white p-0.5 shadow-sm">
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRate(r)}
                  className={`rounded px-1.5 py-1 text-[11px] font-bold transition-all ${
                    rate === r ? 'bg-brand text-white shadow' : 'text-muted hover:text-ink'
                  }`}
                >
                  {r}×
                </button>
              ))}
            </div>

            {/* Fullscreen Option */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? t('learn.video.exit_fullscreen') : t('learn.video.fullscreen')}
              title={isFullscreen ? t('learn.video.exit_fullscreen') : t('learn.video.fullscreen')}
              className="btn btn-secondary !h-10 gap-1.5 font-bold shadow-sm"
            >
              {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
              <span className="hidden md:inline">
                {isFullscreen ? t('learn.video.exit_fullscreen') : t('learn.video.fullscreen')}
              </span>
            </button>
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
            <p className="text-xs text-muted">{t('learn.video.generate_hint')}</p>
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
