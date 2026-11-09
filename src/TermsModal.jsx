import { useState } from 'react'
import { supabase } from './supabase'

// "Terms" link in the top bar that opens a Usage & Copyright modal.
// The licensing contact routes through the existing contact pipeline
// (contact_messages insert + `contact` edge function), so no email address
// ever appears on the page for scrapers to find.
export default function TermsModal({ clientRow, onToast }) {
  const [open, setOpen]       = useState(false)
  const [showForm, setShow]   = useState(false)
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
          kind: 'licensing',
          name: clientRow?.name || '',
          company: clientRow?.company || '',
          email: clientRow?.email || '',
          message: text,
        },
      })
    } catch (_) { /* email best-effort */ }
    setSending(false)
    if (dbErr) { onToast?.('Could not send — please try again', 'error'); return }
    setMessage(''); setShow(false); setOpen(false)
    onToast?.('Message sent — we\'ll get back to you')
  }

  const close = () => { setOpen(false); setShow(false); setMessage('') }

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Terms</button>

      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0a0a0a', border: '1px solid #232323', borderRadius: 8,
              width: 560, maxWidth: '100%', maxHeight: '85vh', overflow: 'auto',
              padding: '32px 32px 28px', position: 'relative',
            }}>
            <button
              onClick={close}
              aria-label="Close"
              style={{
                position: 'absolute', top: 16, right: 16, background: 'none',
                border: 'none', color: '#8a8a8a', fontSize: 22, cursor: 'pointer', lineHeight: 1,
              }}>×</button>

            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#8a8a8a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              © 2026 CYPHER · All Rights Reserved
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 20px', color: '#fff', lineHeight: 1.1 }}>
              Usage &amp; Copyright
            </h2>

            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.65, color: '#c8c8c8', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0 }}>
                All compositions, recordings, stems, and sound design elements featured in this
                music library are the original property of CYPHER and its credited composers, and
                are protected under applicable copyright laws and international treaties. Preview
                streams and downloads are provided for evaluation purposes only and do not
                constitute a license to use, distribute, sync to picture, broadcast, or publicly
                perform any track.
              </p>
              <p style={{ margin: 0 }}>
                Use of any track requires a valid license issued by CYPHER. Licensing terms, usage
                rights, territory, and term are defined per agreement at the time of purchase or
                commission.
              </p>
              <p style={{ margin: 0 }}>
                For licensing inquiries or custom composition requests, get in touch:
              </p>
            </div>

            {!showForm ? (
              <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShow(true)}>
                Contact us about licensing
              </button>
            ) : (
              <div style={{ marginTop: 20 }}>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Which track, and what do you have in mind?"
                  rows={4}
                  style={{
                    width: '100%', background: '#000', color: '#fff',
                    border: '1px solid #232323', borderRadius: 4, padding: 10,
                    fontFamily: "'Inter', sans-serif", fontSize: 14, resize: 'vertical',
                    boxSizing: 'border-box', marginBottom: 12,
                  }} />
                <button className="btn btn-primary" style={{ width: '100%' }}
                  onClick={send} disabled={sending || !message.trim()}>
                  {sending ? 'Sending…' : 'Send message'}
                </button>
                {clientRow?.email && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#555', marginTop: 10, textAlign: 'center' }}>
                    Sending as {clientRow.email}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
