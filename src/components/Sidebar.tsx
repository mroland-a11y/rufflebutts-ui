'use client'
import styles from './Sidebar.module.css'

const jobTypes = [
  { id: 'flat_product_shot', label: 'Flat product shots', ready: true },
  { id: 'studio_lifestyle', label: 'Studio & Lifestyle', ready: true },
  { id: 'outfit_builder', label: 'Outfit builder', ready: false },
  { id: 'scene_background', label: 'Scene / background', ready: false },
  { id: 'campaign_assets', label: 'Campaign assets', ready: false },
  { id: 'detail_shots', label: 'Detail shots', ready: false },
  { id: 'retouch_editing', label: 'Retouch / editing', ready: false },
  { id: 'size_inclusivity', label: 'Size inclusivity', ready: false },
]

interface SidebarProps {
  activeJob: string
  onJobSelect: (id: string) => void
  onViewJobs: () => void
  jobCount: number
}

export default function Sidebar({ activeJob, onJobSelect, onViewJobs, jobCount }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoText}>RuffleButts</div>
        <div className={styles.logoSub}>Virtual Studio</div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navLabel}>New Job</div>
        {jobTypes.map(job => (
          <button
            key={job.id}
            className={`${styles.navItem} ${activeJob === job.id ? styles.active : ''} ${!job.ready ? styles.disabled : ''}`}
            onClick={() => job.ready && onJobSelect(job.id)}
          >
            <span className={styles.dot} />
            <span className={styles.navText}>{job.label}</span>
            {!job.ready && <span className={styles.soon}>Soon</span>}
          </button>
        ))}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.navLabel}>History</div>
        <button className={styles.navItem} onClick={onViewJobs}>
          <span className={styles.dot} />
          <span className={styles.navText}>All jobs</span>
          {jobCount > 0 && <span className={styles.badge}>{jobCount}</span>}
        </button>
      </div>
    </aside>
  )
}
