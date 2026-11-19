import type { LayoutMode } from '../lib/combineLabels'

interface LayoutToggleProps {
  value: LayoutMode
  onChange: (mode: LayoutMode) => void
  disabled?: boolean
}

export function LayoutToggle({ value, onChange, disabled }: LayoutToggleProps) {
  return (
    <div className="layout-toggle" role="group" aria-label="Labels per page">
      <button
        type="button"
        className={value === '4-up' ? 'layout-toggle__btn is-active' : 'layout-toggle__btn'}
        onClick={() => onChange('4-up')}
        disabled={disabled}
      >
        <span className="layout-toggle__grid" aria-hidden>
          <i /><i /><i /><i />
        </span>
        4 per A4
        <small>2 × 2 grid</small>
      </button>
      <button
        type="button"
        className={value === '2-up' ? 'layout-toggle__btn is-active' : 'layout-toggle__btn'}
        onClick={() => onChange('2-up')}
        disabled={disabled}
      >
        <span className="layout-toggle__stack" aria-hidden>
          <i /><i />
        </span>
        2 per A4
        <small>Larger print</small>
      </button>
    </div>
  )
}
