import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', password: '', display_name: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form.username, form.email, form.password, form.display_name)
      navigate('/leagues')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
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
          Join the <span className="text-red">Draft</span>
        </h1>
        <p className="text-muted mt-1" style={{ fontSize: '0.875rem' }}>
          Create your account and start building your cabinet.
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
              placeholder="choose a username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="your team name or nickname"
              value={form.display_name}
              onChange={e => setForm({ ...form, display_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <hr className="divider mt-2" />

        <p className="text-center text-muted mt-1" style={{ fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link to="/login" className="text-gold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
