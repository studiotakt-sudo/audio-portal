import { useState, useEffect, useRef, memo } from 'react'
import { supabase } from './supabase'
import { DEFAULT_THEME as T, fmtTime, InlineSeekbar } from './App'

function hashPassword(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0 }
  return hash.toString(16)
}

function fmtDuration(sec) {
  if (!sec || !isFinite(sec)) return ''
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const TrackMeta = memo(function TrackMeta({ size, duration, bpm }) {
  const parts = []
  if (duration) parts.push(fmtDuration(duration))
  if (bpm) parts.push(`${bpm} BPM`)
  if (size) parts.push((size / 1024 / 1024).toFixed(1) + ' MB')
  return <div className="track-duration">{parts.join(' · ')}</div>
})

const WaveformBg = memo(function WaveformBg({ peaks, baseColor }) {
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
})

// Preview of a stored featured image
function FeaturedImagePreview({ path }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!path) return
    supabase.storage.from('featured-images').createSignedUrl(path, 3600)
      .then(({ data }) => { if (data?.signedUrl) setUrl(data.signedUrl) })
  }, [path])
  if (!url) return null
  return (
    <div style={{
      width:80, height:56, borderRadius:4, overflow:'hidden',
      border:`1px solid ${T.border}`, flexShrink:0,
      background: `url(${url}) center/cover`,
    }} />
  )
}

