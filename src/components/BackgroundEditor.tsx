'use client'
import { useState, useRef } from 'react'
import styles from './BackgroundEditor.module.css'
import ResultsPanel, { ResultImage } from './ResultsPanel'

const N8N_WEBHOOK = process.env.NEXT_PUBLIC_N8N_BACKGROUND_WEBHOOK || ''

type Mode = 'solid' | 'remove' | 'replace' | 'extend'
type Position = 'left' | 'center' | 'right' | 'top' | 'bottom'
type Format = 'jpeg' | 'png'

interface UploadedImage {
  file: File
  preview: string
}

type GeneratedImage = ResultImage & {
  index?: number
  gcsUrl?: string
  gcsFileName?: string
}

interface Job {
  id: string
  mode: Mode
  status: 'processing' | 'done' | 'error'
  time: string
}

const BRAND_COLORS = [
  { hex: '#F6F0EB', label: 'Warm White' },
  { hex: '#FADADD', label: 'Blush Pink' },
  { hex: '#D4EAF7', label: 'Baby Blue' },
  { hex: '#D8EFD8', label: 'Mint Green' },
  { hex: '#FFF3CD', label: 'Soft Yellow' },
  { hex: '#F2E6FF', label: 'Lavender' },
]

const MODE_OPTIONS: { value: Mode; label: string; description: string }[] = [
  { value: 'solid', label: 'Solid Color', description: 'Replace background with a solid color' },
  { value: 'remove', label: 'Remove', description: 'Remove background — transparent or solid fill' },
  { value: 'replace', label: 'Replace', description: 'Swap background with image or scene description' },
  { value: 'extend', label: 'Extend', description: 'Expand canvas to fill a larger target size' },
]

const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
]

