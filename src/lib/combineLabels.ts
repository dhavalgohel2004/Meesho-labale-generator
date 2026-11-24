import {
  PDFArray,
  PDFDocument,
  PDFPage,
  PDFRawStream,
  decodePDFRawStream,
  rgb,
  PageSizes,
} from 'pdf-lib'

export type InvoiceMode = 'without' | 'with'

export interface CombineOptions {
  /** Default: without (crop invoice, pack 8 per A4). */
  invoiceMode: InvoiceMode
  /** Inner margin inside each cell (points). */
  margin?: number
  /** Gap between cells (points). */
  gap?: number
  /** Draw light cut guides between cells. */
  cutGuides?: boolean
}

export interface CombineResult {
  pdfBytes: Uint8Array
  inputPages: number
  outputPages: number
  labelsPerSheet: number
  invoiceMode: InvoiceMode
}

const A4 = PageSizes.A4 // [595.28, 841.89]

const CLIP_LEFT = 8
const CLIP_RIGHT = 587
const CLIP_TOP = 842
/** Fallback when TAX INVOICE position cannot be read. */
const FALLBACK_BOTTOM = 480

/** Fallback outer box for full label+invoice (Meesho A4 content, not page margins). */
const FULL_PAGE_FALLBACK = {
  left: 11,
  bottom: 262,
  right: 584,
  top: 832,
} as const

function gridForMode(mode: InvoiceMode): { cols: number; rows: number } {
  // Without invoice: cropped labels are short → 2×4 = 8 per A4
  // With invoice: full A4 pages → 2×2 = 4 per A4
  return mode === 'without' ? { cols: 2, rows: 4 } : { cols: 2, rows: 2 }
}

function cellForSlot(
  slot: number,
  cols: number,
  rows: number,
  pageW: number,
  pageH: number,
  gap: number,
): { x: number; y: number; w: number; h: number } {
  const cellW = (pageW - gap * (cols - 1)) / cols
  const cellH = (pageH - gap * (rows - 1)) / rows
  const col = slot % cols
  const rowFromTop = Math.floor(slot / cols)
  const x = col * (cellW + gap)
  const y = pageH - (rowFromTop + 1) * cellH - rowFromTop * gap
  return { x, y, w: cellW, h: cellH }
}

function drawCutGuides(
  page: PDFPage,
  cols: number,
  rows: number,
  pageW: number,
  pageH: number,
  gap: number,
) {
  const color = rgb(0.78, 0.78, 0.78)
  const thickness = 0.35
  const cellW = (pageW - gap * (cols - 1)) / cols
  const cellH = (pageH - gap * (rows - 1)) / rows

  for (let c = 1; c < cols; c++) {
    const x = c * cellW + (c - 0.5) * gap
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: pageH },
      thickness,
      color,
      dashArray: [3, 3],
    })
  }
  for (let r = 1; r < rows; r++) {
    const y = pageH - r * cellH - (r - 0.5) * gap
    page.drawLine({
      start: { x: 0, y },
      end: { x: pageW, y },
      thickness,
      color,
      dashArray: [3, 3],
    })
  }
}

function getPageContentString(page: PDFPage): string {
  const contents = page.node.Contents()
  if (!contents) return ''

  const parts: string[] = []
  const push = (stream: unknown) => {
    if (!(stream instanceof PDFRawStream)) return
    const decoded = decodePDFRawStream(stream).decode()
    let s = ''
    for (let i = 0; i < decoded.length; i++) s += String.fromCharCode(decoded[i]!)
    parts.push(s)
  }

  if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      push(contents.lookup(i))
    }
  } else {
    push(contents)
  }
  return parts.join('\n')
}

/**
 * Find crop bottom so the full Product Details row is kept and the
 * TAX INVOICE header strip is excluded.
 */
function detectLabelBottom(page: PDFPage): number {
  const content = getPageContentString(page)

  const taxMatch = /([\d.]+)\s+([\d.]+)\s+Td\n\(TAX INVOICE\)/.exec(content)
  const taxY = taxMatch ? parseFloat(taxMatch[2]) : null

  // Lowest text Y above the tax invoice (SKU / size / qty row).
  const beforeTax =
    taxMatch && taxMatch.index != null
      ? content.slice(0, taxMatch.index)
      : content
  let lowestProductY = Number.POSITIVE_INFINITY
  const tdRe = /([\d.]+)\s+([\d.]+)\s+Td\n\(([^)]*)\)/g
  let m: RegExpExecArray | null
  while ((m = tdRe.exec(beforeTax))) {
    const y = parseFloat(m[2])
    if (y >= 450 && y <= 620) {
      lowestProductY = Math.min(lowestProductY, y)
    }
  }

  // Product-details bottom border is usually a few pts under the SKU baseline.
  // Stop just under that border so TAX INVOICE / "Original for Recipient" is cut off.
  if (Number.isFinite(lowestProductY)) {
    return Math.max(400, Math.min(lowestProductY - 8, 520))
  }
  if (taxY != null) {
    return Math.max(400, Math.min(taxY + 14, 520))
  }
  return FALLBACK_BOTTOM
}

