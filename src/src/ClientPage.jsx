import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { T } from './App'

export default function ClientPage({ clientRow, onPlay, currentTrack, onToast }) {
  const [tracks, setTracks]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [activeTag, setActiveTag] = useState(null)

  useEffect(() => {
    fetchTracks()
  }, [])

  const fetchTracks = async () => {
    // Fetch all tracks assigned to this client (or assigned_to is empty = all clients)
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .order('uploaded_at', { ascending: false })

    // Filter client-side: show if assigned_to includes this client's id OR is empty
    const mine = (data || []).filter(t =>
      !t.assigned_to?.length || t.assigned_to.includes(clientRow.id)
    )
    setTracks(mine)
    setLoading(false)
  }

  const download = async (track) => {
    const { data, error } = await supabase.storage
      .from('audio-tracks')
      .createSignedUrl(track.file_path, 60) // 60 second download URL

    if (error || !data?.signedUrl) { onToast('Download failed', 'error'); return }

    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = track.file_name || track.title
    a.click()
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
          <div className="page-subtitle">
            Welcome back, {clientRow.name} · {tracks.length} track{tracks.length !== 1 ? 's' : ''} available
          </div>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          No tracks have been shared with you yet.
        </div>
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
                <button key={tag}
                  className={`tag-filter ${activeTag === tag ? 'active' : ''}`}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}>
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div className="section-header">
            {filtered.length} of {tracks.length} tracks
            {activeTag && ` · filtered by #${activeTag}`}
          </div>

          <div className="track-list" style={{paddingBottom:80}}>
            {filtered.length === 0 ? (
              <div className="empty-state" style={{padding:40}}>
                <div style={{fontSize:28, marginBottom:8}}>🔍</div>
                No tracks match your search
              </div>
            ) : filtered.map((track, i) => (
              <div key={track.id}
                className={`track-row ${currentTrack?.id === track.id ? 'playing' : ''}`}
                onClick={() => onPlay(track)}
              >
                <div className={`track-num ${currentTrack?.id === track.id ? 'playing-indicator' : ''}`}>
                  {currentTrack?.id === track.id ? '♪' : i + 1}
                </div>
                <div className="track-info">
                  <div className={`track-name ${currentTrack?.id === track.id ? 'playing' : ''}`}>{track.title}</div>
                  <div className="track-meta">
                    <div className="track-tags-inline">
                      {track.tags?.map(tag => <span key={tag} className="tag-inline">#{tag}</span>)}
                    </div>
                  </div>
                </div>
                <div className="track-duration">
                  {track.file_size ? (track.file_size / 1024 / 1024).toFixed(1) + ' MB' : ''}
                </div>
                <div className="track-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" title="Preview" onClick={() => onPlay(track)}>▶</button>
                  <button className="btn-icon" title="Download" onClick={() => download(track)}>↓</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
