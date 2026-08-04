import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function BurgerMenu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="burger-btn"
        onClick={() => setOpen(!open)}
        style={{
          fontSize: '24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          color: '#0B4F6C'
        }}
        title="Menü"
      >
        ☰
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 998
            }}
            onClick={() => setOpen(false)}
          />

          {/* Menu */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '280px',
              height: '100%',
              background: 'white',
              boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
              zIndex: 999,
              padding: '20px',
              overflowY: 'auto'
            }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{
                float: 'right',
                fontSize: '24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                color: '#0B4F6C'
              }}
              title="Schließen"
            >
              ✕
            </button>

            <div style={{ clear: 'both', marginTop: '30px' }}>
              <h2 style={{
                color: '#0B4F6C',
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '20px',
                marginTop: '0'
              }}>
                LifePilot
              </h2>

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 12px',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#0B4F6C',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F7FA'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <img src="/Logo_lifePilot_Dashboard.png" alt="Dashboard" style={{ height: '32px', width: 'auto' }} />
                  Dashboard
                </Link>

                <Link
                  to="/trips"
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 12px',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#0B4F6C',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F7FA'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <span style={{ fontSize: '20px' }}>✈️</span>
                  Deine Reisen
                </Link>
              </nav>

              <hr style={{
                border: 'none',
                borderTop: '1px solid #E0E0E0',
                margin: '24px 0'
              }} />

              <p style={{
                fontSize: '13px',
                color: '#90A4AE',
                margin: '0',
                paddingTop: '8px'
              }}>
                © 2026 LifePilot
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
