import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from './supabase'
import LoginPage from './LoginPage'
import AdminPage from './AdminPage'
import ClientPage from './ClientPage'

// ── Cypher Cache palette ──────────────────────────────────────────
// Brand imagery: black field, organic coral forms radiating to cyan cores,
// crystalline accents. The signature is the coral→cyan gradient; everything
// structural stays neutral grey/black so the accent reads as energy, not noise.
// Token names `amber`/`amberDim` are retained (remapped to coral) so existing
// references keep working; `cyan`/`cyanDim` and the gradient tokens are new.
export const DEFAULT_THEME = {
  bg0: '#0a0a0a', bg1: '#141414', bg2: '#1d1d1d', bg3: '#262626',
  border: '#2a2a2a',
  amber: '#e8432c', amberDim: '#5e2118',   // coral (primary accent)
  cyan: '#3fd9c4', cyanDim: '#1c5c54',      // cyan (secondary accent)
  gold: '#f0a93a',                          // amber, sparing tertiary use only
  green: '#4ade80', red: '#f87171',
  textPrimary: '#f0efed', textSecondary: '#999999', textMuted: '#6a6a6a',
}

// ── Analytics ────────────────────────────────────────────────────
// Fire-and-forget event logger. Never throws into the UI — analytics must
// never break playback or downloads. One row per play (once a track passes the
// 4s threshold) and per download.
export async function logTrackEvent({ trackId, clientId, eventType, versionIdx = null }) {
  if (!trackId || !eventType) return
  try {
    await supabase.from('track_events').insert({
      track_id: trackId,
      client_id: clientId || null,
      event_type: eventType,
      version_idx: versionIdx,
    })
  } catch {
    // swallow — a failed analytics write should be invisible to the user
  }
}

