import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { DEFAULT_THEME as T } from './App'

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

function TrackMeta({ size, duration }) {
  const parts = []
  if (size) parts.push((size / 1024 / 1024).toFixed(1) + ' MB')
  if (duration) parts.push(fmtDuration(duration))
  return <div className="track-duration">{parts.join(' · ')}</div>
}

export default function AdminPage({ clientRow, onPlay, currentTrack, onToast, theme, onThemeChange }) {
  const [tab, setTab]         = useState('tracks')
  const [tracks, setTracks]   = useState([])
  const [clients, setClients] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoadingData(true)
    const [{ data: tracksData }, { data: clientsData }] = await Promise.all([
      supabase.from('tracks').select('*').order('uploaded_at', { ascending: false }),
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
      {tab === 'tracks' && <TrackManager tracks={tracks} clients={clients} onRefresh={fetchAll} onPlay={onPlay} currentTrack={currentTrack} onToast={onToast} />}
      {tab === 'clients' && <ClientManager clients={clients} onRefresh={fetchAll} onToast={onToast} />}
      {tab === 'theme' && <ThemeManager theme={theme} onThemeChange={onThemeChange} onToast={onToast} />}
    </div>
  )
}

// ─── Track Manager ─────────────────────────────────────────────────
function TrackManager({ tracks, clients, onRefresh, onPlay, currentTrack, onToast }) {
  const [dragOver, setDragOver]       = useState(false)
  const [pendingFile, setPendingFile] = useState(null) // { file, duration }
  const [form, setForm]               = useState({ title:'', tags:[], tagInput:'', assignedTo:[] })
  const [uploading, setUploading]     = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [search, setSearch]           = useState('')
  const [editingId, setEditingId]     = useState(null)
  const [editState, setEditState]     = useState({})
  const [expandedId, setExpandedId]   = useState(null)
  const fileRef = useRef()
  const [versionFile, setVersionFile]   = useState(null)
  const [versionLabel, setVersionLabel] = useState('')
  const [versionUploading, setVersionUploading] = useState(false)
  const versionFileRef = useRef()

  const clientList = clients.filter(c => c.role === 'client')

  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files[0] || e.target.files?.[0]
    if (!file) return
    // Detect duration via temporary audio element
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      setPendingFile({ file, duration: audio.duration })
    })
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      setPendingFile({ file, duration: null })
    })
    setForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }))
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

  const uploadTrack = async () => {
    if (!pendingFile) return
    setUploading(true); setUploadProgress(10)
    const { file, duration } = pendingFile
    const filePath = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const { error: uploadError } = await supabase.storage
      .from('audio-tracks').upload(filePath, file, { contentType: file.type })
    if (uploadError) { onToast('Upload failed: ' + uploadError.message, 'error'); setUploading(false); return }
    setUploadProgress(70)
    const { error: dbError } = await supabase.from('tracks').insert({
      title: form.title || file.name,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      duration: duration || null,
      tags: form.tags,
      assigned_to: form.assignedTo.length ? form.assignedTo : clientList.map(c => c.id),
      versions: [],
    })
    if (dbError) { onToast('Could not save track: ' + dbError.message, 'error'); setUploading(false); return }
    setUploadProgress(100)
    await onRefresh()
    setPendingFile(null)
    setForm({ title:'', tags:[], tagInput:'', assignedTo:[] })
    setUploading(false)
    onToast('Track uploaded successfully')
  }

  const openEdit = (track, e) => {
    e.stopPropagation()
    if (editingId === track.id) { setEditingId(null); return }
    setEditingId(track.id)
    setVersionFile(null); setVersionLabel('')
    setEditState({
      title: track.title,
      tags: [...(track.tags || [])],
      tagInput: '',
      assignedTo: [...(track.assigned_to || [])],
      versions: [...(track.versions || [])],
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
    // Get duration for version file
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
    const newVersion = {
      label: versionLabel.trim(),
      file_path: filePath,
      file_name: versionFile.name,
      file_size: versionFile.size,
      duration: vDuration || null,
    }
    setEditState(s => ({ ...s, versions: [...s.versions, newVersion] }))
    setVersionFile(null); setVersionLabel(''); setVersionUploading(false)
    onToast('Version added — click Save to confirm')
  }

  const removeVersion = (idx) => setEditState(s => ({ ...s, versions: s.versions.filter((_, i) => i !== idx) }))

  const saveEdit = async (trackId) => {
    const { error } = await supabase.from('tracks').update({
      title: editState.title,
      tags: editState.tags,
      assigned_to: editState.assignedTo,
      versions: editState.versions,
    }).eq('id', trackId)
    if (error) { onToast('Save failed', 'error'); return }
    await onRefresh(); setEditingId(null); onToast('Track updated')
  }

  const deleteTrack = async (track) => {
    if (!confirm('Delete this track and all its versions?')) return
    const paths = [track.file_path, ...(track.versions || []).map(v => v.file_path)]
    await supabase.storage.from('audio-tracks').remove(paths)
    await supabase.from('tracks').delete().eq('id', track.id)
    await onRefresh(); onToast('Track deleted')
  }

  const filtered = tracks.filter(t =>
    !search ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.tags?.some(tag => tag.includes(search.toLowerCase()))
  )

  return (
    <>
      {!pendingFile && (
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
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <div className="field">
              <label className="label">Track title</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} />
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

      {tracks.length > 0 && (
        <>
          <div className="search-bar">
            <div className="search-input-wrap">
              <span className="search-icon">⌕</span>
              <input className="input search-input" placeholder="Search tracks or tags…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="section-header">Library — {filtered.length} of {tracks.length}</div>
          <div className="track-list" style={{paddingBottom:80}}>
            {filtered.map((track, i) => {
              const isEditing  = editingId === track.id
              const isExpanded = expandedId === track.id
              const assignedNames = clients.filter(c => track.assigned_to?.includes(c.id)).map(c => c.name)
              const versions = track.versions || []

              return (
                <div key={track.id}>
                  <div className={`track-row ${currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined?'playing':''} ${isEditing?'editing':''}`}
                    onClick={() => !isEditing && onPlay(track)}>
                    <div className={`track-num ${currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined?'playing-indicator':''}`}>
                      {currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined ? '♪' : i+1}
                    </div>
                    <div className="track-info">
                      <div className={`track-name ${currentTrack?.id===track.id&&currentTrack?.versionIdx===undefined?'playing':''}`}>
                        {track.title}
                        {versions.length > 0 && (
                          <span style={{fontSize:10, fontFamily:'Space Mono,monospace', color:T.amber, marginLeft:8, opacity:0.8}}>
                            +{versions.length} version{versions.length!==1?'s':''}
                          </span>
                        )}
                      </div>
                      <div className="track-meta">
                        <span className="track-uploader">{assignedNames.length ? `→ ${assignedNames.join(', ')}` : '→ All clients'}</span>
                        <div className="track-tags-inline">
                          {track.tags?.map(tag => <span key={tag} className="tag-inline">#{tag}</span>)}
                        </div>
                      </div>
                    </div>
                    <TrackMeta size={track.file_size} duration={track.duration} />
                    <div className="track-actions" onClick={e => e.stopPropagation()}>
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
                        <div className={`track-name ${currentTrack?.id===track.id&&currentTrack?.versionIdx===vi?'playing':''}`} style={{fontSize:13}}>
                          {v.label}
                        </div>
                      </div>
                      <TrackMeta size={v.file_size} duration={v.duration} />
                      <div className="track-actions" />
                    </div>
                  ))}

                  {isEditing && (
                    <div className="track-edit-panel" onClick={e => e.stopPropagation()}>
                      <div className="track-edit-grid">
                        <div>
                          <div className="track-edit-label">Title</div>
                          <input className="input" value={editState.title}
                            onChange={e => setEditState(s => ({...s, title:e.target.value}))} />
                        </div>
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
                            <button className="btn btn-ghost btn-sm"
                              onClick={uploadVersion}
                              disabled={!versionFile || !versionLabel.trim() || versionUploading}>
                              {versionUploading ? <><span className="spinner"/>…</> : '+ Add'}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="track-edit-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(track.id)}>Save changes</button>
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

      {tracks.length === 0 && !pendingFile && (
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
    const { error: dbError } = await supabase.from('clients').insert({
      name: form.name.trim(), role: 'client', password_hash: hashPassword(form.password),
    })
    if (dbError) { setError('Could not add client: ' + dbError.message); setLoading(false); return }
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

  const update = (key, val) => {
    const next = { ...local, [key]: val }
    setLocal(next)
    onThemeChange(next)
  }

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('theme').update({ colors: local }).eq('id', 1)
    setSaving(false)
    if (error) { onToast('Could not save theme', 'error'); return }
    onToast('Theme saved — all users will see the new colours')
  }

  const reset = async () => {
    const { DEFAULT_THEME } = await import('./App')
    setLocal({ ...DEFAULT_THEME })
    onThemeChange({ ...DEFAULT_THEME })
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
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, top: 0, left: 0 }} />
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
