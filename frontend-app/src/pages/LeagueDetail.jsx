import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'

const PHOTO_URL = (bioguideId) =>
  `https://unitedstates.github.io/images/congress/225x275/${bioguideId}.jpg`

function PoliticianPhoto({ bioguideId, name, size = 40 }) {
  return (
    <img
      src={PHOTO_URL(bioguideId)}
      alt={name}
      onError={e => { e.target.style.display = 'none' }}
      style={{
        width: size,
        height: size * 1.22,
        objectFit: 'cover',
        objectPosition: 'top',
        borderRadius: 3,
        border: '1px solid var(--navy-lt)',
        flexShrink: 0,
      }}
    />
  )
}

function PartyBadge({ party }) {
  const cls = party === 'democrat' ? 'badge-dem' : party === 'republican' ? 'badge-rep' : 'badge-ind'
  const label = party === 'democrat' ? 'D' : party === 'republican' ? 'R' : 'I'
  return <span className={`badge ${cls}`}>{label}</span>
}

function StatPill({ label, value, warning, tooltip }) {
  return (
    <div title={tooltip} style={{
      background: 'var(--navy)',
      border: '1px solid var(--navy-lt)',
      borderRadius: 4,
      padding: '0.4rem 0.65rem',
      minWidth: 90,
      cursor: tooltip ? 'help' : 'default',
    }}>
      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-mid)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.95rem',
        color: value === '—' ? 'var(--gray-mid)' : warning ? 'var(--red)' : 'var(--gold)',
        fontWeight: 600,
      }}>
        {value}
      </div>
    </div>
  )
}

function IdeologyBar({ score, label }) {
  if (score == null) return (
    <div>
      <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-mid)', marginBottom: 4 }}>
        Ideology (GovTrack)
      </p>
      <p className="text-muted" style={{ fontSize: '0.8rem' }}>
        Not enough data — member introduced fewer than 10 bills.
      </p>
    </div>
  )

  const pct = Math.round(score * 100)
  return (
    <div>
      <div className="flex justify-between" style={{ marginBottom: 4 }}>
        <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-mid)' }}>
          Ideology (GovTrack) ⓘ
        </p>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--white)' }}>{label}</span>
      </div>
      <div style={{ background: 'var(--navy)', borderRadius: 4, height: 10, position: 'relative', overflow: 'hidden' }}>
        {/* Gradient bar: blue left, red right */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, #1a3a8f, #8f1a1a)',
          borderRadius: 4,
        }} />
        {/* Position marker */}
        <div style={{
          position: 'absolute',
          left: `${pct}%`,
          top: -2,
          bottom: -2,
          width: 3,
          background: 'var(--gold)',
          borderRadius: 2,
          transform: 'translateX(-50%)',
        }} />
      </div>
      <div className="flex justify-between" style={{ marginTop: 3 }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--gray-mid)' }}>Progressive</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--gray-mid)' }}>Conservative</span>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--gray-mid)', marginTop: 4, lineHeight: 1.4 }}>
        Based on cosponsorship patterns (GovTrack). Does not reflect positions on specific issues.
        <a href="https://www.govtrack.us/about/analysis" target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--gold)', marginLeft: 4 }}>Learn more</a>
      </p>
    </div>
  )
}

