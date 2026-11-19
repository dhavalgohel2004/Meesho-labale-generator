interface PreviewProps {
  url: string | null
  outputPages: number
  inputPages: number
  labelsPerSheet: number
}

export function Preview({ url, outputPages, inputPages, labelsPerSheet }: PreviewProps) {
  if (!url) return null

  return (
    <section className="preview">
      <div className="preview__meta">
        <span>
          {inputPages} label{inputPages === 1 ? '' : 's'} → {outputPages} A4 sheet
          {outputPages === 1 ? '' : 's'}
        </span>
        <span>{labelsPerSheet} per page</span>
      </div>
      <iframe title="Combined labels preview" className="preview__frame" src={url} />
    </section>
  )
}
