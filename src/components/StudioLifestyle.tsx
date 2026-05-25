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
  if (referenceImage) formData.append('Scene_Reference', referenceImage.file)

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
    formData.append(`${prefix}_Shot_Direction`, m.shotDirection)
    if (m.referenceModel) formData.append(`${prefix}_Reference_Model`, m.referenceModel.file)
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
      const n8nJobId = responseData.jobId
      if (!n8nJobId) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error' } : j))
        setSubmitting(false)
        return
      }
      pollJobStatus(n8nJobId, jobId)
    } else {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error' } : j))
      setSubmitting(false)
    }
  } catch {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error' } : j))
    setSubmitting(false)
  }
}

const pollJobStatus = async (n8nJobId: string, uiJobId: string) => {
  const JOB_STATUS_WEBHOOK = process.env.NEXT_PUBLIC_N8N_JOB_STATUS_WEBHOOK || ''
  const MAX_POLLS = 120 // 10 minutes at 5s interval
  let polls = 0

  const poll = async () => {
    polls++
    try {
      const res = await fetch(`${JOB_STATUS_WEBHOOK}?jobId=${encodeURIComponent(n8nJobId)}`)
      if (res.ok) {
        const data = await res.json()
        const statusData = Array.isArray(data) ? data[0] : data
        if (statusData.status === 'done' && statusData.result_url) {
          const img: GeneratedImage = {
            fileId: n8nJobId,
            gcsUrl: statusData.result_url,
            gcsFileName: statusData.result_url.split('/').pop() || n8nJobId,
            imageUrl: statusData.result_url,
            fileName: statusData.result_url.split('/').pop() || n8nJobId,
            status: 'pending',
            showRefine: false,
            refineText: '',
          }
          setResults(prev => [img, ...prev])
          setJobs(prev => prev.map(j => j.id === uiJobId ? { ...j, status: 'done' } : j))
          setSubmitting(false)
          return
        }
        if (statusData.status === 'error') {
          setJobs(prev => prev.map(j => j.id === uiJobId ? { ...j, status: 'error' } : j))
          setSubmitting(false)
          return
        }
      }
    } catch { /* keep polling */ }

    if (polls >= MAX_POLLS) {
      setJobs(prev => prev.map(j => j.id === uiJobId ? { ...j, status: 'error' } : j))
      setSubmitting(false)
      return
    }
    setTimeout(poll, 5000)
  }

  setTimeout(poll, 5000)
}
