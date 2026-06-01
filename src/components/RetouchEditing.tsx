'use client'
import { useState, useRef } from 'react'
import styles from './GarmentSwap.module.css'
import ResultsPanel, { ResultImage } from './ResultsPanel'

const REFINE_WEBHOOK = process.env.NEXT_PUBLIC_N8N_RETOUCH_WEBHOOK || 'https://rufflebutts.app.n8n.cloud/webhook/image-refine-upload'

interface SourceImage {
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
  status: 'processing' | 'done' | 'error'
  time: string
}

export default function RetouchEditing() {
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null)
  const [instructions, setInstructions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [results, setResults] = useState<GeneratedImage[]>([])
  const [refineSubmitting, setRefineSubmitting] = useState<string | null>(null)

  const sourceInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (sourceImage) URL.revokeObjectURL(sourceImage.preview)
    setSourceImage({ file, preview: URL.createObjectURL(file) })
  }

  const removeImage = () => {
    if (sourceImage) URL.revokeObjectURL(sourceImage.preview)
    setSourceImage(null)
  }

  const canSubmit = sourceImage && instructions.trim() && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)

    const formData = new FormData()
    formData.append('Original_Image', sourceImage.file)
    formData.append('Refine_Instructions', instructions)

    const jobId = Date.now().toString()
    setJobs(prev => [{
      id: jobId,
      status: 'processing',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }, ...prev])

    try {
      const response = await fetch(REFINE_WEBHOOK, { method: 'POST', body: formData })
      if (response.ok) {
        const data = await response.json()
        const responseData = Array.isArray(data) ? data[0] : data
        const images: GeneratedImage[] = (responseData.images || []).map((img: GeneratedImage, i: number) => ({
          ...img,
          imageUrl: img.gcsUrl || img.imageUrl,
          fileId: img.gcsFileName || img.fileId || `image_${i}_${Date.now()}`,
          fileName: img.gcsFileName || img.fileName,
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

  const handleRefineSubmit = async (image: GeneratedImage) => {
    if (!image.refineText) return
    setRefineSubmitting(image.fileId)
    const formData = new FormData()
    formData.append('Original_Image_URL', image.imageUrl)
    formData.append('Refine_Instructions', image.refineText as string)
    try {
      const response = await fetch(REFINE_WEBHOOK, { method: 'POST', body: formData })
      if (response.ok) {
        const data = await response.json()
        const responseData = Array.isArray(data) ? data[0] : data
        const newImages: GeneratedImage[] = (responseData.images || []).map((img: GeneratedImage, i: number) => ({
          ...img,
          imageUrl: (img.gcsUrl as string) || img.imageUrl,
          fileId: (img.gcsFileName as string) || img.fileId || `refined_${i}_${Date.now()}`,
          fileName: (img.gcsFileName as string) || img.fileName,
          status: 'pending' as const,
          showRefine: false,
          refineText: '',
        }))
        setResults(prev => [...newImages, ...prev])
        setResults(prev => prev.map(img => img.fileId === image.fileId ? { ...img, status: 'rejected', showRefine: false } : img))
      }
    } catch { /* silent fail */ }
    setRefineSubmitting(null)
  }

  const handleClearAll = () => setResults([])

  const handleAddResults = (images: GeneratedImage[]) => setResults(prev => [...images, ...prev])

  return (
    <div className={styles.layout}>

      {/* ── Left: Form panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.title}>Retouch / Editing</div>
            <div className={styles.subtitle}>Upload an image and describe the change you want</div>
          </div>
          <div className={styles.modelBadge}>
            <span className={styles.statusDot} />
            gpt-image-2
          </div>
        </div>

        <div className={styles.body}>

          {/* Step 1 — Source image */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Step 1 — Image to edit</div>
            <div className={styles.stepDescription}>
              Upload the image you want to retouch. Everything else stays the same — only what you describe below gets changed.
            </div>
            <input
              ref={sourceInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {sourceImage ? (
              <div className={styles.uploadPreview}>
                <img src={sourceImage.preview} alt="Source" className={styles.previewImg} />
                <button className={styles.removeBtn} onClick={removeImage}>✕ Remove</button>
              </div>
            ) : (
              <button className={styles.uploadBox} onClick={() => sourceInputRef.current?.click()}>
                <span className={styles.uploadIcon}>↑</span>
                <span className={styles.uploadLabel}>Upload image</span>
                <span className={styles.uploadSub}>The image you want to edit</span>
              </button>
            )}
          </section>

          <div className={styles.sectionDivider} />

          {/* Step 2 — What to change */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Step 2 — What to change</div>
            <div className={styles.stepDescription}>
              Describe the edit in plain language. You can change the model or the scene — for example: &quot;make the model smile,&quot; &quot;move the arms down to the sides,&quot; or &quot;swap the model&apos;s face for a different child.&quot;
            </div>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Make the boy smile and move his arms down to his sides. Keep the outfit and background exactly the same."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
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
                <><span className={styles.spinner} /> Editing image...</>
              ) : 'Apply edit'}
            </button>

            {jobs.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className={styles.sectionLabel}>Recent jobs</div>
                {jobs.slice(0, 5).map(job => (
                  <div key={job.id} className={styles.jobCard}>
                    <div className={styles.jobTop}>
                      <span className={styles.jobName}>Retouch / Editing</span>
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

      {/* ── Resizable divider ── */}
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
