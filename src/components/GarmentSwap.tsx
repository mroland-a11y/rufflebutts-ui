'use client'
import { useState, useRef } from 'react'
import styles from './GarmentSwap.module.css'
import ResultsPanel, { ResultImage } from './ResultsPanel'

const N8N_WEBHOOK = process.env.NEXT_PUBLIC_N8N_GARMENT_SWAP_WEBHOOK || process.env.NEXT_PUBLIC_N8N_STUDIO_WEBHOOK || ''
const REFINE_WEBHOOK = process.env.NEXT_PUBLIC_N8N_REFINE_WEBHOOK || 'https://rufflebutts.app.n8n.cloud/webhook/image-refine'

interface SwapImage {
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

export default function GarmentSwap() {
  const [referencePhoto, setReferencePhoto] = useState<SwapImage | null>(null)
  const [garmentFlat, setGarmentFlat] = useState<SwapImage | null>(null)
  const [instructions, setInstructions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [results, setResults] = useState<GeneratedImage[]>([])
  const [refineSubmitting, setRefineSubmitting] = useState<string | null>(null)

  const referenceInputRef = useRef<HTMLInputElement>(null)
  const garmentInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File, setter: (img: SwapImage) => void, current: SwapImage | null) => {
    if (current) URL.revokeObjectURL(current.preview)
    setter({ file, preview: URL.createObjectURL(file) })
  }

  const removeImage = (setter: (img: null) => void, current: SwapImage | null) => {
    if (current) URL.revokeObjectURL(current.preview)
    setter(null)
  }

  const canSubmit = referencePhoto && garmentFlat && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)

    const formData = new FormData()
    formData.append('Reference_Photo', referencePhoto.file)
    formData.append('Garment_Flat', garmentFlat.file)
    formData.append('Swap_Instructions', instructions)

    const jobId = Date.now().toString()
    setJobs(prev => [{
      id: jobId,
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

  const activeResults = results.filter(img => img.status !== 'rejected')
  const approvedResults = results.filter(img => img.status === 'approved')

  return (
    <div className={styles.layout}>

      {/* ── Left: Form panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.title}>Garment Swap</div>
            <div className={styles.subtitle}>Keep the child, pose, and scene — swap only the garment</div>
          </div>
          <div className={styles.modelBadge}>
            <span className={styles.statusDot} />
            gpt-image-2
          </div>
        </div>

        <div className={styles.body}>

          {/* Step 1 — Reference photo */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Step 1 — Reference photo</div>
            <div className={styles.stepDescription}>
              Upload the real photo you want to keep. The child, pose, lighting, and background will be preserved exactly.
            </div>
            <input
              ref={referenceInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], setReferencePhoto, referencePhoto)}
            />
            {referencePhoto ? (
              <div className={styles.uploadPreview}>
                <img src={referencePhoto.preview} alt="Reference" className={styles.previewImg} />
                <button className={styles.removeBtn} onClick={() => removeImage(setReferencePhoto as (img: null) => void, referencePhoto)}>✕ Remove</button>
              </div>
            ) : (
              <button className={styles.uploadBox} onClick={() => referenceInputRef.current?.click()}>
                <span className={styles.uploadIcon}>↑</span>
                <span className={styles.uploadLabel}>Upload reference photo</span>
                <span className={styles.uploadSub}>The child and scene to keep</span>
              </button>
            )}
          </section>

          <div className={styles.sectionDivider} />

          {/* Step 2 — New garment */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Step 2 — New garment</div>
            <div className={styles.stepDescription}>
              Upload the garment to put on the child. Use a flat lay or product shot.
            </div>
            <input
              ref={garmentInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], setGarmentFlat, garmentFlat)}
            />
            {garmentFlat ? (
              <div className={styles.uploadPreview}>
                <img src={garmentFlat.preview} alt="Garment" className={styles.previewImg} />
                <button className={styles.removeBtn} onClick={() => removeImage(setGarmentFlat as (img: null) => void, garmentFlat)}>✕ Remove</button>
              </div>
            ) : (
              <button className={styles.uploadBox} onClick={() => garmentInputRef.current?.click()}>
                <span className={styles.uploadIcon}>↑</span>
                <span className={styles.uploadLabel}>Upload new garment</span>
                <span className={styles.uploadSub}>Flat lay or product shot</span>
              </button>
            )}
          </section>

          <div className={styles.sectionDivider} />

          {/* Step 3 — Instructions */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Step 3 — Instructions <span className={styles.optional}>(optional)</span></div>
            <div className={styles.stepDescription}>
              Any specific notes about the swap — e.g. "keep the toy the child is holding" or "match the original pose exactly."
            </div>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Keep the background and pose exactly as the reference. Only replace the garment."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={3}
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
                <><span className={styles.spinner} /> Swapping garment...</>
              ) : 'Swap garment'}
            </button>

            {jobs.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className={styles.sectionLabel}>Recent jobs</div>
                {jobs.slice(0, 5).map(job => (
                  <div key={job.id} className={styles.jobCard}>
                    <div className={styles.jobTop}>
                      <span className={styles.jobName}>Garment Swap</span>
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
