import { useEffect, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PreviewProps {
  pdfBytes: Uint8Array | null
  downloadUrl: string | null
  outputPages: number
  inputPages: number
  labelsPerSheet: number
}

export function Preview({
  pdfBytes,
  downloadUrl,
  outputPages,
  inputPages,
  labelsPerSheet,
}: PreviewProps) {
  const [pageImages, setPageImages] = useState<string[]>([])
  const [rendering, setRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

  useEffect(() => {
    if (!pdfBytes) {
      setPageImages([])
      setRenderError(null)
      return
    }

    let cancelled = false
    const urls: string[] = []

    const run = async () => {
      setRendering(true)
      setRenderError(null)
      try {
        const doc = await pdfjs.getDocument({ data: pdfBytes.slice() }).promise
        const images: string[] = []

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          const base = page.getViewport({ scale: 1 })
          const targetWidth = Math.min(900, typeof window !== 'undefined' ? window.innerWidth * 1.6 : 900)
          const scale = targetWidth / base.width
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.width = Math.ceil(viewport.width)
          canvas.height = Math.ceil(viewport.height)
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Canvas not supported')
          await page.render({ canvasContext: ctx, viewport, canvas }).promise
          const url = canvas.toDataURL('image/jpeg', 0.92)
          urls.push(url)
          images.push(url)
        }

        if (!cancelled) setPageImages(images)
      } catch (err) {
        if (!cancelled) {
          setPageImages([])
          setRenderError(
            err instanceof Error ? err.message : 'Preview failed to render.',
          )
        }
      } finally {
        if (!cancelled) setRendering(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [pdfBytes])

  if (!pdfBytes) return null

  return (
    <section className="preview">
      <div className="preview__meta">
        <span>
          {inputPages} label{inputPages === 1 ? '' : 's'} → {outputPages} A4 sheet
          {outputPages === 1 ? '' : 's'}
        </span>
        <span>{labelsPerSheet} per page</span>
      </div>

      {rendering && <p className="preview__status">Rendering preview…</p>}
      {renderError && (
        <p className="banner banner--error" role="alert">
          Preview unavailable on this device. Use Download PDF instead.
          {downloadUrl && (
            <>
              {' '}
              <a className="preview__open" href={downloadUrl} target="_blank" rel="noreferrer">
                Open PDF
              </a>
            </>
          )}
        </p>
      )}

      <div className="preview__pages">
        {pageImages.map((src, i) => (
          <figure key={i} className="preview__page">
            <img src={src} alt={`Output page ${i + 1}`} />
            <figcaption>Page {i + 1}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
