import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)
    const res = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    localStorage.setItem('token', res.data.access_token)
    const me = await api.get('/auth/me')
    setUser(me.data)
    return me.data
  }

  const register = async (username, email, password, displayName) => {
    const res = await api.post('/auth/register', {
      username, email, password, display_name: displayName
    })
    localStorage.setItem('token', res.data.access_token)
    const me = await api.get('/auth/me')
    setUser(me.data)
    return me.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
