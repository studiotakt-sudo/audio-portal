import { useState } from 'react'
import { supabase, CLIENT_SELF_COLS } from './supabase'

export default function LoginPage({ onLogin, onToast }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!email.trim() || !password) { setError('Please enter your email and password'); return }
    setLoading(true)

    // Real authentication: bcrypt verification happens server-side in
    // Supabase Auth. No hashes ever reach (or leave) the browser.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (authError || !authData?.user) {
      // One message for both wrong-email and wrong-password — no account
      // enumeration from the login form.
      setError('Incorrect email or password')
      setLoading(false); return
    }

    // Fetch this user's portal profile (RLS: own row only for clients).
    const { data: row, error: rowError } = await supabase
      .from('clients')
      .select(CLIENT_SELF_COLS)
      .eq('user_id', authData.user.id)
      .single()

    if (rowError || !row) {
      await supabase.auth.signOut()
      setError('This account is not set up for the portal — contact the studio.')
      setLoading(false); return
    }

    onLogin(row)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-eyebrow">Private Portal</div>
        <div className="login-title">Sign in to access your files</div>

        <div className="field">
          <label className="label">Email</label>
          <input type="email" className={`input ${error ? 'input-error' : ''}`}
            placeholder="you@example.com"
            value={email}
            autoComplete="email"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        <div className="field">
          <label className="label">Password</label>
          <input type="password" className={`input ${error ? 'input-error' : ''}`}
            placeholder="••••••••"
            value={password}
            autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="btn btn-primary" style={{ width:'100%', marginTop:20 }}
          onClick={handleLogin} disabled={loading}>
          {loading ? <><span className="spinner" />Signing in…</> : 'Sign in →'}
        </button>
      </div>
    </div>
  )
}
