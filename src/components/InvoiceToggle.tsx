import type { InvoiceMode } from '../lib/combineLabels'

interface InvoiceToggleProps {
  value: InvoiceMode
  onChange: (mode: InvoiceMode) => void
  disabled?: boolean
}

export function InvoiceToggle({ value, onChange, disabled }: InvoiceToggleProps) {
  return (
    <div className="layout-toggle" role="group" aria-label="Invoice option">
      <button
        type="button"
        className={
          value === 'without'
            ? 'layout-toggle__btn is-active'
            : 'layout-toggle__btn'
        }
        onClick={() => onChange('without')}
        disabled={disabled}
      >
        <span className="layout-toggle__grid layout-toggle__grid--8" aria-hidden>
          <i /><i /><i /><i /><i /><i /><i /><i />
        </span>
        Without invoice
        <small>8 labels per A4 · cropped</small>
      </button>
      <button
        type="button"
        className={
          value === 'with' ? 'layout-toggle__btn is-active' : 'layout-toggle__btn'
        }
        onClick={() => onChange('with')}
        disabled={disabled}
      >
        <span className="layout-toggle__grid" aria-hidden>
          <i /><i /><i /><i />
        </span>
        With invoice
        <small>4 full pages per A4</small>
      </button>
    </div>
  )
}
