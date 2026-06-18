function normalize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function tokenize(text) {
  return normalize(text).split(' ').filter((t) => t.length > 2)
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function fuzzyMatch(needle, haystack) {
  const n = normalize(needle)
  const h = normalize(haystack)
  if (h.includes(n)) return true
  const nTokens = n.split(' ')
  for (const token of nTokens) {
    if (token.length < 3) continue
    if (h.includes(token)) return true
    const hTokens = h.split(' ')
    for (const ht of hTokens) {
      if (ht.length >= 3 && levenshtein(token, ht) <= 1) return true
    }
  }
  return false
}

export function scoreJob(jobData, profile) {
  const { title = '', description = '', snippet = '' } = jobData
  const fullText = normalize([title, description, snippet].join(' '))
  const matchedKeywords = []

  // Title match — up to 40 points
  let titleScore = 0
  let titleMatch = false
  if (profile.targetTitles && profile.targetTitles.length) {
    for (const target of profile.targetTitles) {
      if (fuzzyMatch(target, title)) {
        titleMatch = true
        titleScore = 40
        break
      }
    }
    if (!titleMatch) {
      // Partial: any title word in job title
      const titleTokens = tokenize(title)
      for (const target of profile.targetTitles) {
        const targetTokens = tokenize(target)
        const overlap = targetTokens.filter((t) => titleTokens.includes(t))
        if (overlap.length > 0) {
          titleScore = Math.max(titleScore, Math.round((overlap.length / targetTokens.length) * 25))
        }
      }
    }
  }

  // Domain match — up to 30 points
  let domainScore = 0
  const domains = profile.targetDomains || []
  const matchedDomains = domains.filter((d) => fuzzyMatch(d, fullText))
  if (domains.length > 0) {
    domainScore = Math.round((matchedDomains.length / domains.length) * 30)
    matchedKeywords.push(...matchedDomains)
  }

  // Skills match — up to 30 points
  let skillScore = 0
  const allSkills = []
  if (profile.skills) {
    for (const group of Object.values(profile.skills)) {
      if (Array.isArray(group)) allSkills.push(...group)
    }
  }
  const matchedSkills = allSkills.filter((s) => fuzzyMatch(s, fullText))
  if (allSkills.length > 0) {
    skillScore = Math.round((matchedSkills.length / allSkills.length) * 30)
    matchedKeywords.push(...matchedSkills)
  }

  const score = Math.min(100, titleScore + domainScore + skillScore)
  const uniqueKeywords = [...new Set(matchedKeywords)].slice(0, 5)

  return { score, matchedKeywords: uniqueKeywords, titleMatch }
}
