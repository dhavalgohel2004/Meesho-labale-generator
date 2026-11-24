import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dropzone } from './components/Dropzone'
import { InvoiceToggle } from './components/InvoiceToggle'
import { Preview } from './components/Preview'
import {
  combineLabels,
  downloadPdf,
  type InvoiceMode,
} from './lib/combineLabels'
import './App.css'

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null)
  const [invoiceMode, setInvoiceMode] = useState<InvoiceMode>('without')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)
  const [inputPages, setInputPages] = useState(0)
  const [outputPages, setOutputPages] = useState(0)
  const [labelsPerSheet, setLabelsPerSheet] = useState(8)

  const downloadUrl = useMemo(() => {
    if (!resultBytes) return null
    const copy = new Uint8Array(resultBytes)
    return URL.createObjectURL(new Blob([copy], { type: 'application/pdf' }))
  }, [resultBytes])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  const onFile = useCallback(async (next: File) => {
    setError(null)
    setResultBytes(null)
    setFile(next)
    try {
      const buf = await next.arrayBuffer()
      setFileBytes(new Uint8Array(buf))
    } catch {
      setFile(null)
      setFileBytes(null)
      setError('Could not read that file. Please try another PDF.')
    }
  }, [])

  useEffect(() => {
    if (!fileBytes) return

    let cancelled = false

    const run = async () => {
      setBusy(true)
      setError(null)
      try {
        const result = await combineLabels(fileBytes, {
          invoiceMode,
          cutGuides: true,
        })
        if (cancelled) return
        setResultBytes(result.pdfBytes)
        setInputPages(result.inputPages)
        setOutputPages(result.outputPages)
        setLabelsPerSheet(result.labelsPerSheet)
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Failed to combine labels.'
        setError(message)
        setResultBytes(null)
      } finally {
        if (!cancelled) setBusy(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [fileBytes, invoiceMode])

  const onDownload = () => {
    if (!resultBytes) return
    const base = file?.name?.replace(/\.pdf$/i, '') || 'meesho-labels'
    const suffix = invoiceMode === 'without' ? 'no-invoice-8up' : 'with-invoice-4up'
    downloadPdf(resultBytes, `${base}-${suffix}-A4.pdf`)
  }

  return (
    <div className="app">
      <div className="app__bg" aria-hidden />

      <header className="hero">
        <p className="hero__eyebrow">Seller print tool</p>
        <h1 className="hero__brand">Meesho Label Generator</h1>
        <p className="hero__lead">
          Upload your Sub_Order_Labels PDF. Default packs cropped shipping labels
          (no invoice) — 8 per A4. Or keep full pages with invoice — 4 per A4.
        </p>
      </header>

      <main className="panel">
        <Dropzone onFile={onFile} disabled={busy} fileName={file?.name ?? null} />

        <div className="panel__controls">
          <InvoiceToggle
            value={invoiceMode}
            onChange={setInvoiceMode}
            disabled={busy || !fileBytes}
          />

          <div className="panel__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onDownload}
              disabled={!resultBytes || busy}
            >
              Download PDF
            </button>
          </div>
        </div>

        {error && (
          <p className="banner banner--error" role="alert">
            {error}
          </p>
        )}

        {!error && resultBytes && (
          <p className="banner banner--ok">
            Ready — print at <strong>Actual size / 100%</strong>, never Fit to
            page.
          </p>
        )}

        <Preview
          pdfBytes={resultBytes}
          downloadUrl={downloadUrl}
          outputPages={outputPages}
          inputPages={inputPages}
          labelsPerSheet={labelsPerSheet}
        />
      </main>

      <footer className="footer">
        <p>
          Without invoice crops the shipping label only and fits 8 on each A4.
          With invoice keeps the full Meesho page and places 4 per sheet. Empty
          cells stay blank.
        </p>
      </footer>
    </div>
  )
}
