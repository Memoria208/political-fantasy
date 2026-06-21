import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="site-header">
      <Link to="/" className="site-logo">
        Political <span>Fantasy</span>
      </Link>

      <nav className="site-nav">
        {user ? (
          <>
            <Link to="/leagues" className="nav-link">My Leagues</Link>
            <Link to="/politicians" className="nav-link">Players</Link>
            <Link to="/settings" className="nav-link" style={{ color: 'var(--gold)' }}>
              {user.display_name} ⚙
            </Link>
            <button className="nav-btn" onClick={logout}>Sign Out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Sign In</Link>
            <Link to="/register" className="nav-btn">Join</Link>
          </>
        )}
      </nav>
    </header>
  )
}
