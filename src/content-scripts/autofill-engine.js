import fieldMapping from '../lib/field-mapping.json'

const BUTTON_HOST_ID = 'sextant-autofill-root'

function sendMsg(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        if (chrome.runtime.lastError) resolve(null)
        else resolve(res)
      })
    } catch {
      resolve(null)
    }
  })
}

function normalize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function getFieldLabel(element) {
  // aria-label
  if (element.getAttribute('aria-label')) return element.getAttribute('aria-label')

  // <label for="id">
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
    if (label) return label.innerText || label.textContent
  }

  // parent label
  const parentLabel = element.closest('label')
  if (parentLabel) return parentLabel.innerText || parentLabel.textContent

  // fieldset legend (for radio/checkbox groups)
  const fieldset = element.closest('fieldset')
  if (fieldset) {
    const legend = fieldset.querySelector('legend')
    if (legend) return legend.innerText || legend.textContent
  }

  // placeholder, name, id as fallbacks
  return element.placeholder || element.name || element.id || ''
}

function findBestMatch(labelText) {
  const normalLabel = normalize(labelText)
  if (!normalLabel) return { key: null, confidence: 0 }

  let bestKey = null
  let bestScore = 0

  for (const [key, synonyms] of Object.entries(fieldMapping)) {
    for (const synonym of synonyms) {
      const normSyn = normalize(synonym)
      if (normalLabel.includes(normSyn) || normSyn.includes(normalLabel)) {
        const score = normSyn.length / Math.max(normalLabel.length, normSyn.length)
        if (score > bestScore) {
          bestScore = score
          bestKey = key
        }
      }
    }
  }

  return { key: bestKey, confidence: bestScore }
}

function getProfileValue(key, profile) {
  switch (key) {
    case 'firstName': return profile.personal?.firstName || ''
    case 'lastName': return profile.personal?.lastName || ''
    case 'email': return profile.personal?.email || ''
    case 'phone': return profile.personal?.phone || ''
    case 'location': return profile.personal?.location || ''
    case 'linkedinUrl': return profile.personal?.linkedinUrl || ''
    case 'workAuthorization': return profile.personal?.workAuthorization || ''
    case 'salaryExpectationMin': return String(profile.personal?.salaryExpectationMin || '')
    case 'summary': return profile.summary || ''
    case 'noticePeriod': return profile.commonAnswers?.noticePeriod || ''
    case 'whyThisCompany': return profile.commonAnswers?.whyThisCompany || ''
    case 'whyLeavingCurrentRole': return profile.commonAnswers?.whyLeavingCurrentRole || ''
    default: return ''
  }
}

function isEssayField(element) {
  return element.tagName === 'TEXTAREA' || (element.tagName === 'INPUT' && element.type === 'text' && !element.value)
}

function fillInput(element, value) {
  if (!value) return
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set

  if (element.tagName === 'TEXTAREA' && nativeTextareaSetter) {
    nativeTextareaSetter.call(element, value)
  } else if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value)
  } else {
    element.value = value
  }

  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function fillSelect(element, value) {
  const normVal = normalize(value)
  for (const opt of element.options) {
    if (normalize(opt.text).includes(normVal) || normVal.includes(normalize(opt.text))) {
      element.value = opt.value
      element.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }
  }
  return false
}

function markField(element, type) {
  // type: 'filled' | 'unfilled' | 'essay'
  const existingOverlay = element.parentElement?.querySelector('[data-sextant-mark]')
  if (existingOverlay) existingOverlay.remove()

  const colors = { filled: '#22c55e', unfilled: '#eab308', essay: '#3b82f6' }
  const icons = { filled: '✓', unfilled: '?', essay: '✎' }

  element.style.outline = `2px solid ${colors[type]}`
  element.style.outlineOffset = '2px'

  const mark = document.createElement('span')
  mark.setAttribute('data-sextant-mark', type)
  mark.style.cssText = `
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; border-radius: 50%;
    background: ${colors[type]}; color: #fff; font-size: 11px; font-weight: 700;
    position: absolute; top: -6px; right: -6px; z-index: 9999; pointer-events: none;
  `
  mark.textContent = icons[type]

  const wrapper = element.parentElement
  if (wrapper && getComputedStyle(wrapper).position === 'static') {
    wrapper.style.position = 'relative'
  }
  wrapper?.appendChild(mark)
}

