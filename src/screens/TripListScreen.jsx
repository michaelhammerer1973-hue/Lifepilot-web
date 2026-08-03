import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../App'
import AppHeader from '../components/AppHeader'
import TrashIcon from '../components/TrashIcon'
import SaveIcon from '../components/SaveIcon'
import CancelIcon from '../components/CancelIcon'

export default function TripListScreen() {
  const navigate = useNavigate()
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

  useEffect(() => {
    loadTrips()
  }, [])

  const loadTrips = async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('trips')
        .select('*')

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
    if (!confirm('Reise wirklich löschen? (Das löscht auch alle Tage, Aktivitäten und Übernachtungen)')) return
    try {
      await supabase.from('trips').delete().eq('id', tripId)
      await loadTrips()
    } catch (err) {
      console.error('Fehler beim Löschen:', err)
    }
  }

  const handleSave = async (tripId) => {
    try {
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

      // Trip erstellen
      const { data: tripInsert, error: tripError } = await supabase
        .from('trips')
        .insert([{
          titel: tripData.titel,
          start_datum: tripData.start_datum,
          end_datum: tripData.end_datum,
          status: 'geplant',
          standard_schwerpunkte: tripData.schwerpunkte || []
        }])
        .select()

      if (tripError) throw tripError
      const tripId = tripInsert[0].id

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
    <div className="container">
      <AppHeader />

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
          <div className="card" style={{ borderLeft: '4px solid #28a745', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <h3 className="section-title">📥 Reise aus JSON importieren</h3>

            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
              Wähle die JSON-Datei von Claude Desktop:
            </p>

            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '12px',
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

            <button className="btn-danger" onClick={() => { setShowImportModal(false); setImportJson(''); setImportError(''); }} style={{ width: '100%' }}>
              Abbrechen
            </button>
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
              <select
                value={editForm.maps_mode || 'transit'}
                onChange={(e) => setEditForm({...editForm, maps_mode: e.target.value})}
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
              >
                <option value="transit">Öffentliche Verkehrsmittel</option>
                <option value="driving">Auto</option>
                <option value="walking">Zu Fuß</option>
                <option value="bicycling">Fahrrad</option>
              </select>
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
  )
}