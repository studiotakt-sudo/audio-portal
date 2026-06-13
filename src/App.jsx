import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import LoginPage from './LoginPage'
import AdminPage from './AdminPage'
import ClientPage from './ClientPage'

// ─── Default theme ────────────────────────────────────────────────
export const DEFAULT_THEME = {
  bg0:         '#0a0b0f',
  bg1:         '#11131a',
  bg2:         '#191c26',
  bg3:         '#222534',
  border:      '#2a2e42',
  amber:       '#e8a44a',
  amberDim:    '#7a5520',
  green:       '#4ade80',
  red:         '#f87171',
  textPrimary: '#f0eee8',
  textSecondary:'#8b8fa8',
  textMuted:   '#4a4e65',
}

export function buildCss(t) {
  return `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Space Grotesk', sans-serif; background: ${t.bg0}; color: ${t.textPrimary}; min-height: 100vh; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${t.bg1}; } ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 2px; }
  .portal { min-height: 100vh; display: flex; flex-direction: column; }
  .topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 60px; background: ${t.bg1}; border-bottom: 1px solid ${t.border}; position: sticky; top: 0; z-index: 100; }
  .topbar-brand { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; letter-spacing: 0.15em; color: ${t.amber}; display: flex; align-items: center; gap: 10px; }
  .topbar-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: ${t.amber}; animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .mode-badge { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; padding: 4px 10px; border-radius: 2px; text-transform: uppercase; background: ${t.bg3}; color: ${t.textSecondary}; border: 1px solid ${t.border}; }
  .mode-badge.admin { background: ${t.bg0}; color: ${t.amber}; border-color: ${t.amberDim}; }
  .btn { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 500; padding: 8px 18px; border-radius: 3px; border: none; cursor: pointer; transition: all 0.15s; }
  .btn-primary { background: ${t.amber}; color: ${t.bg0}; } .btn-primary:hover { filter: brightness(1.15); } .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: ${t.textSecondary}; border: 1px solid ${t.border}; } .btn-ghost:hover { border-color: ${t.textSecondary}; color: ${t.textPrimary}; }
  .btn-danger { background: ${t.bg0}; color: ${t.red}; border: 1px solid ${t.red}; opacity: 0.7; } .btn-danger:hover { opacity: 1; }
  .btn-sm { font-size: 11px; padding: 5px 12px; }
  .btn-icon { background: transparent; border: 1px solid ${t.border}; color: ${t.textSecondary}; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 3px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
  .btn-icon:hover { border-color: ${t.amber}; color: ${t.amber}; }
  .btn-icon.edit-active { border-color: ${t.amber}; color: ${t.amber}; background: ${t.bg0}; }
  .field { margin-bottom: 16px; }
  .label { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.08em; color: ${t.textSecondary}; text-transform: uppercase; margin-bottom: 6px; }
  .input { width: 100%; background: ${t.bg2}; border: 1px solid ${t.border}; color: ${t.textPrimary}; padding: 10px 14px; border-radius: 3px; font-family: 'Space Grotesk', sans-serif; font-size: 14px; transition: border-color 0.15s; }
  .input:focus { outline: none; border-color: ${t.amber}; } .input::placeholder { color: ${t.textMuted}; }
  .input-error { border-color: ${t.red} !important; }
  .error-msg { font-size: 12px; color: ${t.red}; margin-top: 8px; }
  .main { flex: 1; padding: 32px; max-width: 1200px; margin: 0 auto; width: 100%; }
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
  .page-title { font-size: 20px; font-weight: 600; } .page-subtitle { font-size: 13px; color: ${t.textSecondary}; margin-top: 2px; }
  .upload-zone { border: 2px dashed ${t.border}; border-radius: 6px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 28px; background: ${t.bg1}; }
  .upload-zone:hover, .upload-zone.drag-over { border-color: ${t.amber}; background: ${t.bg0}; }
  .upload-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.6; }
  .upload-hint { font-size: 13px; color: ${t.textSecondary}; } .upload-hint strong { color: ${t.amber}; }
  .upload-formats { font-size: 11px; color: ${t.textMuted}; margin-top: 6px; font-family: 'Space Mono', monospace; }
  .upload-form { background: ${t.bg1}; border: 1px solid ${t.border}; border-radius: 6px; padding: 24px; margin-bottom: 28px; }
  .upload-form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .upload-form-title { font-size: 14px; font-weight: 600; }
  .upload-form-file { font-family: 'Space Mono', monospace; font-size: 11px; color: ${t.amber}; margin-top: 4px; }
  .tag-input-row { display: flex; gap: 8px; }
  .tag-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .tag-chip { display: flex; align-items: center; gap: 4px; background: ${t.bg3}; border: 1px solid ${t.border}; border-radius: 2px; padding: 3px 8px; font-size: 11px; font-family: 'Space Mono', monospace; color: ${t.amber}; }
  .tag-chip-remove { cursor: pointer; background: none; border: none; color: ${t.textMuted}; padding: 0; font-size: 13px; line-height: 1; display: flex; align-items: center; } .tag-chip-remove:hover { color: ${t.red}; }
  .search-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
  .search-input-wrap { position: relative; flex: 1; min-width: 200px; }
  .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; color: ${t.textMuted}; pointer-events: none; }
  .search-input { padding-left: 36px !important; }
  .tag-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .tag-filter { font-family: 'Space Mono', monospace; font-size: 11px; padding: 4px 10px; border-radius: 2px; cursor: pointer; border: 1px solid ${t.border}; background: ${t.bg2}; color: ${t.textSecondary}; transition: all 0.15s; }
  .tag-filter:hover { border-color: ${t.amber}; color: ${t.amber}; }
  .tag-filter.active { background: ${t.bg0}; border-color: ${t.amber}; color: ${t.amber}; }
  .tag-filter-label { font-size: 11px; color: ${t.textMuted}; align-self: center; font-family: 'Space Mono', monospace; white-space: nowrap; }
  .track-list { display: flex; flex-direction: column; gap: 2px; }
  .track-row { display: grid; grid-template-columns: 40px 1fr auto auto; gap: 16px; align-items: center; background: ${t.bg1}; border: 1px solid transparent; border-radius: 4px; padding: 12px 16px; transition: all 0.15s; cursor: pointer; }
  .track-row:hover { border-color: ${t.border}; background: ${t.bg2}; }
  .track-row.playing { border-color: ${t.amberDim}; background: ${t.bg0}; }
  .track-row.editing { border-color: ${t.amber} !important; border-radius: 4px 4px 0 0; background: ${t.bg2}; }
  .track-num { font-family: 'Space Mono', monospace; font-size: 12px; color: ${t.textMuted}; text-align: center; }
  .track-num.playing-indicator { color: ${t.amber}; font-size: 16px; }
  .track-info { min-width: 0; }
  .track-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .track-name.playing { color: ${t.amber}; }
  .track-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
  .track-uploader { font-size: 11px; color: ${t.textMuted}; }
  .track-tags-inline { display: flex; gap: 4px; flex-wrap: wrap; }
  .tag-inline { font-family: 'Space Mono', monospace; font-size: 10px; padding: 1px 6px; border-radius: 1px; background: ${t.bg3}; border: 1px solid ${t.border}; color: ${t.textSecondary}; }
  .track-duration { font-family: 'Space Mono', monospace; font-size: 12px; color: ${t.textMuted}; white-space: nowrap; }
  .track-actions { display: flex; gap: 6px; }
  .track-edit-panel { background: ${t.bg2}; border: 1px solid ${t.border}; border-top: none; border-radius: 0 0 4px 4px; padding: 16px 20px 20px; margin-bottom: 2px; animation: expandDown 0.15s ease; }
  @keyframes expandDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
  .track-edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .track-edit-label { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: ${t.textMuted}; text-transform: uppercase; margin-bottom: 8px; }
  .track-edit-actions { display: flex; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid ${t.border}; }
  .player-bar { position: fixed; bottom: 0; left: 0; right: 0; background: ${t.bg1}; border-top: 1px solid ${t.border}; padding: 0 24px; z-index: 200; display: flex; align-items: center; gap: 16px; height: 72px; }
  .player-track-info { min-width: 140px; max-width: 200px; flex-shrink: 0; }
  .player-track-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .player-track-sub { font-size: 11px; color: ${t.textMuted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .player-play-btn { width: 36px; height: 36px; border-radius: 50%; background: ${t.amber}; color: ${t.bg0}; border: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
  .player-play-btn:hover { filter: brightness(1.15); }
  .player-center { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .waveform-wrap { position: relative; width: 100%; height: 40px; cursor: pointer; }
  .waveform-canvas { display: block; width: 100%; height: 100%; }
  .waveform-playhead { position: absolute; top: 0; bottom: 0; width: 2px; background: ${t.amber}; pointer-events: none; transform: translateX(-50%); }
  .player-times { display: flex; justify-content: space-between; }
  .time-label { font-family: 'Space Mono', monospace; font-size: 10px; color: ${t.textMuted}; white-space: nowrap; }
  .tabs { display: flex; margin-bottom: 28px; border-bottom: 1px solid ${t.border}; }
  .tab { padding: 10px 20px; font-size: 13px; font-weight: 500; color: ${t.textSecondary}; cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s; font-family: 'Space Grotesk', sans-serif; }
  .tab:hover { color: ${t.textPrimary}; } .tab.active { color: ${t.amber}; border-bottom-color: ${t.amber}; }
  .client-card { background: ${t.bg1}; border: 1px solid ${t.border}; border-radius: 6px; padding: 16px 20px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .client-name { font-size: 14px; font-weight: 500; } .client-meta { font-family: 'Space Mono', monospace; font-size: 11px; color: ${t.textSecondary}; margin-top: 2px; }
  .empty-state { padding: 60px 20px; text-align: center; color: ${t.textMuted}; font-size: 14px; }
  .empty-icon { font-size: 40px; opacity: 0.3; margin-bottom: 12px; }
  .section-header { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: ${t.textMuted}; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid ${t.border}; }
  .toast { position: fixed; top: 72px; right: 24px; padding: 10px 16px; border-radius: 4px; font-size: 13px; z-index: 300; animation: slideIn 0.2s ease; }
  .toast-success { background: ${t.bg0}; border: 1px solid ${t.green}; color: ${t.green}; }
  .toast-error { background: ${t.bg0}; border: 1px solid ${t.red}; color: ${t.red}; }
  @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  .progress-bar-upload { height: 2px; background: ${t.bg3}; border-radius: 1px; margin-top: 12px; }
  .progress-bar-upload-fill { height: 100%; background: ${t.amber}; border-radius: 1px; transition: width 0.2s ease; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: ${t.amber}; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 8px; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .login-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 16px; }
  .login-card { background: ${t.bg1}; border: 1px solid ${t.border}; border-radius: 6px; padding: 48px 40px; width: 100%; max-width: 400px; }
  .login-eyebrow { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: ${t.amber}; text-transform: uppercase; margin-bottom: 8px; }
  .login-title { font-size: 22px; font-weight: 600; margin-bottom: 32px; color: ${t.textPrimary}; }
  .theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .theme-swatch { display: flex; align-items: center; gap: 10px; }
  .theme-swatch-preview { width: 32px; height: 32px; border-radius: 4px; border: 1px solid ${t.border}; flex-shrink: 0; cursor: pointer; }
  .theme-swatch-label { font-size: 12px; color: ${t.textSecondary}; }
  .theme-preview-bar { height: 48px; border-radius: 6px; border: 1px solid ${t.border}; margin-bottom: 20px; display: flex; align-items: center; padding: 0 16px; gap: 12px; overflow: hidden; }
  @media (max-width: 600px) {
    .main { padding: 16px; } .topbar { padding: 0 16px; }
    .track-row { grid-template-columns: 32px 1fr auto; } .track-duration { display: none; }
    .player-bar { flex-wrap: wrap; height: auto; padding: 10px 16px; gap: 10px; }
    .player-center { min-width: 100%; order: 3; }
    .player-track-info { max-width: 100%; min-width: 0; }
    .track-edit-grid { grid-template-columns: 1fr; } .login-card { padding: 32px 24px; }
    .theme-grid { grid-template-columns: 1fr 1fr; }
  }
`
}

