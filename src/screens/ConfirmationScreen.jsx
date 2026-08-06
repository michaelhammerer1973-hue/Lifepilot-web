import { useState } from 'react'
import { supabase } from '../App'

export default function ConfirmationScreen({ email, onBackToLogin }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleResendEmail = async () => {
    try {
      setLoading(true)
      setMessage('')
      setError('')

      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (err) throw err

      setMessage('✅ E-Mail erneut gesendet! Bitte überprüfe dein Postfach.')
    } catch (err) {
      console.error('Resend error:', err)
      setError(`Fehler: ${err.message || 'E-Mail konnte nicht versendet werden'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
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
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>

        <h1 style={{
          fontSize: '24px',
          color: '#0B4F6C',
          marginBottom: '8px',
          fontWeight: '600'
        }}>
          Bestätigung erforderlich
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          Wir haben dir eine E-Mail an<br />
          <strong>{email}</strong><br />
          gesendet. Bitte bestätige deine E-Mail-Adresse um fortzufahren.
        </p>

        {message && (
          <div style={{
            backgroundColor: '#E6F9E6',
            color: '#2D5F2E',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#FFE6E6',
            color: '#C00',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          <button
            onClick={handleResendEmail}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#0B4F6C',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Wird versendet...' : '📧 E-Mail erneut senden'}
          </button>

          <button
            onClick={onBackToLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: 'transparent',
              color: '#0B4F6C',
              border: '2px solid #0B4F6C',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            ← Zurück zum Login
          </button>
        </div>

        <p style={{
          fontSize: '12px',
          color: '#999',
          marginTop: '24px'
        }}>
          Bestätigung abgeschlossen? Logge dich ein um zu starten! 🚀
        </p>
      </div>
    </div>
  )
}
