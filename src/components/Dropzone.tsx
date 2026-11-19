import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react'

interface DropzoneProps {
  onFile: (file: File) => void
  disabled?: boolean
  fileName?: string | null
}

export function Dropzone({ onFile, disabled, fileName }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const acceptFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        return
      }
      onFile(file)
    },
    [onFile],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    acceptFile(e.dataTransfer.files?.[0])
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0])
    e.target.value = ''
  }

  return (
    <div
      className={`dropzone${dragging ? ' dropzone--active' : ''}${disabled ? ' dropzone--disabled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={onChange}
        disabled={disabled}
      />
      <div className="dropzone__icon" aria-hidden>
        PDF
      </div>
      <p className="dropzone__title">
        {fileName ? fileName : 'Drop Meesho label PDF here'}
      </p>
      <p className="dropzone__hint">
        {fileName
          ? 'Click or drop another file to replace'
          : 'or click to browse · Sub_Order_Labels_*.pdf'}
      </p>
    </div>
  )
}
