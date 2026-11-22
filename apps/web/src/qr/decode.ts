import jsQR from 'jsqr'

/** decodeQr: read a code from pixel data in the browser. Returns null when nothing is found. */
export function decodeQr(data: Uint8ClampedArray, width: number, height: number): string | null {
  const res = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' }) // also handles light-on-dark codes
  return res ? res.data : null
}

/** Decode from an image file: draw it on a canvas (scaled down if huge) and retry at two sizes for blurry or small pictures. */
export async function decodeImageFile(file: Blob): Promise<string | null> {
  const bmp = await createImageBitmap(file)
  for (const maxSide of [1000, 600]) {
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale))
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(bmp, 0, 0, w, h)
    const out = decodeQr(ctx.getImageData(0, 0, w, h).data, w, h)
    if (out) return out
  }
  return null
}
