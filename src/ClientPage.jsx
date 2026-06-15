import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { DEFAULT_THEME as T, fmtTime, InlineSeekbar } from './App'

function fmtDuration(sec) {
  if (!sec || !isFinite(sec)) return ''
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function WaveformBg({ peaks, baseColor }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !peaks || peaks.length === 0) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const barW = W / peaks.length
    peaks.forEach((peak, i) => {
      const x = i * barW
      const barH = Math.max(1, peak * 16)
      const y = (H - barH) / 2
      ctx.fillStyle = baseColor || '#2a2e42'
      ctx.globalAlpha = 0.25 + peak * 0.4
      ctx.fillRect(x, y, Math.max(1, barW - 0.8), barH)
    })
    ctx.globalAlpha = 1
  }, [peaks, baseColor])
  return (
    <canvas ref={canvasRef} width={500} height={40}
      style={{ display:'block', width:'100%', height:40, pointerEvents:'none' }} />
  )
}

function FeaturedCard({ track, isPlaying, onPlay }) {
  const [bgUrl, setBgUrl] = useState(null)
  useEffect(() => {
    if (!track.featured_image) return
    supabase.storage.from('featured-images').createSignedUrl(track.featured_image, 3600)
      .then(({ data }) => { if (data?.signedUrl) setBgUrl(data.signedUrl) })
  }, [track.featured_image])

  return (
    <div onClick={onPlay} style={{
      position: 'relative', height: 180, borderRadius: 6, overflow: 'hidden',
      cursor: 'pointer', border: `1px solid ${isPlaying ? T.amber : T.border}`,
      background: T.bg2, transition: 'all 0.2s',
    }}>
      {bgUrl && <div style={{ position:'absolute', inset:0, backgroundImage:`url(${bgUrl})`, backgroundSize:'cover', backgroundPosition:'center' }} />}
      <div style={{
        position: 'absolute', inset: 0,
        background: bgUrl
          ? 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)'
          : `linear-gradient(to top, ${T.bg0} 0%, transparent 100%)`,
      }} />
      <div style={{
        position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%',
        background: isPlaying ? T.amber : 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: isPlaying ? T.bg0 : '#fff', transition: 'all 0.15s',
        border: `1px solid ${isPlaying ? T.amber : 'rgba(255,255,255,0.3)'}`,
      }}>
        {isPlaying ? '♪' : '▶'}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:4, textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>
          {track.title}
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontFamily:'Space Mono,monospace' }}>
          {[fmtDuration(track.duration), track.bpm ? `${track.bpm} BPM` : null].filter(Boolean).join(' · ')}
        </div>
        {track.tags?.length > 0 && (
          <div style={{display:'flex', gap:4, flexWrap:'wrap', marginTop:6}}>
            {track.tags.slice(0,3).map(tag => (
              <span key={tag} style={{ fontFamily:'Space Mono,monospace', fontSize:10, padding:'1px 6px', borderRadius:1, background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.8)' }}>#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClientPage({ clientRow, onPlay, playerProps, onToast }) {
  const [tracks, setTracks]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [activeTag, setActiveTag]   = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const { currentTrack, isPlaying, progress, duration, onTogglePlay, onSeek, theme, loadingTrackId, preloadUrls } = playerProps
  const accentColor = theme?.amber || T.amber
  const mutedColor  = theme?.border || T.border

  useEffect(() => { fetchTracks() }, [])

  const fetchTracks = async () => {
    const { data } = await supabase.from('tracks').select('*').order('sort_order', { ascending: true })
    const mine = (data || []).filter(t => !t.assigned_to?.length || t.assigned_to.includes(clientRow.id))
    setTracks(mine)
    setLoading(false)
    // Preload signed URLs in background after tracks are shown
    if (preloadUrls && mine.length > 0) {
      setTimeout(() => preloadUrls(mine), 500)
    }
  }

  const download = async (track) => {
    const { data, error } = await supabase.storage.from('audio-tracks').createSignedUrl(track.file_path, 60)
    if (error || !data?.signedUrl) { onToast('Download failed', 'error'); return }
    const a = document.createElement('a')
    a.href = data.signedUrl; a.download = track.file_name || track.title; a.click()
    onToast('Download started')
  }

  const isTrackActive = (track, versionIdx) =>
    currentTrack?.id === track.id && currentTrack?.versionIdx === versionIdx

  const allTags = [...new Set(tracks.flatMap(t => t.tags || []))].sort()
  const filtered = tracks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.tags?.some(tag => tag.includes(search.toLowerCase()))
    const matchTag = !activeTag || t.tags?.includes(activeTag)
    return matchSearch && matchTag
  })
  const featuredTracks = tracks.filter(t => t.featured)
  const showFeatured = featuredTracks.length > 0 && !search && !activeTag

  if (loading) return (
    <div className="main" style={{ display:'flex', alignItems:'center', gap:10, color: T.textMuted, fontFamily:'Space Mono,monospace', fontSize:13 }}>
      <span className="spinner"/>Loading your files…
    </div>
  )

  const TrackRow = ({ track, i }) => {
    const versions    = track.versions || []
    const isExpanded  = expandedId === track.id
    const isActive    = isTrackActive(track, undefined)
    const peaks       = track.waveform_peaks || []

    return (
      <div>
        <div
          className={`track-row ${isActive ? 'playing' : ''}`}
          style={{ gridTemplateColumns:'40px 1fr auto', alignItems: isActive ? 'start' : 'center' }}
          onClick={() => onPlay(track)}
        >
          {/* Number / playing indicator */}
          <div className={`track-num ${isActive ? 'playing-indicator' : ''}`} style={{paddingTop: isActive ? 4 : 0}}>
            {loadingTrackId === track.id
              ? <span className="spinner" style={{margin:0, width:12, height:12, borderWidth:2}} />
              : isActive ? '♪' : i + 1
            }
          </div>

          {/* Main content column */}
          <div style={{display:'flex', flexDirection:'column', gap:4, minWidth:0}}>
            <div className={`track-name ${isActive ? 'playing' : ''}`}>
              {track.title}
              {versions.length > 0 && (
                <span style={{fontSize:10, fontFamily:'Space Mono,monospace', color:accentColor, marginLeft:8, opacity:0.8}}>
                  +{versions.length} version{versions.length!==1?'s':''}
                </span>
              )}
            </div>

            {/* Inactive: static waveform bg */}
            {!isActive && peaks.length > 0 && (
              <WaveformBg peaks={peaks} baseColor={mutedColor} />
            )}

            {/* Active: inline player */}
            {isActive && (
              <div onClick={e => e.stopPropagation()}>
                <div className="inline-player">
                  <button className="inline-play-btn"
                    style={{background: accentColor, color: T.bg0}}
                    onClick={e => { e.stopPropagation(); onTogglePlay() }}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <InlineSeekbar
                    peaks={peaks.length > 0 ? peaks : null}
                    progress={progress}
                    duration={duration}
                    onSeek={onSeek}
                    accentColor={accentColor}
                    mutedColor={mutedColor}
                  />
                </div>
                <div className="inline-times">
                  <span className="time-label">{fmtTime(progress)}</span>
                  <span className="time-label">{fmtTime(duration)}</span>
                </div>
              </div>
            )}

            {/* Tags */}
            {track.tags?.length > 0 && (
              <div style={{display:'flex', gap:4, overflow:'hidden', flexWrap:'nowrap'}}>
                {track.tags.map(tag => <span key={tag} className="tag-inline" style={{flexShrink:0}}>#{tag}</span>)}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{display:'flex', alignItems:'center', gap:8, paddingTop: isActive ? 2 : 0}} onClick={e => e.stopPropagation()}>
            <div className="track-duration">
                {[fmtDuration(track.duration), track.bpm ? `${track.bpm} BPM` : null].filter(Boolean).join(' · ')}
              </div>
            {versions.length > 0 && (
              <button className={`btn-icon ${isExpanded ? 'edit-active' : ''}`} title="Show versions"
                onClick={() => setExpandedId(isExpanded ? null : track.id)}>
                {isExpanded ? '▴' : '▾'}
              </button>
            )}
            <button className="btn-icon" title="Download" onClick={() => download(track)}>↓</button>
          </div>
        </div>

        {/* Version rows */}
        {isExpanded && versions.map((v, vi) => {
          const isVersionActive = isTrackActive(track, vi)
          const vTrack = {...track, file_path:v.file_path, file_name:v.file_name, file_size:v.file_size, duration:v.duration, versionIdx:vi, versionLabel:v.label}
          return (
            <div key={vi}
              className={`track-row ${isVersionActive ? 'playing' : ''}`}
              style={{paddingLeft:56, borderTop:`1px solid ${T.border}`, gridTemplateColumns:'1fr auto', alignItems: isVersionActive ? 'start' : 'center'}}
              onClick={() => onPlay(vTrack)}>
              <div style={{display:'flex', flexDirection:'column', gap:4, minWidth:0}}>
                <div className={`track-name ${isVersionActive ? 'playing' : ''}`} style={{fontSize:13}}>↳ {v.label}</div>
                {isVersionActive && (
                  <div onClick={e => e.stopPropagation()}>
                    <div className="inline-player">
                      <button className="inline-play-btn"
                        style={{background: accentColor, color: T.bg0}}
                        onClick={e => { e.stopPropagation(); onTogglePlay() }}>
                        {isPlaying ? '⏸' : '▶'}
                      </button>
                      <InlineSeekbar peaks={v.waveform_peaks || []} progress={progress} duration={duration} onSeek={onSeek} accentColor={accentColor} mutedColor={mutedColor} />
                    </div>
                    <div className="inline-times">
                      <span className="time-label">{fmtTime(progress)}</span>
                      <span className="time-label">{fmtTime(duration)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8}} onClick={e => e.stopPropagation()}>
                <div className="track-duration">{fmtDuration(v.duration)}</div>
                <button className="btn-icon" title="Download" onClick={() => download(vTrack)}>↓</button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="main">
      <div className="page-header">
        <div>
          <div className="page-title">Your Files</div>
          <div className="page-subtitle">Welcome back, {clientRow.name} · {tracks.length} track{tracks.length!==1?'s':''} available</div>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🎵</div>No tracks have been shared with you yet.</div>
      ) : (
        <>
          {/* Featured */}
          {showFeatured && (
            <div style={{marginBottom:32}}>
              <div className="section-header" style={{display:'flex', alignItems:'center', gap:8}}>
                <span style={{color:accentColor}}>★</span> Featured
              </div>
              <div style={{display:'grid', gridTemplateColumns:`repeat(${featuredTracks.length}, 1fr)`, gap:12}}>
                {featuredTracks.map(track => (
                  <FeaturedCard key={track.id} track={track}
                    isPlaying={isTrackActive(track, undefined)}
                    onPlay={() => onPlay(track)} />
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="search-bar">
            <div className="search-input-wrap">
              <span className="search-icon">⌕</span>
              <input className="input search-input" placeholder="Search by title or tag…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="tag-filters">
              <span className="tag-filter-label">Filter:</span>
              {allTags.map(tag => (
                <button key={tag} className={`tag-filter ${activeTag===tag?'active':''}`}
                  onClick={() => setActiveTag(activeTag===tag?null:tag)}>#{tag}</button>
              ))}
            </div>
          )}

          <div className="section-header">
            {filtered.length} of {tracks.length} tracks{activeTag && ` · #${activeTag}`}
          </div>

          <div className="track-list" style={{paddingBottom:32}}>
            {filtered.length === 0
              ? <div className="empty-state" style={{padding:40}}><div style={{fontSize:28, marginBottom:8}}>🔍</div>No tracks match your search</div>
              : filtered.map((track, i) => <TrackRow key={track.id} track={track} i={i} />)
            }
          </div>
        </>
      )}
    </div>
  )
}
