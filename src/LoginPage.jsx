import { useState } from 'react'
import { supabase } from './supabase'

function hashPassword(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0 }
  return hash.toString(16)
}

export default function LoginPage({ onLogin, onToast }) {
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!name.trim() || !password) { setError('Please enter your name and password'); return }
    setLoading(true)

    const { data, error: dbError } = await supabase
      .from('clients')
      .select('*')
      .ilike('name', name.trim())
      .single()

    if (dbError || !data) {
      setError('Name not found')
      setLoading(false); return
    }

    if (data.password_hash !== hashPassword(password)) {
      setError('Incorrect password')
      setLoading(false); return
    }

    onLogin(data)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-eyebrow">Private Portal</div>
        <div className="login-title">Sign in to access your files</div>

        <div className="field">
          <label className="label">Name</label>
          <input className={`input ${error ? 'input-error' : ''}`}
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        <div className="field">
          <label className="label">Password</label>
          <input type="password" className={`input ${error ? 'input-error' : ''}`}
            placeholder="••••••••"
            value={password}
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
