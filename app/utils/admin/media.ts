import type { MediaKind } from '#shared/admin'
import { MAX_UPLOAD_BYTES, isAllowedMedia } from '#shared/admin'
import { fileBase, fileExtension } from './slug'

/**
 * Files on their way into a post, prepared in the browser before they are sent:
 * a phone photo goes up as a ~300 KB WebP instead of a 5 MB JPEG, turned the
 * right way up, with its GPS position and other metadata gone.
 */

/** The long edge of an uploaded photo: sharp at twice the article's width. */
const MAX_EDGE = 2400

export interface PreparedFile {
  blob: Blob
  kind: MediaKind
  /** The name it is stored and served under: `gel-3f9a2c1d.webp`. */
  name: string
  width?: number
  height?: number
}

export class MediaError extends Error {}

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

const hash8 = async (blob: Blob) => {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest).slice(0, 4)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const EXTENSIONS: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new MediaError('The image could not be encoded.'))), type, quality)
  )

/** Whether any pixel is see-through: a JPEG would turn it black. */
const hasAlpha = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const { data } = context.getImageData(0, 0, width, height)
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) return true
  return false
}

/** An image's own size, for SVGs and GIFs, which go up untouched. */
const naturalSize = (file: File) =>
  new Promise<{ width?: number, height?: number }>((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image.naturalWidth ? { width: image.naturalWidth, height: image.naturalHeight } : {})
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({})
    }
    image.src = url
  })

const named = async (blob: Blob, original: string, fallback: string, extension: string) =>
  `${fileBase(original, fallback)}-${await hash8(blob)}.${extension}`

/**
 * A photo or screenshot, ready to upload. Vector images and GIFs (which may move)
 * are kept as they are; everything else is redrawn at most 2400px wide, which
 * drops its metadata, and saved as WebP — or PNG when that is smaller, as it is
 * for flat screenshots, or when the browser can't write WebP.
 */
export const prepareImage = async (file: File): Promise<PreparedFile> => {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    if (file.size > MAX_UPLOAD_BYTES) throw new MediaError(`${file.name} is ${megabytes(file.size)}; images can be up to 4 MB.`)
    const extension = file.type === 'image/gif' ? 'gif' : 'svg'
    return { blob: file, kind: 'images', name: await named(file, file.name, 'image', extension), ...(await naturalSize(file)) }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new MediaError(`${file.name} can't be read by this browser. Try a JPEG or PNG.`)
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const isPng = file.type === 'image/png'
  let blob = await toBlob(canvas, 'image/webp', isPng ? 0.9 : 0.82)
  if (blob.type !== 'image/webp') {
    // No WebP encoder (the browser handed back a PNG).
    blob = isPng || hasAlpha(context, width, height) ? await toBlob(canvas, 'image/png') : await toBlob(canvas, 'image/jpeg', 0.85)
  } else if (isPng) {
    const png = await toBlob(canvas, 'image/png')
    if (png.size < blob.size) blob = png
  }
  if (blob.size > MAX_UPLOAD_BYTES) throw new MediaError(`${file.name} is still ${megabytes(blob.size)} after resizing.`)
  return { blob, kind: 'images', name: await named(blob, file.name, 'image', EXTENSIONS[blob.type] ?? 'webp'), width, height }
}

/** Any other file: uploaded as it is, when it is a kind the site serves. */
export const prepareAttachment = async (file: File): Promise<PreparedFile> => {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new MediaError(`${file.name} is ${megabytes(file.size)}; attachments can be up to 4 MB for now.`)
  }
  const extension = fileExtension(file.name)
  const name = await named(file, file.name, 'file', extension || 'bin')
  if (!extension || !isAllowedMedia('files', name)) {
    throw new MediaError(`${file.name}: this kind of file can't be attached.`)
  }
  return { blob: file, kind: 'files', name }
}

export const isImageFile = (file: File) => file.type.startsWith('image/')
