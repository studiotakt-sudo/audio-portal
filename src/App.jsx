import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import LoginPage from './LoginPage'
import AdminPage from './AdminPage'
import ClientPage from './ClientPage'

export const T = {
  bg0: '#0a0b0f', bg1: '#11131a', bg2: '#191c26', bg3: '#222534',
  border: '#2a2e42', amber: '#e8a44a', amberDim: '#7a5520',
  green: '#4ade80', red: '#f87171',
  textPrimary: '#f0eee8', textSecondary: '#8b8fa8', textMuted: '#4a4e65',
}

export const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Space Grotesk', sans-serif; background: #0a0b0f; color: #f0eee8; min-height: 100vh; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #11131a; } ::-webkit-scrollbar-thumb { background: #2a2e42; border-radius: 2px; }
  .portal { min-height: 100vh; display: flex; flex-direction: column; }
  .topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 60px; background: #11131a; border-bottom: 1px solid #2a2e42; position: sticky; top: 0; z-index: 100; }
  .topbar-brand { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; letter-spacing: 0.15em; color: #e8a44a; display: flex; align-items: center; gap: 10px; }
  .topbar-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: #e8a44a; animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .mode-badge { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; padding: 4px 10px; border-radius: 2px; text-transform: uppercase; background: #222534; color: #8b8fa8; border: 1px solid #2a2e42; }
  .mode-badge.admin { background: #1a1200; color: #e8a44a; border-color: #7a5520; }
  .btn { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 500; padding: 8px 18px; border-radius: 3px; border: none; cursor: pointer; transition: all 0.15s; }
  .btn-primary { background: #e8a44a; color: #0a0800; } .btn-primary:hover { background: #f0b860; } .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: #8b8fa8; border: 1px solid #2a2e42; } .btn-ghost:hover { border-color: #8b8fa8; color: #f0eee8; }
  .btn-danger { background: #3a1010; color: #f87171; border: 1px solid #5a2020; } .btn-danger:hover { background: #4a1515; }
  .btn-sm { font-size: 11px; padding: 5px 12px; }
  .btn-icon { background: transparent; border: 1px solid #2a2e42; color: #8b8fa8; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 3px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
  .btn-icon:hover { border-color: #e8a44a; color: #e8a44a; }
  .btn-icon.edit-active { border-color: #e8a44a; color: #e8a44a; background: #1a1200; }
  .field { margin-bottom: 16px; }
  .label { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.08em; color: #8b8fa8; text-transform: uppercase; margin-bottom: 6px; }
  .input { width: 100%; background: #191c26; border: 1px solid #2a2e42; color: #f0eee8; padding: 10px 14px; border-radius: 3px; font-family: 'Space Grotesk', sans-serif; font-size: 14px; transition: border-color 0.15s; }
  .input:focus { outline: none; border-color: #e8a44a; } .input::placeholder { color: #4a4e65; }
  .input-error { border-color: #f87171 !important; }
  .error-msg { font-size: 12px; color: #f87171; margin-top: 8px; }
  .main { flex: 1; padding: 32px; max-width: 1200px; margin: 0 auto; width: 100%; }
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
  .page-title { font-size: 20px; font-weight: 600; } .page-subtitle { font-size: 13px; color: #8b8fa8; margin-top: 2px; }
  .upload-zone { border: 2px dashed #2a2e42; border-radius: 6px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 28px; background: #11131a; }
  .upload-zone:hover, .upload-zone.drag-over { border-color: #e8a44a; background: #12100a; }
  .upload-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.6; }
  .upload-hint { font-size: 13px; color: #8b8fa8; } .upload-hint strong { color: #e8a44a; }
  .upload-formats { font-size: 11px; color: #4a4e65; margin-top: 6px; font-family: 'Space Mono', monospace; }
  .upload-form { background: #11131a; border: 1px solid #2a2e42; border-radius: 6px; padding: 24px; margin-bottom: 28px; }
  .upload-form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .upload-form-title { font-size: 14px; font-weight: 600; }
  .upload-form-file { font-family: 'Space Mono', monospace; font-size: 11px; color: #e8a44a; margin-top: 4px; }
  .tag-input-row { display: flex; gap: 8px; }
  .tag-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .tag-chip { display: flex; align-items: center; gap: 4px; background: #222534; border: 1px solid #2a2e42; border-radius: 2px; padding: 3px 8px; font-size: 11px; font-family: 'Space Mono', monospace; color: #e8a44a; }
  .tag-chip-remove { cursor: pointer; background: none; border: none; color: #4a4e65; padding: 0; font-size: 13px; line-height: 1; display: flex; align-items: center; } .tag-chip-remove:hover { color: #f87171; }
  .search-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
  .search-input-wrap { position: relative; flex: 1; min-width: 200px; }
  .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #4a4e65; pointer-events: none; }
  .search-input { padding-left: 36px !important; }
  .tag-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .tag-filter { font-family: 'Space Mono', monospace; font-size: 11px; padding: 4px 10px; border-radius: 2px; cursor: pointer; border: 1px solid #2a2e42; background: #191c26; color: #8b8fa8; transition: all 0.15s; }
  .tag-filter:hover { border-color: #e8a44a; color: #e8a44a; }
  .tag-filter.active { background: #1a1200; border-color: #e8a44a; color: #e8a44a; }
  .tag-filter-label { font-size: 11px; color: #4a4e65; align-self: center; font-family: 'Space Mono', monospace; white-space: nowrap; }
  .track-list { display: flex; flex-direction: column; gap: 2px; }
  .track-row { display: grid; grid-template-columns: 40px 1fr auto auto; gap: 16px; align-items: center; background: #11131a; border: 1px solid transparent; border-radius: 4px; padding: 12px 16px; transition: all 0.15s; cursor: pointer; }
  .track-row:hover { border-color: #2a2e42; background: #191c26; }
  .track-row.playing { border-color: #7a5520; background: #12100a; }
  .track-row.editing { border-color: #e8a44a !important; border-radius: 4px 4px 0 0; background: #191c26; }
  .track-num { font-family: 'Space Mono', monospace; font-size: 12px; color: #4a4e65; text-align: center; }
  .track-num.playing-indicator { color: #e8a44a; font-size: 16px; }
  .track-info { min-width: 0; }
  .track-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .track-name.playing { color: #e8a44a; }
  .track-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
  .track-uploader { font-size: 11px; color: #4a4e65; }
  .track-tags-inline { display: flex; gap: 4px; flex-wrap: wrap; }
  .tag-inline { font-family: 'Space Mono', monospace; font-size: 10px; padding: 1px 6px; border-radius: 1px; background: #222534; border: 1px solid #2a2e42; color: #8b8fa8; }
  .track-duration { font-family: 'Space Mono', monospace; font-size: 12px; color: #4a4e65; white-space: nowrap; }
  .track-actions { display: flex; gap: 6px; }
  .track-edit-panel { background: #191c26; border: 1px solid #2a2e42; border-top: none; border-radius: 0 0 4px 4px; padding: 16px 20px 20px; margin-bottom: 2px; animation: expandDown 0.15s ease; }
  @keyframes expandDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
  .track-edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .track-edit-label { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: #4a4e65; text-transform: uppercase; margin-bottom: 8px; }
  .track-edit-actions { display: flex; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #2a2e42; }
  .player-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #11131a; border-top: 1px solid #2a2e42; padding: 0 24px; z-index: 200; display: flex; align-items: center; gap: 20px; height: 70px; }
  .player-track-info { min-width: 160px; max-width: 220px; }
  .player-track-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .player-track-sub { font-size: 11px; color: #4a4e65; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .player-play-btn { width: 36px; height: 36px; border-radius: 50%; background: #e8a44a; color: #0a0800; border: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
  .player-play-btn:hover { background: #f0b860; }
  .player-progress { flex: 2; display: flex; align-items: center; gap: 10px; min-width: 0; }
  .progress-bar { flex: 1; height: 3px; background: #222534; border-radius: 2px; cursor: pointer; }
  .progress-fill { height: 100%; background: #e8a44a; border-radius: 2px; transition: width 0.1s linear; }
  .time-label { font-family: 'Space Mono', monospace; font-size: 10px; color: #4a4e65; white-space: nowrap; }
  .visualiser-wrap { width: 120px; height: 40px; flex-shrink: 0; display: flex; align-items: center; }
  .tabs { display: flex; margin-bottom: 28px; border-bottom: 1px solid #2a2e42; }
  .tab { padding: 10px 20px; font-size: 13px; font-weight: 500; color: #8b8fa8; cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s; font-family: 'Space Grotesk', sans-serif; }
  .tab:hover { color: #f0eee8; } .tab.active { color: #e8a44a; border-bottom-color: #e8a44a; }
  .client-card { background: #11131a; border: 1px solid #2a2e42; border-radius: 6px; padding: 16px 20px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .client-name { font-size: 14px; font-weight: 500; } .client-meta { font-family: 'Space Mono', monospace; font-size: 11px; color: #8b8fa8; margin-top: 2px; }
  .empty-state { padding: 60px 20px; text-align: center; color: #4a4e65; font-size: 14px; }
  .empty-icon { font-size: 40px; opacity: 0.3; margin-bottom: 12px; }
  .section-header { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: #4a4e65; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #2a2e42; }
  .toast { position: fixed; top: 72px; right: 24px; padding: 10px 16px; border-radius: 4px; font-size: 13px; z-index: 300; animation: slideIn 0.2s ease; }
  .toast-success { background: #0a1f0a; border: 1px solid #2a5a2a; color: #4ade80; }
  .toast-error { background: #1f0a0a; border: 1px solid #5a2a2a; color: #f87171; }
  @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  .progress-bar-upload { height: 2px; background: #222534; border-radius: 1px; margin-top: 12px; }
  .progress-bar-upload-fill { height: 100%; background: #e8a44a; border-radius: 1px; transition: width 0.2s ease; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #e8a44a; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 8px; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .login-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 16px; }
  .login-card { background: #11131a; border: 1px solid #2a2e42; border-radius: 6px; padding: 48px 40px; width: 100%; max-width: 400px; }
  .login-eyebrow { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #e8a44a; text-transform: uppercase; margin-bottom: 8px; }
  .login-title { font-size: 22px; font-weight: 600; margin-bottom: 32px; }
  @media (max-width: 600px) {
    .main { padding: 16px; } .topbar { padding: 0 16px; }
    .track-row { grid-template-columns: 32px 1fr auto; } .track-duration { display: none; }
    .player-bar { flex-wrap: wrap; height: auto; padding: 10px 16px; gap: 10px; }
    .player-progress { min-width: 100%; order: 3; }
    .visualiser-wrap { display: none; }
    .track-edit-grid { grid-template-columns: 1fr; } .login-card { padding: 32px 24px; }
  }
`

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

// ─── Waveform Visualiser ──────────────────────────────────────────
function Visualiser({ audioRef, isPlaying }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const ctxRef    = useRef(null)     // AudioContext
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const connectedRef = useRef(false)

  // Set up Web Audio API analyser once
  const setupAnalyser = useCallback(() => {
    if (connectedRef.current || !audioRef.current) return
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      const source = audioCtx.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(audioCtx.destination)
      ctxRef.current = audioCtx
      analyserRef.current = analyser
      sourceRef.current = source
      connectedRef.current = true
    } catch (e) {
      console.error('Visualiser setup failed:', e)
    }
  }, [audioRef])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)

    ctx.clearRect(0, 0, W, H)

    const barCount = 28
    const barWidth = 3
    const gap = (W - barCount * barWidth) / (barCount - 1)

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor(i * bufferLength / barCount)
      const value = dataArray[dataIndex] / 255
      const barH = Math.max(2, value * H)
      const x = i * (barWidth + gap)
      const y = (H - barH) / 2

      // Amber with opacity based on intensity
      const alpha = 0.3 + value * 0.7
      ctx.fillStyle = `rgba(232, 164, 74, ${alpha})`
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barH, 1)
      ctx.fill()
    }

    animRef.current = requestAnimationFrame(draw)
  }, [])

  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const barCount = 28
    const barWidth = 3
    const gap = (W - barCount * barWidth) / (barCount - 1)
    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap)
      ctx.fillStyle = 'rgba(232, 164, 74, 0.15)'
      ctx.beginPath()
      ctx.roundRect(x, H / 2 - 1, barWidth, 2, 1)
      ctx.fill()
    }
  }, [])

  useEffect(() => {
    if (isPlaying) {
      setupAnalyser()
      if (ctxRef.current?.state === 'suspended') ctxRef.current.resume()
      animRef.current = requestAnimationFrame(draw)
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      drawIdle()
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [isPlaying, draw, drawIdle, setupAnalyser])

  // Draw idle state on mount
  useEffect(() => { drawIdle() }, [drawIdle])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={40}
      style={{ display:'block' }}
    />
  )
}

export default function App() {
  const [clientRow, setClientRow] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState(null)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [progress, setProgress]         = useState(0)
  const [duration, setDuration]         = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('portal_client')
    if (saved) setClientRow(JSON.parse(saved))
    setLoading(false)
  }, [])

  const handleLogin = (client) => {
    setClientRow(client)
    sessionStorage.setItem('portal_client', JSON.stringify(client))
  }

  const handleSignOut = () => {
    setClientRow(null)
    sessionStorage.removeItem('portal_client')
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setCurrentTrack(null); setIsPlaying(false)
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const playTrack = useCallback(async (track) => {
    const el = audioRef.current
    if (!el) return
    const { data, error } = await supabase.storage
      .from('audio-tracks')
      .createSignedUrl(track.file_path, 3600)
    if (error || !data?.signedUrl) { showToast('Could not load audio', 'error'); return }
    el.pause()
    el.src = data.signedUrl
    el.load()
    el.play().catch(console.error)
    setCurrentTrack(track)
    setIsPlaying(true)
    setProgress(0); setDuration(0)
  }, [])

  const togglePlay = () => {
    const el = audioRef.current
    if (!el || !currentTrack) return
    if (isPlaying) el.pause()
    else el.play().catch(console.error)
  }

  const seekTo = (e) => {
    const el = audioRef.current
    if (!el || !duration) return
    const bar = e.currentTarget
    const ratio = (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth
    el.currentTime = ratio * duration
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0b0f', color:'#4a4e65', fontFamily:'Space Mono,monospace', fontSize:13 }}>
      <span className="spinner" />Loading…
    </div>
  )

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
                <span style={{ fontSize:13, color:'#8b8fa8' }}>{clientRow.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
              </>
            )}
          </div>
        </div>
        {!clientRow
          ? <LoginPage onLogin={handleLogin} onToast={showToast} />
          : clientRow.role === 'admin'
            ? <AdminPage clientRow={clientRow} onPlay={playTrack} currentTrack={currentTrack} onToast={showToast} />
            : <ClientPage clientRow={clientRow} onPlay={playTrack} currentTrack={currentTrack} onToast={showToast} />
        }
      </div>

      {currentTrack && (
        <div className="player-bar">
          <div className="player-track-info">
            <div className="player-track-name">{currentTrack.title}</div>
            <div className="player-track-sub">{currentTrack.tags?.join(' · ')}</div>
          </div>
          <button className="player-play-btn" onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button>
          <div className="player-progress">
            <span className="time-label">{fmtTime(progress)}</span>
            <div className="progress-bar" onClick={seekTo}>
              <div className="progress-fill" style={{ width: `${duration ? (progress/duration)*100 : 0}%` }} />
            </div>
            <span className="time-label">{fmtTime(duration)}</span>
          </div>
          <div className="visualiser-wrap">
            <Visualiser audioRef={audioRef} isPlaying={isPlaying} />
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.msg}</div>}
    </>
  )
}
