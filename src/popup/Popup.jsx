import React, { useState } from 'react'
import Profile from './tabs/Profile.jsx'
import Pipeline from './tabs/Pipeline.jsx'
import Settings from './tabs/Settings.jsx'

const TABS = ['Profile', 'Pipeline', 'Settings']

export default function Popup() {
  const [activeTab, setActiveTab] = useState('Profile')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#1e3a5f', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>🧭</span>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>Sextant</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1.5px solid #e2e8f0' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '9px 0', border: 'none', background: 'none',
              fontFamily: 'inherit', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#1e3a5f' : '#64748b',
              borderBottom: activeTab === tab ? '2.5px solid #1e3a5f' : '2.5px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {activeTab === 'Profile' && <Profile />}
        {activeTab === 'Pipeline' && <Pipeline />}
        {activeTab === 'Settings' && <Settings />}
      </div>
    </div>
  )
}
