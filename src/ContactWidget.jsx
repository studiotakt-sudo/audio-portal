import { useState } from 'react'
import { supabase } from './supabase'

// Contact form used two ways:
//  - variant="floating" (default): the bottom-right "Need something?" button
//    for track/style requests.
//  - variant="link": a text trigger (e.g. in the top bar) for licensing/general
//    contact. Renders an inline trigger that opens the same modal.
// Both save to contact_messages and email the studio via the `contact` function.
export default function ContactWidget({
  clientRow,
  onToast,
  variant = 'floating',
  kind = 'request',
  triggerLabel = 'Need something?',
  title = 'Need something?',
  body = "Not finding what you're looking for? Let us know what you need and we'll see what we can do to help!",
  placeholder = 'What are you looking for?',
}) {
  const [open, setOpen]       = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    const text = message.trim()
    if (!text) return
    setSending(true)

    const { error: dbErr } = await supabase.from('contact_messages').insert({
      client_id: clientRow?.id ?? null,
      name: clientRow?.name ?? null,
      company: clientRow?.company ?? null,
      email: clientRow?.email ?? null,
      message: text,
    })
    try {
      await supabase.functions.invoke('contact', {
        body: {
          kind,
          name: clientRow?.name || '',
          company: clientRow?.company || '',
          email: clientRow?.email || '',
          message: text,
        },
      })
    } catch (_) { /* email best-effort */ }

    setSending(false)
    if (dbErr) { onToast?.('Could not send — please try again', 'error'); return }
    setMessage('')
    setOpen(false)
    onToast?.('Message sent — we\'ll get back to you')
  }

  const panel = (
    <div style={{
      position: 'fixed',
      bottom: variant === 'floating' ? 84 : undefined,
      top: variant === 'link' ? 84 : undefined,
      right: 24, zIndex: 200,
      width: 320, maxWidth: 'calc(100vw - 48px)',
      background: '#0a0a0a', border: '1px solid #232323', borderRadius: 8,
      padding: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, marginBottom: 6, color: '#fff' }}>
        {title}
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#8a8a8a', marginBottom: 14, lineHeight: 1.5 }}>
        {body}
      </div>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{
          width: '100%', background: '#000', color: '#fff',
          border: '1px solid #232323', borderRadius: 4, padding: 10,
          fontFamily: "'Inter', sans-serif", fontSize: 14, resize: 'vertical',
          boxSizing: 'border-box', marginBottom: 12,
        }} />
      <button className="btn btn-primary" onClick={send} disabled={sending || !message.trim()} style={{ width: '100%' }}>
        {sending ? 'Sending…' : 'Send message'}
      </button>
      {clientRow?.email && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#555', marginTop: 10, textAlign: 'center' }}>
          Sending as {clientRow.email}
        </div>
      )}
    </div>
  )

  if (variant === 'link') {
    return (
      <>
        <button onClick={() => setOpen(o => !o)} className="btn btn-ghost btn-sm">
          {triggerLabel}
        </button>
        {open && panel}
      </>
    )
  }

  // floating variant
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Request something from the studio"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          height: 46, padding: '0 20px', borderRadius: 23,
          background: '#ffffff', color: '#000000', border: 'none',
          fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif",
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {open ? '×  Close' : triggerLabel}
      </button>
      {open && panel}
    </>
  )
}