/**
 * Trim Meesho A4 page margins so label+invoice fills the cell (bigger print).
 * Uses outer stroke lines from the page content when available.
 */
function detectFullPageClip(page: PDFPage): {
  left: number
  bottom: number
  right: number
  top: number
} {
  const content = getPageContentString(page)
  const lineRe =
    /([\d.]+)\s+([\d.]+)\s+m\n([\d.]+)\s+([\d.]+)\s+l\nS/g
  const xs: number[] = []
  const ys: number[] = []
  let m: RegExpExecArray | null
  while ((m = lineRe.exec(content))) {
    const x1 = parseFloat(m[1])
    const y1 = parseFloat(m[2])
    const x2 = parseFloat(m[3])
    const y2 = parseFloat(m[4])
    // Outer frame lines are long (≥400pt).
    const len = Math.hypot(x2 - x1, y2 - y1)
    if (len < 400) continue
    xs.push(x1, x2)
    ys.push(y1, y2)
  }

  if (xs.length >= 4 && ys.length >= 4) {
    const left = Math.min(...xs) - 2
    const right = Math.max(...xs) + 2
    const bottom = Math.min(...ys) - 2
    const top = Math.max(...ys) + 2
    // Sanity: must look like a label box on A4, not a bad parse.
    if (right - left > 400 && top - bottom > 400) {
      return {
        left: Math.max(0, left),
        bottom: Math.max(0, bottom),
        right: Math.min(595, right),
        top: Math.min(842, top),
      }
    }
  }

  return { ...FULL_PAGE_FALLBACK }
}

/**
 * Combines Meesho label pages onto A4 sheets.
 * - without invoice: crop shipping label only, 8 per page (2×4)
 * - with invoice: trim page margins, keep label+invoice, 4 per page (2×2)
 */
export async function combineLabels(
  sourceBytes: ArrayBuffer | Uint8Array,
  options: CombineOptions,
): Promise<CombineResult> {
  const invoiceMode = options.invoiceMode
  // Zero cell padding for with-invoice — content crop removes A4 white margins.
  const margin = options.margin ?? (invoiceMode === 'without' ? 1.5 : 0)
  const gap = options.gap ?? (invoiceMode === 'without' ? 1 : 0)
  const cutGuides = options.cutGuides ?? true
  const { cols, rows } = gridForMode(invoiceMode)
  const perSheet = cols * rows

  const source = await PDFDocument.load(sourceBytes, {
    ignoreEncryption: true,
  })
  const inputPages = source.getPageCount()
  if (inputPages === 0) {
    throw new Error('This PDF has no pages.')
  }

  const output = await PDFDocument.create()
  const [pageW, pageH] = A4
  const sourcePages = source.getPages()

  const embeddedPages = await Promise.all(
    sourcePages.map((page) => {
      if (invoiceMode === 'without') {
        const bottom = detectLabelBottom(page)
        return output.embedPage(page, {
          left: CLIP_LEFT,
          bottom,
          right: CLIP_RIGHT,
          top: CLIP_TOP,
        })
      }
      const clip = detectFullPageClip(page)
      return output.embedPage(page, clip)
    }),
  )

  let outputPages = 0

  for (let i = 0; i < embeddedPages.length; i += perSheet) {
    const sheet = output.addPage([pageW, pageH])
    outputPages += 1

    if (cutGuides) {
      drawCutGuides(sheet, cols, rows, pageW, pageH, gap)
    }

    const chunk = embeddedPages.slice(i, i + perSheet)
    chunk.forEach((embedded, slot) => {
      const cell = cellForSlot(slot, cols, rows, pageW, pageH, gap)
      const availW = Math.max(cell.w - margin * 2, 1)
      const availH = Math.max(cell.h - margin * 2, 1)
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
    invoiceMode,
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
