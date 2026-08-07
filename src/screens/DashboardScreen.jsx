import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Globe from 'react-globe.gl'
import { Color, DirectionalLight, AmbientLight } from 'three'
import { supabase } from '../App'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import BurgerMenu from '../components/BurgerMenu'
import { getAllPlannedCountries } from '../utils/countryParser'
import countries from '../data/countries.json'

export default function DashboardScreen() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const globeEl = useRef()
  const userMenuRef = useRef()
  const [trips, setTrips] = useState([])
  const [visitedCountries, setVisitedCountries] = useState([])
  const [plannedCountries, setPlannedCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const [countriesData, setCountriesData] = useState(null)
  const [showVisitedModal, setShowVisitedModal] = useState(false)
  const [countryInput, setCountryInput] = useState('')
  const [filteredCountries, setFilteredCountries] = useState([])
  const [toastMessage, setToastMessage] = useState('')
  const [countryFilter, setCountryFilter] = useState('besucht')
  const [showCloseTooltip, setShowCloseTooltip] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(2.5)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const location = useLocation()

  const getUserInitials = () => {
    return user?.username?.substring(0, 2).toUpperCase() || 'LP'
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  useEffect(() => {
    loadGeoJsonData()
    loadData()
  }, [])

  // Globus-Hintergrund aktualisieren wenn Theme sich ändert
  useEffect(() => {
    const updateGlobeBackground = () => {
      if (globeEl.current) {
        const scene = globeEl.current.scene()
        if (scene) {
          const backgroundColor = theme === 'dark' ? 0x1a1a1a : 0xf5f7fa
          scene.background = new Color(backgroundColor)
        }
      }
    }

    updateGlobeBackground()
    // Auch nach kurzer Verzögerung aktualisieren für Sicherheit
    const timer = setTimeout(updateGlobeBackground, 100)
    return () => clearTimeout(timer)
  }, [theme])

  // Schließe User Menu wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showUserMenu])

  // Reload data wenn zur Dashboard-Route navigiert wird (z.B. nach Löschen)
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/dashboard') {
      loadData()
    }
  }, [location.pathname])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 2500)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const loadGeoJsonData = async () => {
    try {
      // Lade GeoJSON von Natural Earth (kostenlos)
      const response = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      const data = await response.json()
      console.log('GeoJSON loaded, features:', data.features?.length)
      setCountriesData(data)
    } catch (err) {
      console.error('Error loading GeoJSON:', err)
      // Fallback: einfache Feature Collection
      setCountriesData({
        type: 'FeatureCollection',
        features: []
      })
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)

      if (!user?.id) {
        setLoading(false)
        return
      }

      // Lade Trips mit Days - nur für diesen Benutzer
      const { data: tripsData } = await supabase
        .from('trips')
        .select('*, days(*)')
        .eq('user_id', user.id)

      setTrips(tripsData || [])

      // Extrahiere geplante Länder
      const planned = getAllPlannedCountries(tripsData || [])
      setPlannedCountries(planned)

      // Lade besuchte Länder - nur für diesen Benutzer
      const { data: visitedData } = await supabase
        .from('visited_countries')
        .select('country_code')
        .eq('user_id', user.id)

      const visited = visitedData?.map(d => d.country_code) || []
      console.log('Besuchte Länder geladen:', visited)
      setVisitedCountries(visited)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCountryToggle = async (country) => {
    const countryCode = country.properties?.ISO_A2 || country.code
    const countryName = country.properties?.ADMIN || country.name

    if (!countryCode) return

    try {
      if (visitedCountries.includes(countryCode)) {
        // Remove
        await supabase
          .from('visited_countries')
          .delete()
          .eq('country_code', countryCode)
          .eq('user_id', user.id)
      } else {
        // Add
        await supabase
          .from('visited_countries')
          .insert({
            user_id: user.id,
            country_code: countryCode,
            country_name: countryName,
            visited_date: new Date().toISOString().split('T')[0]
          })
      }

      // Reload
      await loadData()
    } catch (err) {
      console.error('Error toggling country:', err)
    }
  }

  const handleGlobeReady = () => {
    if (globeEl.current) {
      const scene = globeEl.current.scene()
      if (scene) {
        const backgroundColor = theme === 'dark' ? 0x1a1a1a : 0xf5f7fa
        scene.background = new Color(backgroundColor)

        // Entferne alte Lights um Duplikate zu vermeiden
        const lightsToRemove = scene.children.filter(child => child.isLight)
        lightsToRemove.forEach(light => scene.remove(light))

        // Ambient Light (stärker für bessere Sichtbarkeit)
        const ambientLight = new AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        // Directional Light (Sonne von links oben)
        const sunLight = new DirectionalLight(0xfdb813, 0.8)
        sunLight.position.set(2, 1, 1)
        scene.add(sunLight)

        // Optional: Zweite stärkere Light für Schattenseite (mehr Strahlkraft)
        const fillLight = new DirectionalLight(0x1e3c72, 0.5)
        fillLight.position.set(-1, -1, -0.5)
        scene.add(fillLight)
      }
    }
  }


  const handleGlobeZoom = ({ altitude }) => {
    setZoomLevel(altitude)
  }

  const handleCountryInputChange = (value) => {
    setCountryInput(value)

    if (!value.trim()) {
      setFilteredCountries([])
      return
    }

    const lowerValue = value.toLowerCase()
    const filtered = Object.entries(countries)
      .filter(([code, data]) =>
        data.name.toLowerCase().includes(lowerValue)
      )
      .map(([code, data]) => ({ code, ...data, isVisited: visitedCountries.includes(code) }))
      .sort((a, b) => {
        if (a.isVisited === b.isVisited) return a.name.localeCompare(b.name)
        return a.isVisited ? -1 : 1
      })
      .slice(0, 10)

    setFilteredCountries(filtered)
  }

  const handleAddVisitedCountry = async (countryCode, countryName) => {
    try {
      const { data: existing, error: selectError } = await supabase
        .from('visited_countries')
        .select('id')
        .eq('country_code', countryCode)
        .eq('user_id', user.id)
        .maybeSingle()

      if (selectError) {
        console.error('Select error:', selectError.message || selectError)
        return
      }

      if (existing) {
        setToastMessage('Land existiert bereits')
        return
      }

      const { data, error: insertError } = await supabase
        .from('visited_countries')
        .insert({
          user_id: user.id,
          country_code: countryCode,
          country_name: countryName,
          visited_date: new Date().toISOString().split('T')[0]
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        return
      }

      setCountryInput('')
      setFilteredCountries([])
      await loadData()
    } catch (err) {
      console.error('Error adding visited country:', err)
    }
  }

  const getCountryColor = (country) => {
    // Versuche zuerst ISO_A2, aber Natural Earth hat -99 für manche Länder
    let code = country.properties?.ISO_A2

    // Fallback auf ADMIN Name wenn ISO_A2 ungültig
    if (!code || code === '-99') {
      // Nutze eine Mapping-Funktion für bekannte Länder
      const nameToCode = {
        'France': 'FR',
        'Germany': 'DE',
        'Spain': 'ES',
        'Italy': 'IT',
        'Portugal': 'PT',
        'United Kingdom': 'GB',
        'Netherlands': 'NL',
        'Belgium': 'BE',
        'Austria': 'AT',
        'Switzerland': 'CH',
        'Czechia': 'CZ',
        'Slovakia': 'SK',
        'Greece': 'GR',
        'Croatia': 'HR',
        'Bosnia and Herzegovina': 'BA',
        'Canada': 'CA',
        'United States of America': 'US'
      }
      code = nameToCode[country.properties?.ADMIN]
    }

    if (code && visitedCountries.includes(code)) {
      return '#0B4F6C' // Dunkelblau
    }

    if (code && plannedCountries.includes(code)) {
      return '#C79A2B' // Gold
    }

    return '#D0D8E0' // Mittleres Grau (sichtbarer)
  }

  const totalKm = trips.reduce((sum, trip) => {
    if (trip.days && Array.isArray(trip.days)) {
      return sum + trip.days.reduce((daySum, day) => {
        const km = parseInt(day.strecke_km) || 0
        return daySum + km
      }, 0)
    }
    return sum
  }, 0)

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#0B4F6C'
      }}>
        Lädt Dashboard... 🌍
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Welcome Message */}
      <div style={{
        background: `linear-gradient(135deg, var(--color-primary) 0%, ${theme === 'light' ? '#063d52' : '#0a2a38'} 100%)`,
        color: 'white',
        padding: '16px',
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: '500'
      }}>
        👋 Willkommen zurück, {user?.username}! Was planen wir heute?
      </div>

      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: `2px solid var(--color-primary)`,
        padding: '12px 16px',
        boxShadow: `0 2px 6px var(--shadow-color)`
      }}>
        <div style={{
          width: '100%',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'visible',
          minHeight: '45px'
        }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', position: 'absolute', left: '16px' }}>
            <img
              src="/Logo_lifePilot_Dashboard.png"
              alt="LifePilot Dashboard"
              className="dashboard-logo"
              style={{ height: '40px', width: 'auto' }}
            />
          </Link>

          <img
            src="/Dashboard_Banner.png"
            alt="LifePilot Banner"
            className="dashboard-banner"
            style={{ height: '39px', width: 'auto' }}
          />

          <div style={{ position: 'absolute', right: '16px', display: 'flex', gap: '12px', alignItems: 'center' }} ref={userMenuRef}>
            <BurgerMenu />

            {/* Avatar Button */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '22px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {getUserInitials()}
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '8px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '8px',
                boxShadow: `0 4px 12px var(--shadow-color-hover)`,
                zIndex: '1000',
                minWidth: '220px',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid var(--border-light)`
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)' }}>
                    👤 Meine Daten
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '6px', fontWeight: '500' }}>
                    {user?.username}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {user?.email}
                  </div>
                </div>

                <div style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid var(--border-light)`
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '12px' }}>
                    ⭐ Mein Abo
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '500' }}>
                    {user?.subscription === 'free' ? '📦 Free Plan' : user?.subscription === 'premium' ? '⭐ Premium Plan' : '🚀 Unlimited Plan'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {/* TODO: Upgrade Handler */}}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                      Upgrade
                    </button>
                    <button
                      onClick={() => {/* TODO: Cancel Handler */}}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-hover)',
                        color: 'var(--color-primary)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                      Kündigen
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => toggleTheme()}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderBottom: `1px solid var(--border-light)`
                  }}
                >
                  {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>

                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="8" height="18" rx="1" />
                    <path d="M14 9l4 3-4 3" />
                    <line x1="14" y1="12" x2="21" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        background: 'var(--bg-primary)',
        padding: '16px'
      }}>
        <div className="dashboard-content" style={{
          margin: '0 auto'
        }}>
          {/* Globe Section First */}
          <div style={{
            minHeight: '750px',
            position: 'relative',
            paddingTop: typeof window !== 'undefined' && window.innerWidth < 768 ? '40px' : '100px',
            paddingBottom: '24px',
            margin: '0 -16px',
            marginTop: '-60px',
            paddingLeft: '16px',
            paddingRight: '16px'
          }}>
          {/* Stats Cards - Top Left and Right */}
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '16px',
            right: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            zIndex: '10'
          }}>
          <button
            onClick={() => navigate('/trips')}
            style={{
              background: '#FFF4E6',
              border: '2px solid #C79A2B',
              borderRadius: '8px',
              padding: '12px 16px',
              textAlign: 'center',
              minHeight: '70px',
              width: '140px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(199, 154, 43, 0.08)',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(199, 154, 43, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(199, 154, 43, 0.08)'
            }}
          >
            <h3 style={{
              fontSize: '24px',
              color: '#C79A2B',
              margin: '0 0 4px 0',
              fontWeight: '700'
            }}>
              {trips.length}
            </h3>
            <p style={{
              color: '#C79A2B',
              margin: '0',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              Reisen geplant
            </p>
          </button>

          <button
            onClick={() => setShowVisitedModal(true)}
            style={{
              background: '#0B4F6C',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              textAlign: 'center',
              minHeight: '70px',
              width: '140px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(11, 79, 108, 0.08)',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(11, 79, 108, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(11, 79, 108, 0.08)'
            }}
          >
            <h3 style={{
              fontSize: '24px',
              color: 'white',
              margin: '0 0 4px 0',
              fontWeight: '700'
            }}>
              {visitedCountries.length}
            </h3>
            <p style={{
              color: 'white',
              margin: '0',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              Länder besucht
            </p>
          </button>

          </div>

          <div style={{
            height: '650px',
            position: 'absolute',
            left: '16px',
            right: '16px',
            top: '60px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            backgroundColor: '#000000'
          }}>
            {countriesData && countriesData.features && countriesData.features.length > 0 ? (
              <div style={{ height: '100%', position: 'relative', zIndex: '1' }}>
                <Globe
                  ref={globeEl}
                  width={typeof window !== 'undefined' ? Math.round(window.innerWidth < 768 ? window.innerWidth * 0.90 : window.innerWidth * 0.66) : 600}
                  height={650}
                  backgroundColor="#000000"
                  showAtmosphere={true}
                  showGraticules={false}
                  polygonsData={countriesData.features}
                  polygonCapColor={(d) => getCountryColor(d)}
                  polygonSideColor="rgba(0, 0, 0, 0.05)"
                  polygonStrokeColor={() => '#0B4F6C'}
                  polygonAltitude={0.02}
                  onGlobeReady={handleGlobeReady}
                  onZoom={handleGlobeZoom}
                />

                {/* Labels entfernt - Projektion zu komplex */}
              </div>
            ) : (
              <div style={{
                color: 'var(--color-primary)',
                fontSize: '16px'
              }}>
                Globus lädt Daten... 🌍
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal für besuchte Länder */}
      {showVisitedModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 1000
            }}
            onClick={() => setShowVisitedModal(false)}
          ></div>

          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              zIndex: 1001,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            {toastMessage && (
              <div style={{
                background: '#FFA500',
                color: '#fff',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '14px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {toastMessage}
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h2 style={{
                color: '#0B4F6C',
                fontSize: '20px',
                fontWeight: '600',
                marginTop: '0',
                marginBottom: '0'
              }}>
                ✏️ Besuchte Länder {visitedCountries.length} von {Object.keys(countries).length} - {((visitedCountries.length / Object.keys(countries).length) * 100).toFixed(1)}%
              </h2>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowVisitedModal(false)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '2px solid #0B4F6C',
                    background: 'white',
                    color: '#0B4F6C',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#0B4F6C'
                    e.target.style.color = 'white'
                    setShowCloseTooltip(true)
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white'
                    e.target.style.color = '#0B4F6C'
                    setShowCloseTooltip(false)
                  }}
                  title="Schließen"
                >
                  ✕
                </button>
                {showCloseTooltip && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-40px',
                    right: '0',
                    background: '#0B4F6C',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    zIndex: 1002,
                    pointerEvents: 'none',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                  }}>
                    schließen + speichern
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Land eingeben (z.B. Portugal)..."
                value={countryInput}
                onChange={(e) => handleCountryInputChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && filteredCountries.length > 0) {
                    const country = filteredCountries[0]
                    handleAddVisitedCountry(country.code, country.name)
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  marginBottom: '12px'
                }}
                autoFocus
              />

              {filteredCountries.length > 0 && (
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => {
                        if (!country.isVisited) {
                          handleAddVisitedCountry(country.code, country.name)
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: 'none',
                        borderBottom: '1px solid #eee',
                        background: country.isVisited ? '#F0F0F0' : 'white',
                        cursor: country.isVisited ? 'default' : 'pointer',
                        textAlign: 'left',
                        fontSize: '14px',
                        transition: 'background 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: country.isVisited ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!country.isVisited) {
                          e.target.style.background = '#F5F7FA'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = country.isVisited ? '#F0F0F0' : 'white'
                      }}
                      disabled={country.isVisited}
                    >
                      <span>{country.name}</span>
                      {country.isVisited && (
                        <span style={{
                          color: '#C79A2B',
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}>
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              flexWrap: 'wrap'
            }}>
              {['besucht', 'nicht besucht', 'alle'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCountryFilter(filter)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: countryFilter === filter ? '2px solid #0B4F6C' : '1px solid #ddd',
                    background: countryFilter === filter ? '#0B4F6C' : 'white',
                    color: countryFilter === filter ? 'white' : '#0B4F6C',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  {filter === 'alle' ? 'Alle' : filter === 'besucht' ? 'Besucht' : 'Unentdeckt'}
                </button>
              ))}
            </div>

            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <tbody>
                {Object.entries(countries)
                  .sort((a, b) => a[1].name.localeCompare(b[1].name))
                  .filter(([code]) => {
                    if (countryFilter === 'alle') return true
                    if (countryFilter === 'besucht') return visitedCountries.includes(code)
                    if (countryFilter === 'nicht besucht') return !visitedCountries.includes(code)
                    return true
                  })
                  .map(([code, country], idx) => {
                    const isVisited = visitedCountries.includes(code)
                    return (
                      <tr
                        key={code}
                        style={{
                          background: idx % 2 === 0 ? 'white' : '#F9FAFB',
                          borderBottom: '1px solid #eee'
                        }}
                      >
                        <td style={{
                          padding: '1.5px',
                          textAlign: 'left',
                          color: '#0B4F6C',
                          fontWeight: '500'
                        }}>
                          {country.name}
                        </td>
                        <td style={{
                          padding: '1.5px',
                          textAlign: 'right',
                          width: '40px'
                        }}>
                          <button
                            onClick={async () => {
                              if (isVisited) {
                                await supabase
                                  .from('visited_countries')
                                  .delete()
                                  .eq('country_code', code)
                                  .eq('user_id', user.id)
                                await loadData()
                              } else {
                                await handleAddVisitedCountry(code, country.name)
                              }
                            }}
                            style={{
                              background: isVisited ? '#C79A2B' : '#E8EBF0',
                              border: 'none',
                              color: isVisited ? '#fff' : '#0B4F6C',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              width: '28px',
                              height: '28px',
                              padding: '0',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = isVisited ? '#E74C3C' : '#C79A2B'
                              e.target.textContent = isVisited ? '✕' : '✓'
                              e.target.style.color = 'white'
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = isVisited ? '#C79A2B' : '#E8EBF0'
                              e.target.textContent = isVisited ? '✓' : ''
                              e.target.style.color = isVisited ? '#fff' : '#0B4F6C'
                            }}
                            title={isVisited ? 'Entfernen' : 'Hinzufügen'}
                          >
                            {isVisited ? '✓' : ''}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
