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
    <div className="login-screen" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f7fa',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img
            src="/login-logo.png"
            alt="LifePilot"
            style={{ height: '140px', marginBottom: '20px', width: 'auto' }}
          />
          <p style={{ fontSize: '16px', color: '#999', margin: '0', fontWeight: '400' }}>Plane dein Abenteuer</p>
        </div>

        <form onSubmit={handleAuth}>
          {isSignup && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0B4F6C', marginBottom: '8px' }}>
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
                  padding: '12px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0B4F6C', marginBottom: '8px' }}>
              E-Mail oder Benutzername
            </label>
            <input
              type="text"
              placeholder="m.hammerer@zahlen-werk.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                color: '#333',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0B4F6C', marginBottom: '8px' }}>
              Passwort
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  color: '#333',
                  backgroundColor: '#FFFFFF'
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
                  opacity: loading ? 0.5 : 1,
                  padding: '0',
                  minHeight: 'auto'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#FFE6E6',
              color: '#C00',
              padding: '12px 14px',
              borderRadius: '6px',
              marginBottom: '20px',
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
              backgroundColor: '#0B4F6C',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              minHeight: '44px',
              opacity: loading ? 0.6 : 1,
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Lädt...' : isSignup ? 'Registrieren' : 'Anmelden'}
          </button>
        </form>

        <div style={{
          marginTop: '28px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#999', fontSize: '14px', marginBottom: '12px', margin: '0 0 12px 0' }}>
            {isSignup ? 'Du hast bereits ein Konto?' : 'Du hast noch kein Konto?'}
          </p>
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            disabled={loading}
            style={{
              backgroundColor: 'transparent',
              color: '#0B4F6C',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0',
              minHeight: 'auto'
            }}
          >
            {isSignup ? 'Anmelden' : 'Registrieren'}
          </button>
        </div>
      </div>
    </div>
  )
}