function PoliticianCard({ p, isMyTurn, onPick }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const toggleExpand = async () => {
    if (!expanded && !detail) {
      setLoadingDetail(true)
      try {
        const res = await api.get(`/politicians/${p.id}`)
        setDetail(res.data)
      } catch (e) {
        console.error('Failed to load detail', e)
      } finally {
        setLoadingDetail(false)
      }
    }
    setExpanded(!expanded)
  }

  const fmt = (val, suffix = '') => val != null ? `${val}${suffix}` : '—'

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Main Row */}
      <div className="flex items-center gap-2"
        style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
        onClick={toggleExpand}
      >
        <PoliticianPhoto bioguideId={p.bioguide_id} name={p.full_name} size={36} />
        <PartyBadge party={p.party} />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.title} {p.full_name}</span>
          <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
            {p.state}{p.district ? `-${p.district}` : ''}
          </span>
        </div>
        <span className="badge badge-senate" style={{ marginRight: '0.25rem' }}>
          {p.chamber === 'senate' ? 'SEN' : 'REP'}
        </span>
        {isMyTurn && (
          <button
            className="btn btn-gold"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
            onClick={(e) => { e.stopPropagation(); onPick(p.id) }}
          >
            Draft
          </button>
        )}
        <span style={{ color: 'var(--gray-mid)', fontSize: '0.8rem', marginLeft: '0.25rem' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded Detail Panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--navy-lt)', padding: '1rem', background: 'var(--navy)' }}>
          {loadingDetail ? (
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Loading...</p>
          ) : detail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Photo + Name Header */}
              <div className="flex items-center gap-2">
                <PoliticianPhoto bioguideId={p.bioguide_id} name={p.full_name} size={64} />
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
                    {p.title} {p.full_name}
                  </p>
                  <p className="text-muted" style={{ fontSize: '0.82rem' }}>
                    {p.state}{p.district ? `-${p.district}` : ''} · {p.chamber === 'senate' ? 'Senate' : 'House'}
                  </p>
                </div>
              </div>

              {/* Performance Stats */}
              <div>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-mid)', marginBottom: '0.5rem' }}>
                  Performance Stats
                </p>
                <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                  <StatPill label="Fantasy Pts" value={detail.total_points != null ? detail.total_points.toFixed(1) : '—'}
                    tooltip="Total fantasy points earned so far this session" />
                  <StatPill label="Party Vote %" value={fmt(detail.votes_with_party_pct, '%')}
                    tooltip="How often this member votes with their party" />
                  <StatPill label="Missed Votes" value={fmt(detail.missed_votes_pct, '%')}
                    warning={detail.missed_votes_pct != null && detail.missed_votes_pct > 10}
                    tooltip="% of votes missed — high % means -3 pts penalty events" />
                  <StatPill label="Seniority" value={detail.seniority != null ? `${detail.seniority}yr` : '—'}
                    tooltip="Years served in this chamber" />
                  <StatPill label="Leadership" value={detail.leadership_label || '—'}
                    tooltip="GovTrack leadership score — how often others cosponsor this member's bills" />
                </div>
              </div>

              {/* Ideology Bar */}
              <IdeologyBar score={detail.ideology_score} label={detail.ideology_label} />

              {/* Recent Scoring Events */}
              <div>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-mid)', marginBottom: '0.5rem' }}>
                  Recent Scoring Activity
                </p>
                {detail.recent_events?.length > 0 ? (
                  detail.recent_events.slice(0, 4).map((e, i) => (
                    <div key={i} className="flex justify-between items-center" style={{
                      padding: '0.35rem 0',
                      borderTop: i > 0 ? '1px solid var(--navy-lt)' : 'none',
                      fontSize: '0.82rem',
                    }}>
                      <span className="text-muted" style={{ flex: 1, paddingRight: '1rem' }}>
                        {e.description}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        color: e.points < 0 ? 'var(--red)' : 'var(--gold)',
                        fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {e.points > 0 ? '+' : ''}{e.points} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted" style={{ fontSize: '0.82rem' }}>
                    No scoring events yet. Stats populate after the first weekly scoring run.
                  </p>
                )}
              </div>

              {/* External Links */}
              <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                <a href={detail.links?.bioguide} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                  Biography ↗
                </a>
                <a href={detail.links?.congress_gov} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                  Legislation & Votes ↗
                </a>
                <a href={detail.links?.ballotpedia} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                  Ballotpedia Profile ↗
                </a>
              </div>

            </div>
          ) : (
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Could not load stats.</p>
          )}
        </div>
      )}
    </div>
  )
}

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