export default function AdminPage({ clientRow, onPlay, playerProps, onToast, theme, onThemeChange }) {
  const [tab, setTab]         = useState('tracks')
  const [tracks, setTracks]   = useState([])
  const [clients, setClients] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const { currentTrack } = playerProps || {}

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoadingData(true)
    const [{ data: tracksData }, { data: clientsData }] = await Promise.all([
      supabase.from('tracks').select('*').order('sort_order', { ascending: true }),
      supabase.from('clients').select('*').order('created_at'),
    ])
    setTracks(tracksData || [])
    setClients(clientsData || [])
    setLoadingData(false)
  }

  if (loadingData) return (
    <div className="main" style={{ display:'flex', alignItems:'center', gap:10, color: T.textMuted, fontFamily:'Space Mono,monospace', fontSize:13 }}>
      <span className="spinner" />Loading library…
    </div>
  )

  return (
    <div className="main">
      <div className="page-header">
        <div>
          <div className="page-title">Studio Dashboard</div>
          <div className="page-subtitle">
            {tracks.length} track{tracks.length !== 1 ? 's' : ''} · {clients.filter(c => c.role === 'client').length} client{clients.filter(c => c.role === 'client').length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <div className="tabs">
        <button className={`tab ${tab === 'tracks' ? 'active' : ''}`} onClick={() => setTab('tracks')}>🎵 Tracks</button>
        <button className={`tab ${tab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}>👤 Clients</button>
        <button className={`tab ${tab === 'theme' ? 'active' : ''}`} onClick={() => setTab('theme')}>🎨 Theme</button>
      </div>
      {tab === 'tracks' && <TrackManager tracks={tracks} clients={clients} onRefresh={fetchAll} onPlay={onPlay} playerProps={playerProps} onToast={onToast} />}
      {tab === 'clients' && <ClientManager clients={clients} onRefresh={fetchAll} onToast={onToast} />}
      {tab === 'theme' && <ThemeManager theme={theme} onThemeChange={onThemeChange} onToast={onToast} />}
    </div>
  )
}

// ─── Track Manager ─────────────────────────────────────────────────
function TrackManager({ tracks, clients, onRefresh, onPlay, playerProps, onToast }) {
  const { currentTrack, isPlaying, progress, duration, onTogglePlay, onSeek, theme, loadingTrackId } = playerProps || {}
  const accentColor = theme?.amber || T.amber
  const mutedColor  = theme?.border || T.border
  const [dragOver, setDragOver]       = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [extracting, setExtracting]   = useState(false)
  const [form, setForm]               = useState({ title:'', tags:[], tagInput:'', assignedTo:[], bpm:'' })
  const [uploading, setUploading]     = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [search, setSearch]           = useState('')
  const [editingId, setEditingId]     = useState(null)
  const [editState, setEditState]     = useState({})
  const [expandedId, setExpandedId]   = useState(null)
  const [localTracks, setLocalTracks] = useState(tracks)
  const fileRef = useRef()
  const [versionFile, setVersionFile]   = useState(null)
  const [versionLabel, setVersionLabel] = useState('')
  const [versionUploading, setVersionUploading] = useState(false)
  const [featuredImageFile, setFeaturedImageFile] = useState(null)
  const [featuredImageUploading, setFeaturedImageUploading] = useState(false)
  const versionFileRef = useRef()
  const featuredImageRef = useRef()

  // drag-to-reorder state
  const dragItem    = useRef(null)
  const dragOverItem = useRef(null)

  useEffect(() => { setLocalTracks(tracks) }, [tracks])

  const clientList = clients.filter(c => c.role === 'client')

  // ── Audio data extraction ─────────────────────────────────────
  const extractAudioData = (file) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const arrayBuffer = ev.target.result
      let audioCtx
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      } catch(e) {
        resolve({ duration: null, waveformPeaks: [] }); return
      }
      audioCtx.decodeAudioData(
        arrayBuffer,
        (decoded) => {
          audioCtx.close()
          try {
            const raw = decoded.getChannelData(0)
            const peakCount = 200
            const blockSize = Math.floor(raw.length / peakCount)
            const peaks = []
            for (let i = 0; i < peakCount; i++) {
              let max = 0
              for (let j = 0; j < blockSize; j++) {
                const v = Math.abs(raw[i * blockSize + j])
                if (v > max) max = v
              }
              peaks.push(max)
            }
            const maxVal = Math.max(...peaks) || 1
            const normalized = peaks.map(v => Math.round((v / maxVal) * 100) / 100)
            resolve({ duration: decoded.duration, waveformPeaks: normalized })
          } catch(e) {
            resolve({ duration: decoded.duration, waveformPeaks: [] })
          }
        },
        (err) => {
          audioCtx.close()
          resolve({ duration: null, waveformPeaks: [] })
        }
      )
    }
    reader.onerror = () => resolve({ duration: null, waveformPeaks: [] })
    reader.readAsArrayBuffer(file)
  })

  // ── File drop ────────────────────────────────────────────────
  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files[0] || e.target.files?.[0]
    if (!file) return
    setForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }))
    setExtracting(true)
    // Decode audio for duration + waveform peaks
    extractAudioData(file).then(({ duration, waveformPeaks }) => {
      setPendingFile({ file, duration, waveformPeaks })
      setExtracting(false)
    })
  }

  const addTag = () => {
    const t = form.tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || form.tags.includes(t)) return
    setForm(f => ({ ...f, tags:[...f.tags, t], tagInput:'' }))
  }
  const removeTag = tag => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== tag) }))
  const toggleClient = id => setForm(f => ({
    ...f, assignedTo: f.assignedTo.includes(id) ? f.assignedTo.filter(x => x !== id) : [...f.assignedTo, id]
  }))

  // ── Upload ───────────────────────────────────────────────────
  const uploadTrack = async () => {
    if (!pendingFile || !pendingFile.file) return
    setUploading(true); setUploadProgress(10)
    const { file, duration, waveformPeaks } = pendingFile
    const filePath = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const { error: uploadError } = await supabase.storage
      .from('audio-tracks').upload(filePath, file, { contentType: file.type })
    if (uploadError) { onToast('Upload failed: ' + uploadError.message, 'error'); setUploading(false); return }
    setUploadProgress(70)
    const nextOrder = localTracks.length > 0 ? Math.max(...localTracks.map(t => t.sort_order || 0)) + 1 : 1
    const { error: dbError } = await supabase.from('tracks').insert({
      title: form.title || file.name,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      duration: duration || null,
      waveform_peaks: waveformPeaks || [],
      bpm: form.bpm ? parseInt(form.bpm) : null,
      tags: form.tags,
      assigned_to: form.assignedTo.length ? form.assignedTo : clientList.map(c => c.id),
      versions: [],
      sort_order: nextOrder,
      featured: false,
    })
    if (dbError) { onToast('Could not save track: ' + dbError.message, 'error'); setUploading(false); return }
    setUploadProgress(100)
    await onRefresh()
    setPendingFile(null)
    setForm({ title:'', tags:[], tagInput:'', assignedTo:[], bpm:'' })
    setUploading(false)
    onToast('Track uploaded successfully')
  }

  // ── Drag to reorder ──────────────────────────────────────────
  const handleDragStart = (i) => { dragItem.current = i }
  const handleDragEnter = (i) => { dragOverItem.current = i }

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return
    const reordered = [...localTracks]
    const dragged = reordered.splice(dragItem.current, 1)[0]
    reordered.splice(dragOverItem.current, 0, dragged)
    dragItem.current = null; dragOverItem.current = null

    // Optimistically update UI
    setLocalTracks(reordered)

    // Save new sort_order to DB
    await Promise.all(reordered.map((t, idx) =>
      supabase.from('tracks').update({ sort_order: idx + 1 }).eq('id', t.id)
    ))
    onToast('Order saved')
  }

  // ── Featured toggle ──────────────────────────────────────────
  const toggleFeatured = async (track, e) => {
    e.stopPropagation()
    const featuredCount = localTracks.filter(t => t.featured).length
    if (!track.featured && featuredCount >= 3) {
      onToast('Maximum 3 featured tracks — unfeature one first', 'error'); return
    }
    const newVal = !track.featured
    setLocalTracks(lt => lt.map(t => t.id === track.id ? { ...t, featured: newVal } : t))
    await supabase.from('tracks').update({ featured: newVal }).eq('id', track.id)
    onToast(newVal ? 'Track featured' : 'Track unfeatured')
  }

  // ── Edit helpers ─────────────────────────────────────────────
  const openEdit = (track, e) => {
    e.stopPropagation()
    if (editingId === track.id) { setEditingId(null); return }
    setEditingId(track.id)
    setVersionFile(null); setVersionLabel('')
    setFeaturedImageFile(null)
    setEditState({
      title: track.title,
      tags: [...(track.tags || [])],
      tagInput: '',
      assignedTo: [...(track.assigned_to || [])],
      versions: [...(track.versions || [])],
      featured_image: track.featured_image || null,
      bpm: track.bpm || '',
    })
  }
  const editAddTag = () => {
    const t = editState.tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || editState.tags.includes(t)) return
    setEditState(s => ({ ...s, tags:[...s.tags, t], tagInput:'' }))
  }
  const editRemoveTag = tag => setEditState(s => ({ ...s, tags: s.tags.filter(x => x !== tag) }))
  const editToggleClient = id => setEditState(s => ({
    ...s, assignedTo: s.assignedTo.includes(id) ? s.assignedTo.filter(x => x !== id) : [...s.assignedTo, id]
  }))

  const uploadVersion = async () => {
    if (!versionFile || !versionLabel.trim()) return
    setVersionUploading(true)
    const vDuration = await new Promise(resolve => {
      const url = URL.createObjectURL(versionFile)
      const audio = new Audio(url)
      audio.addEventListener('loadedmetadata', () => { URL.revokeObjectURL(url); resolve(audio.duration) })
      audio.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(null) })
    })
    const filePath = `${Date.now()}-${versionFile.name.replace(/\s+/g, '_')}`
    const { error } = await supabase.storage
      .from('audio-tracks').upload(filePath, versionFile, { contentType: versionFile.type })
    if (error) { onToast('Version upload failed', 'error'); setVersionUploading(false); return }
    setEditState(s => ({ ...s, versions: [...s.versions, { label: versionLabel.trim(), file_path: filePath, file_name: versionFile.name, file_size: versionFile.size, duration: vDuration || null }] }))
    setVersionFile(null); setVersionLabel(''); setVersionUploading(false)
    onToast('Version added — click Save to confirm')
  }

  const removeVersion = (idx) => setEditState(s => ({ ...s, versions: s.versions.filter((_, i) => i !== idx) }))

  const saveEdit = async (trackId) => {
    let featuredImagePath = editState.featured_image
    // Upload new featured image if one was selected
    if (featuredImageFile) {
      setFeaturedImageUploading(true)
      const imgPath = `${Date.now()}-${featuredImageFile.name.replace(/\s+/g, '_')}`
      const { error: imgError } = await supabase.storage
        .from('featured-images').upload(imgPath, featuredImageFile, { contentType: featuredImageFile.type })
      if (!imgError) featuredImagePath = imgPath
      setFeaturedImageUploading(false)
    }
    const { error } = await supabase.from('tracks').update({
      title: editState.title,
      tags: editState.tags,
      assigned_to: editState.assignedTo,
      versions: editState.versions,
      featured_image: featuredImagePath,
      bpm: editState.bpm ? parseInt(editState.bpm) : null,
    }).eq('id', trackId)
    if (error) { onToast('Save failed', 'error'); return }
    setFeaturedImageFile(null)
    await onRefresh(); setEditingId(null); onToast('Track updated')
  }

  const deleteTrack = async (track) => {
    if (!confirm('Delete this track and all its versions?')) return
    const paths = [track.file_path, ...(track.versions || []).map(v => v.file_path)]
    await supabase.storage.from('audio-tracks').remove(paths)
    await supabase.from('tracks').delete().eq('id', track.id)
    await onRefresh(); onToast('Track deleted')
  }

  const filtered = localTracks.filter(t =>
    !search ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.tags?.some(tag => tag.includes(search.toLowerCase()))
  )

  const featuredCount = localTracks.filter(t => t.featured).length

  return (
    <>
      {!pendingFile && !extracting && (
        <div className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileRef.current.click()}>
          <div className="upload-icon">🎵</div>
          <div className="upload-hint">Drop audio file or <strong>click to browse</strong></div>
          <div className="upload-formats">MP3 · WAV · FLAC · AAC · OGG · M4A</div>
          <input ref={fileRef} type="file" accept="audio/*" style={{display:'none'}} onChange={handleFileDrop} />
        </div>
      )}

      {extracting && (
        <div className="upload-zone" style={{cursor:'default'}}>
          <div style={{fontSize:13, color:T.textSecondary, display:'flex', alignItems:'center', gap:10, justifyContent:'center'}}>
            <span className="spinner" />Analysing audio…
          </div>
        </div>
      )}

      {pendingFile && (
        <div className="upload-form">
          <div className="upload-form-header">
            <div>
              <div className="upload-form-title">Configure track</div>
              <div className="upload-form-file">
                📎 {pendingFile.file.name} · {(pendingFile.file.size/1024/1024).toFixed(1)} MB
                {pendingFile.duration ? ` · ${fmtDuration(pendingFile.duration)}` : ''}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPendingFile(null)}>Cancel</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:16}}>
            <div className="field">
              <label className="label">Track title</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} />
            </div>
            <div className="field" style={{width:90}}>
              <label className="label">BPM</label>
              <input className="input" type="number" placeholder="120" min="1" max="300"
                value={form.bpm} onChange={e => setForm(f => ({...f, bpm:e.target.value}))} />
            </div>
            <div className="field">
              <label className="label">Assign to clients</label>
              <div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:4}}>
                {clientList.length === 0
                  ? <span style={{fontSize:12, color:T.textMuted}}>No clients yet — visible to all</span>
                  : clientList.map(c => (
                    <button key={c.id} className={`tag-filter ${form.assignedTo.includes(c.id) ? 'active' : ''}`}
                      onClick={() => toggleClient(c.id)}>{c.name}</button>
                  ))
                }
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label">Tags</label>
            <div className="tag-input-row">
              <input className="input" style={{flex:1}} placeholder="e.g. upbeat, rock, 120bpm"
                value={form.tagInput}
                onChange={e => setForm(f => ({...f, tagInput:e.target.value}))}
                onKeyDown={e => { if(e.key==='Enter'||e.key===','){e.preventDefault();addTag()}}} />
              <button className="btn btn-ghost btn-sm" onClick={addTag}>Add</button>
            </div>
            {form.tags.length > 0 && (
              <div className="tag-chips">
                {form.tags.map(tag => (
                  <div key={tag} className="tag-chip">#{tag}
                    <button className="tag-chip-remove" onClick={() => removeTag(tag)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {uploading && <div className="progress-bar-upload"><div className="progress-bar-upload-fill" style={{width:`${uploadProgress}%`}} /></div>}
          <button className="btn btn-primary" style={{marginTop:16}} onClick={uploadTrack} disabled={uploading}>
            {uploading ? <><span className="spinner"/>Uploading…</> : 'Upload track'}
          </button>
        </div>
      )}

      {localTracks.length > 0 && (
        <>
          <div className="search-bar">
            <div className="search-input-wrap">
              <span className="search-icon">⌕</span>
              <input className="input search-input" placeholder="Search tracks or tags…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {!search && (
              <div style={{fontSize:11, color:T.textMuted, fontFamily:'Space Mono,monospace', whiteSpace:'nowrap'}}>
                ☆ {featuredCount}/3 featured · drag ⠿ to reorder
              </div>
            )}
          </div>
          <div className="section-header">Library — {filtered.length} of {localTracks.length}</div>
          <div className="track-list" style={{paddingBottom:80}}>
            {filtered.map((track, i) => {
              const isEditing  = editingId === track.id
              const isExpanded = expandedId === track.id
              const assignedNames = clients.filter(c => track.assigned_to?.includes(c.id)).map(c => c.name)
              const versions = track.versions || []
              const isFeatured = track.featured

              return (
                <div key={track.id}
                  onDragEnter={() => !search && handleDragEnter(i)}
                  onDragOver={e => e.preventDefault()}
                  onDragEnd={handleDragEnd}
                >
                  <div className={`track-row ${currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined?'playing':''} ${isEditing?'editing':''}`}
                    onClick={() => !isEditing && onPlay(track)}
                    style={{
                      gridTemplateColumns: search ? '40px 1fr auto auto' : '20px 40px 1fr auto auto',
                      alignItems: currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined ? 'start' : 'center',
                      ...(isFeatured ? {borderColor: accentColor, borderLeftWidth:3} : {})
                    }}>
                    {/* Drag handle */}
                    {!search && (
                      <div draggable onDragStart={e => { e.stopPropagation(); handleDragStart(i) }}
                        onClick={e => e.stopPropagation()}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', cursor:'grab', fontSize:16, color:T.textSecondary, userSelect:'none', padding:'0 4px', paddingTop: currentTrack?.id===track.id ? 4 : 0 }}
                        title="Drag to reorder">⠿</div>
                    )}
                    <div className={`track-num ${currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined?'playing-indicator':''}`} style={{paddingTop: currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined ? 4 : 0}}>
                      {loadingTrackId === track.id
                        ? <span className="spinner" style={{margin:0, width:12, height:12, borderWidth:2}} />
                        : currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined ? '♪' : i+1
                      }
                    </div>
                    {/* Main content */}
                    <div style={{display:'flex', flexDirection:'column', gap:4, minWidth:0}}>
                      <div className={`track-name ${currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined?'playing':''}`}>
                        {isFeatured && <span style={{fontSize:10, marginRight:6, color:accentColor}}>★</span>}
                        {track.title}
                        {versions.length > 0 && (
                          <span style={{fontSize:10, fontFamily:'Space Mono,monospace', color:accentColor, marginLeft:8, opacity:0.8}}>
                            +{versions.length} version{versions.length!==1?'s':''}
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:11, color:T.textMuted}}>
                        {assignedNames.length ? `→ ${assignedNames.join(', ')}` : '→ All clients'}
                      </div>
                      {/* Inactive: static waveform */}
                      {!(currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined) && track.waveform_peaks?.length > 0 && (
                        <WaveformBg peaks={track.waveform_peaks} baseColor={mutedColor} />
                      )}
                      {/* Active: inline player */}
                      {currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined && (
                        <div onClick={e => e.stopPropagation()}>
                          <div className="inline-player">
                            <button className="inline-play-btn"
                              style={{background: accentColor, color: T.bg0}}
                              onClick={e => { e.stopPropagation(); onTogglePlay() }}>
                              {isPlaying ? '⏸' : '▶'}
                            </button>
                            <InlineSeekbar
                              peaks={track.waveform_peaks || []}
                              progress={progress} duration={duration}
                              onSeek={onSeek} accentColor={accentColor} mutedColor={mutedColor} />
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
                    <TrackMeta size={track.file_size} duration={track.duration} bpm={track.bpm} />
                    <div className="track-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className={`btn-icon ${isFeatured ? 'edit-active' : ''}`}
                        title={isFeatured ? 'Unfeature' : `Feature track${featuredCount >= 3 ? ' (max 3)' : ''}`}
                        onClick={e => toggleFeatured(track, e)}
                        style={isFeatured ? {} : {opacity: featuredCount >= 3 ? 0.3 : 1}}
                      >★</button>
                      {versions.length > 0 && (
                        <button className={`btn-icon ${isExpanded?'edit-active':''}`} title="Show versions"
                          onClick={() => setExpandedId(isExpanded ? null : track.id)}>
                          {isExpanded ? '▴' : '▾'}
                        </button>
                      )}
                      <button className={`btn-icon ${isEditing?'edit-active':''}`} title="Edit" onClick={e => openEdit(track,e)}>✎</button>
                      <button className="btn-icon" title="Delete" style={{color:T.red, borderColor:T.red, opacity:0.6}}
                        onClick={() => deleteTrack(track)}>×</button>
                    </div>
                  </div>

                  {isExpanded && versions.map((v, vi) => (
                    <div key={vi}
                      className={`track-row ${currentTrack?.id===track.id&&currentTrack?.versionIdx===vi?'playing':''}`}
                      style={{paddingLeft:56, borderTop:`1px solid ${T.border}`}}
                      onClick={() => onPlay({...track, file_path:v.file_path, file_name:v.file_name, file_size:v.file_size, duration:v.duration, versionIdx:vi, versionLabel:v.label})}>
                      <div style={{fontSize:10, fontFamily:'Space Mono,monospace', color:T.amber}}>↳</div>
                      <div className="track-info">
                        <div className={`track-name ${currentTrack?.id===track.id&&currentTrack?.versionIdx===vi?'playing':''}`} style={{fontSize:13}}>{v.label}</div>
                      </div>
                      <TrackMeta size={v.file_size} duration={v.duration} />
                      <div className="track-actions" />
                    </div>
                  ))}

                  {isEditing && (
                    <div className="track-edit-panel" onClick={e => e.stopPropagation()}>
                      <div className="track-edit-grid">                        <div>
                          <div className="track-edit-label">Title</div>
                          <input className="input" value={editState.title}
                            onChange={e => setEditState(s => ({...s, title:e.target.value}))} />
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'end'}}>
                          <div>
                            <div className="track-edit-label">Client access</div>
                          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                            {clientList.length === 0
                              ? <span style={{fontSize:12, color:T.textMuted}}>No clients yet</span>
                              : clientList.map(c => (
                                <button key={c.id} className={`tag-filter ${editState.assignedTo.includes(c.id)?'active':''}`}
                                  onClick={() => editToggleClient(c.id)}>{c.name}</button>
                              ))
                            }
                            {clientList.length > 0 && (
                              <button className="tag-filter" style={{borderStyle:'dashed', fontSize:10}}
                                onClick={() => setEditState(s => ({...s, assignedTo: s.assignedTo.length===clientList.length?[]:clientList.map(c=>c.id)}))}>
                                {editState.assignedTo.length===clientList.length?'Deselect all':'Select all'}
                              </button>
                            )}
                          </div>
                          {clientList.length>0 && editState.assignedTo.length===0 && (
                            <div style={{fontSize:11, color:T.amber, marginTop:6, fontFamily:'Space Mono,monospace'}}>⚠ No clients selected</div>
                          )}
                          </div>
                          <div>
                            <div className="track-edit-label">BPM</div>
                            <input className="input" type="number" placeholder="120" min="1" max="300" style={{width:80}}
                              value={editState.bpm}
                              onChange={e => setEditState(s => ({...s, bpm:e.target.value}))} />
                          </div>
                        </div>
                        <div style={{gridColumn:'1 / -1'}}>
                          <div className="track-edit-label">Tags</div>
                          <div className="tag-input-row">
                            <input className="input" style={{flex:1}} placeholder="Add tag, press Enter"
                              value={editState.tagInput}
                              onChange={e => setEditState(s => ({...s, tagInput:e.target.value}))}
                              onKeyDown={e => { if(e.key==='Enter'||e.key===','){e.preventDefault();editAddTag()}}} />
                            <button className="btn btn-ghost btn-sm" onClick={editAddTag}>Add</button>
                          </div>
                          {editState.tags.length > 0 && (
                            <div className="tag-chips" style={{marginTop:8}}>
                              {editState.tags.map(tag => (
                                <div key={tag} className="tag-chip">#{tag}
                                  <button className="tag-chip-remove" onClick={() => editRemoveTag(tag)}>×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{gridColumn:'1 / -1', borderTop:`1px solid ${T.border}`, paddingTop:16}}>
                          <div className="track-edit-label">Versions</div>
                          {editState.versions.length > 0 && (
                            <div style={{display:'flex', flexDirection:'column', gap:6, marginBottom:12}}>
                              {editState.versions.map((v, vi) => (
                                <div key={vi} style={{display:'flex', alignItems:'center', gap:10, background:T.bg2, padding:'8px 12px', borderRadius:3, border:`1px solid ${T.border}`}}>
                                  <span style={{fontFamily:'Space Mono,monospace', fontSize:11, color:T.amber, flex:1}}>{v.label}</span>
                                  <span style={{fontFamily:'Space Mono,monospace', fontSize:10, color:T.textMuted}}>
                                    {v.file_name}{v.duration ? ` · ${fmtDuration(v.duration)}` : ''}
                                  </span>
                                  <button className="btn-icon" style={{width:24, height:24, color:T.red, borderColor:T.red, opacity:0.6, fontSize:12}}
                                    onClick={() => removeVersion(vi)}>×</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'end'}}>
                            <div>
                              <div style={{fontSize:11, color:T.textMuted, marginBottom:4}}>Version label</div>
                              <input className="input" placeholder="e.g. 30 sec, Instrumental"
                                value={versionLabel} onChange={e => setVersionLabel(e.target.value)} />
                            </div>
                            <div>
                              <div style={{fontSize:11, color:T.textMuted, marginBottom:4}}>Audio file</div>
                              <input className="input" readOnly
                                value={versionFile ? versionFile.name : ''}
                                placeholder="No file chosen"
                                onClick={() => versionFileRef.current.click()}
                                style={{cursor:'pointer'}} />
                              <input ref={versionFileRef} type="file" accept="audio/*" style={{display:'none'}}
                                onChange={e => setVersionFile(e.target.files?.[0] || null)} />
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={uploadVersion}
                              disabled={!versionFile || !versionLabel.trim() || versionUploading}>
                              {versionUploading ? <><span className="spinner"/>…</> : '+ Add'}
                            </button>
                          </div>
                        </div>
                        {/* Featured image — only shown when track is featured */}
                        {isFeatured && (
                          <div style={{gridColumn:'1 / -1', borderTop:`1px solid ${T.border}`, paddingTop:16}}>
                            <div className="track-edit-label">Featured card background image</div>
                            <div style={{display:'flex', gap:12, alignItems:'center', marginTop:8}}>
                              {editState.featured_image && !featuredImageFile && (
                                <FeaturedImagePreview path={editState.featured_image} />
                              )}
                              {featuredImageFile && (
                                <div style={{
                                  width:80, height:56, borderRadius:4, overflow:'hidden',
                                  border:`1px solid ${T.border}`, flexShrink:0,
                                  background: `url(${URL.createObjectURL(featuredImageFile)}) center/cover`,
                                }} />
                              )}
                              <div style={{flex:1}}>
                                <input className="input" readOnly
                                  value={featuredImageFile ? featuredImageFile.name : editState.featured_image ? 'Image set ✓' : 'No image'}
                                  placeholder="No image chosen"
                                  onClick={() => featuredImageRef.current.click()}
                                  style={{cursor:'pointer'}} />
                                <input ref={featuredImageRef} type="file" accept="image/*" style={{display:'none'}}
                                  onChange={e => setFeaturedImageFile(e.target.files?.[0] || null)} />
                                <div style={{fontSize:11, color:T.textMuted, marginTop:4}}>
                                  JPG or PNG recommended · will be shown as card background
                                </div>
                              </div>
                              {editState.featured_image && (
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditState(s => ({...s, featured_image: null}))}>
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="track-edit-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(track.id)}
                          disabled={featuredImageUploading}>
                          {featuredImageUploading ? <><span className="spinner"/>Uploading image…</> : 'Save changes'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {localTracks.length === 0 && !pendingFile && (
        <div className="empty-state"><div className="empty-icon">🎧</div>Upload your first track to get started</div>
      )}
    </>
  )
}

// ─── Client Manager ────────────────────────────────────────────────
function ClientManager({ clients, onRefresh, onToast }) {
  const [form, setForm]           = useState({ name:'', password:'' })
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newPass, setNewPass]     = useState('')
  const clientList = clients.filter(c => c.role === 'client')

  const addClient = async () => {
    setError('')
    if (!form.name.trim()) { setError('Name is required'); return }
    if (form.password.length < 4) { setError('Password must be at least 4 characters'); return }
    if (clients.some(c => c.name.toLowerCase() === form.name.trim().toLowerCase())) {
      setError('A client with that name already exists'); return
    }
    setLoading(true)
    const { data: newClient, error: dbError } = await supabase.from('clients').insert({
      name: form.name.trim(), role: 'client', password_hash: hashPassword(form.password),
    }).select().single()
    if (dbError) { setError('Could not add client: ' + dbError.message); setLoading(false); return }

    // Auto-assign all existing tracks to the new client
    const { data: allTracks } = await supabase.from('tracks').select('id, assigned_to')
    if (allTracks?.length) {
      await Promise.all(allTracks.map(track => {
        const current = track.assigned_to || []
        if (current.includes(newClient.id)) return Promise.resolve()
        return supabase.from('tracks').update({ assigned_to: [...current, newClient.id] }).eq('id', track.id)
      }))
    }
    await onRefresh()
    setForm({ name:'', password:'' })
    setLoading(false)
    onToast('Client added')
  }

  const resetPassword = async (id) => {
    if (newPass.length < 4) { onToast('Password must be at least 4 characters', 'error'); return }
    const { error } = await supabase.from('clients').update({ password_hash: hashPassword(newPass) }).eq('id', id)
    if (error) { onToast('Could not update password', 'error'); return }
    setEditingId(null); setNewPass(''); onToast('Password updated')
  }

  const deleteClient = async (client) => {
    if (!confirm(`Remove ${client.name}?`)) return
    await supabase.from('clients').delete().eq('id', client.id)
    await onRefresh(); onToast('Client removed')
  }

  return (
    <>
      <div className="upload-form">
        <div className="upload-form-title" style={{marginBottom:16}}>Add new client</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'end'}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="label">Name</label>
            <input className="input" placeholder="Client name" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="label">Password</label>
            <input type="text" className="input" placeholder="Set a password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
          </div>
          <button className="btn btn-primary" onClick={addClient} disabled={loading}>
            {loading ? <><span className="spinner"/>Adding…</> : 'Add client'}
          </button>
        </div>
        {error && <div className="error-msg" style={{marginTop:8}}>{error}</div>}
      </div>
      <div className="section-header">{clientList.length} client{clientList.length!==1?'s':''}</div>
      {clientList.length === 0
        ? <div className="empty-state"><div className="empty-icon">👤</div>No clients yet</div>
        : clientList.map(c => (
          <div key={c.id} className="client-card">
            <div>
              <div className="client-name">{c.name}</div>
              <div className="client-meta">Added {new Date(c.created_at).toLocaleDateString()}</div>
            </div>
            <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
              {editingId === c.id ? (
                <>
                  <input className="input" style={{width:160}} type="text" placeholder="New password"
                    value={newPass} onChange={e => setNewPass(e.target.value)} />
                  <button className="btn btn-primary btn-sm" onClick={() => resetPassword(c.id)}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(null); setNewPass('') }}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(c.id)}>Reset password</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteClient(c)}>Remove</button>
                </>
              )}
            </div>
          </div>
        ))
      }
    </>
  )
}

// ─── Theme Manager ────────────────────────────────────────────────
export function ThemeManager({ theme, onThemeChange, onToast }) {
  const [local, setLocal] = useState({ ...theme })
  const [saving, setSaving] = useState(false)

  const SWATCHES = [
    { key: 'bg0',          label: 'Background (darkest)' },
    { key: 'bg1',          label: 'Surface' },
    { key: 'bg2',          label: 'Surface raised' },
    { key: 'bg3',          label: 'Surface top' },
    { key: 'border',       label: 'Borders' },
    { key: 'amber',        label: 'Accent colour' },
    { key: 'amberDim',     label: 'Accent dim' },
    { key: 'textPrimary',  label: 'Text primary' },
    { key: 'textSecondary',label: 'Text secondary' },
    { key: 'textMuted',    label: 'Text muted' },
    { key: 'red',          label: 'Danger colour' },
    { key: 'green',        label: 'Success colour' },
  ]

  const update = (key, val) => { const next = { ...local, [key]: val }; setLocal(next); onThemeChange(next) }

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('theme').update({ colors: local }).eq('id', 1)
    setSaving(false)
    if (error) { onToast('Could not save theme', 'error'); return }
    onToast('Theme saved — all users will see the new colours')
  }

  const reset = async () => {
    const { DEFAULT_THEME } = await import('./App')
    setLocal({ ...DEFAULT_THEME }); onThemeChange({ ...DEFAULT_THEME })
    await supabase.from('theme').update({ colors: {} }).eq('id', 1)
    onToast('Theme reset to default')
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="track-edit-label" style={{ marginBottom: 10 }}>Preview</div>
        <div className="theme-preview-bar" style={{ background: local.bg1, borderColor: local.border }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: local.amber, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 6, borderRadius: 3, background: local.border, overflow: 'hidden' }}>
              <div style={{ width: '40%', height: '100%', background: local.amber, borderRadius: 3 }} />
            </div>
          </div>
          <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 11, color: local.textMuted }}>0:42 / 1:45</div>
          <div style={{ padding: '4px 10px', borderRadius: 2, background: local.bg0, border: `1px solid ${local.amber}`, color: local.amber, fontFamily: 'Space Mono,monospace', fontSize: 10 }}>ADMIN</div>
          <div style={{ padding: '6px 14px', borderRadius: 3, background: local.amber, color: local.bg0, fontSize: 12, fontWeight: 600 }}>Button</div>
        </div>
      </div>
      <div className="theme-grid">
        {SWATCHES.map(({ key, label }) => (
          <div key={key} className="theme-swatch">
            <div style={{ position: 'relative' }}>
              <div className="theme-swatch-preview" style={{ background: local[key] }}
                onClick={() => document.getElementById(`swatch-${key}`).click()} />
              <input id={`swatch-${key}`} type="color" value={local[key]}
                onChange={e => update(key, e.target.value)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            </div>
            <div>
              <div className="theme-swatch-label">{label}</div>
              <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 10, color: local.textMuted }}>{local[key]}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner" />Saving…</> : 'Save theme'}
        </button>
        <button className="btn btn-ghost" onClick={reset}>Reset to default</button>
      </div>
    </div>
  )
}
