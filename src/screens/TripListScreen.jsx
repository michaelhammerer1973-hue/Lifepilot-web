import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../App'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import BurgerMenu from '../components/BurgerMenu'
import TrashIcon from '../components/TrashIcon'
import SaveIcon from '../components/SaveIcon'
import CancelIcon from '../components/CancelIcon'

export default function TripListScreen() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const userMenuRef = useRef()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [allTrips, setAllTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [filter, setFilter] = useState('geplant')
  const [searchTerm, setSearchTerm] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState('')
  const [duplicateDialog, setDuplicateDialog] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState(null)

  useEffect(() => {
    loadTrips()
  }, [])

  // Close User Menu wenn außerhalb geklickt wird
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

  const loadTrips = async () => {
    try {
      setLoading(true)
      if (!user?.id) {
        setLoading(false)
        return
      }
      const { data, error: err } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)

      let tripsData = data || []
      if (err) {
        console.warn('Supabase Fehler:', err.message)
        tripsData = []
      } else if (!data || data.length === 0) {
        console.warn('Keine Reisen vorhanden')
        tripsData = []
      }

      // Automatisch Status aktualisieren basierend auf Daten
      const today = new Date().toISOString().split('T')[0]

      // Auf "archiviert" setzen, wenn Reise vorbei ist
      const tripsToArchive = tripsData.filter(trip =>
        trip.status !== 'archiviert' && trip.end_datum < today
      )

      // Auf "laufend" setzen, wenn Reise-Startdatum erreicht
      const tripsToStart = tripsData.filter(trip =>
        trip.status === 'geplant' && trip.start_datum <= today
      )

      const updatePromises = [
        ...tripsToArchive.map(trip =>
          supabase.from('trips').update({ status: 'archiviert' }).eq('id', trip.id)
        ),
        ...tripsToStart.map(trip =>
          supabase.from('trips').update({ status: 'laufend' }).eq('id', trip.id)
        )
      ]

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises)
        // Nach Update erneut laden
        const { data: updatedData } = await supabase.from('trips').select('*')
        setAllTrips(updatedData || tripsData)
      } else {
        setAllTrips(tripsData)
      }
    } catch (err) {
      console.warn('Error loading trips:', err.message)
      setAllTrips([])
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = useCallback(() => {
    let trips = [...allTrips]

    if (filter === 'geplant') {
      trips = trips.filter(t => t.status === 'geplant' || t.status === 'laufend')
    } else if (filter === 'archiviert') {
      trips = trips.filter(t => t.status === 'archiviert')
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      trips = trips.filter(t => t.titel.toLowerCase().includes(term))
    }

    trips.sort((a, b) => {
      const dateA = a.start_datum ? new Date(a.start_datum).getTime() : 0
      const dateB = b.start_datum ? new Date(b.start_datum).getTime() : 0
      return dateA - dateB
    })

    return trips
  }, [allTrips, filter, searchTerm])

  const filteredTrips = useMemo(() => applyFiltersAndSort(), [applyFiltersAndSort])

  const handleDelete = async (tripId) => {
    // Finde Trip-Titel für Modal
    const trip = allTrips.find(t => t.id === tripId)
    setDeleteDialog({
      titel: trip?.titel || 'Unbekannte Reise',
      tripId,
      onConfirm: async () => {
        try {
          await supabase.from('trips').delete().eq('id', tripId)
          setDeleteDialog(null)
          await loadTrips()
        } catch (err) {
          console.error('Fehler beim Löschen:', err)
          setDeleteDialog(null)
        }
      }
    })
  }

  const handleSave = async (tripId) => {
    try {
      console.log('Speichere editForm:', editForm)
      console.log('maps_mode Wert:', editForm.maps_mode)
      await supabase.from('trips').update(editForm).eq('id', tripId)
      setEditingId(null)
      await loadTrips()
    } catch (err) {
      console.error('Fehler beim Speichern:', err)
    }
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportError('')
    try {
      const fileContent = await file.text()
      const tripData = JSON.parse(fileContent)
      await importTrip(tripData)
      setShowImportModal(false)
      setImportJson('')
    } catch (err) {
      if (err instanceof SyntaxError) {
        setImportError('JSON-Fehler: ' + err.message)
      } else {
        setImportError(err.message || 'Fehler beim Lesen der Datei')
      }
    }
  }

  const convertClaudeFormat = (data) => {
    if (data.reise && !data.titel) {
      const reise = data.reise
      const convertedDays = (reise.tage || []).map(tag => {
        const day = {
          datum: tag.datum,
          start_adresse: null,
          ziel_adresse: null,
          strecke_km: null,
          fahrzeit_geschätzt: null,
          schwerpunkte: tag.schwerpunkt ? [tag.schwerpunkt] : [],
          activities: [],
          accommodations: []
        }

        if (tag.strecke) {
          day.start_adresse = tag.strecke.von || null
          day.ziel_adresse = tag.strecke.nach || null
          day.fahrzeit_geschätzt = tag.strecke.zeitbedarf || null
        }

        if (tag.ziele && Array.isArray(tag.ziele)) {
          day.activities = tag.ziele.map((ziel, idx) => ({
            typ: tag.schwerpunkt || 'Aktivität',
            titel: ziel.name,
            dauer_geschätzt: ziel.zeitbedarf || null,
            reihenfolge: idx
          }))
        }

        if (tag.uebernachtung) {
          day.accommodations = [{
            name: tag.uebernachtung.name,
            typ: 'mittel',
            kosten: tag.uebernachtung.kosten || null,
            adresse: tag.uebernachtung.adresse
          }]
        }

        return day
      })

      return {
        titel: reise.titel,
        start_datum: reise.start_datum,
        end_datum: reise.end_datum,
        schwerpunkte: [],
        days: convertedDays
      }
    }
    return data
  }

  const importTrip = async (tripData) => {
    setImportError('')
    try {
      // Konvertiere Claude-Format falls nötig
      tripData = convertClaudeFormat(tripData)

      // Validierung
      if (!tripData.titel || !tripData.start_datum || !tripData.end_datum || !tripData.days) {
        setImportError('JSON muss folgende Felder haben: titel, start_datum, end_datum, days')
        return
      }

      // Duplikat-Check: Prüfe ob Trip mit gleichem Titel schon existiert (nur für diesen User)
      const { data: existingTrips } = await supabase
        .from('trips')
        .select('*')
        .eq('titel', tripData.titel)
        .eq('user_id', user.id)

      const existingTrip = existingTrips && existingTrips.length > 0 ? existingTrips[0] : null
      let tripId

      if (existingTrip) {
        // Modal mit Callbacks öffnen
        setDuplicateDialog({
          titel: tripData.titel,
          onReplace: async () => {
            try {
              // UPDATE: Alte Reise ersetzen
              const { error: updateError } = await supabase
                .from('trips')
                .update({
                  start_datum: tripData.start_datum,
                  end_datum: tripData.end_datum,
                  standard_schwerpunkte: tripData.schwerpunkte || []
                })
                .eq('id', existingTrip.id)

              if (updateError) throw updateError

              // Lösche alle alte Tage/Aktivitäten/Unterkünfte
              const { data: oldDays } = await supabase.from('days').select('id').eq('trip_id', existingTrip.id)
              if (oldDays) {
                await Promise.all(
                  oldDays.map(day =>
                    Promise.all([
                      supabase.from('activities').delete().eq('day_id', day.id),
                      supabase.from('accommodations').delete().eq('day_id', day.id)
                    ])
                  )
                )
              }
              await supabase.from('days').delete().eq('trip_id', existingTrip.id)

              // Tage neu erstellen
              const daysToInsert = tripData.days.map(day => ({
                trip_id: existingTrip.id,
                datum: day.datum,
                start_adresse: day.start_adresse || null,
                ziel_adresse: day.ziel_adresse,
                strecke_km: day.strecke_km || null,
                fahrzeit_geschätzt: day.fahrzeit_geschätzt || null,
                schwerpunkte: day.schwerpunkte || []
              }))

              const { data: daysInsert, error: daysError } = await supabase
                .from('days')
                .insert(daysToInsert)
                .select()

              if (daysError) throw daysError

              // Aktivitäten erstellen
              if (tripData.days.some(d => d.activities)) {
                const activitiesToInsert = []
                tripData.days.forEach((day, dayIdx) => {
                  if (day.activities && Array.isArray(day.activities)) {
                    day.activities.forEach((activity, actIdx) => {
                      activitiesToInsert.push({
                        day_id: daysInsert[dayIdx].id,
                        typ: activity.typ,
                        titel: activity.titel,
                        dauer_geschätzt: activity.dauer_geschätzt || null,
                        adresse: activity.adresse || null,
                        beginn_uhrzeit: activity.beginn_uhrzeit || null,
                        reihenfolge: actIdx
                      })
                    })
                  }
                })
                if (activitiesToInsert.length > 0) {
                  const { error: activitiesError } = await supabase
                    .from('activities')
                    .insert(activitiesToInsert)
                  if (activitiesError) throw activitiesError
                }
              }

              // Übernachtungen erstellen
              if (tripData.days.some(d => d.accommodations)) {
                const accommodationsToInsert = []
                tripData.days.forEach((day, dayIdx) => {
                  if (day.accommodations && Array.isArray(day.accommodations)) {
                    day.accommodations.forEach(acc => {
                      accommodationsToInsert.push({
                        day_id: daysInsert[dayIdx].id,
                        name: acc.name,
                        typ: acc.typ || null,
                        kosten: acc.kosten || null,
                        adresse: acc.adresse
                      })
                    })
                  }
                })
                if (accommodationsToInsert.length > 0) {
                  const { error: accommodationsError } = await supabase
                    .from('accommodations')
                    .insert(accommodationsToInsert)
                  if (accommodationsError) throw accommodationsError
                }
              }

              setDuplicateDialog(null)
              setShowImportModal(false)
              setImportJson('')
              await loadTrips()
            } catch (err) {
              console.error('Replace Error:', err)
              setImportError(err.message || 'Fehler beim Ersetzen')
            }
          },
          onNewPlanning: async () => {
            try {
              // INSERT: Neue Planung mit gleichem Titel speichern
              const { data: tripInsert, error: tripError } = await supabase
                .from('trips')
                .insert([{
                  user_id: user.id,
                  titel: tripData.titel,
                  start_datum: tripData.start_datum,
                  end_datum: tripData.end_datum,
                  status: 'geplant',
                  standard_schwerpunkte: tripData.schwerpunkte || []
                }])
                .select()

              if (tripError) throw tripError
              const newTripId = tripInsert[0].id

              // Tage erstellen
              const daysToInsert = tripData.days.map(day => ({
                trip_id: newTripId,
                datum: day.datum,
                start_adresse: day.start_adresse || null,
                ziel_adresse: day.ziel_adresse,
                strecke_km: day.strecke_km || null,
                fahrzeit_geschätzt: day.fahrzeit_geschätzt || null,
                schwerpunkte: day.schwerpunkte || []
              }))

              const { data: daysInsert, error: daysError } = await supabase
                .from('days')
                .insert(daysToInsert)
                .select()

              if (daysError) throw daysError

              // Aktivitäten erstellen
              if (tripData.days.some(d => d.activities)) {
                const activitiesToInsert = []
                tripData.days.forEach((day, dayIdx) => {
                  if (day.activities && Array.isArray(day.activities)) {
                    day.activities.forEach((activity, actIdx) => {
                      activitiesToInsert.push({
                        day_id: daysInsert[dayIdx].id,
                        typ: activity.typ,
                        titel: activity.titel,
                        dauer_geschätzt: activity.dauer_geschätzt || null,
                        adresse: activity.adresse || null,
                        beginn_uhrzeit: activity.beginn_uhrzeit || null,
                        reihenfolge: actIdx
                      })
                    })
                  }
                })
                if (activitiesToInsert.length > 0) {
                  const { error: activitiesError } = await supabase
                    .from('activities')
                    .insert(activitiesToInsert)
                  if (activitiesError) throw activitiesError
                }
              }

              // Übernachtungen erstellen
              if (tripData.days.some(d => d.accommodations)) {
                const accommodationsToInsert = []
                tripData.days.forEach((day, dayIdx) => {
                  if (day.accommodations && Array.isArray(day.accommodations)) {
                    day.accommodations.forEach(acc => {
                      accommodationsToInsert.push({
                        day_id: daysInsert[dayIdx].id,
                        name: acc.name,
                        typ: acc.typ || null,
                        kosten: acc.kosten || null,
                        adresse: acc.adresse
                      })
                    })
                  }
                })
                if (accommodationsToInsert.length > 0) {
                  const { error: accommodationsError } = await supabase
                    .from('accommodations')
                    .insert(accommodationsToInsert)
                  if (accommodationsError) throw accommodationsError
                }
              }

              setDuplicateDialog(null)
              setShowImportModal(false)
              setImportJson('')
              await loadTrips()
            } catch (err) {
              console.error('New Planning Error:', err)
              setImportError(err.message || 'Fehler beim Speichern')
            }
          }
        })

        // Return früh, damit der Rest nicht ausgeführt wird
        return
      } else {
        // Keine Duplikat: Normaler INSERT
        const { data: tripInsert, error: tripError } = await supabase
          .from('trips')
          .insert([{
            user_id: user.id,
            titel: tripData.titel,
            start_datum: tripData.start_datum,
            end_datum: tripData.end_datum,
            status: 'geplant',
            standard_schwerpunkte: tripData.schwerpunkte || []
          }])
          .select()

        if (tripError) throw tripError
        tripId = tripInsert[0].id
      }

      // Tage erstellen
      const daysToInsert = tripData.days.map(day => ({
        trip_id: tripId,
        datum: day.datum,
        start_adresse: day.start_adresse || null,
        ziel_adresse: day.ziel_adresse,
        strecke_km: day.strecke_km || null,
        fahrzeit_geschätzt: day.fahrzeit_geschätzt || null,
        schwerpunkte: day.schwerpunkte || []
      }))

      const { data: daysInsert, error: daysError } = await supabase
        .from('days')
        .insert(daysToInsert)
        .select()

      if (daysError) throw daysError

      // Aktivitäten erstellen
      if (tripData.days.some(d => d.activities)) {
        const activitiesToInsert = []
        tripData.days.forEach((day, dayIdx) => {
          if (day.activities && Array.isArray(day.activities)) {
            day.activities.forEach((activity, actIdx) => {
              activitiesToInsert.push({
                day_id: daysInsert[dayIdx].id,
                typ: activity.typ,
                titel: activity.titel,
                dauer_geschätzt: activity.dauer_geschätzt || null,
                adresse: activity.adresse || null,
                beginn_uhrzeit: activity.beginn_uhrzeit || null,
                reihenfolge: actIdx
              })
            })
          }
        })
        if (activitiesToInsert.length > 0) {
          const { error: activitiesError } = await supabase
            .from('activities')
            .insert(activitiesToInsert)
          if (activitiesError) throw activitiesError
        }
      }

      // Übernachtungen erstellen - speichere Typ im Namen, nutze generischen Fallback-Typ
      if (tripData.days.some(d => d.accommodations)) {
        const accommodationsToInsert = []
        tripData.days.forEach((day, dayIdx) => {
          if (day.accommodations && Array.isArray(day.accommodations)) {
            day.accommodations.forEach(acc => {
              accommodationsToInsert.push({
                day_id: daysInsert[dayIdx].id,
                name: acc.name,
                typ: acc.typ || null,
                kosten: acc.kosten || null,
                adresse: acc.adresse
              })
            })
          }
        })
        if (accommodationsToInsert.length > 0) {
          console.log('Versuche Accommodations einzufügen:', accommodationsToInsert)
          const { error: accommodationsError } = await supabase
            .from('accommodations')
            .insert(accommodationsToInsert)
          if (accommodationsError) {
            console.error('Accommodations-Fehler:', accommodationsError)
            setImportError(`Übernachtungen-Fehler: ${accommodationsError.message}`)
            return
          }
        }
      }

      setShowImportModal(false)
      setImportJson('')
      await loadTrips()
    } catch (err) {
      console.error('Import-Fehler:', err)
      setImportError(err.message || 'Fehler beim Importieren')
    }
  }

  const getStatusBadge = (status) => {
    const badgeClass = {
      'geplant': 'badge-primary',
      'laufend': 'badge-gold',
      'abgeschlossen': 'badge-success',
      'archiviert': 'badge-info'
    }[status] || 'badge-info'
    return badgeClass
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: `2px solid var(--color-primary)`,
        padding: '24px 16px',
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
          minHeight: '90px'
        }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', position: 'absolute', left: '16px' }}>
            <img
              src="/Logo_lifePilot_Dashboard.png"
              alt="LifePilot Dashboard"
              style={{ height: '80px', width: 'auto' }}
            />
          </Link>

          <h1 style={{
            fontSize: '17px',
            fontWeight: '600',
            color: '#0B4F6C',
            margin: 0
          }}>
            Deine Reisen
          </h1>

          <div style={{ position: 'absolute', right: '16px', display: 'flex', gap: '12px', alignItems: 'center' }} ref={userMenuRef}>
            <BurgerMenu />

            {/* Avatar Button */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '22px',
                backgroundColor: '#0B4F6C',
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
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'LP'}
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '8px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: '1000',
                minWidth: '220px',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B4F6C' }}>
                    👤 Meine Daten
                  </div>
                  <div style={{ fontSize: '12px', color: '#333', marginTop: '6px', fontWeight: '500' }}>
                    {user?.username}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    {user?.email}
                  </div>
                </div>

                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B4F6C', marginBottom: '12px' }}>
                    ⭐ Mein Abo
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px', fontWeight: '500' }}>
                    {user?.subscription === 'free' ? '📦 Free Plan' : user?.subscription === 'premium' ? '⭐ Premium Plan' : '🚀 Unlimited Plan'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#0B4F6C',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Upgrade
                    </button>
                    <button
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#f0f0f0',
                        color: '#0B4F6C',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
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
                    color: '#000',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>

                <button
                  onClick={() => {
                    signOut()
                    setShowUserMenu(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000',
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
                  Abmelden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container">

      {/* Suchbar */}
      <div className="card" style={{ borderLeft: '4px solid #0B4F6C', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍 Reise suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
        />
      </div>

      {/* Filter Tabs + Import Button */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setFilter('geplant')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minHeight: '44px',
            background: filter === 'geplant' ? '#0B4F6C' : '#E8E8E8',
            color: filter === 'geplant' ? 'white' : '#333',
            transition: 'all 0.2s'
          }}
        >
          Geplant
        </button>
        <button
          onClick={() => setFilter('archiviert')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minHeight: '44px',
            background: filter === 'archiviert' ? '#0B4F6C' : '#E8E8E8',
            color: filter === 'archiviert' ? 'white' : '#333',
            transition: 'all 0.2s'
          }}
        >
          Archiviert
        </button>
        <button
          onClick={() => setFilter('alle')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minHeight: '44px',
            background: filter === 'alle' ? '#0B4F6C' : '#E8E8E8',
            color: filter === 'alle' ? 'white' : '#333',
            transition: 'all 0.2s'
          }}
        >
          Alle
        </button>
        <button
          onClick={() => setShowImportModal(true)}
          title="JSON importieren"
          style={{
            width: '44px',
            height: '44px',
            padding: '0',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: '#C79A2B',
            color: 'white',
            transition: 'all 0.2s',
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v10"></path>
            <polyline points="19 7 12 14 5 7"></polyline>
            <path d="M4 18h16c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-1c0-1.1.9-2 2-2z"></path>
          </svg>
        </button>
      </div>

      {loading && <p>Lädt...</p>}
      {error && <p style={{ color: '#f44336', background: 'white', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>❌ {error}</p>}

      {filteredTrips.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>📭</p>
          <p className="text-muted">Keine Reisen gefunden. Plane eine neue mit Claude!</p>
        </div>
      )}

      {showImportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ borderLeft: '4px solid #C79A2B', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>📥 Reise importieren</h3>

            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '16px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            />

            {importError && (
              <p style={{ color: '#f44336', fontSize: '13px', marginBottom: '12px', padding: '8px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
                ❌ {importError}
              </p>
            )}

            <button
              onClick={() => { setShowImportModal(false); setImportJson(''); setImportError(''); }}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                minHeight: '44px',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#da190b'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {duplicateDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div className="card" style={{ borderLeft: '4px solid #C79A2B', maxWidth: '500px', width: '90%' }}>
            <h3 className="section-title">⚠️ Reise existiert bereits</h3>

            <p style={{ fontSize: '14px', marginBottom: '16px', color: '#333' }}>
              <strong>"{duplicateDialog.titel}"</strong><br/>
              <span style={{ fontSize: '13px', color: '#666' }}>Was möchtest du tun?</span>
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              flexDirection: window.innerWidth < 768 ? 'column' : 'row'
            }}>
              <button
                onClick={duplicateDialog.onReplace}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#0B4F6C',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#063d52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0B4F6C'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Ersetzen
              </button>

              <button
                onClick={duplicateDialog.onNewPlanning}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#C79A2B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#B8891F'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#C79A2B'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Neue Planung
              </button>

              <button
                onClick={() => setDuplicateDialog(null)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#da190b'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div className="card" style={{ borderLeft: '4px solid #f44336', maxWidth: '500px', width: '90%' }}>
            <h3 className="section-title">⚠️ Reise löschen</h3>

            <p style={{ fontSize: '14px', marginBottom: '16px', color: '#333' }}>
              <strong>"{deleteDialog.titel}"</strong><br/>
              <span style={{ fontSize: '13px', color: '#666' }}>Das löscht auch alle Tage, Aktivitäten und Übernachtungen. Diese Aktion kann nicht rückgängig gemacht werden.</span>
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              flexDirection: window.innerWidth < 768 ? 'column' : 'row'
            }}>
              <button
                onClick={deleteDialog.onConfirm}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#da190b'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Löschen
              </button>

              <button
                onClick={() => setDeleteDialog(null)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#E8E8E8',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#D0D0D0'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#E8E8E8'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredTrips.map(trip => (
        <div key={trip.id}>
          {editingId === trip.id ? (
            <div className="card" style={{ borderLeft: '4px solid #0B4F6C' }}>
              <h3 className="section-title">✎ Reise bearbeiten</h3>
              <input
                type="text"
                value={editForm.titel || ''}
                onChange={(e) => setEditForm({...editForm, titel: e.target.value})}
                placeholder="Reise-Name"
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
              />
              <input
                type="text"
                value={editForm.maps_origin || ''}
                onChange={(e) => setEditForm({...editForm, maps_origin: e.target.value})}
                placeholder="Start-Adresse (z.B. Porto Airport)"
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
              />
              <input
                type="text"
                value={editForm.maps_destination || ''}
                onChange={(e) => setEditForm({...editForm, maps_destination: e.target.value})}
                placeholder="End-Adresse (z.B. Fisterra)"
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => handleSave(trip.id)} style={{ width: '32px', height: '32px', padding: '0', backgroundColor: '#0B4F6C', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}><SaveIcon size={20} /></button>
                <button onClick={() => setEditingId(null)} style={{ width: '32px', height: '32px', padding: '0', backgroundColor: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}><CancelIcon size={20} /></button>
              </div>
            </div>
          ) : (
            <div
              className="card"
              style={{ borderLeft: '4px solid #0B4F6C', cursor: 'pointer', position: 'relative' }}
              onClick={() => navigate(`/trip/${trip.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ margin: 0, flex: 1 }}>{trip.titel}</h2>
                <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn-gold"
                    onClick={(e) => { e.stopPropagation(); setEditingId(trip.id); setEditForm(trip); }}
                    style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }}
                    style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <TrashIcon size={20} />
                  </button>
                </div>
              </div>
              <p className="text-muted">
                📅 {formatDate(trip.start_datum)} – {formatDate(trip.end_datum)}
              </p>
              {trip.standard_schwerpunkte && trip.standard_schwerpunkte.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {trip.standard_schwerpunkte.map((s, i) => (
                    <span key={i} className="badge badge-info">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <span
                className={`badge ${getStatusBadge(trip.status)}`}
                style={{
                  marginTop: '8px',
                  display: 'inline-block',
                  ...(trip.status === 'laufend' && {
                    backgroundColor: '#0B4F6C',
                    color: 'white',
                    border: '2px solid #C79A2B'
                  })
                }}
              >
                {trip.status}
              </span>
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  )
}