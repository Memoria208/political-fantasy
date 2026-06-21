import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Home() {
  const { user } = useAuth()

  return (
    <div>
      {/* Hero Banner */}
      <div className="star-banner">
        <h1 className="banner-title">
          Political<br />
          <span className="red">Fantasy</span>
        </h1>
        <p className="banner-sub">Draft Congress. Score Points. Win America.</p>
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {user ? (
            <Link to="/leagues" className="btn btn-primary">My Leagues</Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">Start Drafting</Link>
              <Link to="/login" className="btn btn-secondary">Sign In</Link>
            </>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="page">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '2rem' }}>

          <div className="card">
            <div style={{ color: 'var(--gold)', fontSize: '2rem', marginBottom: '0.75rem' }}>★</div>
            <h3 className="card-title" style={{ fontSize: '1.1rem' }}>Draft Your Congress</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Pick from all 537 current members of the 119th Congress in a snake draft with your league.
            </p>
          </div>

          <div className="card">
            <div style={{ color: 'var(--red)', fontSize: '2rem', marginBottom: '0.75rem' }}>⚖</div>
            <h3 className="card-title" style={{ fontSize: '1.1rem' }}>Score on Real Activity</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Bills introduced, votes cast, laws signed — your politicians earn points for real legislative work.
            </p>
          </div>

          <div className="card">
            <div style={{ color: 'var(--white)', fontSize: '2rem', marginBottom: '0.75rem' }}>🏆</div>
            <h3 className="card-title" style={{ fontSize: '1.1rem' }}>Win the Season</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Track your league's leaderboard weekly. The best roster wins when Congress delivers.
            </p>
          </div>
        </div>

        {/* Scoring Table */}
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2 className="card-title">Scoring System</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Bill signed into law', '+25'],
                ['Bill passed committee', '+10'],
                ['Maverick vote (against party)', '+8'],
                ['Bill introduced', '+5'],
                ['Committee hearing', '+3'],
                ['Voted with party', '+2'],
                ['Floor speech', '+1'],
                ['Missed vote', '−3'],
              ].map(([action, pts]) => (
                <tr key={action} style={{ borderTop: '1px solid var(--navy-lt)' }}>
                  <td style={{ padding: '0.65rem 0', color: 'var(--gray-lt)', fontSize: '0.9rem' }}>{action}</td>
                  <td style={{ padding: '0.65rem 0', textAlign: 'right' }}>
                    <span className={`score-sm ${pts.startsWith('−') ? 'text-red' : 'text-gold'}`}>{pts} pts</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
