'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import FlatProductShot from '@/components/FlatProductShot'
import StudioLifestyle from '@/components/StudioLifestyle'
import GarmentSwap from '@/components/GarmentSwap'
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
        {/* All tabs rendered always — hidden with CSS to preserve state */}
        <div style={{ display: activeJob === 'flat_product_shot' ? 'contents' : 'none' }}>
          <FlatProductShot />
        </div>
        <div style={{ display: activeJob === 'studio_lifestyle' ? 'contents' : 'none' }}>
          <StudioLifestyle />
        </div>
        <div style={{ display: activeJob === 'garment_swap' ? 'contents' : 'none' }}>
          <GarmentSwap />
        </div>
        {activeJob !== 'flat_product_shot' && activeJob !== 'studio_lifestyle' && activeJob !== 'garment_swap' && (
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
