import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../App'
import AppHeader from '../components/AppHeader'

export default function DaysOverviewScreen() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [tripId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Lade Trip
      const { data: tripData, error: tripErr } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()

      if (tripErr) {
        console.warn('Trip nicht gefunden:', tripErr.message)
        setTrip(null)
      } else {
        setTrip(tripData)
      }

      // Lade Days
      const { data: daysData, error: daysErr } = await supabase
        .from('days')
        .select('*')
        .eq('trip_id', tripId)
        .order('datum', { ascending: true })

      if (daysErr) {
        console.warn('Days nicht geladen:', daysErr.message)
        setDays([])
      } else {
        setDays(daysData || [])
      }
    } catch (err) {
      console.warn('Error loading data:', err.message)
      setTrip(null)
      setDays([])
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = () => {
    if (!trip || days.length === 0) return { current: 0, total: 0 }

    const today = new Date().toISOString().split('T')[0]
    const startDate = trip.start_datum

    if (today < startDate) {
      return { current: 0, total: days.length }
    }

    const current = Math.min(
      Math.floor((new Date(today) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1,
      days.length
    )
    return { current, total: days.length }
  }

  const progress = calculateProgress()
  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const handleOpenInMaps = () => {
    if (days.length === 0) return
    const waypoints = days.slice(0, -1).map(d => encodeURIComponent(d.ziel_adresse || '')).join('|')
    const destination = encodeURIComponent(days[days.length - 1].ziel_adresse || '')
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&waypoints=${waypoints}&destination=${destination}`
    window.open(mapsUrl, '_blank')
  }

  if (loading) return <div style={{ padding: '20px' }}>Lädt...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Fehler: {error}</div>
  if (!trip) return <div style={{ padding: '20px' }}>Reise nicht gefunden</div>

  return (
    <div className="container">
      <AppHeader />

      <h1 style={{ color: '#0B4F6C' }}>{trip.titel}</h1>

      <div className="card" style={{ borderLeft: '4px solid #0B4F6C', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 className="section-title">📊 Fortschritt</h3>
          <button
            onClick={handleOpenInMaps}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              background: '#0B4F6C',
              color: 'white',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title="Alle Tage in Google Maps anzeigen"
          >
            🗺️ Maps
          </button>
        </div>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          <strong>Tag {progress.current} von {progress.total}</strong>
        </p>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            backgroundColor: '#0B4F6C',
            transition: 'width 0.3s'
          }}></div>
        </div>
      </div>

      <div className="card" style={{ borderLeft: '4px solid #0B4F6C' }}>
        <h3 className="section-title">📅 Tage</h3>
        {days.map(day => {
          const today = new Date().toISOString().split('T')[0]
          const isToday = day.datum === today
          return (
          <Link
            key={day.id}
            to={`/day/${day.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{
              padding: '12px',
              marginBottom: day.id === days[days.length - 1].id ? 0 : '8px',
              backgroundColor: isToday ? '#0B4F6C' : '#F5F7FA',
              borderRadius: '6px',
              borderLeft: isToday ? '4px solid #C79A2B' : '4px solid #0B4F6C',
              border: isToday ? '2px solid #C79A2B' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isToday ? '#0B4F6C' : '#E8F0F5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isToday ? '#0B4F6C' : '#F5F7FA'}
            >
              <div style={{
                display: 'inline-block',
                padding: '4px 8px',
                backgroundColor: isToday ? '#C79A2B' : '#0B4F6C',
                borderRadius: '4px',
                marginBottom: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {formatDate(day.datum)}
              </div>

              {day.ziel_adresse && (
                <p style={{ margin: '4px 0', fontWeight: 'bold', color: isToday ? 'white' : '#0B4F6C' }}>
                  📍 {day.ziel_adresse}
                </p>
              )}

              {day.strecke_km && (
                <p style={{ margin: '0', color: isToday ? '#E8E8E8' : '#666', fontSize: '13px' }}>
                  🛣️ {day.strecke_km} km
                </p>
              )}
            </div>
          </Link>
        )
        })}
      </div>
    </div>
  )
}