// Opening the camera for QR scanning, and turning each way it can fail into a message that says what to do next.

export type CameraErrorKey =
  | 'qr.err.camera' | 'qr.err.camera_dismissed' | 'qr.err.camera_none' | 'qr.err.camera_busy' | 'qr.err.camera_unsupported' | 'qr.err.camera_failed'
type Permission = PermissionState | 'unknown'

/** cameraErrorKey: the browser's error name (and the site's camera permission, when known) -> the message to show. */
export function cameraErrorKey(e: unknown): CameraErrorKey {
  const err = e as { name?: string; permission?: Permission } | null
  const name = err?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return err?.permission === 'prompt' ? 'qr.err.camera_dismissed' : 'qr.err.camera' // asked and closed vs blocked for the site or browser
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'qr.err.camera_none'
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'qr.err.camera_busy' // another app is using it
  if (name === 'NotSupportedError' || name === 'TypeError') return 'qr.err.camera_unsupported'
  return 'qr.err.camera_failed'
}

/** The site's camera permission as the browser reports it ('unknown' where the browser cannot say). */
export async function cameraPermission(): Promise<Permission> {
  try {
    return (await navigator.permissions.query({ name: 'camera' as PermissionName })).state
  } catch {
    return 'unknown'
  }
}

/** Resolve once the page has focus again (a system permission dialog takes it away), or after a timeout. */
export function untilFocused(timeoutMs = 8000): Promise<void> {
  const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
  if (typeof document === 'undefined' || document.hasFocus()) return pause(400)
  return new Promise((resolve) => {
    const done = () => { window.removeEventListener('focus', done); clearTimeout(timer); void pause(300).then(resolve) }
    const timer = setTimeout(done, timeoutMs)
    window.addEventListener('focus', done)
  })
}

type Media = Pick<MediaDevices, 'getUserMedia'> | undefined
interface Deps { permission: () => Promise<Permission>; settle: () => Promise<void> }

/** openCamera: prefer the back camera, and take any camera rather than fail.
 *  On Android the first request can be refused while the phone is still asking whether the browser may use the camera, or
 *  just after the user switched the camera on in settings; the next request then works. So when the site is not actually
 *  blocked, wait for any system dialog to close and try once more before reporting a failure. */
export async function openCamera(
  media: Media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined,
  deps: Deps = { permission: cameraPermission, settle: untilFocused },
): Promise<MediaStream> {
  if (!media?.getUserMedia) throw Object.assign(new Error('no camera API'), { name: 'NotSupportedError' })
  const attempt = async () => {
    try {
      return await media.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
    } catch (e) {
      const name = (e as { name?: string })?.name
      if (name === 'OverconstrainedError' || name === 'NotFoundError') return await media.getUserMedia({ video: true })
      throw e
    }
  }
  try {
    return await attempt()
  } catch (e) {
    if ((e as { name?: string })?.name !== 'NotAllowedError') throw e
    const permission = await deps.permission()
    if (permission === 'denied' || permission === 'prompt') throw Object.assign(e as object, { permission })
    await deps.settle()
    return await attempt() // a second refusal is reported as blocked
  }
}
