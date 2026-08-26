import { useState } from 'react'
import { supabase, CLIENT_SELF_COLS } from './supabase'

export default function LoginPage({ onLogin, onToast }) {
  const [mode, setMode]         = useState('signin')  // 'signin' | 'signup'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')
  const [notice, setNotice]     = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    setError(''); setNotice('')
    if (!email.trim() || !password) { setError('Please enter your email and password'); return }
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (authError || !authData?.user) {
      // Distinguish "not confirmed yet" from a genuine credential failure,
      // since a just-signed-up user hitting sign-in is a common case.
      if (authError?.message?.toLowerCase().includes('confirm')) {
        setError('Please confirm your email first — check your inbox for the link.')
      } else {
        setError('Incorrect email or password')
      }
      setLoading(false); return
    }

    // Fetch this user's portal profile. A brand-new confirmed signup may not
    // have a clients row yet — create their pending row on first sign-in.
    let { data: row } = await supabase
      .from('clients')
      .select(CLIENT_SELF_COLS)
      .eq('user_id', authData.user.id)
      .single()

    if (!row) {
      // First sign-in after confirming: create the pending profile.
      const { error: insErr } = await supabase.from('clients').insert({
        user_id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.display_name || authData.user.email,
        role: 'client',
        approved: false,
      })
      if (insErr) {
        await supabase.auth.signOut()
        setError('Could not finish setting up your account — contact the studio.')
        setLoading(false); return
      }
      const re = await supabase.from('clients').select(CLIENT_SELF_COLS).eq('user_id', authData.user.id).single()
      row = re.data
    }

    if (!row) {
      await supabase.auth.signOut()
      setError('This account is not set up for the portal — contact the studio.')
      setLoading(false); return
    }

    onLogin(row)
  }

  const handleSignup = async () => {
    setError(''); setNotice('')
    if (!name.trim())  { setError('Please enter your name'); return }
    if (!email.trim()) { setError('Please enter your email'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)

    const { data, error: signErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: window.location.origin,
      },
    })
    if (signErr) {
      setError(signErr.message || 'Could not create your account')
      setLoading(false); return
    }

    // With email confirmation ON, no session is returned yet — they must click
    // the link in their email. Show a clear "check your inbox" state.
    setNotice('Check your email to confirm your account, then sign in. Access is granted once the studio approves you.')
    setMode('signin')
    setPassword('')
    setLoading(false)
  }

  const submit = () => (mode === 'signin' ? handleLogin() : handleSignup())

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-eyebrow">Private Portal</div>
        <div className="login-title">
          {mode === 'signin' ? 'Sign in to access your files' : 'Request access'}
        </div>

        {mode === 'signup' && (
          <div className="field">
            <label className="label">Name</label>
            <input type="text" className={`input ${error ? 'input-error' : ''}`}
              placeholder="Your name or studio"
              value={name}
              autoComplete="name"
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
        )}

        <div className="field">
          <label className="label">Email</label>
          <input type="email" className={`input ${error ? 'input-error' : ''}`}
            placeholder="you@example.com"
            value={email}
            autoComplete="email"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        <div className="field">
          <label className="label">Password</label>
          <input type="password" className={`input ${error ? 'input-error' : ''}`}
            placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
            value={password}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        {error && <div className="error-msg">{error}</div>}
        {notice && <div className="notice-msg">{notice}</div>}

        <button className="btn btn-primary" style={{ width:'100%', marginTop:20 }}
          onClick={submit} disabled={loading}>
          {loading
            ? <><span className="spinner" />{mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
            : (mode === 'signin' ? 'Sign in →' : 'Request access →')}
        </button>

        <div className="login-switch">
          {mode === 'signin' ? (
            <>New here? <button className="link-btn" onClick={() => { setMode('signup'); setError(''); setNotice('') }}>Request access</button></>
          ) : (
            <>Already have an account? <button className="link-btn" onClick={() => { setMode('signin'); setError(''); setNotice('') }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  )
}
