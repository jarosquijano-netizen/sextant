import { getProfile, setProfile, getPipeline, addToPipeline, updatePipelineJob, getSettings, setSettings } from '../lib/storage.js'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((err) => sendResponse({ error: err.message }))
  return true // keep channel open for async response
})

async function handleMessage(message) {
  switch (message.type) {
    case 'GET_PROFILE':
      return { profile: await getProfile() }
    case 'SET_PROFILE':
      await setProfile(message.profile)
      return { success: true }
    case 'GET_PIPELINE':
      return { pipeline: await getPipeline() }
    case 'SAVE_JOB':
      return { job: await addToPipeline(message.job) }
    case 'UPDATE_JOB':
      return { success: await updatePipelineJob(message.id, message.updates) }
    case 'GET_SETTINGS':
      return { settings: await getSettings() }
    case 'SET_SETTINGS':
      await setSettings(message.settings)
      return { success: true }
    default:
      return { error: 'Unknown message type' }
  }
}
