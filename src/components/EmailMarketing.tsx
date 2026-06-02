'use client'
import styles from './EmailMarketing.module.css'

export default function EmailMarketing() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Email Campaign</h1>
          <p className={styles.subtitle}>Build campaign copy and visual mockups for your email team</p>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.comingSoon}>
          <div className={styles.comingSoonIcon}>✉</div>
          <div className={styles.comingSoonTitle}>Email Campaign Builder</div>
          <div className={styles.comingSoonText}>Upload a template reference, select approved assets, and generate copy — coming soon.</div>
        </div>
      </div>
    </div>
  )
}
