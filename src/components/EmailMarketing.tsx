'use client'
import { useState, useRef } from 'react'
import styles from './EmailMarketing.module.css'

const N8N_EMAIL_WEBHOOK = process.env.NEXT_PUBLIC_N8N_EMAIL_WEBHOOK || ''
const N8N_COPY_IMPROVER = 'https://rufflebutts.app.n8n.cloud/webhook/copy-improver'

interface CopyField {
  id: string
  value: string
  improved: string
  improving: boolean
}

function makeCopyField(id: string): CopyField {
  return { id, value: '', improved: '', improving: false }
}

async function fetchImprovement(fieldLabel: string, currentValue: string, campaignBrief: string): Promise<string> {
  const res = await fetch(N8N_COPY_IMPROVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field_label: fieldLabel,
      current_copy: currentValue,
      campaign_brief: campaignBrief,
    })
  })
  const data = await res.json()
  return data.improved_copy?.trim() || ''
}

// ── CopyRow moved OUTSIDE the component to fix focus loss on re-render ──
interface CopyRowProps {
  label: string
  field: CopyField
  placeholder: string
  optional?: boolean
  onImprove: () => void
  onChange: (value: string) => void
  onUse: () => void
  onDismiss: () => void
}

function CopyRow({ label, field, placeholder, optional, onImprove, onChange, onUse, onDismiss }: CopyRowProps) {
  return (
    <div className={styles.copyRow}>
      <div className={styles.copyRowTop}>
        <span className={styles.copyLabel}>
          {label}
          {optional && <span className={styles.optional}> (optional)</span>}
        </span>
        <button
          className={styles.improveBtn}
          disabled={!field.value.trim() || field.improving}
          onClick={onImprove}
        >
          {field.improving ? <span className={styles.spinnerSm} /> : '✦'}
          {field.improving ? 'Improving…' : 'Improve with AI'}
        </button>
      </div>
      <input
        className={styles.input}
        placeholder={placeholder}
        value={field.value}
        onChange={e => onChange(e.target.value)}
      />
      {field.improved && (
        <div className={styles.suggestion}>
          <span className={styles.suggestionLabel}>AI suggestion</span>
          <div className={styles.suggestionText}>{field.improved}</div>
          <div className={styles.suggestionActions}>
            <button className={styles.useBtn} onClick={onUse}>Use this</button>
            <button className={styles.dismissBtn} onClick={onDismiss}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmailMarketing() {
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [templatePreview, setTemplatePreview] = useState<string | null>(null)
  const [campaignBrief, setCampaignBrief] = useState('')

  const [subjectLine, setSubjectLine] = useState<CopyField>(makeCopyField('subject'))
  const [previewText, setPreviewText] = useState<CopyField>(makeCopyField('preview'))
  const [headline, setHeadline] = useState<CopyField>(makeCopyField('headline'))
  const [subheadline, setSubheadline] = useState<CopyField>(makeCopyField('subheadline'))

  const [callouts, setCallouts] = useState<CopyField[]>([makeCopyField('callout_0')])
  const [ctas, setCtas] = useState<CopyField[]>([makeCopyField('cta_0')])

  const [submitting, setSubmitting] = useState(false)
  const [mockupUrl, setMockupUrl] = useState<string | null>(null)

  const templateInputRef = useRef<HTMLInputElement>(null)

  // ── Template upload ──────────────────────────────────────────────
  const handleTemplateSelect = (file: File) => {
    setTemplateFile(file)
    setTemplatePreview(URL.createObjectURL(file))
  }

  const removeTemplate = () => {
    if (templatePreview) URL.revokeObjectURL(templatePreview)
    setTemplateFile(null)
    setTemplatePreview(null)
  }

  // ── Single field improve ─────────────────────────────────────────
  const improveField = async (
    label: string,
    field: CopyField,
    setter: React.Dispatch<React.SetStateAction<CopyField>>
  ) => {
    if (!field.value.trim()) return
    setter(prev => ({ ...prev, improving: true, improved: '' }))
    try {
      const improved = await fetchImprovement(label, field.value, campaignBrief)
      setter(prev => ({ ...prev, improving: false, improved }))
    } catch {
      setter(prev => ({ ...prev, improving: false }))
    }
  }

  // ── Callout helpers ──────────────────────────────────────────────
  const addCallout = () => {
    if (callouts.length >= 4) return
    setCallouts(prev => [...prev, makeCopyField(`callout_${Date.now()}`)])
  }
  const removeCallout = (id: string) => setCallouts(prev => prev.filter(c => c.id !== id))
  const updateCallout = (id: string, value: string) =>
    setCallouts(prev => prev.map(c => c.id === id ? { ...c, value, improved: '' } : c))
  const dismissCallout = (id: string) =>
    setCallouts(prev => prev.map(c => c.id === id ? { ...c, improved: '' } : c))
  const useCalloutSuggestion = (id: string) =>
    setCallouts(prev => prev.map(c => c.id === id ? { ...c, value: c.improved, improved: '' } : c))
  const improveCallout = async (id: string) => {
    const c = callouts.find(x => x.id === id)
    if (!c || !c.value.trim()) return
    setCallouts(prev => prev.map(x => x.id === id ? { ...x, improving: true, improved: '' } : x))
    try {
      const improved = await fetchImprovement('Callout', c.value, campaignBrief)
      setCallouts(prev => prev.map(x => x.id === id ? { ...x, improving: false, improved } : x))
    } catch {
      setCallouts(prev => prev.map(x => x.id === id ? { ...x, improving: false } : x))
    }
  }

  // ── CTA helpers ──────────────────────────────────────────────────
  const addCta = () => {
    if (ctas.length >= 4) return
    setCtas(prev => [...prev, makeCopyField(`cta_${Date.now()}`)])
  }
  const removeCta = (id: string) => setCtas(prev => prev.filter(c => c.id !== id))
  const updateCta = (id: string, value: string) =>
    setCtas(prev => prev.map(c => c.id === id ? { ...c, value, improved: '' } : c))
  const dismissCta = (id: string) =>
    setCtas(prev => prev.map(c => c.id === id ? { ...c, improved: '' } : c))
  const useCtaSuggestion = (id: string) =>
    setCtas(prev => prev.map(c => c.id === id ? { ...c, value: c.improved, improved: '' } : c))
  const improveCta = async (id: string) => {
    const c = ctas.find(x => x.id === id)
    if (!c || !c.value.trim()) return
    setCtas(prev => prev.map(x => x.id === id ? { ...x, improving: true, improved: '' } : x))
    try {
      const improved = await fetchImprovement('CTA Button', c.value, campaignBrief)
      setCtas(prev => prev.map(x => x.id === id ? { ...x, improving: false, improved } : x))
    } catch {
      setCtas(prev => prev.map(x => x.id === id ? { ...x, improving: false } : x))
    }
  }

  // ── Submit ───────────────────────────────────────────────────────
  const canSubmit = !!templateFile && campaignBrief.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit || !templateFile) return
    setSubmitting(true)
    setMockupUrl(null)
    const formData = new FormData()
    formData.append('Template_Image', templateFile)
    formData.append('Campaign_Brief', campaignBrief)
    formData.append('Subject_Line', subjectLine.improved || subjectLine.value)
    formData.append('Preview_Text', previewText.improved || previewText.value)
    formData.append('Headline', headline.improved || headline.value)
    formData.append('Subheadline', subheadline.improved || subheadline.value)
    formData.append('Callouts', JSON.stringify(callouts.map(c => c.improved || c.value)))
    formData.append('CTAs', JSON.stringify(ctas.map(c => c.improved || c.value)))
    try {
      const res = await fetch(N8N_EMAIL_WEBHOOK, { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        const d = Array.isArray(data) ? data[0] : data
        setMockupUrl(d.mockupUrl || d.imageUrl || null)
      }
    } catch { /* silent fail */ }
    setSubmitting(false)
  }

  return (
    <div className={styles.layout}>
      {/* ── Form Panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.title}>Email Campaign</div>
            <div className={styles.subtitle}>Build campaign copy and a visual mockup for your Attentive team</div>
          </div>
          <div className={styles.modelBadge}>
            <span className={styles.statusDot} />
            Gemini
          </div>
        </div>

        <div className={styles.body}>

          {/* Template upload */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Template reference</div>
            <input
              ref={templateInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleTemplateSelect(e.target.files[0])}
            />
            {templatePreview ? (
              <div className={styles.templateUploaded}>
                <img src={templatePreview} alt="Template" className={styles.templateThumb} />
                <div className={styles.templateInfo}>
                  <span className={styles.templateName}>{templateFile?.name}</span>
                  <button className={styles.templateRemove} onClick={removeTemplate}>Remove</button>
                </div>
              </div>
            ) : (
              <button className={styles.templateUpload} onClick={() => templateInputRef.current?.click()}>
                <span className={styles.uploadPlus}>+</span>
                <span className={styles.uploadLabel}>Upload a previous email screenshot</span>
                <span className={styles.uploadHint}>PNG, JPG — used as layout reference</span>
              </button>
            )}
          </section>

          {/* Campaign brief */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Campaign brief</div>
            <input
              className={styles.input}
              placeholder='e.g. "25% off Girls Swim" or "New Family Matching Drop"'
              value={campaignBrief}
              onChange={e => setCampaignBrief(e.target.value)}
            />
          </section>

          {/* Copy fields */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Email copy</div>
            <CopyRow
              label="Subject line"
              field={subjectLine}
              placeholder='e.g. "25% off swim — today only ☀️"'
              onImprove={() => improveField('Subject line', subjectLine, setSubjectLine)}
              onChange={v => setSubjectLine(prev => ({ ...prev, value: v, improved: '' }))}
              onUse={() => setSubjectLine(prev => ({ ...prev, value: prev.improved, improved: '' }))}
              onDismiss={() => setSubjectLine(prev => ({ ...prev, improved: '' }))}
            />
            <CopyRow
              label="Preview text"
              field={previewText}
              placeholder="e.g. Shop the swim styles she'll wear all summer"
              optional
              onImprove={() => improveField('Preview text', previewText, setPreviewText)}
              onChange={v => setPreviewText(prev => ({ ...prev, value: v, improved: '' }))}
              onUse={() => setPreviewText(prev => ({ ...prev, value: prev.improved, improved: '' }))}
              onDismiss={() => setPreviewText(prev => ({ ...prev, improved: '' }))}
            />
            <CopyRow
              label="Headline"
              field={headline}
              placeholder='e.g. "Summer Swim Is Here"'
              onImprove={() => improveField('Headline', headline, setHeadline)}
              onChange={v => setHeadline(prev => ({ ...prev, value: v, improved: '' }))}
              onUse={() => setHeadline(prev => ({ ...prev, value: prev.improved, improved: '' }))}
              onDismiss={() => setHeadline(prev => ({ ...prev, improved: '' }))}
            />
            <CopyRow
              label="Subheadline"
              field={subheadline}
              placeholder='e.g. "UPF 50+ styles for every splash"'
              optional
              onImprove={() => improveField('Subheadline', subheadline, setSubheadline)}
              onChange={v => setSubheadline(prev => ({ ...prev, value: v, improved: '' }))}
              onUse={() => setSubheadline(prev => ({ ...prev, value: prev.improved, improved: '' }))}
              onDismiss={() => setSubheadline(prev => ({ ...prev, improved: '' }))}
            />
          </section>

          {/* Callouts */}
          <section className={styles.section}>
            <div className={styles.sectionLabelRow}>
              <span className={styles.sectionLabel} style={{ margin: 0 }}>Callouts</span>
              {callouts.length < 4 && <button className={styles.addBtn} onClick={addCallout}>+ Add callout</button>}
            </div>
            <div className={styles.dynamicFields}>
              {callouts.map((c, i) => (
                <div key={c.id} className={styles.dynamicField}>
                  <div className={styles.dynamicFieldTop}>
                    <span className={styles.copyLabel}>Callout {i + 1}</span>
                    <div className={styles.dynamicActions}>
                      <button className={styles.improveBtn} disabled={!c.value.trim() || c.improving} onClick={() => improveCallout(c.id)}>
                        {c.improving ? <span className={styles.spinnerSm} /> : '✦'}
                        {c.improving ? 'Improving…' : 'Improve with AI'}
                      </button>
                      {callouts.length > 1 && <button className={styles.removeBtn} onClick={() => removeCallout(c.id)}>✕</button>}
                    </div>
                  </div>
                  <input className={styles.input} placeholder='e.g. "UPF 50+" or "Family Matching"' value={c.value} onChange={e => updateCallout(c.id, e.target.value)} />
                  {c.improved && (
                    <div className={styles.suggestion}>
                      <span className={styles.suggestionLabel}>AI suggestion</span>
                      <div className={styles.suggestionText}>{c.improved}</div>
                      <div className={styles.suggestionActions}>
                        <button className={styles.useBtn} onClick={() => useCalloutSuggestion(c.id)}>Use this</button>
                        <button className={styles.dismissBtn} onClick={() => dismissCallout(c.id)}>Dismiss</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* CTAs */}
          <section className={styles.section}>
            <div className={styles.sectionLabelRow}>
              <span className={styles.sectionLabel} style={{ margin: 0 }}>CTA buttons</span>
              {ctas.length < 4 && <button className={styles.addBtn} onClick={addCta}>+ Add CTA</button>}
            </div>
            <div className={styles.dynamicFields}>
              {ctas.map((c, i) => (
                <div key={c.id} className={styles.dynamicField}>
                  <div className={styles.dynamicFieldTop}>
                    <span className={styles.copyLabel}>CTA {i + 1}</span>
                    <div className={styles.dynamicActions}>
                      <button className={styles.improveBtn} disabled={!c.value.trim() || c.improving} onClick={() => improveCta(c.id)}>
                        {c.improving ? <span className={styles.spinnerSm} /> : '✦'}
                        {c.improving ? 'Improving…' : 'Improve with AI'}
                      </button>
                      {ctas.length > 1 && <button className={styles.removeBtn} onClick={() => removeCta(c.id)}>✕</button>}
                    </div>
                  </div>
                  <input className={styles.input} placeholder='e.g. "Shop Girls" or "Shop Now"' value={c.value} onChange={e => updateCta(c.id, e.target.value)} />
                  {c.improved && (
                    <div className={styles.suggestion}>
                      <span className={styles.suggestionLabel}>AI suggestion</span>
                      <div className={styles.suggestionText}>{c.improved}</div>
                      <div className={styles.suggestionActions}>
                        <button className={styles.useBtn} onClick={() => useCtaSuggestion(c.id)}>Use this</button>
                        <button className={styles.dismissBtn} onClick={() => dismissCta(c.id)}>Dismiss</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Submit */}
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <><span className={styles.spinner} /> Generating mockup…</> : 'Generate email mockup'}
          </button>
        </div>
      </div>

      {/* ── Output Panel ── */}
      <div className={styles.outputPanel}>
        <div className={styles.outputHeader}>Output</div>
        {mockupUrl ? (
          <div className={styles.mockupWrap}>
            <img src={mockupUrl} alt="Email mockup" className={styles.mockupImg} />
            <a href={mockupUrl} download className={styles.downloadBtn}>Download mockup</a>
          </div>
        ) : (
          <div className={styles.outputEmpty}>
            <div className={styles.outputEmptyIcon}>✉</div>
            <div className={styles.outputEmptyTitle}>Mockup will appear here</div>
            <div className={styles.outputEmptyText}>Upload a template, fill in your copy, and generate</div>
          </div>
        )}
      </div>
    </div>
  )
}
