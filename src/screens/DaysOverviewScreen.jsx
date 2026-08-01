import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../App'
import { mockTrips, mockDays } from '../mock-data'
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
        // Nutze Mock-Daten
        const mockTrip = mockTrips.find(t => t.id === tripId)
        setTrip(mockTrip)
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
        // Nutze Mock-Daten
        const mockDaysList = mockDays.filter(d => d.trip_id === tripId)
        setDays(mockDaysList)
      } else {
        setDays(daysData || [])
      }
    } catch (err) {
      // Fallback zu Mock-Daten bei Error
      console.warn('Error loading data, using mock data:', err.message)
      const mockTrip = mockTrips.find(t => t.id === tripId)
      const mockDaysList = mockDays.filter(d => d.trip_id === tripId)
      setTrip(mockTrip)
      setDays(mockDaysList)
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

  if (loading) return <div style={{ padding: '20px' }}>Lädt...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Fehler: {error}</div>
  if (!trip) return <div style={{ padding: '20px' }}>Reise nicht gefunden</div>

  return (
    <div className="container">
      <AppHeader />

      <h1 style={{ color: '#0B4F6C' }}>{trip.titel}</h1>

      <div className="card" style={{ borderLeft: '4px solid #0B4F6C', marginBottom: '20px' }}>
        <h3 className="section-title">📊 Fortschritt</h3>
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
        {days.map(day => (
          <Link
            key={day.id}
            to={`/day/${day.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{
              padding: '12px',
              marginBottom: day.id === days[days.length - 1].id ? 0 : '8px',
              backgroundColor: '#F5F7FA',
              borderRadius: '6px',
              borderLeft: '4px solid #0B4F6C',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8F0F5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F5F7FA'}
            >
              <div style={{
                display: 'inline-block',
                padding: '4px 8px',
                backgroundColor: '#0B4F6C',
                borderRadius: '4px',
                marginBottom: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {formatDate(day.datum)}
              </div>

              {day.ziel_adresse && (
                <p style={{ margin: '4px 0', color: '#333', fontWeight: 'bold', color: '#0B4F6C' }}>
                  📍 {day.ziel_adresse}
                </p>
              )}

              {day.strecke_km && (
                <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>
                  🛣️ {day.strecke_km} km
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}