export function fmtTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function hashPassword(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0 }
  return hash.toString(16)
}

// ─── Waveform seekbar ─────────────────────────────────────────────
function WaveformSeekbar({ src, progress, duration, onSeek, accentColor, mutedColor }) {
  const canvasRef = useRef(null)
  const waveRef   = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!src) return
    setReady(false); waveRef.current = null
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(src)
        const arrayBuf = await res.arrayBuffer()
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const decoded = await audioCtx.decodeAudioData(arrayBuf)
        audioCtx.close()
        if (cancelled) return
        const raw = decoded.getChannelData(0)
        const peaks = 200
        const blockSize = Math.floor(raw.length / peaks)
        const data = []
        for (let i = 0; i < peaks; i++) {
          let max = 0
          for (let j = 0; j < blockSize; j++) { const v = Math.abs(raw[i * blockSize + j]); if (v > max) max = v }
          data.push(max)
        }
        const maxVal = Math.max(...data)
        waveRef.current = data.map(v => v / maxVal)
        setReady(true)
      } catch(e) { console.warn('Waveform decode failed:', e) }
    })()
    return () => { cancelled = true }
  }, [src])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const peaks = waveRef.current
    if (!peaks) { ctx.fillStyle = mutedColor || '#2a2e42'; ctx.fillRect(0, H/2-1, W, 2); return }
    const progressRatio = duration ? progress / duration : 0
    const playedX = progressRatio * W
    const barW = W / peaks.length
    peaks.forEach((peak, i) => {
      const x = i * barW
      const barH = Math.max(2, peak * H * 0.9)
      const y = (H - barH) / 2
      const isPlayed = x < playedX
      ctx.fillStyle = isPlayed
        ? (accentColor || '#e8a44a')
        : (mutedColor || '#2a2e42')
      ctx.globalAlpha = isPlayed ? (0.5 + peak * 0.5) : (0.3 + peak * 0.5)
      ctx.fillRect(x, y, Math.max(1, barW - 1), barH)
    })
    ctx.globalAlpha = 1
  }, [ready, progress, duration, accentColor, mutedColor])

  const handleClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas || !duration) return
    const rect = canvas.getBoundingClientRect()
    onSeek((e.clientX - rect.left) / rect.width * duration)
  }

  return (
    <div className="waveform-wrap" onClick={handleClick}>
      <canvas ref={canvasRef} className="waveform-canvas" width={800} height={40} />
      {duration > 0 && (
        <div className="waveform-playhead" style={{ left:`${(duration ? progress/duration : 0)*100}%`, background: accentColor || '#e8a44a' }} />
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────
export default function App() {
  const [clientRow, setClientRow]       = useState(null)
  const [loading, setLoading]           = useState(true)
  const [toast, setToast]               = useState(null)
  const [theme, setTheme]               = useState(DEFAULT_THEME)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [progress, setProgress]         = useState(0)
  const [duration, setDuration]         = useState(0)
  const [signedUrl, setSignedUrl]       = useState(null)
  const audioRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const saved = sessionStorage.getItem('portal_client')
      if (saved) setClientRow(JSON.parse(saved))
      // Load theme from Supabase
      const { data } = await supabase.from('theme').select('colors').eq('id', 1).single()
      if (data?.colors && Object.keys(data.colors).length > 0) {
        setTheme({ ...DEFAULT_THEME, ...data.colors })
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleLogin = (client) => {
    setClientRow(client)
    sessionStorage.setItem('portal_client', JSON.stringify(client))
  }

  const handleSignOut = () => {
    setClientRow(null)
    sessionStorage.removeItem('portal_client')
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setCurrentTrack(null); setIsPlaying(false); setSignedUrl(null)
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const playTrack = useCallback(async (track) => {
    const el = audioRef.current
    if (!el) return
    const { data, error } = await supabase.storage.from('audio-tracks').createSignedUrl(track.file_path, 3600)
    if (error || !data?.signedUrl) { showToast('Could not load audio', 'error'); return }
    setSignedUrl(data.signedUrl)
    el.pause(); el.src = data.signedUrl; el.load()
    el.play().catch(console.error)
    setCurrentTrack(track); setIsPlaying(true); setProgress(0); setDuration(0)
  }, [])

  const togglePlay = () => {
    const el = audioRef.current
    if (!el || !currentTrack) return
    if (isPlaying) el.pause(); else el.play().catch(console.error)
  }

  const seekTo = (time) => { if (audioRef.current) audioRef.current.currentTime = time }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: DEFAULT_THEME.bg0, color: DEFAULT_THEME.textMuted, fontFamily:'Space Mono,monospace', fontSize:13 }}>
      <span className="spinner" style={{borderTopColor: DEFAULT_THEME.amber}} />Loading…
    </div>
  )

  const css = buildCss(theme)

  return (
    <>
      <style>{css}</style>
      <audio
        ref={audioRef}
        onTimeUpdate={e => setProgress(e.target.currentTime)}
        onDurationChange={e => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <div className="portal">
        <div className="topbar">
          <div className="topbar-brand"><div className="topbar-brand-dot" />AUDIO PORTAL</div>
          <div className="topbar-right">
            {clientRow && (
              <>
                <span className={`mode-badge ${clientRow.role}`}>{clientRow.role === 'admin' ? '⬡ Admin' : 'Client'}</span>
                <span style={{ fontSize:13, color: theme.textSecondary }}>{clientRow.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
              </>
            )}
          </div>
        </div>

        {!clientRow
          ? <LoginPage onLogin={handleLogin} onToast={showToast} />
          : clientRow.role === 'admin'
            ? <AdminPage clientRow={clientRow} onPlay={playTrack} currentTrack={currentTrack} onToast={showToast} theme={theme} onThemeChange={setTheme} />
            : <ClientPage clientRow={clientRow} onPlay={playTrack} currentTrack={currentTrack} onToast={showToast} />
        }
      </div>

      {currentTrack && (
        <div className="player-bar">
          <div className="player-track-info">
            <div className="player-track-name">{currentTrack.versionLabel ? `${currentTrack.title} — ${currentTrack.versionLabel}` : currentTrack.title}</div>
            <div className="player-track-sub">{currentTrack.tags?.join(' · ')}</div>
          </div>
          <button className="player-play-btn" onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button>
          <div className="player-center">
            <WaveformSeekbar src={signedUrl} progress={progress} duration={duration} onSeek={seekTo} accentColor={theme.amber} mutedColor={theme.border} />
            <div className="player-times">
              <span className="time-label">{fmtTime(progress)}</span>
              <span className="time-label">{fmtTime(duration)}</span>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.msg}</div>}
    </>
  )
}
