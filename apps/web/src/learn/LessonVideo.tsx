import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  Download,
  FastForward,
  Film,
  Languages,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useLang, type Lang } from '../shell/i18n'
import { formatClock, type Rate } from './audio'
import { pick, type Lesson } from './content'
import { AudioSceneIllustration, buildAudioStoryboard, getBeatAtTime } from './LessonVisuals'
import { playableUrl, videoNarrationUrl } from './offline'
import { narrateScene, playSceneSound } from './videoAudio'
import { generateAndDownloadLessonVideo } from './videoGenerator'
import { buildLessonScenes, totalVideoDuration, type VideoScene } from './videoTypes'

interface LessonVideoProps {
  lesson: Lesson
}

const VIDEO_RATES = [0.75, 1, 1.25, 1.5, 2] as const
type VideoRate = (typeof VIDEO_RATES)[number]

const SPEED_LABEL: Record<Lang, string> = {
  en: 'Playback speed',
  hi: 'प्लेबैक गति',
  cg: 'रफ्तार',
}

const SCENE_LIGHT_BG: Record<VideoScene['kind'], string> = {
  intro: 'linear-gradient(135deg, #EAF1FF 0%, #FFFFFF 52%, #DCEBFF 100%)',
  scenario: 'linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 54%, #FFE4E6 100%)',
  signs: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 54%, #FEF3C7 100%)',
  todo: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 54%, #D1FAE5 100%)',
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
  const [rate, setRate] = useState<VideoRate>(1)
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)
  const [skipBadge, setSkipBadge] = useState<'-10' | '+10' | null>(null)
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

    playableUrl(
      narrationUrl,
      typeof caches !== 'undefined' ? caches : undefined,
      (b) => (made.url = URL.createObjectURL(b))
    ).then((r) => {
      if (alive) setNarrationSrc(r.src)
    })

    return () => {
      alive = false
      if (made.url) URL.revokeObjectURL(made.url)
    }
  }, [narrationUrl])

  const videoContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const stopNarrationRef = useRef<(() => void) | null>(null)
  const lastActiveSceneIdx = useRef(-1)
  const skipBadgeTimer = useRef<number | undefined>(undefined)
  const langSwitchTimer = useRef<number | undefined>(undefined)
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying

  // Build audio-driven visual storyboard: every spoken line gets its own timed illustration
  const storyboard = useMemo(
    () => buildAudioStoryboard(lesson, scenes, audioLang, duration),
    [lesson, scenes, audioLang, duration]
  )

  const activeBeat = useMemo(
    () => getBeatAtTime(storyboard, currentTime),
    [storyboard, currentTime]
  )

  const currentScene = activeBeat.scene
  const sceneIdx = activeBeat.sceneIndex

  // Unique section boundary timestamps for subtle scrubber dividers
  const sectionStarts = useMemo(() => {
    const seen = new Set<number>()
    const starts: number[] = []
    for (const b of storyboard) {
      if (b.sceneIndex > 0 && !seen.has(b.sceneIndex)) {
        seen.add(b.sceneIndex)
        starts.push(b.start)
      }
    }
    return starts
  }, [storyboard])

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

  // Sync Play / Pause state with audio element (and cancel fallback speech when stopped)
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    if (isPlaying) {
      const playPromise = el.play()
      if (playPromise !== undefined) {
        playPromise.catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          if (isPlayingRef.current) setAudioError(true)
        })
      }
    } else {
      window.clearTimeout(langSwitchTimer.current)
      el.pause()
      cancelFallbackNarration()
    }
  }, [isPlaying, cancelFallbackNarration])

  // Smooth 60fps audio clock sync so visuals switch immediately with the voice
  useEffect(() => {
    if (!isPlaying || audioError) return
    let rafId = 0
    const tick = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime)
        if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
          setDuration(audioRef.current.duration)
        }
      }
      rafId = window.requestAnimationFrame(tick)
    }
    rafId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(rafId)
  }, [isPlaying, audioError])

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

  // Scene transition sound cue (and cancel fallback speech if paused or muted)
  useEffect(() => {
    if (!isPlaying || isMuted) {
      cancelFallbackNarration()
      return
    }
    if (sceneIdx !== lastActiveSceneIdx.current) {
      lastActiveSceneIdx.current = sceneIdx
      playSceneSound(currentScene.kind)
      if (audioError) {
        cancelFallbackNarration()
        stopNarrationRef.current = narrateScene(currentScene, audioLang, rate as unknown as Rate)
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
      window.clearTimeout(skipBadgeTimer.current)
      window.clearTimeout(langSwitchTimer.current)
      cancelFallbackNarration()
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [cancelFallbackNarration])

  const togglePlay = useCallback(() => {
    setSpeedMenuOpen(false)
    if (isPlayingRef.current) {
      window.clearTimeout(langSwitchTimer.current)
      isPlayingRef.current = false
      audioRef.current?.pause()
      cancelFallbackNarration()
      setIsPlaying(false)
      return
    }
    if (currentTime >= duration) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
      }
      setCurrentTime(0)
      lastActiveSceneIdx.current = -1
    }
    setIsPlaying(true)
  }, [currentTime, duration, cancelFallbackNarration])

  const handleSeek = useCallback(
    (newTime: number) => {
      const clamped = Math.max(0, Math.min(duration, newTime))
      if (audioRef.current && !isNaN(audioRef.current.duration)) {
        audioRef.current.currentTime = clamped
      }
      setCurrentTime(clamped)
      lastActiveSceneIdx.current = -1
    },
    [duration]
  )

  const skipRelative = useCallback(
    (delta: number) => {
      handleSeek(currentTime + delta)
      setSkipBadge(delta < 0 ? '-10' : '+10')
      window.clearTimeout(skipBadgeTimer.current)
      skipBadgeTimer.current = window.setTimeout(() => setSkipBadge(null), 650)
    },
    [currentTime, handleSeek]
  )

  const handleAudioLangChange = (newLang: Lang) => {
    setAudioLang(newLang)
    setAudioError(false)
    cancelFallbackNarration()
    window.clearTimeout(langSwitchTimer.current)
    const savedTime = currentTime
    langSwitchTimer.current = window.setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.playbackRate = rate
        audioRef.current.currentTime = savedTime
        if (isPlayingRef.current) {
          audioRef.current.play().catch(() => {})
        } else {
          audioRef.current.pause()
        }
      }
    }, 50)
  }

  const toggleFullscreen = useCallback(() => {
    if (!videoContainerRef.current) return
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement) return
    if (e.key === ' ' || e.key.toLowerCase() === 'k') {
      e.preventDefault()
      togglePlay()
    } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
      e.preventDefault()
      skipRelative(-10)
    } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
      e.preventDefault()
      skipRelative(10)
    } else if (e.key.toLowerCase() === 'm') {
      e.preventDefault()
      setIsMuted((prev) => !prev)
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault()
      toggleFullscreen()
    }
  }

  const handleGenerateVideo = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setGenerateProgress(0)
    setDownloadSuccess(false)
    cancelFallbackNarration()
    isPlayingRef.current = false
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
  const progressPct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
  const showStartIntro = !isPlaying && currentTime === 0 && sceneIdx === 0

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-md shadow-blue-950/8 sm:p-4"
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
          if (audioRef.current) {
            audioRef.current.playbackRate = rate
            if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
              setDuration(audioRef.current.duration)
            }
          }
        }}
        onPlay={() => {
          if (!isPlayingRef.current) {
            audioRef.current?.pause()
            return
          }
          if (audioRef.current) audioRef.current.playbackRate = rate
        }}
        onEnded={() => {
          isPlayingRef.current = false
          audioRef.current?.pause()
          cancelFallbackNarration()
          setIsPlaying(false)
          setCurrentTime(duration)
        }}
        onError={() => {
          setAudioError(true)
        }}
      />

      {audioLang === 'cg' && (
        <p className="rounded-lg bg-[#EFF4FF] px-3 py-1.5 text-xs font-medium text-[#1B3B73]" data-testid="video-voice-note">
          {t('learn.video.audio_note')}
        </p>
      )}

      {/* Unified YouTube-Style Light Civic Player Shell */}
      <div
        ref={videoContainerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={`flex w-full flex-col overflow-hidden rounded-xl border border-blue-200/90 bg-white text-[#0F1B3D] shadow-lg shadow-blue-950/10 outline-none focus-visible:ring-2 focus-visible:ring-[#1747c4] select-none ${
          isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none' : ''
        }`}
      >
        {/* 1. Audio-Synced Illustrated Stage */}
        <div
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          className={`group relative flex w-full cursor-pointer flex-col justify-between overflow-hidden bg-[#F4F8FF] ${
            isFullscreen ? 'flex-1' : 'min-h-[250px] sm:aspect-video sm:min-h-[310px]'
          }`}
        >
          {/* Light Civic Scene Gradient Background */}
          <div
            className="absolute inset-0 transition-all duration-700 ease-in-out"
            style={{ background: SCENE_LIGHT_BG[currentScene.kind] }}
          />

          {/* Subtle civic dot-grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-45"
            style={{
              backgroundImage: 'radial-gradient(rgba(22, 50, 100, 0.12) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />

          {/* Top Bar: Brand + Live Scene Badge */}
          <div className="relative z-10 flex items-center justify-between gap-2 px-3 pt-2.5 text-[10.5px] font-extrabold tracking-wider sm:px-4 sm:pt-3 sm:text-[11px]">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/94 px-2.5 py-1 text-[#163264] shadow-xs ring-1 ring-blue-900/10">
              <ShieldCheck className="size-3.5 text-[#1747c4]" strokeWidth={2.4} />
              <span>SURAKSHA</span>
            </span>

            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#163264] ring-1 ring-blue-900/10">
                {activeBeat.beatInScene + 1}/{activeBeat.beatsInScene}
              </span>
              <span
                className="truncate rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white uppercase shadow-xs transition-colors duration-300 sm:text-[10.5px]"
                style={{ backgroundColor: currentScene.accentColor }}
              >
                {activeBeat.badge}
              </span>
            </div>
          </div>

          {/* Center Stage: Live Audio-Matched Illustration + Spoken Explanation Card */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 py-4 sm:px-5 sm:py-6">
            {showStartIntro ? (
              <div className="grid w-full max-w-2xl grid-cols-1 items-center gap-3 sm:grid-cols-12">
                <div className="mx-auto w-full max-w-[200px] sm:col-span-5 sm:max-w-none">
                  <AudioSceneIllustration art={activeBeat.art} accentColor={currentScene.accentColor} />
                </div>
                <div className="flex flex-col items-center gap-2 text-center sm:col-span-7 sm:items-start sm:text-left">
                  <h3 className="text-[18px] font-extrabold leading-tight text-[#0F1B3D] sm:text-2xl">
                    {pick(currentScene.heading, audioLang)}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 sm:text-sm">
                    {activeBeat.badge}
                  </p>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#163264] px-5 py-2 text-xs font-extrabold text-white shadow-lg shadow-blue-950/25 ring-4 ring-white/90 transition-transform group-hover:scale-105 sm:text-sm">
                    <Play className="size-4 translate-x-px fill-current" />
                    <span>{t('learn.video.play')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={activeBeat.id}
                className="grid w-full max-w-2xl grid-cols-1 items-center gap-3 transition-all duration-300 sm:grid-cols-12"
              >
                {/* Left: Full-Bleed Illustrated Scene Matched to Current Audio Beat */}
                <div className="mx-auto w-full max-w-[205px] sm:col-span-6 sm:max-w-none">
                  <AudioSceneIllustration art={activeBeat.art} accentColor={currentScene.accentColor} />
                </div>

                {/* Right: Matching Visual Card Showing What Is Being Spoken Right Now */}
                <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/90 bg-white/96 p-3.5 text-left shadow-md shadow-blue-950/8 sm:col-span-6 sm:p-4">
                  <span
                    className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase"
                    style={{ backgroundColor: currentScene.accentColor }}
                  >
                    {activeBeat.headline}
                  </span>
                  <p className="text-[13.5px] font-bold leading-relaxed text-[#0F1B3D] sm:text-[15px]">
                    {activeBeat.spokenLine}
                  </p>
                </div>
              </div>
            )}

            {/* Paused Overlay (when paused mid-video) */}
            {!isPlaying && !showStartIntro && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/45 backdrop-blur-[1.5px] transition-opacity">
                <div className="flex size-14 items-center justify-center rounded-full bg-[#163264] text-white shadow-xl shadow-blue-950/30 ring-4 ring-white/95 sm:size-16">
                  {isAtEnd ? <RotateCcw className="size-6" /> : <Play className="size-7 translate-x-0.5 fill-current" />}
                </div>
              </div>
            )}

            {/* Brief YouTube-style ±10s Skip Indicator */}
            {skipBadge && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-[#163264]/90 px-4 py-1.5 font-mono text-sm font-extrabold text-white shadow-lg">
                  {skipBadge}s
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Unclipped YouTube-Style Playback Control Dock */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-20 border-t border-blue-100 bg-white px-2.5 pt-2 pb-2.5 sm:px-3.5"
        >
          {/* Interactive Scrubber with Section Dividers */}
          <div className="group/scrub relative mb-2 flex h-4 items-center">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200 transition-all group-hover/scrub:h-2">
              <div
                className="h-full rounded-full bg-[#1747c4] transition-all duration-75"
                style={{ width: `${progressPct}%` }}
              />
              {duration > 0 &&
                sectionStarts.map((startSec, i) => (
                  <span
                    key={i}
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-white"
                    style={{ left: `${(startSec / duration) * 100}%` }}
                  />
                ))}
            </div>

            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              aria-label={t('learn.video.seek')}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          {/* Single Responsive Control Row */}
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {/* Left: Play/Pause, -10s, +10s, Volume, Clock */}
            <div className="flex min-w-0 items-center gap-0.5 sm:gap-1.5">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? t('learn.video.pause') : t('learn.video.play')}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#163264] text-white shadow-xs transition-colors hover:bg-[#1747c4]"
              >
                {isPlaying ? (
                  <Pause className="size-4 fill-current" />
                ) : (
                  <Play className="size-4 translate-x-px fill-current" />
                )}
              </button>

              <button
                type="button"
                onClick={() => skipRelative(-10)}
                aria-label={t('learn.video.rewind')}
                title={t('learn.video.rewind')}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#163264] transition-colors hover:bg-blue-50"
              >
                <RotateCcw className="size-4" strokeWidth={2.2} />
              </button>

              <button
                type="button"
                onClick={() => skipRelative(10)}
                aria-label={t('learn.video.forward')}
                title={t('learn.video.forward')}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#163264] transition-colors hover:bg-blue-50"
              >
                <FastForward className="size-4" strokeWidth={2.2} />
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  aria-label={isMuted ? t('learn.video.unmute') : t('learn.video.mute')}
                  title={isMuted ? t('learn.video.unmute') : t('learn.video.mute')}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#163264] transition-colors hover:bg-blue-50"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="size-4" strokeWidth={2.2} />
                  ) : volume < 0.5 ? (
                    <Volume1 className="size-4" strokeWidth={2.2} />
                  ) : (
                    <Volume2 className="size-4" strokeWidth={2.2} />
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
                  className="hidden h-1 w-14 cursor-pointer accent-[#1747c4] sm:block"
                />
              </div>

              <span className="pl-1 font-mono text-[11px] font-bold whitespace-nowrap text-slate-600 tabular-nums">
                {formatClock(currentTime)} / {formatClock(duration)}
              </span>
            </div>

            {/* Right: Speed Popover (up to 2×), Fullscreen */}
            <div className="relative flex shrink-0 items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSpeedMenuOpen((v) => !v)}
                  aria-expanded={speedMenuOpen}
                  aria-label={SPEED_LABEL[lang]}
                  title={SPEED_LABEL[lang]}
                  className={`flex h-8 min-w-[44px] items-center justify-center rounded-lg border px-2 text-[11.5px] font-extrabold transition-colors ${
                    rate !== 1 || speedMenuOpen
                      ? 'border-[#1747c4]/40 bg-[#EFF4FF] text-[#1747c4]'
                      : 'border-slate-200 bg-slate-50 text-[#163264] hover:border-[#1747c4]/40 hover:bg-blue-50'
                  }`}
                >
                  {rate}×
                </button>

                {speedMenuOpen && (
                  <div className="absolute right-0 bottom-10 z-30 flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-blue-950/15">
                    {VIDEO_RATES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setRate(r)
                          setSpeedMenuOpen(false)
                        }}
                        className={`min-w-[68px] rounded-lg px-3 py-1.5 text-left text-xs font-extrabold transition-colors ${
                          rate === r
                            ? 'bg-[#163264] text-white'
                            : 'text-[#0F1B3D] hover:bg-[#EFF4FF] hover:text-[#1747c4]'
                        }`}
                      >
                        {r}×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? t('learn.video.exit_fullscreen') : t('learn.video.fullscreen')}
                title={isFullscreen ? t('learn.video.exit_fullscreen') : t('learn.video.fullscreen')}
                className="flex size-8 items-center justify-center rounded-full text-[#163264] transition-colors hover:bg-blue-50"
              >
                {isFullscreen ? <Minimize className="size-4" strokeWidth={2.2} /> : <Maximize className="size-4" strokeWidth={2.2} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compact YouTube-Style Action Strip: Audio Language Pills + Offline Download Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-[#F4F7FF] p-1">
          <span className="inline-flex items-center gap-1 px-1.5 text-[11px] font-bold text-slate-500">
            <Languages className="size-3.5 text-[#1747c4]" />
            <span className="hidden sm:inline">{t('learn.video.audio_lang')}:</span>
          </span>
          {(['hi', 'cg', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => handleAudioLangChange(code)}
              aria-pressed={audioLang === code}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                audioLang === code
                  ? 'bg-[#163264] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white hover:text-[#0F1B3D]'
              }`}
            >
              {code === 'hi' ? 'हिन्दी' : code === 'cg' ? 'छत्तीसगढ़ी' : 'English'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleGenerateVideo}
          disabled={isGenerating}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#163264]/15 bg-[#EFF4FF] px-3 text-xs font-bold text-[#163264] shadow-2xs transition-all hover:border-[#1747c4]/40 hover:bg-[#E3EBFF] disabled:opacity-70"
        >
          {isGenerating ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-[#163264] border-t-transparent" />
              <span>{t('learn.video.generating', { percent: generateProgress })}</span>
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>{t('learn.video.download_ready')}</span>
            </>
          ) : (
            <>
              <Download className="size-3.5 text-[#1747c4]" />
              <span>{t('learn.video.generate')}</span>
            </>
          )}
        </button>
      </div>

      {/* Slim Generation Progress Bar (shown only while exporting) */}
      {isGenerating && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#1747c4] transition-all duration-200"
              style={{ width: `${generateProgress}%` }}
            />
          </div>
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <Film className="size-3" />
            <span>{t('learn.video.generate_hint')}</span>
          </p>
        </div>
      )}
    </section>
  )
}