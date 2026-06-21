import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'

export default function Settings() {
  const { user, setUser } = useAuth()

  // ── profile section state
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })
  const [savingProfile, setSavingProfile] = useState(false)

  // ── password section state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })
  const [savingPassword, setSavingPassword] = useState(false)

  // pre-fill the profile form with whatever I currently have on file
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setEmail(user.email || '')
      setAvatarUrl(user.avatar_url || '')
    }
  }, [user])

  // saves display name, email, and/or avatar URL
  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileMsg({ type: '', text: '' })
    try {
      const res = await api.patch('/auth/me', {
        display_name: displayName,
        email,
        avatar_url: avatarUrl,
      })
      // update the auth context so the header reflects the new display name immediately
      if (setUser) setUser(res.data)
      setProfileMsg({ type: 'success', text: 'Profile updated!' })
    } catch (e) {
      setProfileMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to save profile.' })
    } finally {
      setSavingProfile(false)
    }
  }

  // changes password — requires the current password to confirm it's really me
  const changePassword = async () => {
    setPasswordMsg({ type: '', text: '' })

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords don\'t match.' })
      return
    }

    setSavingPassword(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' })
      // clear the password fields after a successful change
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      setPasswordMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to change password.' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return <div className="page"><p className="text-muted">Loading...</p></div>

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2rem' }}>
        Account Settings
      </h1>

      {/* ── PROFILE SECTION ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
          Profile
        </p>

        {/* avatar preview — shows their photo if they have a URL, otherwise initials */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--navy-lt)',
            border: '2px solid var(--navy-lt)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1.3rem', color: 'var(--gold)',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
              : (displayName || user.username || '?')[0].toUpperCase()
            }
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{displayName || user.username}</p>
            <p className="text-muted" style={{ fontSize: '0.78rem' }}>@{user.username}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label className="form-label">Display Name</label>
            <input className="form-input" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="How your name appears in leagues" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" />
          </div>
          <div>
            <label className="form-label">Avatar URL <span className="text-muted" style={{ fontWeight: 400 }}>(optional — paste a link to any image)</span></label>
            <input className="form-input" value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://..." />
          </div>
        </div>

        {profileMsg.text && (
          <div className={`alert alert-${profileMsg.type}`} style={{ marginTop: '1rem' }}>
            {profileMsg.text}
          </div>
        )}

        <button className="btn btn-primary" onClick={saveProfile}
          disabled={savingProfile} style={{ marginTop: '1.25rem' }}>
          {savingProfile ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {/* ── PASSWORD SECTION ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
          Change Password
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password" />
          </div>
          <div>
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password" />
          </div>
        </div>

        {passwordMsg.text && (
          <div className={`alert alert-${passwordMsg.type}`} style={{ marginTop: '1rem' }}>
            {passwordMsg.text}
          </div>
        )}

        <button className="btn btn-primary" onClick={changePassword}
          disabled={savingPassword} style={{ marginTop: '1.25rem' }}>
          {savingPassword ? 'Saving...' : 'Change Password'}
        </button>
      </div>

      {/* ── ACCOUNT INFO (read-only) ── */}
      <div className="card">
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          Account Info
        </p>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
          Username: <span style={{ color: 'var(--white)', fontFamily: 'var(--font-mono)' }}>@{user.username}</span>
        </p>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
          {/* username changes are tricky (JWT tokens reference it) so I'm leaving this read-only for now */}
          Username cannot be changed. Contact support if you need help.
        </p>
      </div>
    </div>
  )
}
