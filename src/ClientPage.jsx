import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { T } from './App'

export default function ClientPage({ clientRow, onPlay, currentTrack, onToast }) {
  const [tracks, setTracks]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { fetchTracks() }, [])

  const fetchTracks = async () => {
    const { data } = await supabase.from('tracks').select('*').order('uploaded_at', { ascending: false })
    const mine = (data || []).filter(t => !t.assigned_to?.length || t.assigned_to.includes(clientRow.id))
    setTracks(mine)
    setLoading(false)
  }

  const download = async (track) => {
    const { data, error } = await supabase.storage
      .from('audio-tracks').createSignedUrl(track.file_path, 60)
    if (error || !data?.signedUrl) { onToast('Download failed', 'error'); return }
    const a = document.createElement('a')
    a.href = data.signedUrl; a.download = track.file_name || track.title; a.click()
    onToast('Download started')
  }

  const allTags = [...new Set(tracks.flatMap(t => t.tags || []))].sort()

  const filtered = tracks.filter(t => {
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.tags?.some(tag => tag.includes(search.toLowerCase()))
    const matchTag = !activeTag || t.tags?.includes(activeTag)
    return matchSearch && matchTag
  })

  if (loading) return (
    <div className="main" style={{ display:'flex', alignItems:'center', gap:10, color: T.textMuted, fontFamily:'Space Mono,monospace', fontSize:13 }}>
      <span className="spinner"/>Loading your files…
    </div>
  )

  return (
    <div className="main">
      <div className="page-header">
        <div>
          <div className="page-title">Your Files</div>
          <div className="page-subtitle">Welcome back, {clientRow.name} · {tracks.length} track{tracks.length !== 1 ? 's' : ''} available</div>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🎵</div>No tracks have been shared with you yet.</div>
      ) : (
        <>
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
                <button key={tag} className={`tag-filter ${activeTag === tag ? 'active' : ''}`}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}>#{tag}</button>
              ))}
            </div>
          )}

          <div className="section-header">
            {filtered.length} of {tracks.length} tracks{activeTag && ` · #${activeTag}`}
          </div>

          <div className="track-list" style={{paddingBottom:80}}>
            {filtered.length === 0 ? (
              <div className="empty-state" style={{padding:40}}>
                <div style={{fontSize:28, marginBottom:8}}>🔍</div>No tracks match your search
              </div>
            ) : filtered.map((track, i) => {
              const versions = track.versions || []
              const isExpanded = expandedId === track.id
              const isMainPlaying = currentTrack?.id === track.id && currentTrack?.versionIdx === undefined

              return (
                <div key={track.id}>
                  {/* Main track row */}
                  <div className={`track-row ${isMainPlaying ? 'playing' : ''}`}
                    onClick={() => onPlay(track)}>
                    <div className={`track-num ${isMainPlaying ? 'playing-indicator' : ''}`}>
                      {isMainPlaying ? '♪' : i + 1}
                    </div>
                    <div className="track-info">
                      <div className={`track-name ${isMainPlaying ? 'playing' : ''}`}>
                        {track.title}
                        {versions.length > 0 && (
                          <span style={{fontSize:10, fontFamily:'Space Mono,monospace', color:T.amber, marginLeft:8, opacity:0.8}}>
                            +{versions.length} version{versions.length!==1?'s':''}
                          </span>
                        )}
                      </div>
                      <div className="track-meta">
                        <div className="track-tags-inline">
                          {track.tags?.map(tag => <span key={tag} className="tag-inline">#{tag}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="track-duration">{track.file_size ? (track.file_size/1024/1024).toFixed(1)+' MB' : ''}</div>
                    <div className="track-actions" onClick={e => e.stopPropagation()}>
                      {versions.length > 0 && (
                        <button className={`btn-icon ${isExpanded ? 'edit-active' : ''}`} title="Show versions"
                          onClick={() => setExpandedId(isExpanded ? null : track.id)}>
                          {isExpanded ? '▴' : '▾'}
                        </button>
                      )}
                      <button className="btn-icon" title="Preview" onClick={() => onPlay(track)}>▶</button>
                      <button className="btn-icon" title="Download" onClick={() => download(track)}>↓</button>
                    </div>
                  </div>

                  {/* Version rows */}
                  {isExpanded && versions.map((v, vi) => {
                    const isVersionPlaying = currentTrack?.id === track.id && currentTrack?.versionIdx === vi
                    return (
                      <div key={vi}
                        className={`track-row ${isVersionPlaying ? 'playing' : ''}`}
                        style={{paddingLeft:56, background:'#0e1018', borderTop:'1px solid #1a1d2a'}}
                        onClick={() => onPlay({...track, file_path:v.file_path, file_name:v.file_name, file_size:v.file_size, versionIdx:vi, versionLabel:v.label})}>
                        <div style={{fontSize:10, fontFamily:'Space Mono,monospace', color:T.amber}}>↳</div>
                        <div className="track-info">
                          <div className={`track-name ${isVersionPlaying ? 'playing' : ''}`} style={{fontSize:13}}>
                            {v.label}
                          </div>
                        </div>
                        <div className="track-duration">{v.file_size ? (v.file_size/1024/1024).toFixed(1)+' MB' : ''}</div>
                        <div className="track-actions" onClick={e => e.stopPropagation()}>
                          <button className="btn-icon" title="Preview"
                            onClick={() => onPlay({...track, file_path:v.file_path, file_name:v.file_name, file_size:v.file_size, versionIdx:vi, versionLabel:v.label})}>▶</button>
                          <button className="btn-icon" title="Download"
                            onClick={() => download({...track, file_path:v.file_path, file_name:v.file_name})}>↓</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
