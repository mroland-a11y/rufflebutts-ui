'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import styles from './StudioLifestyle.module.css'

const N8N_WEBHOOK = process.env.NEXT_PUBLIC_N8N_STUDIO_WEBHOOK || ''

// ─── Types ────────────────────────────────────────────────────────────────────

interface GarmentImage {
  file: File
  preview: string
}

interface Garment {
  image: GarmentImage | null
  type: string
  instructions: string
}

interface Model {
  id: string
  age: string
  sex: string
  race: string
  hairColor: string
  hairLength: string
  bodyType: string
  personality: string
  poseDirection: string
  garments: Garment[]
  expanded: boolean
}

interface GeneratedImage {
  index: number
  fileId: string
  gcsUrl?: string
  gcsFileName?: string
  imageUrl: string
  fileName: string
  status: 'pending' | 'approved' | 'rejected'
  refineText?: string
  showRefine?: boolean
}

interface Job {
  id: string
  models: number
  status: 'processing' | 'done' | 'error'
  time: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGE_OPTIONS = ['Newborn', '12m', '18-24m', '3yr', '6yr', '10yr', '30yr']
const SEX_OPTIONS = ['Male', 'Female']
const RACE_OPTIONS = ['White', 'Hispanic', 'Black', 'Persian', 'European', 'Asian', 'Light-Skinned Black']
const HAIR_LENGTH_OPTIONS = ['Short', 'Medium', 'Long']
const SHOT_TYPE_OPTIONS = ['Full body', 'Thigh high', 'Shin high', 'Waist up', 'Close up']
const POSITION_OPTIONS = ['Left', 'Center', 'Right']
const TIME_OF_DAY_OPTIONS = ['Morning', 'Midday', 'Golden Hour', 'Overcast', 'Night']
const LIGHTING_OPTIONS = ['Studio', 'Natural', 'Golden Hour', 'Dramatic', 'Overcast']
const GARMENT_TYPE_OPTIONS = ['Top', 'Bottom', 'Hair Accessory', 'Cover', 'Accessories']
const DIMENSION_PRESETS = [
  { label: '3:4 — 1800×2400', width: '1800', height: '2400' },
  { label: '1:1 — 2400×2400', width: '2400', height: '2400' },
  { label: '4:5 — 1920×2400', width: '1920', height: '2400' },
  { label: 'Custom', width: '', height: '' },
]

const DEFAULT_PERSONALITY = 'smiling, laughing, standing, sitting, arms naturally posed'

const MIN_FORM = 380
const MIN_RESULTS = 260

function makeGarment(): Garment {
  return { image: null, type: '', instructions: '' }
}

function makeModel(id: string): Model {
  return {
    id,
    age: '',
    sex: '',
    race: '',
    hairColor: '',
    hairLength: '',
    bodyType: '',
    personality: DEFAULT_PERSONALITY,
    poseDirection: '',
    garments: [makeGarment(), makeGarment(), makeGarment(), makeGarment(), makeGarment()],
    expanded: true,
  }
}

function modelSummary(m: Model): string {
  const parts = [m.sex, m.age].filter(Boolean)
  const garmentCount = m.garments.filter(g => g.image).length
  if (garmentCount > 0) parts.push(`${garmentCount} garment${garmentCount !== 1 ? 's' : ''}`)
  return parts.length > 0 ? parts.join(', ') : 'Configure model'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudioLifestyle() {
  // Output
  const [dimensionPreset, setDimensionPreset] = useState(DIMENSION_PRESETS[0].label)
  const [customWidth, setCustomWidth] = useState('1800')
  const [customHeight, setCustomHeight] = useState('2400')
  const [shotType, setShotType] = useState('Full body')
  const [modelPosition, setModelPosition] = useState('Center')

  // Scene
  const [sceneType, setSceneType] = useState<'Studio' | 'Lifestyle'>('Studio')
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [bgColorHex, setBgColorHex] = useState('#FFFFFF')
  const [sceneDirection, setSceneDirection] = useState('')
  const [referenceImage, setReferenceImage] = useState<GarmentImage | null>(null)
  const [timeOfDay, setTimeOfDay] = useState('Midday')
  const [seasonTheme, setSeasonTheme] = useState('')

  // Lighting
  const [lightingPreset, setLightingPreset] = useState('Studio')
  const [lightingInstructions, setLightingInstructions] = useState('')

  // Models
  const [models, setModels] = useState<Model[]>([makeModel('1')])
  const nextModelId = useRef(2)

  // Scene set
  const [sceneSet, setSceneSet] = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [results, setResults] = useState<GeneratedImage[]>([])
  const [refineSubmitting, setRefineSubmitting] = useState<string | null>(null)

  // Resizable panel
  const [resultsWidth, setResultsWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  // Set initial results width to 40% on mount
  useEffect(() => {
    if (containerRef.current) {
      setResultsWidth(Math.round(containerRef.current.offsetWidth * 0.4))
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = resultsWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [resultsWidth])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const delta = dragStartX.current - e.clientX
      const containerWidth = containerRef.current.offsetWidth
      const newResultsWidth = Math.min(
        containerWidth - MIN_FORM - 6,
        Math.max(MIN_RESULTS, dragStartWidth.current + delta)
      )
      const formWidth = containerWidth - newResultsWidth - 6
      if (formWidth >= MIN_FORM) {
        setResultsWidth(newResultsWidth)
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

  // File input refs
  const referenceInputRef = useRef<HTMLInputElement>(null)
  const garmentInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const updateModel = (id: string, updates: Partial<Model>) =>
    setModels(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))

  const toggleModel = (id: string) =>
    setModels(prev => prev.map(m => m.id === id ? { ...m, expanded: !m.expanded } : m))

  const addModel = () => {
    if (models.length >= 6) return
    const id = String(nextModelId.current++)
    setModels(prev => [...prev, makeModel(id)])
  }

  const removeModel = (id: string) => {
    if (models.length <= 1) return
    setModels(prev => prev.filter(m => m.id !== id))
  }

  const updateGarment = (modelId: string, garmentIdx: number, updates: Partial<Garment>) => {
    setModels(prev => prev.map(m => {
      if (m.id !== modelId) return m
      const garments = [...m.garments]
      garments[garmentIdx] = { ...garments[garmentIdx], ...updates }
      return { ...m, garments }
    }))
  }

  const handleGarmentFile = (modelId: string, garmentIdx: number, file: File) => {
    const preview = URL.createObjectURL(file)
    updateGarment(modelId, garmentIdx, { image: { file, preview } })
  }

  const removeGarment = (modelId: string, garmentIdx: number) => {
    setModels(prev => prev.map(m => {
      if (m.id !== modelId) return m
      const garments = [...m.garments]
      if (garments[garmentIdx].image) URL.revokeObjectURL(garments[garmentIdx].image!.preview)
      garments[garmentIdx] = { ...garments[garmentIdx], image: null }
      return { ...m, garments }
    }))
  }

  const handleReferenceFile = (file: File) => {
    if (referenceImage) URL.revokeObjectURL(referenceImage.preview)
    setReferenceImage({ file, preview: URL.createObjectURL(file) })
  }

  const handleBgColorChange = (hex: string) => {
    setBgColor(hex)
    setBgColorHex(hex.toUpperCase())
  }

  const handleBgHexInput = (val: string) => {
    setBgColorHex(val)
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setBgColor(val)
  }

  const handleDimensionPreset = (label: string) => {
    setDimensionPreset(label)
    const preset = DIMENSION_PRESETS.find(p => p.label === label)
    if (preset && preset.width) {
      setCustomWidth(preset.width)
      setCustomHeight(preset.height)
    } else {
      setCustomWidth('')
      setCustomHeight('')
    }
  }

  const totalGarments = models.reduce((sum, m) => sum + m.garments.filter(g => g.image).length, 0)

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (totalGarments === 0) return
    setSubmitting(true)

    const formData = new FormData()
    formData.append('Shot Type', shotType)
    formData.append('Model Position', modelPosition)
    formData.append('Output Width', customWidth)
    formData.append('Output Height', customHeight)
    formData.append('Scene Type', sceneType)
    formData.append('Background Color', sceneType === 'Studio' ? bgColor : '')
    formData.append('Scene Direction', sceneDirection)
    formData.append('Time Of Day', timeOfDay)
    formData.append('Season Theme', seasonTheme)
    formData.append('Lighting Preset', lightingPreset)
    formData.append('Lighting Instructions', lightingInstructions)
    formData.append('Scene Set', sceneSet)
    formData.append('Model Count', String(models.length))
    if (referenceImage) formData.append('Reference_Image', referenceImage.file)

    models.forEach((m, mi) => {
      const prefix = `Model_${mi + 1}`
      formData.append(`${prefix}_Age`, m.age)
      formData.append(`${prefix}_Sex`, m.sex)
      formData.append(`${prefix}_Race`, m.race)
      formData.append(`${prefix}_Hair_Color`, m.hairColor)
      formData.append(`${prefix}_Hair_Length`, m.hairLength)
      formData.append(`${prefix}_Body_Type`, m.bodyType)
      formData.append(`${prefix}_Personality`, m.personality)
      formData.append(`${prefix}_Pose`, m.poseDirection)
      m.garments.forEach((g, gi) => {
        if (g.image) {
          formData.append(`${prefix}_Garment_${gi + 1}`, g.image.file)
          formData.append(`${prefix}_Garment_${gi + 1}_Type`, g.type)
          formData.append(`${prefix}_Garment_${gi + 1}_Instructions`, g.instructions)
        }
      })
    })

    const jobId = Date.now().toString()
    setJobs(prev => [{
      id: jobId,
      models: models.length,
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

  // ─── Result actions ────────────────────────────────────────────────────────

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
    formData.append('Refine Instructions', image.refineText)
    formData.append('Original File ID', image.fileId)

    try {
      const response = await fetch(N8N_WEBHOOK, { method: 'POST', body: formData })
      if (response.ok) {
        const data = await response.json()
        const responseData = Array.isArray(data) ? data[0] : data
        const newImages: GeneratedImage[] = (responseData.images || []).map((img: GeneratedImage, i: number) => ({
          ...img,
          imageUrl: img.gcsUrl || img.imageUrl,
          fileId: img.gcsFileName || img.fileId || `image_${i}_${Date.now()}`,
          fileName: img.gcsFileName || img.fileName,
          status: 'pending' as const,
          showRefine: false,
          refineText: '',
        }))
        setResults(prev => [...newImages, ...prev])
        setResults(prev => prev.map(img => img.fileId === image.fileId ? { ...img, status: 'rejected', showRefine: false } : img))
      }
    } catch {
      // silent fail
    }

    setRefineSubmitting(null)
  }

  const activeResults = results.filter(img => img.status !== 'rejected')
  const approvedResults = results.filter(img => img.status === 'approved')

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.layout} ref={containerRef}>

      {/* ── Left: Form panel ── */}
      <div className={styles.formPanel}>

        <div className={styles.topbar}>
          <div>
            <div className={styles.title}>Studio &amp; Lifestyle shots</div>
            <div className={styles.subtitle}>AI-rendered models in studio or location scenes — up to 6 models per run</div>
          </div>
          <div className={styles.modelBadge}>
            <span className={styles.statusDot} />
            Gemini 3 Pro
          </div>
        </div>

        <div className={styles.body}>

          {/* Output */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Output</div>
            <div className={styles.twoCol} style={{ marginBottom: 10 }}>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Dimensions</div>
                <select value={dimensionPreset} onChange={e => handleDimensionPreset(e.target.value)}>
                  {DIMENSION_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                </select>
              </div>
              {dimensionPreset === 'Custom' && (
                <div className={styles.fieldGroup}>
                  <div className={styles.fieldLabel}>Custom size (px)</div>
                  <div className={styles.twoCol}>
                    <input type="number" placeholder="Width" value={customWidth} onChange={e => setCustomWidth(e.target.value)} />
                    <input type="number" placeholder="Height" value={customHeight} onChange={e => setCustomHeight(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <div className={styles.twoCol}>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Shot type</div>
                <select value={shotType} onChange={e => setShotType(e.target.value)}>
                  {SHOT_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Model position on canvas</div>
                <div className={styles.positionRow}>
                  {POSITION_OPTIONS.map(pos => (
                    <button
                      key={pos}
                      className={`${styles.positionBtn} ${modelPosition === pos ? styles.selected : ''}`}
                      onClick={() => setModelPosition(pos)}
                    >{pos}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className={styles.sectionDivider} />

          {/* Scene */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Scene</div>
            <div style={{ marginBottom: 10 }}>
              <div className={styles.toggleRow}>
                {(['Studio', 'Lifestyle'] as const).map(t => (
                  <button
                    key={t}
                    className={`${styles.toggleBtn} ${sceneType === t ? styles.selected : ''}`}
                    onClick={() => setSceneType(t)}
                  >{t}</button>
                ))}
              </div>
            </div>
            {sceneType === 'Studio' && (
              <div className={styles.fieldGroup} style={{ marginBottom: 10 }}>
                <div className={styles.fieldLabel}>Background color</div>
                <div className={styles.colorRow}>
                  <div className={styles.colorSwatch}>
                    <input type="color" value={bgColor} onChange={e => handleBgColorChange(e.target.value)} />
                  </div>
                  <input
                    className={styles.colorHex}
                    type="text"
                    value={bgColorHex}
                    onChange={e => handleBgHexInput(e.target.value)}
                    placeholder="#FFFFFF"
                    maxLength={7}
                  />
                </div>
              </div>
            )}
            <div className={styles.fieldGroup} style={{ marginBottom: 10 }}>
              <div className={styles.fieldLabel}>Scene &amp; shot direction</div>
              <textarea
                className={styles.textarea}
                placeholder="e.g. Models on beach with backs to the water, slightly blurred background, portrait mode"
                value={sceneDirection}
                onChange={e => setSceneDirection(e.target.value)}
                rows={3}
              />
            </div>
            <div className={styles.twoCol} style={{ marginBottom: 10 }}>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Time of day</div>
                <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}>
                  {TIME_OF_DAY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Season / theme <span className={styles.optional}>(optional)</span></div>
                <input
                  type="text"
                  placeholder="e.g. summer, 4th of July, Christmas"
                  value={seasonTheme}
                  onChange={e => setSeasonTheme(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>Reference image <span className={styles.optional}>(optional)</span></div>
              <input
                ref={referenceInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleReferenceFile(e.target.files[0])}
              />
              {referenceImage ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={referenceImage.preview} alt="Reference" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 5, border: '0.5px solid var(--border)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{referenceImage.file.name}</span>
                  <button onClick={() => { URL.revokeObjectURL(referenceImage.preview); setReferenceImage(null) }} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 14, cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <button className={styles.uploadEmpty} style={{ height: 40, borderRadius: 6, aspectRatio: 'unset' }} onClick={() => referenceInputRef.current?.click()}>
                  <span className={styles.uploadPlus}>+</span>
                  <span className={styles.uploadLabel}>Upload reference image</span>
                </button>
              )}
            </div>
          </section>

          <div className={styles.sectionDivider} />

          {/* Lighting */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Lighting</div>
            <div className={styles.fieldGroup} style={{ marginBottom: 10 }}>
              <div className={styles.fieldLabel}>Preset</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {LIGHTING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    className={`${styles.positionBtn} ${lightingPreset === opt ? styles.selected : ''}`}
                    onClick={() => setLightingPreset(opt)}
                    style={{ fontSize: 10 }}
                  >{opt}</button>
                ))}
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>Custom lighting instructions <span className={styles.optional}>(optional)</span></div>
              <input
                type="text"
                placeholder="e.g. Soft rim light from the left, warm fill"
                value={lightingInstructions}
                onChange={e => setLightingInstructions(e.target.value)}
              />
            </div>
          </section>

          <div className={styles.sectionDivider} />

          {/* Models */}
          <section className={styles.modelsSection}>
            <div className={styles.sectionLabel}>
              Models
              <span style={{ color: 'var(--accent)', fontSize: 10 }}>{models.length}/6</span>
            </div>

            {models.map((model, modelIdx) => (
              <div key={model.id} className={styles.modelCard}>
                <div className={styles.modelCardHeader} onClick={() => toggleModel(model.id)}>
                  <div className={styles.modelCardHeaderLeft}>
                    <div className={styles.modelCardNumber}>{modelIdx + 1}</div>
                    <div>
                      <div className={styles.modelCardTitle}>Model {modelIdx + 1}</div>
                      {!model.expanded && (
                        <div className={styles.modelCardSummary}>{modelSummary(model)}</div>
                      )}
                    </div>
                  </div>
                  <div className={`${styles.modelCardToggle} ${model.expanded ? styles.open : ''}`}>+</div>
                </div>

                {model.expanded && (
                  <div className={styles.modelCardBody}>
                    <div className={styles.threeCol}>
                      <div className={styles.fieldGroup}>
                        <div className={styles.fieldLabel}>Age</div>
                        <select value={model.age} onChange={e => updateModel(model.id, { age: e.target.value })}>
                          <option value="">Select</option>
                          {AGE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className={styles.fieldGroup}>
                        <div className={styles.fieldLabel}>Sex</div>
                        <select value={model.sex} onChange={e => updateModel(model.id, { sex: e.target.value })}>
                          <option value="">Select</option>
                          {SEX_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className={styles.fieldGroup}>
                        <div className={styles.fieldLabel}>Race</div>
                        <select value={model.race} onChange={e => updateModel(model.id, { race: e.target.value })}>
                          <option value="">Select</option>
                          {RACE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className={styles.threeCol}>
                      <div className={styles.fieldGroup}>
                        <div className={styles.fieldLabel}>Hair color</div>
                        <input type="text" placeholder="e.g. Blonde" value={model.hairColor} onChange={e => updateModel(model.id, { hairColor: e.target.value })} />
                      </div>
                      <div className={styles.fieldGroup}>
                        <div className={styles.fieldLabel}>Hair length</div>
                        <select value={model.hairLength} onChange={e => updateModel(model.id, { hairLength: e.target.value })}>
                          <option value="">Select</option>
                          {HAIR_LENGTH_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className={styles.fieldGroup}>
                        <div className={styles.fieldLabel}>Body type</div>
                        <input type="text" placeholder="e.g. Slim" value={model.bodyType} onChange={e => updateModel(model.id, { bodyType: e.target.value })} />
                      </div>
                    </div>

                    <div className={styles.twoCol}>
                      <div className={styles.fieldGroup}>
                        <div className={styles.fieldLabel}>Personality / pose</div>
                        <input type="text" value={model.personality} onChange={e => updateModel(model.id, { personality: e.target.value })} />
                      </div>
                      <div className={styles.fieldGroup}>
                        <div className={styles.fieldLabel}>Custom pose direction <span className={styles.optional}>(optional)</span></div>
                        <input type="text" placeholder="e.g. Hand on hips" value={model.poseDirection} onChange={e => updateModel(model.id, { poseDirection: e.target.value })} />
                      </div>
                    </div>

                    <div>
                      <div className={styles.fieldLabel} style={{ marginBottom: 6 }}>Garments</div>
                      <div className={styles.garmentGrid}>
                        {model.garments.map((garment, gi) => {
                          const refKey = `${model.id}-${gi}`
                          return (
                            <div key={gi} className={styles.garmentCell}>
                              <input
                                ref={el => { garmentInputRefs.current[refKey] = el }}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={e => e.target.files?.[0] && handleGarmentFile(model.id, gi, e.target.files[0])}
                              />
                              {garment.image ? (
                                <div className={styles.uploadFilled} onClick={() => removeGarment(model.id, gi)}>
                                  <img src={garment.image.preview} alt="" className={styles.uploadThumb} />
                                  <div className={styles.uploadOverlay}>
                                    <span className={styles.removeX}>✕</span>
                                  </div>
                                </div>
                              ) : (
                                <button className={styles.uploadEmpty} onClick={() => garmentInputRefs.current[refKey]?.click()}>
                                  <span className={styles.uploadPlus}>+</span>
                                  <span className={styles.uploadLabel}>G{gi + 1}</span>
                                </button>
                              )}
                              <select
                                className={styles.garmentTypeSelect}
                                value={garment.type}
                                onChange={e => updateGarment(model.id, gi, { type: e.target.value })}
                              >
                                <option value="">Type</option>
                                {GARMENT_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                              </select>
                              <textarea
                                className={styles.garmentInstructions}
                                placeholder="Instructions"
                                value={garment.instructions}
                                onChange={e => updateGarment(model.id, gi, { instructions: e.target.value })}
                                rows={2}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {models.length > 1 && (
                      <button className={styles.modelCardRemove} onClick={() => removeModel(model.id)}>
                        Remove model
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {models.length < 6 && (
              <button className={styles.addModelBtn} onClick={addModel}>+ Add model</button>
            )}
          </section>

          <div className={styles.sectionDivider} />

          {/* Scene Set + Submit */}
          <section className={styles.submitSection}>
            <div className={styles.fieldGroup} style={{ marginBottom: 14 }}>
              <div className={styles.sectionLabel}>Scene set <span className={styles.optional}>(optional)</span></div>
              <textarea
                className={styles.textarea}
                placeholder="e.g. Model 1 throwing a ball to Model 2"
                value={sceneSet}
                onChange={e => setSceneSet(e.target.value)}
                rows={2}
              />
            </div>

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={totalGarments === 0 || submitting}
            >
              {submitting ? (
                <><span className={styles.spinner} /> Generating...</>
              ) : (
                `Generate — ${models.length} model${models.length !== 1 ? 's' : ''}, ${totalGarments} garment${totalGarments !== 1 ? 's' : ''}`
              )}
            </button>

            {jobs.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className={styles.sectionLabel}>Recent jobs</div>
                {jobs.slice(0, 5).map(job => (
                  <div key={job.id} className={styles.jobCard}>
                    <div className={styles.jobTop}>
                      <span className={styles.jobName}>Studio &amp; Lifestyle — {job.models} model{job.models !== 1 ? 's' : ''}</span>
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
      <div className={styles.resizeDivider} onMouseDown={handleMouseDown}>
        <div className={styles.resizeHandle}>
          <span /><span /><span />
        </div>
      </div>

      {/* ── Right: Results panel ── */}
      <div
        className={styles.resultsPanel}
        style={{ width: resultsWidth || '40%', minWidth: MIN_RESULTS }}
      >
        <div className={styles.resultsPanelHeader}>
          <div className={styles.resultsPanelTitle}>Results</div>
          {approvedResults.length > 0 && (
            <span className={styles.approvedCount}>{approvedResults.length} approved</span>
          )}
        </div>

        {activeResults.length === 0 ? (
          <div className={styles.resultsEmpty}>
            <div className={styles.resultsEmptyIcon}>◫</div>
            <div className={styles.resultsEmptyText}>
              Results will appear here after you generate
            </div>
          </div>
        ) : (
          <div className={styles.resultsList}>
            {activeResults.map(image => (
              <div
                key={image.fileId}
                className={`${styles.resultCard} ${image.status === 'approved' ? styles.resultApproved : ''}`}
              >
                <div className={styles.resultImgWrap}>
                  <img src={image.imageUrl} alt={image.fileName} className={styles.resultImg} crossOrigin="anonymous" />
                  {image.status === 'approved' && (
                    <div className={styles.approvedBadge}>✓ Approved</div>
                  )}
                </div>
                <div className={styles.resultMeta}>
                  <div className={styles.resultFileName}>{image.fileName}</div>
                  <div className={styles.resultActions}>
                    {image.status === 'pending' && (
                      <>
                        <button className={styles.approveBtn} onClick={() => handleApprove(image.fileId)}>Approve</button>
                        <button className={styles.refineBtn} onClick={() => toggleRefine(image.fileId)}>Refine</button>
                        <button className={styles.rejectBtn} onClick={() => handleReject(image.fileId)}>Reject</button>
                      </>
                    )}
                    {image.status === 'approved' && (
                      <>
                        <a href={image.imageUrl} target="_blank" rel="noopener noreferrer" className={styles.downloadBtn}>Download</a>
                        <button className={styles.refineBtn} onClick={() => toggleRefine(image.fileId)}>Refine</button>
                      </>
                    )}
                  </div>
                  {image.showRefine && (
                    <div className={styles.refineBox}>
                      <textarea
                        className={styles.refineTextarea}
                        placeholder="Describe what to change..."
                        value={image.refineText || ''}
                        onChange={e => handleRefineTextChange(image.fileId, e.target.value)}
                        rows={2}
                      />
                      <button
                        className={styles.refineSubmitBtn}
                        onClick={() => handleRefineSubmit(image)}
                        disabled={!image.refineText || refineSubmitting === image.fileId}
                      >
                        {refineSubmitting === image.fileId ? (
                          <><span className={styles.spinner} /> Refining...</>
                        ) : 'Submit refinement'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
