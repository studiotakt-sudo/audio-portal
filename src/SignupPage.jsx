import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Invite-only signup, reached at /signup?code=XXXX. The code is validated
// against signup_codes via the check_signup_code() RPC (definer-run, so the
// anon key never reads the codes table directly).
export default function SignupPage({ onToast }) {
  const [code, setCode]           = useState('')
  const [codeState, setCodeState] = useState('checking') // checking|valid|invalid|missing
  const [name, setName]           = useState('')
  const [company, setCompany]     = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const c = (params.get('code') || '').trim()
    if (!c) { setCodeState('missing'); return }
    setCode(c)
    let cancelled = false
    ;(async () => {
      const { data, error: rpcErr } = await supabase.rpc('check_signup_code', { p_code: c })
      if (cancelled) return
      if (rpcErr) { setCodeState('invalid'); return }
      setCodeState(data === true ? 'valid' : 'invalid')
    })()
    return () => { cancelled = true }
  }, [])

  const handleSignup = async () => {
    setError('')
    if (!name.trim())    { setError('Please enter your name'); return }
    if (!company.trim()) { setError('Please enter your company'); return }
    if (!email.trim())   { setError('Please enter your email'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)

    const { data: stillValid } = await supabase.rpc('check_signup_code', { p_code: code })
    if (stillValid !== true) {
      setError('This invite code is no longer valid. Contact the studio for a new link.')
      setCodeState('invalid'); setLoading(false); return
    }

    const { data, error: signErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: name.trim(), company: company.trim() },
        emailRedirectTo: window.location.origin,
      },
    })
    if (signErr) {
      setError(signErr.message || 'Could not create your account')
      setLoading(false); return
    }

    if (data?.user) {
      await supabase.from('clients').insert({
        user_id: data.user.id,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        company: company.trim(),
        role: 'client',
        approved: false,
      }).then(() => {}, () => {})
    }

    setDone(true)
    setLoading(false)
  }

  if (codeState === 'checking') {
    return (
      <div className="login-wrap"><div className="login-card" style={{textAlign:'center'}}>
        <span className="spinner" /> <span style={{color:'#8a8a8a', fontSize:13}}>Checking your invite…</span>
      </div></div>
    )
  }

  if (codeState === 'missing' || codeState === 'invalid') {
    return (
      <div className="login-wrap"><div className="login-card" style={{textAlign:'center'}}>
        <div className="login-eyebrow">Private Portal</div>
        <div className="login-title" style={{marginBottom:16}}>Invite required</div>
        <p style={{color:'#8a8a8a', fontSize:14, lineHeight:1.6}}>
          This signup link is missing a valid invite code. Please use the full link
          the studio sent you, or get in touch for a new one.
        </p>
      </div></div>
    )
  }

  if (done) {
    return (
      <div className="login-wrap"><div className="login-card" style={{textAlign:'center'}}>
        <div className="login-eyebrow">Private Portal</div>
        <div className="login-title" style={{marginBottom:16}}>Almost there</div>
        <p style={{color:'#8a8a8a', fontSize:14, lineHeight:1.6, marginBottom:24}}>
          Check your email to confirm your address. Once you've confirmed and the
          studio approves you, you'll be able to sign in and browse the library.
        </p>
        <a href="/" className="btn btn-ghost" style={{width:'100%', textDecoration:'none'}}>Back to sign in</a>
      </div></div>
    )
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-eyebrow">Private Portal · Invited</div>
        <div className="login-title">Request access</div>

        <div className="field">
          <label className="label">Name</label>
          <input type="text" className="input" placeholder="Your name"
            value={name} autoComplete="name" onChange={e => setName(e.target.value)} />
        </div>

        <div className="field">
          <label className="label">Company</label>
          <input type="text" className="input" placeholder="Where you work"
            value={company} autoComplete="organization" onChange={e => setCompany(e.target.value)} />
        </div>

        <div className="field">
          <label className="label">Email</label>
          <input type="email" className="input" placeholder="you@example.com"
            value={email} autoComplete="email" onChange={e => setEmail(e.target.value)} />
        </div>

        <div className="field">
          <label className="label">Password</label>
          <input type="password" className="input" placeholder="At least 8 characters"
            value={password} autoComplete="new-password"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSignup()} />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="btn btn-primary" style={{width:'100%', marginTop:20}}
          onClick={handleSignup} disabled={loading}>
          {loading ? <><span className="spinner" />Creating account…</> : 'Request access →'}
        </button>

        <div className="login-switch">
          Already have an account? <a href="/" className="link-btn" style={{textDecoration:'underline'}}>Sign in</a>
        </div>
      </div>
    </div>
  )
}
