import React, { useState, useEffect } from 'react'

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) resolve(null)
      else resolve(res)
    })
  })
}

export default function Settings() {
  const [settings, setSettings] = useState({ apiKey: '', aiEnabled: false })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    sendMsg({ type: 'GET_SETTINGS' }).then((res) => {
      if (res?.settings) setSettings(res.settings)
    })
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    await sendMsg({ type: 'SET_SETTINGS', settings })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSave}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 10, paddingBottom: 4, borderBottom: '1.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          AI Draft Feature
        </div>

        <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: '#0369a1', lineHeight: 1.6 }}>
          Your API key is stored locally on your device and only used when you click <strong>"Draft with AI"</strong> on a job application form. It is never shared with anyone or sent to any server other than Anthropic's API.
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Anthropic API Key
          </label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
            placeholder="sk-ant-..."
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            Get your key at console.anthropic.com
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1.5px solid #e2e8f0' }}>
          <input
            type="checkbox"
            checked={settings.aiEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, aiEnabled: e.target.checked }))}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1e3a5f' }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Enable AI Draft Feature</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Show "Draft with AI" button next to open-ended form fields</div>
          </div>
        </label>
      </div>

      <button
        type="submit"
        style={{ width: '100%', padding: '10px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </form>
  )
}
