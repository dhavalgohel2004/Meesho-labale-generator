import { PDFDocument, PDFPage, rgb, PageSizes } from 'pdf-lib'

export type LayoutMode = '4-up' | '2-up'

export interface CombineOptions {
  layout: LayoutMode
  /** Inner margin inside each cell (points). */
  margin?: number
  /** Draw light cut guides between cells. */
  cutGuides?: boolean
}

export interface CombineResult {
  pdfBytes: Uint8Array
  inputPages: number
  outputPages: number
  labelsPerSheet: number
}

const A4 = PageSizes.A4 // [595.28, 841.89]

function labelsPerSheet(layout: LayoutMode): number {
  return layout === '4-up' ? 4 : 2
}

/** Cell origin (bottom-left) and size for a given slot index. */
function cellForSlot(
  layout: LayoutMode,
  slot: number,
  pageW: number,
  pageH: number,
): { x: number; y: number; w: number; h: number } {
  if (layout === '4-up') {
    const w = pageW / 2
    const h = pageH / 2
    // 0 TL, 1 TR, 2 BL, 3 BR
    const col = slot % 2
    const rowFromTop = Math.floor(slot / 2)
    const x = col * w
    const y = rowFromTop === 0 ? h : 0
    return { x, y, w, h }
  }

  // 2-up: 0 top, 1 bottom
  const w = pageW
  const h = pageH / 2
  const y = slot === 0 ? h : 0
  return { x: 0, y, w, h }
}

function drawCutGuides(
  page: PDFPage,
  layout: LayoutMode,
  pageW: number,
  pageH: number,
) {
  const color = rgb(0.75, 0.75, 0.75)
  const thickness = 0.4

  if (layout === '4-up') {
    page.drawLine({
      start: { x: pageW / 2, y: 0 },
      end: { x: pageW / 2, y: pageH },
      thickness,
      color,
      dashArray: [3, 3],
    })
    page.drawLine({
      start: { x: 0, y: pageH / 2 },
      end: { x: pageW, y: pageH / 2 },
      thickness,
      color,
      dashArray: [3, 3],
    })
  } else {
    page.drawLine({
      start: { x: 0, y: pageH / 2 },
      end: { x: pageW, y: pageH / 2 },
      thickness,
      color,
      dashArray: [3, 3],
    })
  }
}

/**
 * Combines whole Meesho label pages (label + invoice, uncropped) onto A4 sheets.
 * Default 4-up (2x2); optional 2-up (stacked).
 */
export async function combineLabels(
  sourceBytes: ArrayBuffer | Uint8Array,
  options: CombineOptions,
): Promise<CombineResult> {
  const margin = options.margin ?? 4
  const cutGuides = options.cutGuides ?? true
  const perSheet = labelsPerSheet(options.layout)

  const source = await PDFDocument.load(sourceBytes, {
    ignoreEncryption: true,
  })
  const inputPages = source.getPageCount()
  if (inputPages === 0) {
    throw new Error('This PDF has no pages.')
  }

  const output = await PDFDocument.create()
  const [pageW, pageH] = A4

  const embeddedPages = await output.embedPages(source.getPages())

  let outputPages = 0

  for (let i = 0; i < embeddedPages.length; i += perSheet) {
    const sheet = output.addPage([pageW, pageH])
    outputPages += 1

    if (cutGuides) {
      drawCutGuides(sheet, options.layout, pageW, pageH)
    }

    const chunk = embeddedPages.slice(i, i + perSheet)
    chunk.forEach((embedded, slot) => {
      const cell = cellForSlot(options.layout, slot, pageW, pageH)
      const availW = cell.w - margin * 2
      const availH = cell.h - margin * 2
      const scale = Math.min(availW / embedded.width, availH / embedded.height)
      const drawW = embedded.width * scale
      const drawH = embedded.height * scale
      const x = cell.x + (cell.w - drawW) / 2
      const y = cell.y + (cell.h - drawH) / 2

      sheet.drawPage(embedded, {
        x,
        y,
        width: drawW,
        height: drawH,
      })
    })
  }

  const pdfBytes = await output.save()
  return {
    pdfBytes,
    inputPages,
    outputPages,
    labelsPerSheet: perSheet,
  }
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const copy = new Uint8Array(bytes)
  const blob = new Blob([copy], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
