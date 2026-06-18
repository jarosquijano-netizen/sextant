import {
  getProfile, putProfile, saveJob, getJobs, patchJob,
  getStats, generateCoverLetter, draftAnswer, bulletSuggestions,
  getInsights, refreshInsights, exportData, importData,
  getApiConfig, setApiConfig,
} from '../lib/api.js'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((err) => sendResponse({ error: err.message }))
  return true
})

async function handleMessage(msg) {
  switch (msg.type) {
    case 'GET_PROFILE':        return { profile: await getProfile() }
    case 'PUT_PROFILE':        return { profile: await putProfile(msg.profile) }
    case 'SAVE_JOB':           return { job: await saveJob(msg.job) }
    case 'GET_JOBS':           return { jobs: await getJobs(msg.status) }
    case 'PATCH_JOB':          return { job: await patchJob(msg.id, msg.updates) }
    case 'GET_STATS':          return { stats: await getStats() }
    case 'COVER_LETTER':       return generateCoverLetter(msg.jobId)
    case 'DRAFT_ANSWER':       return draftAnswer(msg.payload)
    case 'BULLET_SUGGESTIONS': return bulletSuggestions(msg.payload)
    case 'GET_INSIGHTS':       return getInsights()
    case 'REFRESH_INSIGHTS':   return refreshInsights()
    case 'EXPORT':             return exportData()
    case 'IMPORT':             return importData(msg.dump)
    case 'GET_API_CONFIG':     return { config: await getApiConfig() }
    case 'SET_API_CONFIG':     await setApiConfig(msg.config); return { success: true }
    default:                   return { error: 'Unknown message type' }
  }
}
