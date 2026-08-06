import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen() {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('m.hammerer@zahlen-werk.com')
  const [password, setPassword] = useState('password123')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')
  const { signUp, signIn, loading, error } = useAuth()

  const handleAuth = async (e) => {
    e.preventDefault()
    try {
      if (isSignup) {
        if (!username.trim()) {
          alert('Bitte gib einen Benutzernamen ein')
          return
        }
        await signUp(email, password, username)
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      console.error('Auth error:', err)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: `0 4px 12px var(--shadow-color)`
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/login-logo.png"
            alt="LifePilot"
            style={{ height: '264px', marginBottom: '24px', width: 'auto' }}
          />
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Plane dein Abenteuer</p>
        </div>

        <form onSubmit={handleAuth}>
          {isSignup && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '8px' }}>
                Benutzername
              </label>
              <input
                type="text"
                placeholder="dein Benutzername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid var(--border-color)`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '8px' }}>
              E-Mail oder Benutzername
            </label>
            <input
              type="text"
              placeholder="deine@email.com oder Benutzername"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid var(--border-color)`,
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '8px' }}>
              Passwort
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 12px',
                  border: `1px solid var(--border-color)`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              color: 'var(--color-danger)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Lädt...' : isSignup ? 'Registrieren' : 'Anmelden'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          borderTop: `1px solid var(--border-light)`,
          paddingTop: '24px'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
            {isSignup ? 'Du hast bereits ein Konto?' : 'Du hast noch kein Konto?'}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup)
            }}
            disabled={loading}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isSignup ? 'Anmelden' : 'Registrieren'}
          </button>
        </div>
      </div>
    </div>
  )
}
