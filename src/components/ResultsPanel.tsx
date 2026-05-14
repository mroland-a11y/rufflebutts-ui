'use client'
import { useState } from 'react'
import styles from './ResultsPanel.module.css'

export interface ResultImage {
  fileId: string
  imageUrl: string
  fileName: string
  status: 'pending' | 'approved' | 'rejected'
  refineText?: string
  showRefine?: boolean
  [key: string]: unknown
}

interface ResultsPanelProps {
  results: ResultImage[]
  refineSubmitting: string | null
  onApprove: (fileId: string) => void
  onReject: (fileId: string) => void
  onToggleRefine: (fileId: string) => void
  onRefineTextChange: (fileId: string, text: string) => void
  onRefineSubmit: (image: ResultImage) => Promise<void>
  onClearAll: () => void
  onAddResults: (images: ResultImage[]) => void
}

export default function ResultsPanel({
  results,
  refineSubmitting: externalRefineSubmitting,
  onApprove,
  onReject,
  onToggleRefine,
  onRefineTextChange,
  onRefineSubmit,
  onClearAll,
  onAddResults,
}: ResultsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [localRefineSubmitting, setLocalRefineSubmitting] = useState<string | null>(null)
  const [refineJobs, setRefineJobs] = useState<{ id: string; time: string; status: 'processing' | 'done' | 'error' }[]>([])

  const refineSubmitting = localRefineSubmitting || externalRefineSubmitting

  const activeResults = results.filter(img => img.status !== 'rejected')
  const approvedCount = results.filter(img => img.status === 'approved').length

  const isExpanded = (image: ResultImage, index: number) => {
    if (expandedId === image.fileId) return true
    if (expandedId === null && index === 0) return true
    return false
  }

  const handleToggle = (image: ResultImage, index: number) => {
    if (isExpanded(image, index)) {
      setExpandedId('__none__')
    } else {
      setExpandedId(image.fileId)
    }
  }

  const handleReject = (fileId: string) => {
    onReject(fileId)
    if (expandedId === fileId) setExpandedId(null)
  }

  const handleRefineSubmit = async (image: ResultImage) => {
    if (!image.refineText) return
    const jobId = `refine_${Date.now()}`
    setRefineJobs(prev => [{
      id: jobId,
      status: 'processing',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }, ...prev])
    setLocalRefineSubmitting(image.fileId)
    try {
      await onRefineSubmit(image)
      setRefineJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'done' } : j))
    } catch {
      setRefineJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error' } : j))
    }
    setLocalRefineSubmitting(null)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>Results</div>
        <div className={styles.headerRight}>
          {approvedCount > 0 && (
            <span className={styles.approvedCount}>{approvedCount} approved</span>
          )}
          {activeResults.length > 0 && (
            <button className={styles.clearBtn} onClick={onClearAll}>Clear all</button>
          )}
        </div>
      </div>

      {refineJobs.length > 0 && (
        <div className={styles.refineJobsList}>
          {refineJobs.slice(0, 3).map(job => (
            <div key={job.id} className={styles.refineJobCard}>
              <div className={styles.refineJobLeft}>
                {job.status === 'processing' && <span className={styles.spinner} />}
                {job.status === 'done' && <span className={styles.refineJobDot} style={{ background: 'var(--success)' }} />}
                {job.status === 'error' && <span className={styles.refineJobDot} style={{ background: 'var(--danger)' }} />}
                <span className={styles.refineJobName}>
                  {job.status === 'processing' ? 'Refining image...' : job.status === 'done' ? 'Refinement complete' : 'Refinement failed'}
                </span>
              </div>
              <span className={styles.refineJobTime}>{job.time}</span>
            </div>
          ))}
        </div>
      )}

      {activeResults.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◫</div>
          <div className={styles.emptyText}>Results will appear here after you generate</div>
        </div>
      ) : (
        <div className={styles.list}>
          {activeResults.map((image, index) => {
            const expanded = isExpanded(image, index)
            return (
              <div
                key={image.fileId}
                className={`${styles.card} ${image.status === 'approved' ? styles.cardApproved : ''}`}
              >
                {!expanded ? (
                  <div className={styles.collapsedRow} onClick={() => handleToggle(image, index)}>
                    <img src={image.imageUrl} alt="" className={styles.thumb} crossOrigin="anonymous" />
                    <div className={styles.collapsedMeta}>
                      <div className={styles.collapsedName}>{image.fileName}</div>
                      <div className={styles.collapsedStatus}>
                        {image.status === 'approved' ? '✓ Approved' : 'Tap to expand'}
                      </div>
                    </div>
                    <span className={styles.expandChevron}>›</span>
                  </div>
                ) : (
                  <>
                    <div className={styles.imgWrap}>
                      <img
                        src={image.imageUrl}
                        alt={image.fileName}
                        className={styles.img}
                        crossOrigin="anonymous"
                      />
                      {image.status === 'approved' && (
                        <div className={styles.approvedBadge}>✓ Approved</div>
                      )}
                      <button className={styles.collapseBtn} onClick={() => handleToggle(image, index)}>
                        ↑ Collapse
                      </button>
                    </div>
                    <div className={styles.meta}>
                      <div className={styles.fileName}>{image.fileName}</div>
                      <div className={styles.actions}>
                        {image.status === 'pending' && (
                          <>
                            <button className={styles.approveBtn} onClick={() => onApprove(image.fileId)}>Approve</button>
                            <button className={styles.refineBtn} onClick={() => onToggleRefine(image.fileId)}>Refine</button>
                            <button className={styles.rejectBtn} onClick={() => handleReject(image.fileId)}>Reject</button>
                          </>
                        )}
                        {image.status === 'approved' && (
                          <>
                            <a href={image.imageUrl} target="_blank" rel="noopener noreferrer" className={styles.downloadBtn}>Download</a>
                            <button className={styles.refineBtn} onClick={() => onToggleRefine(image.fileId)}>Refine</button>
                          </>
                        )}
                      </div>
                      {image.showRefine && (
                        <div className={styles.refineBox}>
                          <textarea
                            className={styles.refineTextarea}
                            placeholder="Describe what to change..."
                            value={image.refineText as string || ''}
                            onChange={e => onRefineTextChange(image.fileId, e.target.value)}
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
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
