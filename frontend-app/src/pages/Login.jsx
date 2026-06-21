import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/leagues')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 420, paddingTop: '4rem' }}>
      <div className="text-center" style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.5rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          Sign <span className="text-red">In</span>
        </h1>
        <p className="text-muted mt-1" style={{ fontSize: '0.875rem' }}>
          Draft your Congress. Win the season.
        </p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              placeholder="your username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full mt-2"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <hr className="divider mt-2" />

        <p className="text-center text-muted mt-1" style={{ fontSize: '0.875rem' }}>
          No account?{' '}
          <Link to="/register" className="text-gold">Create one</Link>
        </p>
      </div>
    </div>
  )
}
