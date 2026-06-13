import { useState } from 'react'
import { supabase } from './supabase'
import { T } from './App'

export default function LoginPage({ onToast }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Incorrect email or password')
      setLoading(false)
    }
    // On success the auth listener in App.jsx takes over
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-eyebrow">Private Portal</div>
        <div className="login-title">Sign in to access your files</div>

        <div className="field">
          <label className="label">Email</label>
          <input
            className={`input ${error ? 'input-error' : ''}`}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div className="field">
          <label className="label">Password</label>
          <input
            className={`input ${error ? 'input-error' : ''}`}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 20 }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? <><span className="spinner" />Signing in…</> : 'Sign in →'}
        </button>
      </div>
    </div>
  )
}
