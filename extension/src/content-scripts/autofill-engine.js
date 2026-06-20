import fieldMapping from '../lib/field-mapping.json'

const BUTTON_HOST_ID = 'sextant-autofill-root'
let cachedProfile = null

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

function getAllLabels(el) {
  const candidates = []

  // Most specific first: aria-label, placeholder, name attr
  if (el.getAttribute('aria-label')) candidates.push(el.getAttribute('aria-label'))
  if (el.getAttribute('placeholder')) candidates.push(el.getAttribute('placeholder'))
  if (el.getAttribute('name')) candidates.push(el.getAttribute('name'))

  // Explicit label[for=id]
  if (el.id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    if (lbl) {
      const clone = lbl.cloneNode(true)
      clone.querySelectorAll('input,select,textarea,span[aria-hidden]').forEach(n => n.remove())
      const txt = (clone.innerText || clone.textContent).trim()
      if (txt) candidates.push(txt)
    }
  }

  // Parent label (strip child input text)
  const parentLabel = el.closest('label')
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true)
    clone.querySelectorAll('input,select,textarea').forEach(n => n.remove())
    const txt = (clone.innerText || clone.textContent).trim()
    if (txt) candidates.push(txt)
  }

  // Walk up looking for a sibling/ancestor label or legend
  let node = el.parentElement
  for (let i = 0; i < 5 && node; i++, node = node.parentElement) {
    const legend = node.querySelector('legend')
    if (legend) { candidates.push((legend.innerText || legend.textContent).trim()); break }
    // label that is a sibling (not containing the input)
    const sibling = node.querySelector('label')
    if (sibling && !sibling.contains(el)) {
      candidates.push((sibling.innerText || sibling.textContent).trim())
      break
    }
  }

  return candidates.filter(Boolean)
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
        if (score > bestScore) { bestScore = score; bestKey = key }
      }
    }
  }
  return { key: bestKey, confidence: bestScore }
}

function getFieldLabel(el) {
  // Try all label sources, return the one that gives the best field match
  const candidates = getAllLabels(el)
  if (!candidates.length) return ''

  let bestLabel = candidates[0]
  let bestScore = 0

  for (const label of candidates) {
    const { confidence } = findBestMatch(label)
    if (confidence > bestScore) {
      bestScore = confidence
      bestLabel = label
    }
  }
  return bestLabel
}

function getProfileValue(key, profile) {
  const p = profile.personal || {}
  switch (key) {
    case 'firstName':         return p.firstName || ''
    case 'lastName':          return p.lastName || ''
    case 'fullName':          return `${p.firstName || ''} ${p.lastName || ''}`.trim() || ''
    case 'email':             return p.email || ''
    case 'phone':             return p.phone || ''
    case 'location':          return p.location || ''
    case 'country': {
      const loc = p.location || ''
      const parts = loc.split(',')
      return parts.length > 1 ? parts[parts.length - 1].trim() : loc
    }
    case 'linkedinUrl':       return p.linkedinUrl || ''
    case 'websiteUrl':        return p.websiteUrl || ''
    case 'githubUrl':         return p.githubUrl || ''
    case 'currentTitle': {
      const exp = (profile.experience || [])[0]
      return exp?.title || ''
    }
    case 'currentCompany': {
      const exp = (profile.experience || [])[0]
      return exp?.company || ''
    }
    case 'yearsExperience':   return '19'
    case 'workAuthorization': return p.workAuthorization || 'Yes'
    case 'salaryExpectation': return p.salaryExpectationMin ? String(p.salaryExpectationMin) : ''
    case 'noticePeriod':      return p.noticePeriod || ''
    case 'summary':           return profile.summary || ''
    case 'whyThisCompany':    return ''
    case 'whyLeavingCurrentRole': return ''
    default:                  return ''
  }
}

function isEssayField(el) {
  return el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === ''))
}

function fillInput(el, value) {
  if (!value) return false
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new Event('blur', { bubbles: true }))
  return true
}

function fillSelect(el, value) {
  const normVal = normalize(value)
  for (const opt of el.options) {
    if (normalize(opt.text).includes(normVal) || normVal.includes(normalize(opt.text))) {
      el.value = opt.value
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }
  }
  return false
}

