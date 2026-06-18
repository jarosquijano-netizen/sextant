import React, { useState, useEffect } from 'react'

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) resolve(null)
      else resolve(res)
    })
  })
}

function Label({ children }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{children}</label>
}

function Input({ value, onChange, type = 'text', placeholder }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
    />
  )
}

function Textarea({ value, onChange, rows = 3, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
    />
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 10, paddingBottom: 4, borderBottom: '1.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    sendMsg({ type: 'GET_PROFILE' }).then((res) => {
      if (res?.profile) setProfile(res.profile)
    })
  }, [])

  if (!profile) return <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</div>

  function update(path, value) {
    const parts = path.split('.')
    setProfile((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      let obj = next
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]]
      obj[parts[parts.length - 1]] = value
      return next
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    await sendMsg({ type: 'SET_PROFILE', profile })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const p = profile.personal || {}

  return (
    <form onSubmit={handleSave}>
      <Section title="Personal Info">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="First Name">
            <Input value={p.firstName || ''} onChange={(e) => update('personal.firstName', e.target.value)} />
          </Field>
          <Field label="Last Name">
            <Input value={p.lastName || ''} onChange={(e) => update('personal.lastName', e.target.value)} />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" value={p.email || ''} onChange={(e) => update('personal.email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={p.phone || ''} onChange={(e) => update('personal.phone', e.target.value)} />
        </Field>
        <Field label="Location">
          <Input value={p.location || ''} onChange={(e) => update('personal.location', e.target.value)} />
        </Field>
        <Field label="LinkedIn URL">
          <Input value={p.linkedinUrl || ''} onChange={(e) => update('personal.linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." />
        </Field>
        <Field label="Work Authorization">
          <Input value={p.workAuthorization || ''} onChange={(e) => update('personal.workAuthorization', e.target.value)} />
        </Field>
        <Field label="Remote Preference">
          <Input value={p.remotePreference || ''} onChange={(e) => update('personal.remotePreference', e.target.value)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8 }}>
          <Field label="Salary Min">
            <Input type="number" value={p.salaryExpectationMin || ''} onChange={(e) => update('personal.salaryExpectationMin', Number(e.target.value))} />
          </Field>
          <Field label="Salary Max">
            <Input type="number" value={p.salaryExpectationMax || ''} onChange={(e) => update('personal.salaryExpectationMax', Number(e.target.value))} />
          </Field>
          <Field label="Currency">
            <Input value={p.salaryCurrency || ''} onChange={(e) => update('personal.salaryCurrency', e.target.value)} placeholder="EUR" />
          </Field>
        </div>
      </Section>

      <Section title="Summary">
        <Textarea rows={4} value={profile.summary || ''} onChange={(e) => update('summary', e.target.value)} placeholder="Professional summary…" />
      </Section>

      <Section title="Target Titles">
        <Field label="Titles (comma-separated)">
          <Input
            value={(profile.targetTitles || []).join(', ')}
            onChange={(e) => update('targetTitles', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="VP Product, Head of Product…"
          />
        </Field>
      </Section>

      <Section title="Target Domains">
        <Field label="Domains (comma-separated)">
          <Input
            value={(profile.targetDomains || []).join(', ')}
            onChange={(e) => update('targetDomains', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="B2B SaaS, logistics tech…"
          />
        </Field>
      </Section>

      <Section title="Skills">
        {['product', 'domain', 'leadership', 'languages'].map((group) => (
          <Field key={group} label={group.charAt(0).toUpperCase() + group.slice(1)}>
            <Input
              value={((profile.skills || {})[group] || []).join(', ')}
              onChange={(e) => update(`skills.${group}`, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder={`${group} skills, comma-separated`}
            />
          </Field>
        ))}
      </Section>

      <Section title="Experience">
        {(profile.experience || []).map((exp, i) => (
          <div key={i} style={{ background: '#f1f5f9', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <Field label="Company"><Input value={exp.company || ''} onChange={(e) => { const arr = [...profile.experience]; arr[i] = { ...arr[i], company: e.target.value }; update('experience', arr) }} /></Field>
              <Field label="Title"><Input value={exp.title || ''} onChange={(e) => { const arr = [...profile.experience]; arr[i] = { ...arr[i], title: e.target.value }; update('experience', arr) }} /></Field>
              <Field label="Start Date"><Input value={exp.startDate || ''} onChange={(e) => { const arr = [...profile.experience]; arr[i] = { ...arr[i], startDate: e.target.value }; update('experience', arr) }} placeholder="YYYY-MM" /></Field>
              <Field label="End Date"><Input value={exp.endDate || ''} onChange={(e) => { const arr = [...profile.experience]; arr[i] = { ...arr[i], endDate: e.target.value }; update('experience', arr) }} placeholder="YYYY-MM or present" /></Field>
            </div>
            <Field label="Bullets (one per line)">
              <Textarea rows={3} value={(exp.bullets || []).join('\n')} onChange={(e) => { const arr = [...profile.experience]; arr[i] = { ...arr[i], bullets: e.target.value.split('\n') }; update('experience', arr) }} />
            </Field>
          </div>
        ))}
      </Section>

      <Section title="Education">
        {(profile.education || []).map((ed, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 70px', gap: 8 }}>
            <Field label="Degree"><Input value={ed.degree || ''} onChange={(e) => { const arr = [...profile.education]; arr[i] = { ...arr[i], degree: e.target.value }; update('education', arr) }} /></Field>
            <Field label="School"><Input value={ed.school || ''} onChange={(e) => { const arr = [...profile.education]; arr[i] = { ...arr[i], school: e.target.value }; update('education', arr) }} /></Field>
            <Field label="Year"><Input value={ed.year || ''} onChange={(e) => { const arr = [...profile.education]; arr[i] = { ...arr[i], year: e.target.value }; update('education', arr) }} /></Field>
          </div>
        ))}
      </Section>

      <Section title="Common Answers">
        <Field label="Why This Company">
          <Textarea rows={2} value={profile.commonAnswers?.whyThisCompany || ''} onChange={(e) => update('commonAnswers.whyThisCompany', e.target.value)} />
        </Field>
        <Field label="Why Leaving Current Role">
          <Textarea rows={2} value={profile.commonAnswers?.whyLeavingCurrentRole || ''} onChange={(e) => update('commonAnswers.whyLeavingCurrentRole', e.target.value)} />
        </Field>
        <Field label="Notice Period">
          <Input value={profile.commonAnswers?.noticePeriod || ''} onChange={(e) => update('commonAnswers.noticePeriod', e.target.value)} placeholder="e.g. 4 weeks" />
        </Field>
      </Section>

      <button
        type="submit"
        style={{ width: '100%', padding: '10px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {saved ? '✓ Saved!' : 'Save Profile'}
      </button>
      <div style={{ height: 16 }} />
    </form>
  )
}
