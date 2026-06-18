import { scoreJob } from '../lib/match-scorer.js'

const BADGE_ID = 'sextant-badge-root'
const CHIP_CLASS = 'sextant-score-chip'

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

function scoreColor(score) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#eab308'
  return '#ef4444'
}

function buildBadgeHTML(result, jobData) {
  const color = scoreColor(result.score)
  const keywords = result.matchedKeywords.length
    ? result.matchedKeywords.map((k) => `<span class="kw">${k}</span>`).join('')
    : '<span class="kw-none">No keywords matched</span>'
  return `
    <style>
      :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #badge {
        position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
        background: #fff; border-radius: 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        padding: 14px 16px; min-width: 220px; max-width: 280px;
        border: 1.5px solid #e2e8f0;
      }
      #badge-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      #score-ring {
        width: 48px; height: 48px; border-radius: 50%;
        background: conic-gradient(${color} ${result.score * 3.6}deg, #e2e8f0 0deg);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
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
      #save-btn {
        width: 100%; padding: 7px 0; background: #1e3a5f; color: #fff;
        border: none; border-radius: 8px; font-size: 12px; font-weight: 600;
        cursor: pointer; transition: background 0.15s;
      }
      #save-btn:hover { background: #2d5282; }
      #save-btn:disabled { background: #94a3b8; cursor: default; }
      #close-btn {
        position: absolute; top: 8px; right: 10px; background: none; border: none;
        color: #94a3b8; cursor: pointer; font-size: 16px; line-height: 1; padding: 2px;
      }
      #close-btn:hover { color: #475569; }
      .saved-label { text-align: center; font-size: 12px; color: #22c55e; font-weight: 600; padding: 4px 0; }
    </style>
    <div id="badge">
      <button id="close-btn" title="Close">×</button>
      <div id="badge-header">
        <div id="score-ring"><div id="score-inner">${result.score}</div></div>
        <div>
          <div id="badge-title">🧭 Sextant Match</div>
          <div id="badge-sub">${jobData.title || 'Job Posting'}</div>
        </div>
      </div>
      <div id="keywords">${keywords}</div>
      <button id="save-btn">Save to Pipeline</button>
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

  const saveBtn = shadow.getElementById('save-btn')
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true
    saveBtn.textContent = 'Saving…'
    await sendMsg({
      type: 'SAVE_JOB',
      job: {
        title: jobData.title,
        company: jobData.company,
        url: location.href,
        score: result.score,
        matchedKeywords: result.matchedKeywords,
      },
    })
    saveBtn.textContent = '✓ Saved'
    setTimeout(() => {
      saveBtn.textContent = 'Saved to Pipeline'
    }, 1500)
  })
}

function parseIndividualPosting() {
  const titleEl =
    document.querySelector('.job-details-jobs-unified-top-card__job-title h1') ||
    document.querySelector('.job-details-jobs-unified-top-card__job-title') ||
    document.querySelector('h1.t-24') ||
    document.querySelector('h1')
  const companyEl =
    document.querySelector('.job-details-jobs-unified-top-card__company-name') ||
    document.querySelector('.jobs-unified-top-card__company-name')
  const descEl =
    document.querySelector('.jobs-description__content') ||
    document.querySelector('.jobs-box__html-content') ||
    document.querySelector('#job-details')
  const locationEl = document.querySelector('.job-details-jobs-unified-top-card__bullet')

  return {
    title: titleEl?.innerText?.trim() || '',
    company: companyEl?.innerText?.trim() || '',
    location: locationEl?.innerText?.trim() || '',
    description: descEl?.innerText?.trim() || '',
    snippet: '',
  }
}

function buildChipEl(score) {
  const color = scoreColor(score)
  const host = document.createElement('div')
  host.className = CHIP_CLASS

  const shadow = host.attachShadow({ mode: 'closed' })
  shadow.innerHTML = `
    <style>
      :host { display: inline-block; }
      #chip {
        display: inline-flex; align-items: center; gap: 4px;
        background: ${color}18; border: 1px solid ${color};
        border-radius: 999px; padding: 2px 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px; font-weight: 700; color: ${color};
        white-space: nowrap;
      }
    </style>
    <span id="chip">🧭 ${score}</span>
  `
  return host
}

function parseAndScoreCards(profile) {
  const cards = document.querySelectorAll(
    '.job-card-container:not([data-sextant-scored]), .jobs-search-results__list-item:not([data-sextant-scored])'
  )
  cards.forEach((card) => {
    card.setAttribute('data-sextant-scored', '1')

    const titleEl = card.querySelector('.job-card-list__title, .job-card-container__link, a[data-control-name="jobcard_title"]')
    const companyEl = card.querySelector('.job-card-container__primary-description, .artdeco-entity-lockup__subtitle')
    const snippetEl = card.querySelector('.job-card-list__insight, .job-card-container__metadata-item')

    const jobData = {
      title: titleEl?.innerText?.trim() || '',
      company: companyEl?.innerText?.trim() || '',
      description: '',
      snippet: snippetEl?.innerText?.trim() || '',
    }

    const result = scoreJob(jobData, profile)
    const chip = buildChipEl(result.score)

    // Inject chip into card — find a good anchor
    const meta = card.querySelector('.job-card-list__footer-wrapper, .job-card-container__footer-wrapper, .job-card-container__metadata-wrapper')
    if (meta) {
      meta.style.position = 'relative'
      meta.appendChild(chip)
    } else {
      card.style.position = 'relative'
      card.appendChild(chip)
    }
  })
}

async function init() {
  const res = await sendMsg({ type: 'GET_PROFILE' })
  if (!res?.profile) return
  const profile = res.profile

  const url = location.href

  if (url.includes('/jobs/view/')) {
    // Individual posting
    const tryScore = () => {
      const jobData = parseIndividualPosting()
      if (!jobData.title && !jobData.description) return false
      const result = scoreJob(jobData, profile)
      injectBadge(result, jobData)
      return true
    }

    if (!tryScore()) {
      // DOM may not be ready — wait and retry
      const observer = new MutationObserver(() => {
        if (tryScore()) observer.disconnect()
      })
      observer.observe(document.body, { childList: true, subtree: true })
      setTimeout(() => observer.disconnect(), 10000)
    }
  } else {
    // Search / collections list
    const container =
      document.querySelector('.jobs-search-results-list') ||
      document.querySelector('.jobs-search__results-list') ||
      document.body

    parseAndScoreCards(profile)

    // React to user-triggered lazy loading via scroll
    const observer = new MutationObserver(() => parseAndScoreCards(profile))
    observer.observe(container, { childList: true, subtree: true })
  }
}

// Re-run on LinkedIn SPA navigation (URL changes without page reload)
let lastUrl = location.href
const navObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href
    document.getElementById(BADGE_ID)?.remove()
    setTimeout(init, 800) // wait for LinkedIn to render new content
  }
})
navObserver.observe(document.body, { childList: true, subtree: true })

init()
