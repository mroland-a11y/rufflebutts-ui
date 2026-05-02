'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import FlatProductShot from '@/components/FlatProductShot'
import StudioLifestyle from '@/components/StudioLifestyle'
import styles from './page.module.css'

export default function Home() {
  const [activeJob, setActiveJob] = useState('flat_product_shot')
  const [jobCount, setJobCount] = useState(0)

  return (
    <div className={styles.app}>
      <Sidebar
        activeJob={activeJob}
        onJobSelect={setActiveJob}
        onViewJobs={() => {}}
        jobCount={jobCount}
      />
      <main className={styles.main}>
        {activeJob === 'flat_product_shot' && <FlatProductShot />}
        {activeJob === 'studio_lifestyle' && <StudioLifestyle />}
        {activeJob !== 'flat_product_shot' && activeJob !== 'studio_lifestyle' && (
          <div className={styles.comingSoon}>
            <div className={styles.comingSoonIcon}>◫</div>
            <div className={styles.comingSoonTitle}>Coming soon</div>
            <div className={styles.comingSoonText}>This workflow is being built. Check back soon.</div>
          </div>
        )}
      </main>
    </div>
  )
}
