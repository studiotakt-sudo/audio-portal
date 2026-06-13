import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { T, hashPassword } from './App'

export default function AdminPage({ clientRow, onPlay, currentTrack, onToast }) {
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
      </div>
      {tab === 'tracks'
        ? <TrackManager tracks={tracks} clients={clients} onRefresh={fetchAll} onPlay={onPlay} currentTrack={currentTrack} onToast={onToast} />
        : <ClientManager clients={clients} onRefresh={fetchAll} onToast={onToast} />
      }
    </div>
  )
}

// ─── Track Manager ─────────────────────────────────────────────────
function TrackManager({ tracks, clients, onRefresh, onPlay, currentTrack, onToast }) {
  const [dragOver, setDragOver]       = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [form, setForm]               = useState({ title:'', tags:[], tagInput:'', assignedTo:[] })
  const [uploading, setUploading]     = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [search, setSearch]           = useState('')
  const [editingId, setEditingId]     = useState(null)
  const [editState, setEditState]     = useState({})
  const fileRef = useRef()

  const clientList = clients.filter(c => c.role === 'client')

  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files[0] || e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
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

    const filePath = `${Date.now()}-${pendingFile.name.replace(/\s+/g, '_')}`
    const { error: uploadError } = await supabase.storage
      .from('audio-tracks')
      .upload(filePath, pendingFile, { contentType: pendingFile.type })

    if (uploadError) { onToast('Upload failed: ' + uploadError.message, 'error'); setUploading(false); return }
    setUploadProgress(70)

    const { error: dbError } = await supabase.from('tracks').insert({
      title: form.title || pendingFile.name,
      file_name: pendingFile.name,
      file_path: filePath,
      file_size: pendingFile.size,
      mime_type: pendingFile.type,
      tags: form.tags,
      assigned_to: form.assignedTo.length ? form.assignedTo : clientList.map(c => c.id),
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
    setEditState({ title:track.title, tags:[...(track.tags||[])], tagInput:'', assignedTo:[...(track.assigned_to||[])] })
  }
  const editAddTag = () => {
    const t = editState.tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || editState.tags.includes(t)) return
    setEditState(s => ({ ...s, tags:[...s.tags,t], tagInput:'' }))
  }
  const editRemoveTag = tag => setEditState(s => ({ ...s, tags: s.tags.filter(x => x !== tag) }))
  const editToggleClient = id => setEditState(s => ({
    ...s, assignedTo: s.assignedTo.includes(id) ? s.assignedTo.filter(x => x !== id) : [...s.assignedTo, id]
  }))
  const saveEdit = async (trackId) => {
    const { error } = await supabase.from('tracks').update({
      title: editState.title, tags: editState.tags, assigned_to: editState.assignedTo,
    }).eq('id', trackId)
    if (error) { onToast('Save failed', 'error'); return }
    await onRefresh(); setEditingId(null); onToast('Track updated')
  }

  const deleteTrack = async (track) => {
    if (!confirm('Delete this track?')) return
    await supabase.storage.from('audio-tracks').remove([track.file_path])
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
              <div className="upload-form-file">📎 {pendingFile.name} ({(pendingFile.size/1024/1024).toFixed(1)} MB)</div>
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
              const isEditing = editingId === track.id
              const assignedNames = clients.filter(c => track.assigned_to?.includes(c.id)).map(c => c.name)
              return (
                <div key={track.id}>
                  <div className={`track-row ${currentTrack?.id===track.id?'playing':''} ${isEditing?'editing':''}`}
                    onClick={() => !isEditing && onPlay(track)}>
                    <div className={`track-num ${currentTrack?.id===track.id?'playing-indicator':''}`}>
                      {currentTrack?.id===track.id ? '♪' : i+1}
                    </div>
                    <div className="track-info">
                      <div className={`track-name ${currentTrack?.id===track.id?'playing':''}`}>{track.title}</div>
                      <div className="track-meta">
                        <span className="track-uploader">{assignedNames.length ? `→ ${assignedNames.join(', ')}` : '→ All clients'}</span>
                        <div className="track-tags-inline">
                          {track.tags?.map(tag => <span key={tag} className="tag-inline">#{tag}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="track-duration">{track.file_size ? (track.file_size/1024/1024).toFixed(1)+' MB' : ''}</div>
                    <div className="track-actions" onClick={e => e.stopPropagation()}>
                      <button className={`btn-icon ${isEditing?'edit-active':''}`} title="Edit" onClick={e => openEdit(track,e)}>✎</button>
                      <button className="btn-icon" title="Delete" style={{color:T.red, borderColor:'#3a1010'}}
                        onClick={() => deleteTrack(track)}>×</button>
                    </div>
                  </div>

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
  const [form, setForm]     = useState({ name:'', password:'' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
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
      name: form.name.trim(),
      role: 'client',
      password_hash: hashPassword(form.password),
    })
    if (dbError) { setError('Could not add client: ' + dbError.message); setLoading(false); return }
    await onRefresh()
    setForm({ name:'', password:'' })
    setLoading(false)
    onToast('Client added')
  }

  const resetPassword = async (id) => {
    if (newPass.length < 4) { onToast('Password must be at least 4 characters', 'error'); return }
    const { error } = await supabase.from('clients')
      .update({ password_hash: hashPassword(newPass) })
      .eq('id', id)
    if (error) { onToast('Could not update password', 'error'); return }
    setEditingId(null); setNewPass('')
    onToast('Password updated')
  }

  const deleteClient = async (client) => {
    if (!confirm(`Remove ${client.name}?`)) return
    await supabase.from('clients').delete().eq('id', client.id)
    await onRefresh()
    onToast('Client removed')
  }

  return (
    <>
      <div className="upload-form">
        <div className="upload-form-title" style={{marginBottom:16}}>Add new client</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'end'}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="label">Name</label>
            <input className="input" placeholder="Client name"
              value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} />
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="label">Password</label>
            <input type="text" className="input" placeholder="Set a password"
              value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} />
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
