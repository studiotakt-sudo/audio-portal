import { useState } from 'react'
import { supabase } from './supabase'

// Floating contact button (bottom-right) that opens a small form. Saves the
// message to contact_messages and emails the studio via the `contact` function.
// The client's name/company/email are attached automatically from their profile.
export default function ContactWidget({ clientRow, onToast }) {
  const [open, setOpen]       = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    const text = message.trim()
    if (!text) return
    setSending(true)

    // 1) Save to the log table (RLS lets a client insert their own message).
    const { error: dbErr } = await supabase.from('contact_messages').insert({
      client_id: clientRow?.id ?? null,
      name: clientRow?.name ?? null,
      company: clientRow?.company ?? null,
      email: clientRow?.email ?? null,
      message: text,
    })
    // 2) Email the studio (don't block on email failure — the row is saved).
    try {
      await supabase.functions.invoke('contact', {
        body: {
          name: clientRow?.name || '',
          company: clientRow?.company || '',
          email: clientRow?.email || '',
          message: text,
        },
      })
    } catch (_) { /* email best-effort */ }

    setSending(false)
    if (dbErr) {
      onToast?.('Could not send — please try again', 'error')
      return
    }
    setMessage('')
    setOpen(false)
    onToast?.('Message sent — we\'ll get back to you')
  }

  return (
    <>
      {/* Launcher button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Contact the studio"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          width: 52, height: 52, borderRadius: '50%',
          background: '#ffffff', color: '#000000', border: 'none',
          fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {open ? '×' : '✉'}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 200,
          width: 320, maxWidth: 'calc(100vw - 48px)',
          background: '#0a0a0a', border: '1px solid #232323', borderRadius: 8,
          padding: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, marginBottom: 4, color: '#fff' }}>
            Request something
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#8a8a8a', marginBottom: 14, lineHeight: 1.5 }}>
            Missing a track or need a different version? Send us a note and we'll follow up by email.
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="What are you looking for?"
            rows={4}
            style={{
              width: '100%', background: '#000', color: '#fff',
              border: '1px solid #232323', borderRadius: 4, padding: 10,
              fontFamily: "'Inter', sans-serif", fontSize: 14, resize: 'vertical',
              boxSizing: 'border-box', marginBottom: 12,
            }} />
          <button
            className="btn btn-primary"
            onClick={send}
            disabled={sending || !message.trim()}
            style={{ width: '100%' }}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
          {clientRow?.email && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#555', marginTop: 10, textAlign: 'center' }}>
              Sending as {clientRow.email}
            </div>
          )}
        </div>
      )}
    </>
  )
}
