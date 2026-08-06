import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { supabase } from '../App'
import AppHeader from '../components/AppHeader'
import TrashIcon from '../components/TrashIcon'
import SaveIcon from '../components/SaveIcon'
import CancelIcon from '../components/CancelIcon'

export default function DayDetailScreen() {
  const { dayId } = useParams()
  const navigate = useNavigate()
  const [day, setDay] = useState(null)
  const [allDays, setAllDays] = useState([])
  const [activities, setActivities] = useState([])
  const [accommodations, setAccommodations] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { loadData() }, [dayId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Lade Day
      const { data: dayData } = await supabase.from('days').select('*').eq('id', dayId).single()
      setDay(dayData || null)

      // Lade alle Tage der Trip für Navigation
      if (dayData?.trip_id) {
        const { data: daysData, error: daysError } = await supabase.from('days').select('*').eq('trip_id', dayData.trip_id).order('datum', { ascending: true })
        if (daysError) {
          console.warn('Fehler beim Laden der Tage:', daysError)
        }
        console.log('Geladene Tage:', daysData, 'Aktuelle dayId:', dayId, 'Trip-ID:', dayData.trip_id)
        setAllDays(daysData || [])
      }

      // Lade Activities
      const { data: activitiesData } = await supabase.from('activities').select('*').eq('day_id', dayId).order('reihenfolge')
      setActivities(activitiesData || [])

      // Lade Accommodations (mehrere möglich)
      const { data: accommodationsData } = await supabase.from('accommodations').select('*').eq('day_id', dayId)
      setAccommodations(accommodationsData || [])
    } catch (err) {
      console.warn('Error loading data:', err.message)
      setDay(null)
      setActivities([])
      setAccommodations([])
    } finally { setLoading(false) }
  }

  const handleDelete = (table, id) => {
    setDeleteConfirm({ table, id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    await supabase.from(deleteConfirm.table).delete().eq('id', deleteConfirm.id)
    setDeleteConfirm(null)
    await loadData()
  }

  const handleSave = async (table, id) => {
    let updateData = editForm

    if (table === 'activities' && editForm.day_id && editForm.day_id !== day.id) {
      const { data: newDayActivities } = await supabase
        .from('activities')
        .select('reihenfolge')
        .eq('day_id', editForm.day_id)
        .order('reihenfolge', { ascending: false })
        .limit(1)

      const maxReihenfolge = newDayActivities?.[0]?.reihenfolge ?? -1
      updateData = { ...editForm, reihenfolge: maxReihenfolge + 1 }
    }

    await supabase.from(table).update(updateData).eq('id', id)
    setEditingId(null)
    await loadData()
  }

  const handleMove = async (id, direction) => {
    const sorted = [...activities].sort((a, b) => a.reihenfolge - b.reihenfolge)
    const idx = sorted.findIndex(a => a.id === id)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1

    // Vertausche die beiden Aktivitäten
    const temp = sorted[idx].reihenfolge
    sorted[idx].reihenfolge = sorted[newIdx].reihenfolge
    sorted[newIdx].reihenfolge = temp

    // Aktualisiere beide in Supabase
    await Promise.all([
      supabase.from('activities').update({ reihenfolge: sorted[idx].reihenfolge }).eq('id', sorted[idx].id),
      supabase.from('activities').update({ reihenfolge: sorted[newIdx].reihenfolge }).eq('id', sorted[newIdx].id)
    ])
    await loadData()
  }

  const getMapsLink = (address) => {
    return `https://www.google.com/maps/search/${encodeURIComponent(address)}`
  }

  const handlePreviousDay = () => {
    const currentIndex = allDays.findIndex(d => d.id === dayId)
    if (currentIndex > 0) {
      const prevDay = allDays[currentIndex - 1]
      navigate(`/day/${prevDay.id}`)
    }
  }

  const handleNextDay = () => {
    const currentIndex = allDays.findIndex(d => d.id === dayId)
    if (currentIndex >= 0 && currentIndex < allDays.length - 1) {
      const nextDay = allDays[currentIndex + 1]
      navigate(`/day/${nextDay.id}`)
    }
  }

  const handleBackToTrip = () => {
    if (day?.trip_id) {
      navigate(`/trip/${day.trip_id}`)
    }
  }

  const handleOpenDayInMaps = () => {
    if (!day) return
    const origin = encodeURIComponent(day.start_adresse || '')
    const destination = encodeURIComponent(day.ziel_adresse || day.start_adresse || '')
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
    window.open(mapsUrl, '_blank')
  }

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.index === destination.index) return

    const sorted = [...activities].sort((a, b) => a.reihenfolge - b.reihenfolge)
    const [movedActivity] = sorted.splice(source.index, 1)
    sorted.splice(destination.index, 0, movedActivity)

    const updates = sorted.map((activity, idx) => ({
      id: activity.id,
      reihenfolge: idx
    }))

    for (const update of updates) {
      await supabase.from('activities').update({ reihenfolge: update.reihenfolge }).eq('id', update.id)
    }
    await loadData()
  }

  const handleAddActivity = async () => {
    const newActivity = {
      day_id: dayId,
      typ: 'Neue Aktivität',
      titel: '',
      dauer_geschätzt: '',
      reihenfolge: activities.length
    }
    await supabase.from('activities').insert([newActivity])
    await loadData()
  }

  const handleAddAccommodation = async () => {
    const newAccommodation = {
      day_id: dayId,
      name: 'Neue Übernachtung',
      typ: '',
      kosten: '',
      adresse: ''
    }
    await supabase.from('accommodations').insert([newAccommodation])
    await loadData()
  }

  if (loading) return <div className="container"><p>Lädt...</p></div>
  if (!day) return <div className="container"><p>Nicht gefunden</p></div>

  return (
    <div className="container">
      <AppHeader />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button className="back-btn" onClick={handleBackToTrip}>← Zurück</button>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {allDays.length > 0 && allDays.findIndex(d => d.id === dayId) > 0 ? (
            <button className="back-btn" onClick={handlePreviousDay}>← Tag</button>
          ) : null}
          {allDays.length > 0 && allDays.findIndex(d => d.id === dayId) < allDays.length - 1 ? (
            <button className="back-btn" onClick={handleNextDay}>Tag →</button>
          ) : null}
        </div>
      </div>
      <h1 style={{ color: '#0B4F6C' }}>{new Date(day.datum).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h1>

      <div className="card" style={{ borderLeft: '4px solid #0B4F6C' }}>
        <h3 className="section-title">📍 Fahrtinfo</h3>
        {editingId === `day_${dayId}` ? (
          <div>
            <input type="text" value={editForm.start_adresse || ''} onChange={(e) => setEditForm({...editForm, start_adresse: e.target.value})} placeholder="Start-Adresse" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
            <input type="text" value={editForm.ziel_adresse || ''} onChange={(e) => setEditForm({...editForm, ziel_adresse: e.target.value})} placeholder="Ziel-Adresse" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
            <input type="text" value={editForm.strecke_km || ''} onChange={(e) => setEditForm({...editForm, strecke_km: e.target.value})} placeholder="Strecke (km)" style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => handleSave('days', dayId)} style={{ width: '32px', height: '32px', padding: '0', backgroundColor: '#0B4F6C', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}><SaveIcon size={20} /></button>
              <button onClick={() => setEditingId(null)} style={{ width: '32px', height: '32px', padding: '0', backgroundColor: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}><CancelIcon size={20} /></button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              {day.start_adresse && <p style={{ margin: '0 0 4px 0' }}><strong>Start:</strong> <a href={getMapsLink(day.start_adresse)} target="_blank" rel="noopener noreferrer" style={{ color: '#0B4F6C', textDecoration: 'none', cursor: 'pointer' }}>{day.start_adresse} 🗺️</a></p>}
              {day.ziel_adresse && <p style={{ margin: '0 0 4px 0' }}><strong>Ziel:</strong> <a href={getMapsLink(day.ziel_adresse)} target="_blank" rel="noopener noreferrer" style={{ color: '#0B4F6C', textDecoration: 'none', cursor: 'pointer' }}>{day.ziel_adresse} 🗺️</a></p>}
              {day.strecke_km && <p style={{ margin: 0 }}><strong>Strecke:</strong> {day.strecke_km} km</p>}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={handleOpenDayInMaps} style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto', backgroundColor: '#0B4F6C', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="In Google Maps anzeigen">🗺️</button>
              <button className="btn-gold" onClick={() => { setEditingId(`day_${dayId}`); setEditForm(day); }} style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}>✎</button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ borderLeft: '4px solid #0B4F6C' }}>
        <h3 className="section-title">📋 Aktivitäten</h3>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="activities">
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps} style={{ backgroundColor: snapshot.isDraggingOver ? 'var(--bg-hover)' : 'transparent', borderRadius: '4px', padding: '4px' }}>
                {activities.map((a, idx) => (
                  <Draggable key={a.id} draggableId={a.id} index={idx}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ padding: '12px', marginBottom: idx === activities.length - 1 ? 0 : '8px', backgroundColor: snapshot.isDragging ? 'var(--bg-hover)' : 'var(--bg-primary)', borderRadius: '6px', borderLeft: '4px solid var(--color-primary)', ...provided.draggableProps.style }}>
            {editingId === a.id ? (
              <div>
                <input type="text" value={editForm.typ || ''} onChange={(e) => setEditForm({...editForm, typ: e.target.value})} placeholder="Typ" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" value={editForm.titel || ''} onChange={(e) => setEditForm({...editForm, titel: e.target.value})} placeholder="Titel" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" value={editForm.dauer_geschätzt || ''} onChange={(e) => setEditForm({...editForm, dauer_geschätzt: e.target.value})} placeholder="Dauer" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="time" value={editForm.beginn_uhrzeit || ''} onChange={(e) => setEditForm({...editForm, beginn_uhrzeit: e.target.value})} placeholder="Startzeit (optional)" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" value={editForm.adresse || ''} onChange={(e) => setEditForm({...editForm, adresse: e.target.value})} placeholder="Adresse (für Google Maps)" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <select value={editForm.day_id || ''} onChange={(e) => setEditForm({...editForm, day_id: e.target.value})} style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  {allDays.map(d => (
                    <option key={d.id} value={d.id}>
                      {new Date(d.datum).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => handleSave('activities', a.id)} style={{ width: '32px', height: '32px', padding: '0', backgroundColor: '#0B4F6C', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}><SaveIcon size={20} /></button>
                  <button onClick={() => setEditingId(null)} style={{ width: '32px', height: '32px', padding: '0', backgroundColor: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}><CancelIcon size={20} /></button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '18px', cursor: 'grab', color: 'var(--text-light)', userSelect: 'none', marginTop: '2px' }}>☰</span>
                  <div>
                    <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', color: 'var(--color-primary)' }}>{a.typ}</p>
                    <p style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{a.titel}</p>
                    <p className="text-muted" style={{ margin: 0 }}>⏱️ {a.dauer_geschätzt}{a.beginn_uhrzeit && ` · 🕐 ${a.beginn_uhrzeit}`}</p>
                    {a.adresse && <p style={{ margin: '4px 0 0 0' }}><a href={getMapsLink(a.adresse)} target="_blank" rel="noopener noreferrer" style={{ color: '#0B4F6C', textDecoration: 'none', cursor: 'pointer' }}>📍 {a.adresse} 🗺️</a></p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn-gold" onClick={() => { setEditingId(a.id); setEditForm(a); }} style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}>✎</button>
                  <button className="btn-danger" onClick={() => handleDelete('activities', a.id)} style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><TrashIcon size={20} /></button>
                </div>
              </div>
            )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <button
          onClick={handleAddActivity}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '12px',
            backgroundColor: '#0B4F6C',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minHeight: '44px'
          }}
        >
          + Aktivität hinzufügen
        </button>
      </div>

      {accommodations.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #C79A2B' }}>
          <h3 className="section-title">🏨 Übernachtung{accommodations.length > 1 ? 'en' : ''}</h3>
          {accommodations.map(accommodation => (
            <div key={accommodation.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
              {editingId === accommodation.id ? (
                <div>
                  <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} placeholder="Name" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <input type="text" value={editForm.typ || ''} onChange={(e) => setEditForm({...editForm, typ: e.target.value})} placeholder="Typ" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <input type="text" value={editForm.kosten || ''} onChange={(e) => setEditForm({...editForm, kosten: e.target.value})} placeholder="Kosten" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <input type="text" value={editForm.adresse || ''} onChange={(e) => setEditForm({...editForm, adresse: e.target.value})} placeholder="Adresse" style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => handleSave('accommodations', accommodation.id)} style={{ width: '32px', height: '32px', padding: '0', backgroundColor: '#0B4F6C', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}><SaveIcon size={20} /></button>
                    <button onClick={() => setEditingId(null)} style={{ width: '32px', height: '32px', padding: '0', backgroundColor: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}><CancelIcon size={20} /></button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div><p style={{ fontWeight: 'bold', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{accommodation.name.replace(/ \([^)]*Stellplatz[^)]*\)/g, '')}</p>{accommodation.kosten && <p className="text-muted" style={{ margin: '0 0 4px 0' }}>{accommodation.kosten}</p>}<p className="text-muted" style={{ margin: 0 }}><a href={getMapsLink(accommodation.adresse)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{accommodation.adresse} 🗺️</a></p></div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-gold" onClick={() => { setEditingId(accommodation.id); setEditForm(accommodation); }} style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}>✎</button>
                    <button className="btn-danger" onClick={() => handleDelete('accommodations', accommodation.id)} style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><TrashIcon size={20} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            borderLeft: '4px solid #0B4F6C',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <p style={{
              fontSize: '16px',
              color: '#333',
              marginTop: 0,
              marginBottom: '24px',
              fontWeight: '500'
            }}>
              Wirklich löschen?
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f0f0f0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px'
                }}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}