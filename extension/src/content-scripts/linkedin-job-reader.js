import { scoreJob } from '../lib/match-scorer.js'

const BADGE_ID = 'sextant-badge-root'

function sendMsg(msg) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000)
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        clearTimeout(timer)
        if (chrome.runtime.lastError) resolve(null)
        else resolve(res)
      })
    } catch {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

function scoreColor(score) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#eab308'
  return '#ef4444'
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildBadgeHTML(result, jobData) {
  const color = scoreColor(result.score)
  const keywords = result.matchedKeywords.length
    ? result.matchedKeywords.map((k) => `<span class="kw">${escapeHtml(k)}</span>`).join('')
    : '<span class="kw-none">No keywords matched</span>'
  return `
    <style>
      :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #badge {
        position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
        background: #fff; border-radius: 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        padding: 14px 16px; min-width: 240px; max-width: 300px;
        border: 1.5px solid #e2e8f0;
      }
      #badge-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      #score-ring {
        width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
        background: conic-gradient(${color} ${result.score * 3.6}deg, #e2e8f0 0deg);
        display: flex; align-items: center; justify-content: center;
      }
      #score-inner {
        width: 36px; height: 36px; border-radius: 50%; background: #fff;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 13px; color: ${color};
      }
      #badge-title { font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.3; }
      #badge-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
      #keywords { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
      .kw { background: #f1f5f9; color: #475569; font-size: 11px; padding: 2px 7px; border-radius: 999px; }
      .kw-none { font-size: 11px; color: #94a3b8; }
      .btn {
        width: 100%; padding: 7px 0; border: none; border-radius: 8px;
        font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s;
        font-family: inherit; margin-top: 6px; display: block;
      }
      #save-btn { background: #1e3a5f; color: #fff; }
      #save-btn:hover { background: #2d5282; }
      #save-btn:disabled { background: #94a3b8; cursor: default; }
      #bullets-btn { background: #f1f5f9; color: #1e3a5f; border: 1.5px solid #1e3a5f; }
      #bullets-btn:hover { background: #e2e8f0; }
      #bullets-btn:disabled { opacity: 0.5; cursor: default; }
      #bullets-panel {
        margin-top: 10px; background: #f8fafc; border-radius: 8px; padding: 10px;
        border: 1.5px solid #e2e8f0; display: none;
      }
      #bullets-panel.open { display: block; }
      .bullet-item { font-size: 11px; color: #1e293b; padding: 5px 0; border-bottom: 1px solid #e2e8f0; line-height: 1.4; }
      .bullet-item:last-child { border-bottom: none; }
      .bullet-rationale { font-size: 10px; color: #64748b; margin-top: 2px; font-style: italic; }
      #close-btn {
        position: absolute; top: 8px; right: 10px; background: none; border: none;
        color: #94a3b8; cursor: pointer; font-size: 16px; line-height: 1; padding: 2px;
      }
      #close-btn:hover { color: #475569; }
      .err { font-size: 11px; color: #ef4444; margin-top: 4px; }
    </style>
    <div id="badge">
      <button id="close-btn" title="Close">×</button>
      <div id="badge-header">
        <div id="score-ring"><div id="score-inner">${result.score}</div></div>
        <div>
          <div id="badge-title">🧭 Sextant Match</div>
          <div id="badge-sub">${escapeHtml(jobData.title || 'Job Posting')}</div>
        </div>
      </div>
      <div id="keywords">${keywords}</div>
      <button id="save-btn" class="btn">Save to Pipeline</button>
      <button id="bullets-btn" class="btn">✨ Suggest bullets to lead with</button>
      <div id="bullets-panel"></div>
    </div>
  `
}

function injectBadge(result, jobData) {
  if (document.getElementById(BADGE_ID)) return

  const host = document.createElement('div')
  host.id = BADGE_ID
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'closed' })
  shadow.innerHTML = buildBadgeHTML(result, jobData)

  shadow.getElementById('close-btn').addEventListener('click', () => host.remove())

  let savedJobId = null

  const saveBtn = shadow.getElementById('save-btn')
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true
    saveBtn.textContent = 'Saving…'
    const res = await sendMsg({
      type: 'SAVE_JOB',
      job: {
        title: jobData.title,
        company: jobData.company,
        url: location.href,
        description: jobData.description,
        match_score: result.score,
        matched_skills: result.matchedKeywords,
        source: 'linkedin',
      },
    })
    if (res?.error) {
      saveBtn.disabled = false
      saveBtn.textContent = 'Save to Pipeline'
      shadow.getElementById('bullets-panel').innerHTML = `<div class="err">${escapeHtml(res.error)}</div>`
      shadow.getElementById('bullets-panel').classList.add('open')
    } else {
      savedJobId = res?.job?.id
      saveBtn.textContent = '✓ Saved to Pipeline'
    }
  })

  const bulletsBtn = shadow.getElementById('bullets-btn')
  const bulletsPanel = shadow.getElementById('bullets-panel')

  bulletsBtn.addEventListener('click', async () => {
    if (bulletsPanel.classList.contains('open') && bulletsPanel.dataset.loaded) {
      bulletsPanel.classList.toggle('open')
      return
    }

    bulletsBtn.disabled = true
    bulletsBtn.textContent = 'Generating…'

    const payload = savedJobId
      ? { jobId: savedJobId }
      : { jobDescription: jobData.description }

    const res = await sendMsg({ type: 'BULLET_SUGGESTIONS', payload })

    if (res?.error) {
      bulletsPanel.innerHTML = `<div class="err">Error: ${escapeHtml(res.error)}</div>`
    } else {
      const bullets = res?.suggestedBullets || []
      if (!bullets.length) {
        bulletsPanel.innerHTML = '<div class="err">No suggestions returned.</div>'
      } else {
        bulletsPanel.innerHTML = bullets
          .map((b) => {
            const text = typeof b === 'string' ? b : b.bullet
            const rationale = typeof b === 'object' ? b.rationale : ''
            return `<div class="bullet-item">• ${escapeHtml(text)}${rationale ? `<div class="bullet-rationale">↳ ${escapeHtml(rationale)}</div>` : ''}</div>`
          })
          .join('')
        bulletsPanel.dataset.loaded = '1'
      }
    }

    bulletsPanel.classList.add('open')
    bulletsBtn.disabled = false
    bulletsBtn.textContent = '✨ Suggest bullets to lead with'
  })
}