function markField(el, type) {
  el.parentElement?.querySelector('[data-sextant-mark]')?.remove()
  const colors = { filled: '#22c55e', unfilled: '#eab308', essay: '#3b82f6' }
  const icons  = { filled: '✓', unfilled: '?', essay: '✎' }
  el.style.outline = `2px solid ${colors[type]}`
  el.style.outlineOffset = '2px'
  const mark = document.createElement('span')
  mark.setAttribute('data-sextant-mark', type)
  mark.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;
    width:18px;height:18px;border-radius:50%;
    background:${colors[type]};color:#fff;font-size:11px;font-weight:700;
    position:absolute;top:-6px;right:-6px;z-index:9999;pointer-events:none;
  `
  mark.textContent = icons[type]
  const wrapper = el.parentElement
  if (wrapper && getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative'
  wrapper?.appendChild(mark)
}

async function addDraftButton(el, profile, jobDescription, jobId) {
  if (el.parentElement?.querySelector('[data-sextant-draft]')) return
  const btn = document.createElement('button')
  btn.setAttribute('data-sextant-draft', '1')
  btn.textContent = '✨ Draft with AI'
  btn.style.cssText = `
    display:inline-block;margin-top:4px;padding:4px 10px;
    background:#3b82f6;color:#fff;border:none;border-radius:6px;
    font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;
  `
  btn.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    btn.textContent = 'Drafting…'
    btn.disabled = true
    const questionText = getFieldLabel(el)
    const payload = jobId
      ? { jobId, questionText }
      : { jobDescription: jobDescription || '', questionText }
    const res = await sendMsg({ type: 'DRAFT_ANSWER', payload })
    if (res?.error) {
      btn.textContent = `⚠ ${res.error.slice(0, 60)}`
      setTimeout(() => { btn.textContent = '✨ Draft with AI'; btn.disabled = false }, 4000)
      return
    }
    fillInput(el, res?.draft || '')
    markField(el, 'filled')
    btn.textContent = '✓ Drafted'
  })
  el.insertAdjacentElement('afterend', btn)
}

function processField(el, profile, jobDescription, jobId) {
  if (!el.offsetParent && el.type !== 'hidden') return
  const label = getFieldLabel(el)
  const { key, confidence } = findBestMatch(label)

  if (el.tagName === 'SELECT') {
    if (key && confidence > 0.4) {
      const val = getProfileValue(key, profile)
      markField(el, fillSelect(el, val) ? 'filled' : 'unfilled')
    } else {
      markField(el, 'unfilled')
    }
    return
  }

  if (key && confidence > 0.45) {
    const val = getProfileValue(key, profile)
    if (val) {
      fillInput(el, val)
      markField(el, 'filled')
    } else if (isEssayField(el)) {
      markField(el, 'essay')
      addDraftButton(el, profile, jobDescription, jobId)
    } else {
      markField(el, 'unfilled')
    }
  } else if (isEssayField(el)) {
    markField(el, 'essay')
    addDraftButton(el, profile, jobDescription, jobId)
  } else {
    markField(el, 'unfilled')
  }
}

async function loadProfile() {
  if (cachedProfile) return cachedProfile
  const res = await sendMsg({ type: 'GET_PROFILE' })
  if (res?.profile) cachedProfile = res.profile
  return cachedProfile
}

// Click-to-fill: clicking any input tries to fill it immediately
function attachClickToFill(el, getCtx) {
  if (el.dataset.sextantListening) return
  el.dataset.sextantListening = '1'
  el.addEventListener('focus', async () => {
    const profile = await loadProfile()
    if (!profile) return
    const label = getFieldLabel(el)
    const { key, confidence } = findBestMatch(label)
    if (!key || confidence < 0.45) return
    const val = getProfileValue(key, profile)
    if (val && !el.value) {
      fillInput(el, val)
      markField(el, 'filled')
    }
  })
}

async function runAutofill() {
  const profile = await loadProfile()
  if (!profile) {
    alert('Sextant: Profile not loaded. Check your API settings in the extension popup.')
    return
  }

  const jobsRes = await sendMsg({ type: 'GET_JOBS' })
  const jobs = jobsRes?.jobs || []
  const currentJob = jobs.find((j) => j.url && location.href.startsWith(j.url.split('?')[0]))
  const jobDescription = currentJob?.description || ''
  const jobId = currentJob?.id

  const inputs = document.querySelectorAll(
    'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=file]):not([type=checkbox]):not([type=radio]),' +
    'textarea, select'
  )
  inputs.forEach((el) => processField(el, profile, jobDescription, jobId))
}

function attachClickToFillAll() {
  const inputs = document.querySelectorAll(
    'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=file]):not([type=checkbox]):not([type=radio]),' +
    'textarea'
  )
  inputs.forEach((el) => attachClickToFill(el))
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
    </style>
    <button id="fab">🧭 Fill Form</button>
  `
  shadow.getElementById('fab').addEventListener('click', runAutofill)
}

// Init
injectFloatingButton()
attachClickToFillAll()

// Watch for dynamically added fields (single-page apps)
const observer = new MutationObserver(() => attachClickToFillAll())
observer.observe(document.body, { childList: true, subtree: true })
