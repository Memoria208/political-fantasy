import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import PoliticianCard, { PoliticianPhoto, PartyBadge } from '../components/PoliticianCard'

function RankColor(rank) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return ''
}

export default function LeagueDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [league, setLeague] = useState(null)
  const [tab, setTab] = useState('leaderboard')
  const [standings, setStandings] = useState(null)
  const [currentPick, setCurrentPick] = useState(null)
  const [available, setAvailable] = useState([])
  const [myRoster, setMyRoster] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [chamberFilter, setChamberFilter] = useState('')
  const [partyFilter, setPartyFilter] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchAll = async () => {
    try {
      const [leagueRes, standingsRes] = await Promise.all([
        api.get(`/leagues/${id}`),
        api.get(`/leaderboard/${id}`),
      ])
      setLeague(leagueRes.data)
      setStandings(standingsRes.data)

      const me = leagueRes.data.members.find(m => m.username === user?.username)
      if (me) {
        const rosterRes = await api.get(`/leaderboard/${id}/roster/${me.id}`)
        setMyRoster(rosterRes.data)
      }

      if (['active', 'complete'].includes(leagueRes.data.draft_status)) {
        const pickRes = await api.get(`/draft/${id}/current-pick`).catch(() => null)
        setCurrentPick(pickRes?.data)
      }
    } catch (err) {
      setError('Failed to load league')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailable = async () => {
    const params = new URLSearchParams({ limit: 100 })
    if (search) params.set('search', search)
    if (chamberFilter) params.set('chamber', chamberFilter)
    if (partyFilter) params.set('party', partyFilter)
    const res = await api.get(`/draft/${id}/available?${params}`)
    setAvailable(res.data)
  }

  useEffect(() => { fetchAll() }, [id])
  useEffect(() => {
    if (tab === 'draft') fetchAvailable()
  }, [tab, search, chamberFilter, partyFilter])

  const startDraft = async () => {
    try {
      await api.post(`/leagues/${id}/start-draft`)
      setSuccess('Draft started!')
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start draft')
    }
  }

  const makePick = async (politicianId) => {
    setError('')
    try {
      const res = await api.post(`/draft/${id}/pick`, { politician_id: politicianId })
      setSuccess(res.data.message)
      fetchAll()
      fetchAvailable()
    } catch (err) {
      setError(err.response?.data?.detail || 'Pick failed')
    }
  }

  if (loading) return <div className="page"><p className="text-muted">Loading...</p></div>
  if (!league) return <div className="page"><p className="text-red">League not found</p></div>

  const isMyTurn = currentPick?.is_your_turn

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase' }}>
          {league.name}
        </h1>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Invite code: <span className="text-gold" style={{ fontFamily: 'var(--font-mono)' }}>{league.invite_code}</span>
          {' · '}{league.members.length}/{league.max_teams} teams{' · '}
          <span style={{ color: league.draft_status === 'active' ? '#6bcf6b' : 'var(--gray-mid)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
            {league.draft_status}
          </span>
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {league.draft_status === 'pending' && (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            {league.members.length} team{league.members.length !== 1 ? 's' : ''} joined. Commissioner starts the draft when ready.
          </p>
          <button className="btn btn-primary" onClick={startDraft}>🗳 Start Draft</button>
        </div>
      )}

      {league.draft_status === 'active' && currentPick && !currentPick.message && (
        <div className="card" style={{
          marginBottom: '1.5rem',
          borderColor: isMyTurn ? 'var(--gold)' : 'var(--navy-lt)',
          background: isMyTurn ? 'rgba(201,168,76,0.08)' : 'var(--navy-mid)',
        }}>
          <div className="flex justify-between items-center">
            <div>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-mid)' }}>
                Pick {currentPick.pick_number} · Round {currentPick.round_number}
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {isMyTurn ? '⭐ Your pick!' : `${currentPick.team_name} is picking...`}
              </p>
            </div>
            {isMyTurn && (
              <button className="btn btn-gold" onClick={() => setTab('draft')}>Make Pick →</button>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid var(--navy-lt)' }}>
        {['leaderboard', 'draft', 'roster'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none',
            color: tab === t ? 'var(--white)' : 'var(--gray-mid)',
            padding: '0.65rem 1.25rem',
            fontWeight: 600, fontSize: '0.85rem',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            borderBottom: tab === t ? '2px solid var(--red)' : '2px solid transparent',
            marginBottom: '-2px', transition: 'color 0.15s',
          }}>
            {t === 'leaderboard' ? '🏆 Standings' : t === 'draft' ? '🗳 Draft Board' : '📋 My Roster'}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && standings && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {standings.standings.map((team, i) => (
            <div key={i} className="card flex items-center gap-2"
              style={{ padding: '1rem 1.25rem', borderColor: team.is_you ? 'var(--gold)' : 'var(--navy-lt)' }}>
              <div className={`rank-number ${RankColor(team.rank)}`}>{team.rank}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {team.team_name}
                  {team.is_you && <span className="text-gold" style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>YOU</span>}
                </p>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>{team.username} · {team.roster_size} picks</p>
              </div>
              <div className="score">{team.total_score.toFixed(1)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'draft' && (
        <div>
          <p className="text-muted" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
            Click any politician to expand their stats, ideology, and profile links.
            {isMyTurn ? ' ⭐ It\'s your pick!' : ''}
          </p>
          <div className="flex gap-1" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input className="form-input" style={{ maxWidth: 220 }}
              placeholder="Search by name..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-input" style={{ maxWidth: 150 }}
              value={chamberFilter} onChange={e => setChamberFilter(e.target.value)}>
              <option value="">All Chambers</option>
              <option value="senate">Senate</option>
              <option value="house">House</option>
            </select>
            <select className="form-input" style={{ maxWidth: 160 }}
              value={partyFilter} onChange={e => setPartyFilter(e.target.value)}>
              <option value="">All Parties</option>
              <option value="democrat">Democrat</option>
              <option value="republican">Republican</option>
              <option value="independent">Independent</option>
            </select>
          </div>
          {available.length === 0 ? (
            <p className="text-muted">No politicians match your filters.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {available.map(p => (
                <PoliticianCard key={p.id} p={p} isMyTurn={isMyTurn} onPick={makePick} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'roster' && myRoster && (
        <div>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, textTransform: 'uppercase' }}>
              {myRoster.team_name}
            </h2>
            <div className="score">{myRoster.total_score?.toFixed(1)} pts</div>
          </div>
          {myRoster.roster.length === 0 ? (
            <p className="text-muted">No picks yet. Head to the Draft Board tab to pick.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {myRoster.roster.map((p, i) => (
                <div key={i} className="card flex items-center gap-2" style={{ padding: '0.75rem 1rem' }}>
                  <PoliticianPhoto bioguideId={p.bioguide_id} name={p.full_name} size={36} />
                  <PartyBadge party={p.party} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.title} {p.full_name}</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {p.state} · {p.chamber}{p.cabinet_role && ` · ${p.cabinet_role}`}
                    </p>
                  </div>
                  <div className="score-sm">{p.points} pts</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
