import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import LoginPage from './LoginPage'
import AdminPage from './AdminPage'
import ClientPage from './ClientPage'

export const DEFAULT_THEME = {
  bg0: '#0a0b0f', bg1: '#11131a', bg2: '#191c26', bg3: '#222534',
  border: '#2a2e42', amber: '#e8a44a', amberDim: '#7a5520',
  green: '#4ade80', red: '#f87171',
  textPrimary: '#f0eee8', textSecondary: '#8b8fa8', textMuted: '#4a4e65',
}

export function buildCss(t) {
  return `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Space Grotesk', sans-serif; background: ${t.bg0}; color: ${t.textPrimary}; min-height: 100vh; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${t.bg1}; } ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 2px; }
  .portal { min-height: 100vh; display: flex; flex-direction: column; }
  .topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 60px; background: ${t.bg1}; border-bottom: 1px solid ${t.border}; position: sticky; top: 0; z-index: 100; }
  .topbar-brand { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 800; letter-spacing: 0.08em; color: ${t.amber}; display: flex; align-items: center; gap: 10px; }
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
  .track-row { display: grid; grid-template-columns: 40px 1fr auto; gap: 16px; align-items: center; background: ${t.bg1}; border: 1px solid transparent; border-radius: 4px; padding: 12px 16px; transition: border-color 0.15s; cursor: pointer; }
  .track-row:hover { border-color: ${t.border}; }
  .track-row.playing { border-color: ${t.amberDim}; background: ${t.bg2}; cursor: default; }
  .track-row.playing:hover { border-color: ${t.amberDim}; background: ${t.bg2}; }
  .track-row:not(.playing):hover { background: ${t.bg2}; }
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
  .inline-player { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
  .inline-play-btn { width: 30px; height: 30px; border-radius: 50%; background: ${t.amber}; color: ${t.bg0}; border: none; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
  .inline-play-btn:hover { filter: brightness(1.15); }
  .inline-waveform { flex: 1; position: relative; height: 36px; cursor: pointer; }
  .inline-waveform canvas { display: block; width: 100%; height: 100%; }
  .inline-playhead { position: absolute; top: 0; bottom: 0; width: 2px; background: ${t.amber}; pointer-events: none; transform: translateX(-50%); }
  .inline-times { display: flex; justify-content: space-between; margin-top: 3px; }
  .time-label { font-family: 'Space Mono', monospace; font-size: 10px; color: ${t.textMuted}; }
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

// ─── Inline waveform seekbar (used inside track rows) ─────────────
export function InlineSeekbar({ peaks, progress, duration, onSeek, accentColor, mutedColor }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !peaks || peaks.length === 0) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const progressRatio = duration ? progress / duration : 0
    const playedX = progressRatio * W
    const barW = W / peaks.length
    peaks.forEach((peak, i) => {
      const x = i * barW
      const barH = Math.max(2, peak * H * 0.85)
      const y = (H - barH) / 2
      const isPlayed = x < playedX
      ctx.fillStyle = isPlayed ? (accentColor || '#e8a44a') : (mutedColor || '#2a2e42')
      ctx.globalAlpha = isPlayed ? (0.5 + peak * 0.4) : (0.25 + peak * 0.35)
      ctx.fillRect(x, y, Math.max(1, barW - 0.8), barH)
    })
    ctx.globalAlpha = 1
  }, [peaks, progress, duration, accentColor, mutedColor])

  const handleClick = (e) => {
    if (!duration) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width  // use rendered width, not canvas.width
    onSeek(Math.max(0, Math.min(1, ratio)) * duration)
  }

  return (
    <div className="inline-waveform"
      onClick={e => { e.stopPropagation(); handleClick(e) }}
      style={{cursor: duration ? 'pointer' : 'default', paddingTop:6, paddingBottom:6, marginTop:-6, marginBottom:-6}}>
      <canvas ref={canvasRef} width={800} height={36} style={{display:'block', width:'100%', height:36}} />
      {duration > 0 && (
        <div className="inline-playhead" style={{
          left: `${duration ? (progress / duration) * 100 : 0}%`,
          background: accentColor || '#e8a44a'
        }} />
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

  // ── Signed URL cache — persists for the session ───────────────
  const urlCache = useRef({})

  const getCachedUrl = async (filePath) => {
    if (urlCache.current[filePath]) return urlCache.current[filePath]
    const { data, error } = await supabase.storage.from('audio-tracks').createSignedUrl(filePath, 7200)
    if (error || !data?.signedUrl) return null
    urlCache.current[filePath] = data.signedUrl
    return data.signedUrl
  }

  // Preload signed URLs in the background after tracks are known
  const preloadUrls = useCallback(async (tracks) => {
    // Stagger requests so we don't hammer the API
    for (const track of tracks.slice(0, 20)) { // preload first 20
      if (!urlCache.current[track.file_path]) {
        await getCachedUrl(track.file_path)
        await new Promise(r => setTimeout(r, 100)) // 100ms gap between requests
      }
    }
  }, [])

  // ── Use refs for hot-path state to avoid stale closures ──────
  const currentTrackRef = useRef(null)
  const isPlayingRef    = useRef(false)
  const loadingRef      = useRef(null)

  // Keep refs in sync with state
  useEffect(() => { currentTrackRef.current = currentTrack }, [currentTrack])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  const handleSignOut = () => {
    setClientRow(null)
    sessionStorage.removeItem('portal_client')
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setCurrentTrack(null); setIsPlaying(false); setSignedUrl(null)
    currentTrackRef.current = null; isPlayingRef.current = false
    urlCache.current = {}
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const [loadingTrackId, setLoadingTrackId] = useState(null)

  // playTrack uses refs so it never has stale closure issues
  // and hits the cache synchronously when URL is already known
  const playTrack = useCallback((track) => {
    const el = audioRef.current
    if (!el) return

    // Guard against double-click while already loading this track
    if (loadingRef.current === track.id) return

    // Same track — just toggle
    const cur = currentTrackRef.current
    if (cur?.id === track.id && cur?.versionIdx === track.versionIdx) {
      if (isPlayingRef.current) el.pause()
      else el.play().catch(console.error)
      return
    }

    // Optimistic — highlight immediately before any async work
    setCurrentTrack(track)
    setIsPlaying(false)
    setProgress(0)
    setDuration(0)

    // If URL already cached — start playing synchronously, zero delay
    const cachedUrl = urlCache.current[track.file_path]
    if (cachedUrl) {
      setSignedUrl(cachedUrl)
      el.pause()
      el.src = cachedUrl
      el.load()
      el.play().catch(console.error)
      return
    }

    // URL not cached yet — show spinner and fetch
    loadingRef.current = track.id
    setLoadingTrackId(track.id)

    supabase.storage.from('audio-tracks')
      .createSignedUrl(track.file_path, 7200)
      .then(({ data, error }) => {
        loadingRef.current = null
        setLoadingTrackId(null)
        if (error || !data?.signedUrl) { showToast('Could not load audio', 'error'); setCurrentTrack(null); return }
        const url = data.signedUrl
        urlCache.current[track.file_path] = url
        setSignedUrl(url)
        el.pause()
        el.src = url
        el.load()
        el.play().catch(console.error)
      })
  }, []) // no dependencies — uses refs only

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el || !currentTrackRef.current) return
    if (isPlayingRef.current) el.pause()
    else el.play().catch(console.error)
  }, [])

  const seekTo = useCallback((time) => {
    if (audioRef.current) audioRef.current.currentTime = time
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: DEFAULT_THEME.bg0, color: DEFAULT_THEME.textMuted, fontFamily:'Space Mono,monospace', fontSize:13 }}>
      <span className="spinner" style={{borderTopColor: DEFAULT_THEME.amber}} />Loading…
    </div>
  )

  const css = buildCss(theme)
  const playerProps = { currentTrack, isPlaying, progress, duration, signedUrl, onTogglePlay: togglePlay, onSeek: seekTo, theme, loadingTrackId, preloadUrls }

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
          <div className="topbar-brand"><div className="topbar-brand-dot" />CYPHER CACHE</div>
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
            ? <AdminPage clientRow={clientRow} onPlay={playTrack} playerProps={playerProps} onToast={showToast} theme={theme} onThemeChange={setTheme} />
            : <ClientPage clientRow={clientRow} onPlay={playTrack} playerProps={playerProps} onToast={showToast} />
        }
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.msg}</div>}
    </>
  )
}
