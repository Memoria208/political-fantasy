import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// how it works steps — I wrote these to speak directly to fantasy football players
// because that's who will immediately get it
const HOW_IT_WORKS = [
  {
    icon: '🗳️',
    title: 'Draft Real Politicians',
    desc: 'Snake draft from all 537 members of the 119th Congress — just like fantasy football, but your picks are senators and representatives.',
  },
  {
    icon: '⚡',
    title: 'Score on Real Activity',
    desc: 'Your roster earns points for real legislative work: bills introduced, laws signed, maverick votes, committee hearings, and more.',
  },
  {
    icon: '⚔️',
    title: 'Head-to-Head Matchups',
    desc: 'Go head-to-head with your league every week. Whoever\'s politicians did the most work wins the matchup.',
  },
  {
    icon: '🏆',
    title: 'Win the Season',
    desc: 'Track the standings all season long. The best roster when Congress delivers wins.',
  },
]

// these match the SCORE_VALUES dict in models.py — if I change scoring there,
// I need to update this list too so the home page stays accurate
const SCORING = [
  ['Bill signed into law',           '+25', false],
  ['Bill passed committee',          '+10', false],
  ['Maverick vote (against party)',   '+8', false],
  ['Bill introduced',                 '+5', false],
  ['Committee hearing',               '+3', false],
  ['Voted with party',                '+2', false],
  ['Floor speech',                    '+1', false],
  ['Missed vote',                     '−3', true],  // negative — show in red
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div>

      {/* ── HERO — first thing someone sees when they land ── */}
      <div className="star-banner">
        <p style={{
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem',
        }}>
          Fantasy Sports · Just With Congress
        </p>
        <h1 className="banner-title">
          Political<br /><span className="red">Fantasy</span>
        </h1>
        <p className="banner-sub" style={{ maxWidth: 480, margin: '0.75rem auto 0' }}>
          Draft real senators and representatives. Score points when they introduce bills,
          pass laws, or cross party lines. Compete with your friends all season long.
        </p>
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            // if they're already logged in just send them to their leagues
            <Link to="/leagues" className="btn btn-primary">Go to My Leagues →</Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">Start Drafting — It's Free</Link>
              <Link to="/login" className="btn btn-secondary">Sign In</Link>
            </>
          )}
        </div>
        {/* update these numbers once I have real user counts */}
        <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--gray-mid)', letterSpacing: '0.05em' }}>
          Free to play · No credit card required · Premium leagues from $30/season
        </p>
      </div>

      <div className="page">

        {/* ── THE PITCH — one paragraph that explains everything to someone who's never heard of this ── */}
        <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 3rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 4vw, 2rem)',
            fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem',
          }}>
            Fantasy Football. But the Players Are in Congress.
          </h2>
          <p style={{ color: 'var(--gray-lt)', lineHeight: 1.7, fontSize: '1rem' }}>
            You already know how fantasy sports works. You draft a roster, your players
            do stuff in real life, and you score points. Political Fantasy is exactly that —
            except instead of touchdowns and yards, your roster earns points for
            introducing legislation, casting votes, passing bills, and showing up to work.
            The more your politicians actually govern, the better your team does.
          </p>
        </div>

        {/* ── HOW IT WORKS ── */}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem',
          textAlign: 'center',
        }}>
          How It Works
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '3rem',
        }}>
          {HOW_IT_WORKS.map(({ icon, title, desc }) => (
            <div key={title} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{icon}</div>
              <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{title}</h3>
              <p className="text-muted" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* ── SCORING TABLE — people always want to know how points work before they sign up ── */}
        <div className="card" style={{ marginBottom: '3rem' }}>
          <h2 className="card-title">How Scoring Works</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Every action your politicians take in real life translates directly into points for your team.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {SCORING.map(([action, pts, isNegative]) => (
                <tr key={action} style={{ borderTop: '1px solid var(--navy-lt)' }}>
                  <td style={{ padding: '0.65rem 0', color: 'var(--gray-lt)', fontSize: '0.9rem' }}>
                    {action}
                  </td>
                  <td style={{ padding: '0.65rem 0', textAlign: 'right' }}>
                    <span className="score-sm" style={{ color: isNegative ? 'var(--red)' : 'var(--gold)' }}>
                      {pts} pts
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── BOTTOM CTA — only show this to logged out users ── */}
        {!user && (
          <div style={{ textAlign: 'center', paddingBottom: '2rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 4vw, 2rem)',
              fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem',
            }}>
              Ready to Draft Your Congress?
            </h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Create an account, invite your friends, and start your draft.
            </p>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
              Create Free Account
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