function buildChipEl(score) {
  const color = scoreColor(score)
  const host = document.createElement('div')

  const shadow = host.attachShadow({ mode: 'closed' })
  shadow.innerHTML = `
    <style>
      :host { display: inline-block; }
      #chip {
        display: inline-flex; align-items: center; gap: 4px;
        background: ${color}18; border: 1px solid ${color};
        border-radius: 999px; padding: 2px 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px; font-weight: 700; color: ${color}; white-space: nowrap;
      }
    </style>
    <span id="chip">🧭 ${score}</span>
  `
  return host
}

function parseAndScoreCards(profile) {
  const cards = document.querySelectorAll(
    [
      '.job-card-container:not([data-sextant-scored])',
      '.jobs-search-results__list-item:not([data-sextant-scored])',
      '[data-job-id]:not([data-sextant-scored])',
      'li[class*="jobs-search"]:not([data-sextant-scored])',
    ].join(', ')
  )
  cards.forEach((card) => {
    card.setAttribute('data-sextant-scored', '1')
    const titleEl = card.querySelector(
      '.job-card-list__title, .job-card-container__link, [class*="job-card"][class*="title"], a[href*="/jobs/view/"]'
    )
    const companyEl = card.querySelector(
      '.job-card-container__primary-description, .artdeco-entity-lockup__subtitle, [class*="primary-description"], [class*="company-name"]'
    )
    const snippetEl = card.querySelector(
      '.job-card-list__insight, .job-card-container__metadata-item, [class*="insight"], [class*="metadata-item"]'
    )

    const jobData = {
      title: titleEl?.innerText?.trim() || '',
      company: companyEl?.innerText?.trim() || '',
      description: '',
      snippet: snippetEl?.innerText?.trim() || '',
    }

    const result = scoreJob(jobData, profile)
    const chip = buildChipEl(result.score)

    const meta = card.querySelector(
      '.job-card-list__footer-wrapper, .job-card-container__footer-wrapper, .job-card-container__metadata-wrapper'
    )
    ;(meta || card).appendChild(chip)
  })
}

function parseIndividualPosting() {
  const titleEl =
    document.querySelector('.job-details-jobs-unified-top-card__job-title h1') ||
    document.querySelector('.job-details-jobs-unified-top-card__job-title') ||
    document.querySelector('[class*="top-card"][class*="job-title"]') ||
    document.querySelector('h1.t-24') ||
    document.querySelector('h1')
  const companyEl =
    document.querySelector('.job-details-jobs-unified-top-card__company-name') ||
    document.querySelector('.jobs-unified-top-card__company-name') ||
    document.querySelector('[class*="top-card"][class*="company-name"]') ||
    document.querySelector('[class*="company-name"] a')
  const descEl =
    document.querySelector('.jobs-description__content') ||
    document.querySelector('.jobs-box__html-content') ||
    document.querySelector('#job-details') ||
    document.querySelector('[class*="jobs-description"]') ||
    document.querySelector('[id*="job-details"]')
  const locationEl =
    document.querySelector('.job-details-jobs-unified-top-card__bullet') ||
    document.querySelector('[class*="top-card"][class*="bullet"]')

  return {
    title: titleEl?.innerText?.trim() || '',
    company: companyEl?.innerText?.trim() || '',
    location: locationEl?.innerText?.trim() || '',
    description: descEl?.innerText?.trim() || '',
    snippet: '',
  }
}

async function init() {
  let res = await sendMsg({ type: 'GET_PROFILE' })
  if (!res?.profile) {
    // Service worker may have been sleeping — retry once after a short delay
    await new Promise((r) => setTimeout(r, 1500))
    res = await sendMsg({ type: 'GET_PROFILE' })
  }
  if (!res?.profile) return
  const profile = res.profile

  if (location.href.includes('/jobs/view/')) {
    const tryScore = () => {
      const jobData = parseIndividualPosting()
      if (!jobData.title && !jobData.description) return false
      injectBadge(scoreJob(jobData, profile), jobData)
      return true
    }

    if (!tryScore()) {
      const obs = new MutationObserver(() => { if (tryScore()) obs.disconnect() })
      obs.observe(document.body, { childList: true, subtree: true })
      setTimeout(() => obs.disconnect(), 10000)
    }
  } else {
    const container =
      document.querySelector('.jobs-search-results-list') ||
      document.querySelector('.jobs-search__results-list') ||
      document.body

    parseAndScoreCards(profile)
    const obs = new MutationObserver(() => parseAndScoreCards(profile))
    obs.observe(container, { childList: true, subtree: true })
  }
}

let lastUrl = location.href
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href
    document.getElementById(BADGE_ID)?.remove()
    setTimeout(init, 800)
  }
}).observe(document.body, { childList: true, subtree: true })

init()