export default function BackgroundEditor() {
  const [mode, setMode] = useState<Mode>('solid')
  const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null)
  const [replaceBg, setReplaceBg] = useState<UploadedImage | null>(null)

  // Solid color
  const [solidHex, setSolidHex] = useState('#FFFFFF')
  const [solidHexInput, setSolidHexInput] = useState('#FFFFFF')

  // Remove
  const [removeHex, setRemoveHex] = useState('')
  const [removeHexInput, setRemoveHexInput] = useState('')
  const [useTransparent, setUseTransparent] = useState(true)

  // Replace
  const [replaceBgMode, setReplaceBgMode] = useState<'upload' | 'describe'>('describe')
  const [bgDescription, setBgDescription] = useState('')

  // Extend
  const [extendPosition, setExtendPosition] = useState<Position>('center')
  const [extendHex, setExtendHex] = useState('#FFFFFF')
  const [extendHexInput, setExtendHexInput] = useState('#FFFFFF')

  // Output
  const [outputWidth, setOutputWidth] = useState('')
  const [outputHeight, setOutputHeight] = useState('')
  const [outputFormat, setOutputFormat] = useState<Format>('jpeg')
  const [customInstructions, setCustomInstructions] = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [results, setResults] = useState<GeneratedImage[]>([])
  const [refineSubmitting, setRefineSubmitting] = useState<string | null>(null)

  const sourceInputRef = useRef<HTMLInputElement>(null)
  const replaceBgInputRef = useRef<HTMLInputElement>(null)

  // When remove mode + no hex = force PNG
  const isTransparent = mode === 'remove' && useTransparent
  const effectiveFormat: Format = isTransparent ? 'png' : outputFormat

  const handleSourceFile = (file: File) => {
    if (sourceImage) URL.revokeObjectURL(sourceImage.preview)
    setSourceImage({ file, preview: URL.createObjectURL(file) })
  }

  const removeSourceImage = () => {
    if (sourceImage) URL.revokeObjectURL(sourceImage.preview)
    setSourceImage(null)
  }

  const handleReplaceBgFile = (file: File) => {
    if (replaceBg) URL.revokeObjectURL(replaceBg.preview)
    setReplaceBg({ file, preview: URL.createObjectURL(file) })
  }

  const removeReplaceBg = () => {
    if (replaceBg) URL.revokeObjectURL(replaceBg.preview)
    setReplaceBg(null)
  }

  const handleSolidHexChange = (hex: string) => {
    setSolidHex(hex)
    setSolidHexInput(hex.toUpperCase())
  }

  const handleSolidHexInput = (val: string) => {
    setSolidHexInput(val)
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setSolidHex(val)
  }

  const handleExtendHexChange = (hex: string) => {
    setExtendHex(hex)
    setExtendHexInput(hex.toUpperCase())
  }

  const handleExtendHexInput = (val: string) => {
    setExtendHexInput(val)
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setExtendHex(val)
  }

  const handleRemoveHexInput = (val: string) => {
    setRemoveHexInput(val)
    if (val === '') {
      setUseTransparent(true)
      setRemoveHex('')
    } else {
      setUseTransparent(false)
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) setRemoveHex(val)
    }
  }

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    // Auto-set PNG for remove mode
    if (newMode === 'remove') {
      setOutputFormat('png')
    }
  }

  const canSubmit = sourceImage && !submitting && (
    mode === 'solid' ||
    mode === 'remove' ||
    (mode === 'replace' && (replaceBgMode === 'upload' ? !!replaceBg : !!bgDescription)) ||
    (mode === 'extend' && !!targetWidth && !!targetHeight)
  )

  const handleSubmit = async () => {
    if (!sourceImage) return
    setSubmitting(true)

    const formData = new FormData()
    formData.append('Source_Image', sourceImage.file)
    formData.append('Mode', mode)
    formData.append('Output_Width', outputWidth)
    formData.append('Output_Height', outputHeight)
    formData.append('Output_Format', effectiveFormat)
    formData.append('Custom_Instructions', customInstructions)

    if (mode === 'solid') {
      formData.append('Background_Color', solidHex)
    }

    if (mode === 'remove') {
      formData.append('Background_Color', removeHex || 'transparent')
      formData.append('Use_Transparent', String(useTransparent))
    }

    if (mode === 'replace') {
      formData.append('Replace_Mode', replaceBgMode)
      if (replaceBgMode === 'upload' && replaceBg) {
        formData.append('Background_Image', replaceBg.file)
      } else {
        formData.append('Background_Description', bgDescription)
      }
    }

    if (mode === 'extend') {
      formData.append('Extend_Position', extendPosition)
      formData.append('Extend_Color', extendHex)
      formData.append('Target_Width', targetWidth)
      formData.append('Target_Height', targetHeight)
    }

    const jobId = Date.now().toString()
    setJobs(prev => [{
      id: jobId,
      mode,
      status: 'processing',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }, ...prev])

    try {
      const response = await fetch(N8N_WEBHOOK, { method: 'POST', body: formData })
      if (response.ok) {
        const data = await response.json()
        const responseData = Array.isArray(data) ? data[0] : data
        const images: GeneratedImage[] = (responseData.images || []).map((img: GeneratedImage, i: number) => ({
          ...img,
          imageUrl: (img.gcsUrl as string) || img.imageUrl,
          fileId: (img.gcsFileName as string) || img.fileId || `image_${i}_${Date.now()}`,
          fileName: (img.gcsFileName as string) || img.fileName,
          status: 'pending' as const,
          showRefine: false,
          refineText: '',
        }))
        setResults(prev => [...images, ...prev])
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'done' } : j))
      } else {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error' } : j))
      }
    } catch {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error' } : j))
    }

    setSubmitting(false)
  }

  const handleApprove = (fileId: string) =>
    setResults(prev => prev.map(img => img.fileId === fileId ? { ...img, status: 'approved' } : img))

  const handleReject = (fileId: string) =>
    setResults(prev => prev.map(img => img.fileId === fileId ? { ...img, status: 'rejected' } : img))

  const toggleRefine = (fileId: string) =>
    setResults(prev => prev.map(img => img.fileId === fileId ? { ...img, showRefine: !img.showRefine } : img))

  const handleRefineTextChange = (fileId: string, text: string) =>
    setResults(prev => prev.map(img => img.fileId === fileId ? { ...img, refineText: text } : img))

  const handleRefineSubmit = async (image: GeneratedImage): Promise<void> => {
    // Handled by ResultsPanel directly
  }

  const handleClearAll = () => setResults([])
  const handleAddResults = (images: GeneratedImage[]) => setResults(prev => [...images, ...prev])

  const modeLabel = MODE_OPTIONS.find(m => m.value === mode)?.label || ''

  return (
    <div className={styles.layout}>

      {/* ── Left: Form panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.title}>Background</div>
            <div className={styles.subtitle}>Remove, replace, recolor, or extend image backgrounds</div>
          </div>
          <div className={styles.modelBadge}>
            <span className={styles.statusDot} />
            gpt-image-2
          </div>
        </div>

        <div className={styles.body}>

          {/* Mode selector */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Mode</div>
            <div className={styles.modeGrid}>
              {MODE_OPTIONS.map(m => (
                <button
                  key={m.value}
                  className={`${styles.modeBtn} ${mode === m.value ? styles.modeBtnActive : ''}`}
                  onClick={() => handleModeChange(m.value)}
                >
                  <span className={styles.modeBtnLabel}>{m.label}</span>
                  <span className={styles.modeBtnDesc}>{m.description}</span>
                </button>
              ))}
            </div>
          </section>

          <div className={styles.sectionDivider} />

          {/* Source image */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Source image</div>
            <input
              ref={sourceInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleSourceFile(e.target.files[0])}
            />
            {sourceImage ? (
              <div className={styles.uploadPreview}>
                <img src={sourceImage.preview} alt="Source" className={styles.previewImg} />
                <button className={styles.removeBtn} onClick={removeSourceImage}>✕ Remove</button>
              </div>
            ) : (
              <button className={styles.uploadBox} onClick={() => sourceInputRef.current?.click()}>
                <span className={styles.uploadIcon}>↑</span>
                <span className={styles.uploadLabel}>Upload image</span>
                <span className={styles.uploadSub}>The image to edit</span>
              </button>
            )}
          </section>

          <div className={styles.sectionDivider} />

          {/* Mode-specific inputs */}

          {/* SOLID COLOR */}
          {mode === 'solid' && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Background color</div>
              <div className={styles.colorRow}>
                <div className={styles.colorSwatch}>
                  <input type="color" value={solidHex} onChange={e => handleSolidHexChange(e.target.value)} />
                </div>
                <input
                  className={styles.colorHex}
                  type="text"
                  value={solidHexInput}
                  onChange={e => handleSolidHexInput(e.target.value)}
                  placeholder="#FFFFFF"
                  maxLength={7}
                />
              </div>
              <div className={styles.swatchRow}>
                {BRAND_COLORS.map(c => (
                  <button
                    key={c.hex}
                    className={`${styles.swatch} ${solidHex === c.hex ? styles.swatchActive : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => handleSolidHexChange(c.hex)}
                    title={c.label}
                  />
                ))}
              </div>
            </section>
          )}

          {/* REMOVE */}
          {mode === 'remove' && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Background fill</div>
              <div className={styles.fieldDesc}>Leave blank for transparent PNG, or enter a hex color for solid fill.</div>
              <div className={styles.colorRow}>
                <div className={styles.colorSwatch} style={{ opacity: useTransparent ? 0.4 : 1 }}>
                  <input
                    type="color"
                    value={removeHex || '#FFFFFF'}
                    onChange={e => { setUseTransparent(false); setRemoveHex(e.target.value); setRemoveHexInput(e.target.value.toUpperCase()) }}
                  />
                </div>
                <input
                  className={styles.colorHex}
                  type="text"
                  value={removeHexInput}
                  onChange={e => handleRemoveHexInput(e.target.value)}
                  placeholder="Leave blank for transparent"
                  maxLength={7}
                />
              </div>
              <div className={styles.swatchRow}>
                {BRAND_COLORS.map(c => (
                  <button
                    key={c.hex}
                    className={`${styles.swatch} ${removeHex === c.hex ? styles.swatchActive : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => { setUseTransparent(false); setRemoveHex(c.hex); setRemoveHexInput(c.hex) }}
                    title={c.label}
                  />
                ))}
              </div>
            </section>
          )}

          {/* REPLACE */}
          {mode === 'replace' && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>New background</div>
              <div className={styles.toggleRow}>
                {(['describe', 'upload'] as const).map(t => (
                  <button
                    key={t}
                    className={`${styles.toggleBtn} ${replaceBgMode === t ? styles.selected : ''}`}
                    onClick={() => setReplaceBgMode(t)}
                  >
                    {t === 'describe' ? 'Describe' : 'Upload image'}
                  </button>
                ))}
              </div>
              {replaceBgMode === 'describe' ? (
                <textarea
                  className={styles.textarea}
                  placeholder="e.g. Outdoor park on a sunny day, soft blurred background"
                  value={bgDescription}
                  onChange={e => setBgDescription(e.target.value)}
                  rows={3}
                />
              ) : (
                <>
                  <input
                    ref={replaceBgInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handleReplaceBgFile(e.target.files[0])}
                  />
                  {replaceBg ? (
                    <div className={styles.uploadPreview}>
                      <img src={replaceBg.preview} alt="Background" className={styles.previewImg} />
                      <button className={styles.removeBtn} onClick={removeReplaceBg}>✕ Remove</button>
                    </div>
                  ) : (
                    <button className={styles.uploadBox} onClick={() => replaceBgInputRef.current?.click()}>
                      <span className={styles.uploadIcon}>↑</span>
                      <span className={styles.uploadLabel}>Upload background</span>
                      <span className={styles.uploadSub}>The scene to place behind the subject</span>
                    </button>
                  )}
                </>
              )}
            </section>
          )}

          {/* EXTEND */}
          {mode === 'extend' && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Extend settings</div>
              <div className={styles.twoCol} style={{ marginBottom: 12 }}>
                <div className={styles.fieldGroup}>
                  <div className={styles.fieldLabel}>Target width (px)</div>
                  <input type="number" placeholder="e.g. 2400" value={targetWidth} onChange={e => setTargetWidth(e.target.value)} />
                </div>
                <div className={styles.fieldGroup}>
                  <div className={styles.fieldLabel}>Target height (px)</div>
                  <input type="number" placeholder="e.g. 2400" value={targetHeight} onChange={e => setTargetHeight(e.target.value)} />
                </div>
              </div>
              <div className={styles.fieldGroup} style={{ marginBottom: 12 }}>
                <div className={styles.fieldLabel}>Image position on new canvas</div>
                <div className={styles.positionRow}>
                  {POSITION_OPTIONS.map(p => (
                    <button
                      key={p.value}
                      className={`${styles.positionBtn} ${extendPosition === p.value ? styles.selected : ''}`}
                      onClick={() => setExtendPosition(p.value)}
                    >{p.label}</button>
                  ))}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Fill color</div>
                <div className={styles.colorRow}>
                  <div className={styles.colorSwatch}>
                    <input type="color" value={extendHex} onChange={e => handleExtendHexChange(e.target.value)} />
                  </div>
                  <input
                    className={styles.colorHex}
                    type="text"
                    value={extendHexInput}
                    onChange={e => handleExtendHexInput(e.target.value)}
                    placeholder="#FFFFFF"
                    maxLength={7}
                  />
                </div>
                <div className={styles.swatchRow}>
                  {BRAND_COLORS.map(c => (
                    <button
                      key={c.hex}
                      className={`${styles.swatch} ${extendHex === c.hex ? styles.swatchActive : ''}`}
                      style={{ background: c.hex }}
                      onClick={() => handleExtendHexChange(c.hex)}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className={styles.sectionDivider} />

          {/* Output settings */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Output</div>
            <div className={styles.twoCol} style={{ marginBottom: 10 }}>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Width (px) <span className={styles.optional}>(optional)</span></div>
                <input type="number" placeholder="e.g. 2400" value={outputWidth} onChange={e => setOutputWidth(e.target.value)} />
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Height (px) <span className={styles.optional}>(optional)</span></div>
                <input type="number" placeholder="e.g. 2400" value={outputHeight} onChange={e => setOutputHeight(e.target.value)} />
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>Format</div>
              <div className={styles.formatRow}>
                <button
                  className={`${styles.formatBtn} ${effectiveFormat === 'jpeg' ? styles.selected : ''} ${isTransparent ? styles.disabled : ''}`}
                  onClick={() => !isTransparent && setOutputFormat('jpeg')}
                  disabled={isTransparent}
                >JPEG</button>
                <button
                  className={`${styles.formatBtn} ${effectiveFormat === 'png' ? styles.selected : ''}`}
                  onClick={() => setOutputFormat('png')}
                >PNG</button>
                {isTransparent && (
                  <span className={styles.formatNote}>PNG required for transparent background</span>
                )}
              </div>
            </div>
          </section>

          <div className={styles.sectionDivider} />

          {/* Custom instructions */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Custom instructions <span className={styles.optional}>(optional)</span></div>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Add soft confetti, subtle bokeh blur, light gradient from top"
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              rows={2}
            />
          </section>

          <div className={styles.sectionDivider} />

          {/* Submit */}
          <section className={styles.submitSection}>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <><span className={styles.spinner} /> Processing...</>
              ) : `Apply — ${modeLabel}`}
            </button>

            {jobs.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className={styles.sectionLabel}>Recent jobs</div>
                {jobs.slice(0, 5).map(job => (
                  <div key={job.id} className={styles.jobCard}>
                    <div className={styles.jobTop}>
                      <span className={styles.jobName}>Background — {MODE_OPTIONS.find(m => m.value === job.mode)?.label}</span>
                      <span className={`${styles.jobStatus} ${styles[job.status]}`}>
                        {job.status === 'processing' ? 'Processing' : job.status === 'done' ? 'Done' : 'Error'}
                      </span>
                    </div>
                    <div className={styles.jobTime}>Today, {job.time}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      {/* ── Divider ── */}
      <div className={styles.divider} />

      {/* ── Right: Results panel ── */}
      <ResultsPanel
        results={results}
        refineSubmitting={refineSubmitting}
        onApprove={handleApprove}
        onReject={handleReject}
        onToggleRefine={toggleRefine}
        onRefineTextChange={handleRefineTextChange}
        onRefineSubmit={handleRefineSubmit}
        onClearAll={handleClearAll}
        onAddResults={handleAddResults}
      />

    </div>
  )
}
