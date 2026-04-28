'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import styles from './FlatProductShot.module.css'

const N8N_WEBHOOK = process.env.NEXT_PUBLIC_N8N_FLAT_WEBHOOK || ''

interface GarmentImage {
  file: File
  preview: string
}

interface Job {
  id: string
  garments: number
  status: 'processing' | 'done' | 'error'
  time: string
  images?: string[]
}

export default function FlatProductShot() {
  const [shotStyle, setShotStyle] = useState<'flat_lay' | 'ghost_mannequin'>('flat_lay')
  const [garments, setGarments] = useState<(GarmentImage | null)[]>([null, null, null, null])
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])

  // Resizable panel state
  const [previewWidth, setPreviewWidth] = useState(260)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const MIN_PREVIEW = 180
  const MAX_PREVIEW = 520
  const MIN_FORM = 400

  const fileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = previewWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [previewWidth])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const delta = dragStartX.current - e.clientX
      const containerWidth = containerRef.current.offsetWidth
      const newPreviewWidth = Math.min(
        MAX_PREVIEW,
        Math.max(MIN_PREVIEW, dragStartWidth.current + delta)
      )
      const formWidth = containerWidth - newPreviewWidth - 6
      if (formWidth >= MIN_FORM) {
        setPreviewWidth(newPreviewWidth)
      }
    }

    const handleMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleFileSelect = (index: number, file: File) => {
    const preview = URL.createObjectURL(file)
    const updated = [...garments]
    updated[index] = { file, preview }
    setGarments(updated)
  }

  const removeGarment = (index: number) => {
    const updated = [...garments]
    if (updated[index]) URL.revokeObjectURL(updated[index]!.preview)
    updated[index] = null
    setGarments(updated)
  }

  const filledCount = garments.filter(Boolean).length

  const handleSubmit = async () => {
    if (filledCount === 0) return
    setSubmitting(true)

    const formData = new FormData()
    formData.append('Shot Style', shotStyle === 'flat_lay' ? 'Flat Lay' : 'Ghost Mannequin')
    formData.append('Special Instructions', specialInstructions)
    garments.forEach((g, i) => {
      if (g) formData.append(`Garment_Image_${i + 1}`, g.file)
    })

    const jobId = Date.now().toString()
    const newJob: Job = {
      id: jobId,
      garments: filledCount,
      status: 'processing',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setJobs(prev => [newJob, ...prev])

    try {
      const response = await fetch(N8N_WEBHOOK, { method: 'POST', body: formData })
      if (response.ok) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'done' } : j))
      } else {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error' } : j))
      }
    } catch {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error' } : j))
    }

    setSubmitting(false)
  }

  return (
    <div className={styles.layout} ref={containerRef}>
      <div className={styles.formPanel}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.title}>Flat product shots</div>
            <div className={styles.subtitle}>Generate clean studio flat lays — up to 4 garments per run</div>
          </div>
          <div className={styles.modelBadge}>
            <span className={styles.statusDot} />
            Gemini 3.1 Flash
          </div>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Shot style</div>
            <div className={styles.shotGrid}>
              <button
                className={`${styles.shotOption} ${shotStyle === 'flat_lay' ? styles.selected : ''}`}
                onClick={() => setShotStyle('flat_lay')}
              >
                <div className={styles.shotIcon}>▭</div>
                <div className={styles.shotLabel}>Flat lay</div>
              </button>
              <button
                className={`${styles.shotOption} ${shotStyle === 'ghost_mannequin' ? styles.selected : ''}`}
                onClick={() => setShotStyle('ghost_mannequin')}
              >
                <div className={styles.shotIcon}>◈</div>
                <div className={styles.shotLabel}>Ghost mannequin</div>
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionLabel}>Garment images <span className={styles.sectionCount}>{filledCount}/4</span></div>
            <div className={styles.uploadGrid}>
              {garments.map((g, i) => (
                <div key={i} className={styles.uploadCell}>
                  <input
                    ref={fileRefs[i]}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handleFileSelect(i, e.target.files[0])}
                  />
                  {g ? (
                    <div className={styles.uploadFilled} onClick={() => removeGarment(i)}>
                      <img src={g.preview} alt={`Garment ${i + 1}`} className={styles.uploadThumb} />
                      <div className={styles.uploadOverlay}>
                        <span className={styles.removeX}>✕</span>
                      </div>
                      <div className={styles.uploadName}>{g.file.name.replace(/\.[^.]+$/, '').slice(0, 18)}</div>
                    </div>
                  ) : (
                    <button className={styles.uploadEmpty} onClick={() => fileRefs[i].current?.click()}>
                      <span className={styles.uploadPlus}>+</span>
                      <span className={styles.uploadLabel}>Garment {i + 1}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionLabel}>Special instructions <span className={styles.optional}>(optional)</span></div>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Show the garment from the back, emphasize texture..."
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              rows={3}
            />
          </section>

          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={filledCount === 0 || submitting}
          >
            {submitting ? (
              <><span className={styles.spinner} /> Generating...</>
            ) : (
              `Generate ${filledCount > 0 ? filledCount : ''} image${filledCount !== 1 ? 's' : ''}`
            )}
          </button>

          {jobs.length > 0 && (
            <section className={styles.section} style={{ marginTop: '24px' }}>
              <div className={styles.sectionLabel}>Recent jobs</div>
              {jobs.slice(0, 5).map(job => (
                <div key={job.id} className={styles.jobCard}>
                  <div className={styles.jobTop}>
                    <span className={styles.jobName}>Flat product — {job.garments} garment{job.garments !== 1 ? 's' : ''}</span>
                    <span className={`${styles.jobStatus} ${styles[job.status]}`}>
                      {job.status === 'processing' ? 'Processing' : job.status === 'done' ? 'Done' : 'Error'}
                    </span>
                  </div>
                  <div className={styles.jobTime}>Today, {job.time}</div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>

      {/* Resizable divider */}
      <div className={styles.resizeDivider} onMouseDown={handleMouseDown}>
        <div className={styles.resizeHandle}>
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className={styles.previewPanel} style={{ width: previewWidth, minWidth: previewWidth }}>
        <div className={styles.previewHeader}>Preview</div>
        {garments.filter(Boolean).length > 0 ? (
          garments.map((g, i) => g && (
            <div key={i} className={styles.previewCard}>
              <div className={styles.previewLabel}>Garment {i + 1}</div>
              <div className={styles.previewImgWrap}>
                <img src={g.preview} alt="" className={styles.previewImg} />
              </div>
            </div>
          ))
        ) : (
          <div className={styles.previewEmpty}>
            <div className={styles.previewEmptyIcon}>◫</div>
            <div className={styles.previewEmptyText}>Upload garments to preview</div>
          </div>
        )}
      </div>
    </div>
  )
}