async function addDraftButton(element, profile, jobDescription) {
  const existing = element.parentElement?.querySelector('[data-sextant-draft]')
  if (existing) return

  const btn = document.createElement('button')
  btn.setAttribute('data-sextant-draft', '1')
  btn.textContent = '✨ Draft with AI'
  btn.style.cssText = `
    display: inline-block; margin-top: 4px; padding: 4px 10px;
    background: #3b82f6; color: #fff; border: none; border-radius: 6px;
    font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit;
  `

  btn.addEventListener('click', async () => {
    const settingsRes = await sendMsg({ type: 'GET_SETTINGS' })
    const settings = settingsRes?.settings
    if (!settings?.apiKey || !settings?.aiEnabled) {
      btn.textContent = '⚠ Enable AI in Sextant Settings'
      setTimeout(() => { btn.textContent = '✨ Draft with AI' }, 3000)
      return
    }

    btn.textContent = 'Drafting…'
    btn.disabled = true

    const fieldLabel = getFieldLabel(element)
    const prompt = `You are helping a job applicant fill out an application form.

Field label: "${fieldLabel}"

Applicant's professional summary: ${profile.summary}

Job description context: ${jobDescription || 'Not available'}

Write a concise, professional response (2-4 sentences) for this specific field. Be direct and specific. Do not include generic filler. Return only the response text, no explanation.`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) throw new Error(`API error ${response.status}`)
      const data = await response.json()
      const draft = data.content?.[0]?.text || ''
      fillInput(element, draft)
      markField(element, 'filled')
      btn.textContent = '✓ Drafted'
    } catch (err) {
      btn.textContent = `⚠ Error: ${err.message}`
      setTimeout(() => { btn.textContent = '✨ Draft with AI'; btn.disabled = false }, 4000)
      return
    }
  })

  element.insertAdjacentElement('afterend', btn)
}

async function runAutofill() {
  const profileRes = await sendMsg({ type: 'GET_PROFILE' })
  const settingsRes = await sendMsg({ type: 'GET_SETTINGS' })
  if (!profileRes?.profile) return

  const profile = profileRes.profile
  const settings = settingsRes?.settings || {}

  // Try to get saved job description for AI drafting context
  const pipelineRes = await sendMsg({ type: 'GET_PIPELINE' })
  const pipeline = pipelineRes?.pipeline || []
  const currentJob = pipeline.find((j) => location.href.includes(j.url?.split('/').slice(0, 5).join('/')))
  const jobDescription = currentJob?.description || ''

  const inputs = document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=file]), textarea, select')

  inputs.forEach((el) => {
    if (!el.offsetParent && el.type !== 'hidden') return // skip invisible elements

    const label = getFieldLabel(el)
    const { key, confidence } = findBestMatch(label)

    if (el.tagName === 'SELECT') {
      if (key && confidence > 0.5) {
        const val = getProfileValue(key, profile)
        const filled = fillSelect(el, val)
        markField(el, filled ? 'filled' : 'unfilled')
      } else {
        markField(el, 'unfilled')
      }
      return
    }

    if (key && confidence > 0.6) {
      const val = getProfileValue(key, profile)
      if (val) {
        fillInput(el, val)
        markField(el, 'filled')
      } else {
        markField(el, 'unfilled')
        if (isEssayField(el) && settings.aiEnabled) {
          addDraftButton(el, profile, jobDescription)
        }
      }
    } else if (isEssayField(el)) {
      markField(el, 'essay')
      if (settings.aiEnabled && settings.apiKey) {
        addDraftButton(el, profile, jobDescription)
      }
    } else {
      markField(el, 'unfilled')
    }
  })
}

function injectFloatingButton() {
  if (document.getElementById(BUTTON_HOST_ID)) return

  const host = document.createElement('div')
  host.id = BUTTON_HOST_ID
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'closed' })
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      #fab {
        position: fixed; bottom: 80px; left: 20px; z-index: 2147483647;
        background: #1e3a5f; color: #fff; border: none; border-radius: 12px;
        padding: 10px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px; font-weight: 600; cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 6px;
        transition: background 0.15s, transform 0.1s;
      }
      #fab:hover { background: #2d5282; transform: translateY(-1px); }
      #fab:active { transform: translateY(0); }
    </style>
    <button id="fab">🧭 Fill Form</button>
  `

  shadow.getElementById('fab').addEventListener('click', runAutofill)
}

injectFloatingButton()
