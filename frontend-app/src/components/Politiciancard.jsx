import { useState } from 'react'
import api from '../lib/api'

const PHOTO_URL = (bioguideId) =>
  `https://unitedstates.github.io/images/congress/225x275/${bioguideId}.jpg`

export function PoliticianPhoto({ bioguideId, name, size = 40 }) {
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

export function PartyBadge({ party }) {
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
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, #1a3a8f, #8f1a1a)',
          borderRadius: 4,
        }} />
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
        Based on cosponsorship patterns (GovTrack). Does not reflect positions on specific issues.{' '}
        <a href="https://www.govtrack.us/about/analysis" target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--gold)' }}>Learn more</a>
      </p>
    </div>
  )
}

export default function PoliticianCard({ p, isMyTurn, onPick }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const toggleExpand = async () => {
    // Toggle visibility immediately so the card expands on click,
    // independent of the network request below.
    const willExpand = !expanded
    setExpanded(willExpand)

    // Lazy-load detail the first time the card is opened.
    if (willExpand && !detail) {
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
        {isMyTurn && onPick && (
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
                      <span className="text-muted" style={{ flex: 1, paddingRight: '1rem' }}>{e.description}</span>
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