export function buildCss(t) {
  const coral = t.amber, cyan = t.cyan || '#3fd9c4'
  // The signature gradient — coral core bleeding to cyan, echoing the brand render.
  const grad = `linear-gradient(135deg, ${coral} 0%, ${coral} 35%, ${cyan} 100%)`
  const gradRadial = `radial-gradient(circle at 30% 30%, ${coral} 0%, ${coral} 45%, ${cyan} 100%)`
  return `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Space Grotesk', sans-serif; background: ${t.bg0}; color: ${t.textPrimary}; min-height: 100vh; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${t.bg1}; } ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: ${coral}; }
  .grad-text { background: ${grad}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; }
  .portal { min-height: 100vh; display: flex; flex-direction: column; }
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px; height: 84px;
    background: url('/topbar-bg.png') center 35% / cover;
    border-bottom: 1px solid ${t.border};
    position: sticky; top: 0; z-index: 100;
  }
  .topbar::before {
    content: '';
    position: absolute; inset: 0;
    background: rgba(10,11,15,0.68);
    z-index: 0;
  }
  .topbar { position: relative; }
  .topbar-brand, .topbar-right { position: relative; z-index: 1; }
  .topbar-brand { color: #ffffff; text-shadow: 0 1px 6px rgba(0,0,0,0.6); }
  .topbar-right .mode-badge { backdrop-filter: blur(6px); background: rgba(10,11,15,0.7); }
  .topbar-right .btn-ghost { backdrop-filter: blur(6px); background: rgba(10,11,15,0.4); }
  .topbar-brand { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 800; letter-spacing: 0.08em; display: flex; align-items: center; gap: 10px; }
  .topbar-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: ${gradRadial}; animation: pulse 2s ease-in-out infinite; box-shadow: 0 0 8px ${coral}, 0 0 4px rgba(0,0,0,0.5); }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .mode-badge { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; padding: 4px 10px; border-radius: 2px; text-transform: uppercase; background: ${t.bg3}; color: ${t.textSecondary}; border: 1px solid ${t.border}; }
  .mode-badge.admin { background: ${t.bg0}; color: ${t.amber}; border-color: ${t.amberDim}; }
  .btn { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 500; padding: 8px 18px; border-radius: 3px; border: none; cursor: pointer; transition: all 0.15s; }
  .btn-primary { background: ${grad}; color: ${t.bg0}; font-weight: 600; } .btn-primary:hover { filter: brightness(1.08) saturate(1.1); } .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: ${t.textSecondary}; border: 1px solid ${t.border}; } .btn-ghost:hover { border-color: ${t.textSecondary}; color: ${t.textPrimary}; }
  .btn-danger { background: ${t.bg0}; color: ${t.red}; border: 1px solid ${t.red}; opacity: 0.7; } .btn-danger:hover { opacity: 1; }
  .btn-sm { font-size: 11px; padding: 5px 12px; }
  .btn-icon { background: transparent; border: 1px solid ${t.border}; color: ${t.textSecondary}; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 3px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
  .btn-icon:hover { border-color: ${cyan}; color: ${cyan}; }
  .btn-icon.edit-active { border-color: ${coral}; color: ${coral}; background: ${t.bg0}; }
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
  .tag-filter:hover { border-color: ${cyan}; color: ${cyan}; }
  .tag-filter.active { background: ${t.bg0}; border-color: ${coral}; color: ${coral}; }
  .tag-filter-label { font-size: 11px; color: ${t.textMuted}; align-self: center; font-family: 'Space Mono', monospace; white-space: nowrap; }
  .track-list { display: flex; flex-direction: column; gap: 2px; }
  .track-row { display: grid; grid-template-columns: 40px 1fr auto; gap: 16px; align-items: center; background: ${t.bg1}; border: 1px solid transparent; border-radius: 4px; padding: 12px 16px; transition: border-color 0.15s; cursor: pointer; }
  .track-row:hover { border-color: ${t.border}; }
  .track-row.playing { border-color: transparent; background: ${t.bg2}; cursor: default; position: relative; border-left: 2px solid transparent; border-image: ${grad} 1; box-shadow: inset 0 0 0 1px rgba(232,67,44,0.12); }
  .track-row.playing:hover { background: ${t.bg2}; }
  .track-row:not(.playing):hover { background: ${t.bg2}; }
  .track-row.editing { border-color: ${coral} !important; border-radius: 4px 4px 0 0; background: ${t.bg2}; }
  .track-num { font-family: 'Space Mono', monospace; font-size: 12px; color: ${t.textMuted}; text-align: center; }
  .track-num.playing-indicator { font-size: 16px; background: ${grad}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; }
  .track-info { min-width: 0; }
  .track-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .track-name.playing { background: ${grad}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; }
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
  .inline-play-btn { width: 30px; height: 30px; border-radius: 50%; background: ${grad}; color: ${t.bg0}; border: none; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
  .inline-play-btn:hover { filter: brightness(1.08) saturate(1.1); }
  .inline-waveform { flex: 1; position: relative; height: 36px; cursor: pointer; }
  .inline-waveform canvas { display: block; width: 100%; height: 100%; }
  .inline-playhead { position: absolute; top: 0; bottom: 0; width: 2px; background: ${cyan}; pointer-events: none; transform: translateX(-50%); box-shadow: 0 0 6px ${cyan}; }
  .inline-times { display: flex; justify-content: space-between; margin-top: 3px; }
  .time-label { font-family: 'Space Mono', monospace; font-size: 10px; color: ${t.textMuted}; }
  .tabs { display: flex; margin-bottom: 28px; border-bottom: 1px solid ${t.border}; }
  .tab { padding: 10px 20px; font-size: 13px; font-weight: 500; color: ${t.textSecondary}; cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s; font-family: 'Space Grotesk', sans-serif; }
  .tab:hover { color: ${t.textPrimary}; } .tab.active { color: ${coral}; border-bottom: 2px solid transparent; border-image: ${grad} 1; }
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
  .progress-bar-upload-fill { height: 100%; background: ${grad}; border-radius: 1px; transition: width 0.2s ease; }
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
// Progress advances ~4x/sec. Redrawing the canvas (clearRect + repaint) on
// every tick blanks the waveform momentarily each frame — that's the flicker.
// Instead we draw the bars ONCE (only when peaks/colors change): a muted base
// layer and an accent "played" layer stacked on top. On each progress tick we
// only update the played layer's clip-path via inline style — a style-only
// change that composites without ever clearing the canvas, so no flash.
export function InlineSeekbar({ peaks, progress, duration, onSeek, accentColor, mutedColor, cyanColor }) {
  const baseRef   = useRef(null)
  const playedRef = useRef(null)

  const drawLayer = (canvas, color, alphaFor, color2) => {
    if (!canvas || !peaks || peaks.length === 0) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    // If a second color is given, paint bars with a horizontal gradient
    // (coral → cyan) so the played portion carries the brand signature.
    let fill = color
    if (color2) {
      fill = ctx.createLinearGradient(0, 0, W, 0)
      fill.addColorStop(0, color)
      fill.addColorStop(1, color2)
    }
    const barW = W / peaks.length
    peaks.forEach((peak, i) => {
      const x = i * barW
      const barH = Math.max(2, peak * H * 0.85)
      const y = (H - barH) / 2
      ctx.fillStyle = fill
      ctx.globalAlpha = alphaFor(peak)
      ctx.fillRect(x, y, Math.max(1, barW - 0.8), barH)
    })
    ctx.globalAlpha = 1
  }

  // Draw both layers only when the waveform or colors change — NOT on progress.
  useEffect(() => {
    drawLayer(baseRef.current, mutedColor || '#2a2a2a', p => 0.25 + p * 0.35)
    drawLayer(playedRef.current, accentColor || '#e8432c', p => 0.55 + p * 0.4, cyanColor || '#3fd9c4')
  }, [peaks, accentColor, mutedColor, cyanColor])

  const ratio = duration ? Math.max(0, Math.min(1, progress / duration)) : 0

  const handleClick = (e) => {
    if (!duration) return
    const canvas = baseRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const r = (e.clientX - rect.left) / rect.width  // use rendered width, not canvas.width
    onSeek(Math.max(0, Math.min(1, r)) * duration)
  }

  const layerStyle = { position:'absolute', top:0, left:0, display:'block', width:'100%', height:'100%' }

  return (
    <div className="inline-waveform"
      onClick={e => { e.stopPropagation(); handleClick(e) }}
      style={{cursor: duration ? 'pointer' : 'default', paddingTop:6, paddingBottom:6, marginTop:-6, marginBottom:-6, position:'relative'}}>
      {/* spacer canvas establishes the box height; layers are absolutely stacked */}
      <canvas width={800} height={36} style={{display:'block', width:'100%', height:36, visibility:'hidden'}} />
      <canvas ref={baseRef} width={800} height={36} style={layerStyle} />
      <canvas ref={playedRef} width={800} height={36}
        style={{ ...layerStyle, clipPath: `inset(0 ${(1 - ratio) * 100}% 0 0)` }} />
      {duration > 0 && (
        <div className="inline-playhead" style={{
          left: `${ratio * 100}%`,
          background: cyanColor || '#3fd9c4'
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
  const playLoggedRef   = useRef(false)   // has the current track passed 4s & been logged?
  const clientRowRef    = useRef(null)    // current client, for the audio event closures
  const nextTrackResolverRef = useRef(null) // ClientPage sets this: (currentTrackId) => nextVisibleTrack | null

  // Keep refs in sync with state
  useEffect(() => { currentTrackRef.current = currentTrack }, [currentTrack])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { clientRowRef.current = clientRow }, [clientRow])

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

    // Same track — just toggle. Read the element's real state (el.paused)
    // rather than a synced ref, which lags one commit behind and causes
    // missed / no-op clicks during rapid toggling or mid-render.
    const cur = currentTrackRef.current
    if (cur?.id === track.id && cur?.versionIdx === track.versionIdx) {
      if (el.paused) el.play().catch(console.error)
      else el.pause()
      return
    }

    // Optimistic — highlight immediately before any async work
    setCurrentTrack(track)
    setIsPlaying(false)
    setProgress(0)
    setDuration(0)
    playLoggedRef.current = false   // new track — allow one play event once it passes 4s

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
    // el.paused is the synchronous source of truth; isPlayingRef lags a commit
    if (el.paused) el.play().catch(console.error)
    else el.pause()
  }, [])

  const seekTo = useCallback((time) => {
    if (audioRef.current) audioRef.current.currentTime = time
  }, [])

  // Stylesheet only depends on theme — memoize so a progress tick (4x/sec)
  // doesn't recompute and re-inject this entire <style> block every time.
  // NOTE: these hooks must stay ABOVE the early `loading` return — hooks must
  // run in the same order on every render.
  const css = useMemo(() => buildCss(theme), [theme])

  // Split the bundle: everything that is stable across a playback tick goes in
  // playerBase (memoized by identity), while progress/duration — which change
  // ~4x/sec — are passed separately so only the active row consumes them.
  const playerBase = useMemo(() => ({
    currentTrack, isPlaying, signedUrl,
    onTogglePlay: togglePlay, onSeek: seekTo,
    theme, loadingTrackId, preloadUrls,
  }), [currentTrack, isPlaying, signedUrl, togglePlay, seekTo, theme, loadingTrackId, preloadUrls])

  const playerProps = useMemo(() => ({
    ...playerBase, progress, duration,
  }), [playerBase, progress, duration])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: DEFAULT_THEME.bg0, color: DEFAULT_THEME.textMuted, fontFamily:'Space Mono,monospace', fontSize:13 }}>
      <span className="spinner" style={{borderTopColor: DEFAULT_THEME.amber}} />Loading…
    </div>
  )

  return (
    <>
      <style>{css}</style>
      <audio
        ref={audioRef}
        onTimeUpdate={e => {
          const t = e.target.currentTime
          setProgress(t)
          // Log a "play" once, after 4s of playback. Pure ref check + fire-and-
          // forget insert — no state update here, so it can't cause re-renders.
          if (!playLoggedRef.current && t >= 4) {
            playLoggedRef.current = true
            const tr = currentTrackRef.current
            // Skip analytics for admin accounts — only client activity counts.
            if (tr && clientRowRef.current?.role !== 'admin') logTrackEvent({
              trackId: tr.id,
              clientId: clientRowRef.current?.id,
              eventType: 'play',
              versionIdx: tr.versionIdx ?? null,
            })
          }
        }}
        onDurationChange={e => setDuration(e.target.duration)}
        onEnded={() => {
          setIsPlaying(false)
          // Auto-advance: ask the client list for the next VISIBLE track (in the
          // order currently displayed, respecting filters). Plays it, or stops
          // if the finished track was the last visible one.
          const cur = currentTrackRef.current
          const resolver = nextTrackResolverRef.current
          if (cur && resolver) {
            const next = resolver(cur.id)
            if (next) playTrack(next)
          }
        }}
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
                <span style={{ fontSize:13, color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{clientRow.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
              </>
            )}
          </div>
        </div>

        {!clientRow
          ? <LoginPage onLogin={handleLogin} onToast={showToast} />
          : clientRow.role === 'admin'
            ? <AdminPage clientRow={clientRow} onPlay={playTrack} playerProps={playerProps} onToast={showToast} theme={theme} onThemeChange={setTheme} />
            : <ClientPage clientRow={clientRow} onPlay={playTrack} playerProps={playerProps} onToast={showToast} registerNextResolver={fn => { nextTrackResolverRef.current = fn }} />
        }
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.msg}</div>}
    </>
  )
}
