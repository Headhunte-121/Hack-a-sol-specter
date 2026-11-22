// Opening the camera for QR scanning, and turning each way it can fail into a message that says what to do next.

export type CameraErrorKey = 'qr.err.camera' | 'qr.err.camera_none' | 'qr.err.camera_busy' | 'qr.err.camera_unsupported' | 'qr.err.camera_failed'

/** cameraErrorKey: the browser's error name -> the message to show. */
export function cameraErrorKey(e: unknown): CameraErrorKey {
  const name = (e as { name?: string } | null)?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'qr.err.camera' // blocked for this site or for the browser
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'qr.err.camera_none'
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'qr.err.camera_busy' // another app is using it
  if (name === 'NotSupportedError' || name === 'TypeError') return 'qr.err.camera_unsupported'
  return 'qr.err.camera_failed'
}

type Media = Pick<MediaDevices, 'getUserMedia'> | undefined

/** openCamera: prefer the back camera; if this phone cannot honour that, take any camera rather than fail. */
export async function openCamera(media: Media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined): Promise<MediaStream> {
  if (!media?.getUserMedia) throw Object.assign(new Error('no camera API'), { name: 'NotSupportedError' })
  try {
    return await media.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
  } catch (e) {
    const name = (e as { name?: string })?.name
    if (name === 'OverconstrainedError' || name === 'NotFoundError') return await media.getUserMedia({ video: true })
    throw e
  }
}
