import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Leagues() {
  const navigate = useNavigate()
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', max_teams: 8, roster_size: 10 })
  const [joinForm, setJoinForm] = useState({ invite_code: '', team_name: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.get('/leagues/')
      .then(res => setLeagues(res.data))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/leagues/', { ...createForm, season_year: 2026 })
      setLeagues([...leagues, res.data])
      setShowCreate(false)
      setSuccess(`League "${res.data.name}" created! Invite code: ${res.data.invite_code}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create league')
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/leagues/join', joinForm)
      const res = await api.get('/leagues/')
      setLeagues(res.data)
      setShowJoin(false)
      setSuccess('Joined league successfully!')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to join league')
    }
  }

  const statusColor = (status) => {
    if (status === 'pending') return 'var(--gold)'
    if (status === 'active') return '#6bcf6b'
    if (status === 'complete') return 'var(--gray-mid)'
    return 'var(--gray-mid)'
  }

  return (
    <div className="page">
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase' }}>
          My <span className="text-red">Leagues</span>
        </h1>
        <div className="flex gap-1">
          <button className="btn btn-secondary" onClick={() => { setShowJoin(!showJoin); setShowCreate(false) }}>
            Join League
          </button>
          <button className="btn btn-primary" onClick={() => { setShowCreate(!showCreate); setShowJoin(false) }}>
            + Create League
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Create Form */}
      {showCreate && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card-title">Create a League</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">League Name</label>
              <input className="form-input" value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. The Capitol Hill Classic" required />
            </div>
            <div className="flex gap-2">
              <div className="form-group w-full">
                <label className="form-label">Max Teams</label>
                <input className="form-input" type="number" min={2} max={16}
                  value={createForm.max_teams}
                  onChange={e => setCreateForm({ ...createForm, max_teams: parseInt(e.target.value) })} />
              </div>
              <div className="form-group w-full">
                <label className="form-label">Roster Size</label>
                <input className="form-input" type="number" min={5} max={20}
                  value={createForm.roster_size}
                  onChange={e => setCreateForm({ ...createForm, roster_size: parseInt(e.target.value) })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Create League</button>
          </form>
        </div>
      )}

      {/* Join Form */}
      {showJoin && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card-title">Join a League</h2>
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label className="form-label">Invite Code</label>
              <input className="form-input" value={joinForm.invite_code}
                onChange={e => setJoinForm({ ...joinForm, invite_code: e.target.value })}
                placeholder="e.g. ABCD1234" required />
            </div>
            <div className="form-group">
              <label className="form-label">Your Team Name</label>
              <input className="form-input" value={joinForm.team_name}
                onChange={e => setJoinForm({ ...joinForm, team_name: e.target.value })}
                placeholder="e.g. The Filibuster Five" required />
            </div>
            <button type="submit" className="btn btn-gold">Join League</button>
          </form>
        </div>
      )}

      {/* League List */}
      {loading ? (
        <p className="text-muted">Loading leagues...</p>
      ) : leagues.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏛</p>
          <p className="text-muted">You're not in any leagues yet.</p>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Create one or join with an invite code.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {leagues.map(league => (
            <div key={league.id} className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/leagues/${league.id}`)}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    {league.name}
                  </h3>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {league.member_count}/{league.max_teams} teams · {league.roster_size} picks · {league.season_year}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: statusColor(league.draft_status), fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {league.draft_status}
                  </span>
                  <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Code: <span className="text-gold" style={{ fontFamily: 'var(--font-mono)' }}>{league.invite_code}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
