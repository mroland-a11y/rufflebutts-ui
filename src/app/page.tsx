'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import FlatProductShot from '@/components/FlatProductShot'
import StudioLifestyle from '@/components/StudioLifestyle'
import GarmentSwap from '@/components/GarmentSwap'
import BackgroundEditor from '@/components/BackgroundEditor'
import RetouchEditing from '@/components/RetouchEditing'
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
        <div style={{ display: activeJob === 'flat_product_shot' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
          <FlatProductShot />
        </div>
        <div style={{ display: activeJob === 'studio_lifestyle' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
          <StudioLifestyle />
        </div>
        <div style={{ display: activeJob === 'garment_swap' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
          <GarmentSwap />
        </div>
        <div style={{ display: activeJob === 'background_editor' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
          <BackgroundEditor />
        </div>
        <div style={{ display: activeJob === 'retouch_editing' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
          <RetouchEditing />
        </div>
        {activeJob !== 'flat_product_shot' && activeJob !== 'studio_lifestyle' && activeJob !== 'garment_swap' && activeJob !== 'background_editor' && activeJob !== 'retouch_editing' && (
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
