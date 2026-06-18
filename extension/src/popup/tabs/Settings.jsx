import React, { useState, useEffect, useRef } from 'react'

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) resolve(null)
      else resolve(res)
    })
  })
}

export default function Settings() {
  const [config, setConfig] = useState({ baseUrl: '', apiKey: '' })
  const [saved, setSaved] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    sendMsg({ type: 'GET_API_CONFIG' }).then((res) => { if (res?.config) setConfig(res.config) })
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    await sendMsg({ type: 'SET_API_CONFIG', config })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleExport() {
    setExportLoading(true)
    setMsg('')
    const res = await sendMsg({ type: 'EXPORT' })
    if (res?.error) { setMsg(`Export error: ${res.error}`); setExportLoading(false); return }
    const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sextant-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportLoading(false)
    setMsg('Export downloaded.')
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    setMsg('')
    try {
      const text = await file.text()
      const dump = JSON.parse(text)
      const res = await sendMsg({ type: 'IMPORT', dump })
      if (res?.error) throw new Error(res.error)
      setMsg('Import successful.')
    } catch (err) {
      setMsg(`Import error: ${err.message}`)
    } finally {
      setImportLoading(false)
      e.target.value = ''
    }
  }

  return (
    <form onSubmit={handleSave}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 10, paddingBottom: 4, borderBottom: '1.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Railway API Connection
        </div>

        <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: '#0369a1', lineHeight: 1.6 }}>
          Your API key is stored locally and used only to authenticate with your Railway backend. The Anthropic API key lives on the server — it's never stored in the extension.
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Backend URL</label>
          <input type="url" value={config.baseUrl} onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
            placeholder="https://your-app.railway.app"
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>API Key (SEXTANT_API_KEY)</label>
          <input type="password" value={config.apiKey} onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
            placeholder="your-secret-key"
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <button type="submit" style={{ width: '100%', padding: '10px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>

      {/* Export / Import */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 10, paddingBottom: 4, borderBottom: '1.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Backup & Restore
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={handleExport} disabled={exportLoading}
            style={{ flex: 1, padding: '8px 0', background: '#f1f5f9', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {exportLoading ? 'Exporting…' : '↓ Export'}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={importLoading}
            style={{ flex: 1, padding: '8px 0', background: '#f1f5f9', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {importLoading ? 'Importing…' : '↑ Import'}
          </button>
          <input type="file" accept=".json" ref={fileRef} onChange={handleImport} style={{ display: 'none' }} />
        </div>
        {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.includes('error') ? '#dc2626' : '#22c55e' }}>{msg}</div>}
      </div>
    </form>
  )
}
