// this is a fully static demo page — no login required, no API calls, no database.
// it shows a fake but realistic-looking live league so people can see the app
// before they sign up. update the fake scores/names here whenever I want to refresh it.

import { Link } from 'react-router-dom'

// fake standings — I made these look like a real mid-season league
const STANDINGS = [
  { rank: 1, team: 'Bipartisan Ballers',  user: 'jordan_m',  picks: 7, score: 84.0, you: false },
  { rank: 2, team: 'The Filibuster Kings', user: 'alex_r',   picks: 6, score: 71.5, you: true  },
  { rank: 3, team: 'Quorum Crushers',     user: 'casey_h',   picks: 7, score: 63.0, you: false },
  { rank: 4, team: 'The Swing Voters',    user: 'sam_ok',    picks: 7, score: 48.5, you: false },
]

// fake roster using real politicians with real bioguide IDs so their photos load
// from the unitedstates.github.io image repo
const ROSTER = [
  { name: 'Sen. Elizabeth Warren',          bioguide: 'W000817', party: 'dem', chamber: 'senate', state: 'MA',    pts: 18.0 },
  { name: 'Sen. Chuck Grassley',            bioguide: 'G000386', party: 'rep', chamber: 'senate', state: 'IA',    pts: 15.5 },
  { name: 'Rep. Alexandria Ocasio-Cortez',  bioguide: 'O000172', party: 'dem', chamber: 'house',  state: 'NY-14', pts: 13.0 },
  { name: 'Sen. Mike Crapo',                bioguide: 'C000880', party: 'rep', chamber: 'senate', state: 'ID',    pts: 11.0 },
  { name: 'Sen. Bill Cassidy',              bioguide: 'C001075', party: 'rep', chamber: 'senate', state: 'LA',    pts: 9.0  },
  { name: 'Rep. Alma Adams',                bioguide: 'A000370', party: 'dem', chamber: 'house',  state: 'NC-12', pts: 5.0  },
]

// rank colors matching the real app
function rankColor(rank) {
  if (rank === 1) return '#C9A84C'
  if (rank === 2) return '#C0C0C0'
  if (rank === 3) return '#CD7F32'
  return '#9BA8B8'
}

// politician photo from the unitedstates github repo — falls back to initials
function PoliticianPhoto({ bioguide, name }) {
  const initials = name.replace(/^(Sen\.|Rep\.)\s/, '').split(' ').map(w => w[0]).join('').slice(0, 2)
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: '#1E3A5F', flexShrink: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.65rem', fontWeight: 700, color: '#9BA8B8',
    }}>
      <img
        src={`https://unitedstates.github.io/images/congress/225x275/${bioguide}.jpg`}
        alt={name}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerText = initials }}
      />
    </div>
  )
}

export default function Demo() {
  return (
    <div style={{ background: '#0A1628', minHeight: '100vh', color: '#fff', fontFamily: 'var(--font-body)' }}>

      {/* ── DEMO BANNER — tells people this isn't a real account ── */}
      <div style={{
        background: '#C9A84C', color: '#0A1628',
        textAlign: 'center', padding: '0.5rem',
        fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em',
      }}>
        👀 DEMO PREVIEW — This is a sample league.{' '}
        <Link to="/register" style={{ color: '#0A1628', textDecoration: 'underline' }}>
          Create a free account to play for real →
        </Link>
      </div>

      <div className="page" style={{ maxWidth: 720 }}>

        {/* ── LEAGUE HEADER ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '2rem',
            fontWeight: 800, textTransform: 'uppercase',
          }}>
            The Capitol Hill Classic
          </h1>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Invite code: <span className="text-gold" style={{ fontFamily: 'var(--font-mono)' }}>DEMO2026</span>
            {' · '} 4/4 teams {' · '}
            <span style={{ color: '#6bcf6b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
              Active
            </span>
            <span className="text-gold" style={{ fontWeight: 700, fontSize: '0.7rem', marginLeft: '0.5rem', textTransform: 'uppercase' }}>
              ★ Premium
            </span>
          </p>
        </div>

        {/* ── YOUR PICK BANNER — shows what it looks like mid-draft ── */}
        <div className="card" style={{
          marginBottom: '1.5rem',
          borderColor: 'var(--gold)',
          background: 'rgba(201,168,76,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div>
            <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray-mid)' }}>
              Pick 14 · Round 2
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
              ⭐ Your pick!
            </p>
          </div>
          <button className="btn btn-gold" style={{ opacity: 0.6, cursor: 'default' }}>
            Make Pick →
          </button>
        </div>

        {/* ── TABS (visual only — not interactive in the demo) ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid var(--navy-lt)' }}>
          {['🏆 Standings', '🗳 Draft Board', '📋 My Roster'].map((t, i) => (
            <div key={t} style={{
              padding: '0.6rem 1.1rem',
              fontWeight: 600, fontSize: '0.82rem',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: i === 0 ? 'var(--white)' : 'var(--gray-mid)',
              borderBottom: i === 0 ? '2px solid var(--red)' : '2px solid transparent',
              marginBottom: '-2px',
            }}>
              {t}
            </div>
          ))}
        </div>

        {/* ── STANDINGS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
          {STANDINGS.map(team => (
            <div key={team.rank} className="card flex items-center gap-2" style={{
              padding: '1rem 1.25rem',
              borderColor: team.you ? 'var(--gold)' : 'var(--navy-lt)',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800,
                color: rankColor(team.rank), minWidth: '2.5rem',
              }}>
                {team.rank}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {team.team}
                  {team.you && (
                    <span className="text-gold" style={{ fontSize: '0.72rem', marginLeft: '0.5rem', fontWeight: 700 }}>
                      YOU
                    </span>
                  )}
                </p>
                <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                  {team.user} · {team.picks} picks
                </p>
              </div>
              <div className="score">{team.score.toFixed(1)}</div>
            </div>
          ))}
        </div>

        {/* ── MY ROSTER ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.2rem',
              fontWeight: 700, textTransform: 'uppercase',
            }}>
              The Filibuster Kings
            </h2>
            <div className="score">71.5 pts</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {ROSTER.map(p => (
              <div key={p.bioguide} className="card flex items-center gap-2" style={{ padding: '0.75rem 1rem' }}>
                <PoliticianPhoto bioguide={p.bioguide} name={p.name} />
                <span className={`badge badge-${p.party}`}>
                  {p.party === 'dem' ? 'Dem' : 'Rep'}
                </span>
                <span className={`badge badge-${p.chamber}`}>
                  {p.chamber === 'senate' ? 'Senate' : 'House'}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.name}</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>{p.state}</p>
                </div>
                <div className="score-sm">{p.pts.toFixed(1)} pts</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA at the bottom ── */}
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '1.4rem',
            fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem',
          }}>
            Ready to Play for Real?
          </p>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Create a free account, invite your friends, and start your own league.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary">Create Free Account</Link>
            <Link to="/" className="btn btn-secondary">Learn More</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
