import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { supabase } from '../App'
import AppHeader from '../components/AppHeader'

export default function DayDetailScreen() {
  const { dayId } = useParams()
  const [day, setDay] = useState(null)
  const [activities, setActivities] = useState([])
  const [accommodations, setAccommodations] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => { loadData() }, [dayId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Lade Day
      const { data: dayData } = await supabase.from('days').select('*').eq('id', dayId).single()
      setDay(dayData || null)

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

  const handleDelete = async (table, id) => {
    if (!confirm('Wirklich löschen?')) return
    await supabase.from(table).delete().eq('id', id)
    await loadData()
  }

  const handleSave = async (table, id) => {
    await supabase.from(table).update(editForm).eq('id', id)
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
      <button className="back-btn" onClick={() => window.history.back()}>← Zurück</button>
      <h1 style={{ color: '#0B4F6C' }}>{new Date(day.datum).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h1>

      <div className="card" style={{ borderLeft: '4px solid #0B4F6C' }}>
        <h3 className="section-title">📍 Fahrtinfo</h3>
        {editingId === `day_${dayId}` ? (
          <div>
            <input type="text" value={editForm.start_adresse || ''} onChange={(e) => setEditForm({...editForm, start_adresse: e.target.value})} placeholder="Start-Adresse" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
            <input type="text" value={editForm.ziel_adresse || ''} onChange={(e) => setEditForm({...editForm, ziel_adresse: e.target.value})} placeholder="Ziel-Adresse" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
            <input type="text" value={editForm.strecke_km || ''} onChange={(e) => setEditForm({...editForm, strecke_km: e.target.value})} placeholder="Strecke (km)" style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
            <button className="btn-gold" onClick={() => handleSave('days', dayId)} style={{ marginRight: '8px' }}>💾 Speichern</button>
            <button className="btn-danger" onClick={() => setEditingId(null)}>Abbrechen</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              {day.start_adresse && <p style={{ margin: '0 0 4px 0' }}><strong>Start:</strong> <a href={getMapsLink(day.start_adresse)} target="_blank" rel="noopener noreferrer" style={{ color: '#0B4F6C', textDecoration: 'none', cursor: 'pointer' }}>{day.start_adresse} 🗺️</a></p>}
              {day.ziel_adresse && <p style={{ margin: '0 0 4px 0' }}><strong>Ziel:</strong> <a href={getMapsLink(day.ziel_adresse)} target="_blank" rel="noopener noreferrer" style={{ color: '#0B4F6C', textDecoration: 'none', cursor: 'pointer' }}>{day.ziel_adresse} 🗺️</a></p>}
              {day.strecke_km && <p style={{ margin: 0 }}><strong>Strecke:</strong> {day.strecke_km} km</p>}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
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
              <div ref={provided.innerRef} {...provided.droppableProps} style={{ backgroundColor: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent', borderRadius: '4px', padding: '4px' }}>
                {activities.map((a, idx) => (
                  <Draggable key={a.id} draggableId={a.id} index={idx}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ padding: '12px', marginBottom: idx === activities.length - 1 ? 0 : '8px', backgroundColor: snapshot.isDragging ? '#E8F0F5' : '#F5F7FA', borderRadius: '6px', borderLeft: '4px solid #0B4F6C', ...provided.draggableProps.style }}>
            {editingId === a.id ? (
              <div>
                <input type="text" value={editForm.typ || ''} onChange={(e) => setEditForm({...editForm, typ: e.target.value})} placeholder="Typ" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" value={editForm.titel || ''} onChange={(e) => setEditForm({...editForm, titel: e.target.value})} placeholder="Titel" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" value={editForm.dauer_geschätzt || ''} onChange={(e) => setEditForm({...editForm, dauer_geschätzt: e.target.value})} placeholder="Dauer" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" value={editForm.adresse || ''} onChange={(e) => setEditForm({...editForm, adresse: e.target.value})} placeholder="Adresse (für Google Maps)" style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <button className="btn-gold" onClick={() => handleSave('activities', a.id)} style={{ marginRight: '8px' }}>💾 Speichern</button>
                <button className="btn-danger" onClick={() => setEditingId(null)}>Abbrechen</button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', color: '#0B4F6C' }}>{a.typ}</p>
                  <p style={{ margin: '0 0 4px 0' }}>{a.titel}</p>
                  <p className="text-muted" style={{ margin: 0 }}>⏱️ {a.dauer_geschätzt}</p>
                  {a.adresse && <p style={{ margin: '4px 0 0 0' }}><a href={getMapsLink(a.adresse)} target="_blank" rel="noopener noreferrer" style={{ color: '#0B4F6C', textDecoration: 'none', cursor: 'pointer' }}>📍 {a.adresse} 🗺️</a></p>}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn-gold" onClick={() => { setEditingId(a.id); setEditForm(a); }} style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}>✎</button>
                  <button className="btn-danger" onClick={() => handleDelete('activities', a.id)} style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}>🗑️</button>
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
      </div>

      {accommodations.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #C79A2B' }}>
          <h3 className="section-title">🏨 Übernachtung{accommodations.length > 1 ? 'en' : ''}</h3>
          {accommodations.map(accommodation => (
            <div key={accommodation.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
              {editingId === accommodation.id ? (
                <div>
                  <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} placeholder="Name" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <input type="text" value={editForm.typ || ''} onChange={(e) => setEditForm({...editForm, typ: e.target.value})} placeholder="Typ" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <input type="text" value={editForm.kosten || ''} onChange={(e) => setEditForm({...editForm, kosten: e.target.value})} placeholder="Kosten" style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <input type="text" value={editForm.adresse || ''} onChange={(e) => setEditForm({...editForm, adresse: e.target.value})} placeholder="Adresse" style={{ width: '100%', padding: '6px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <button className="btn-gold" onClick={() => handleSave('accommodations', accommodation.id)} style={{ marginRight: '8px' }}>💾 Speichern</button>
                  <button className="btn-danger" onClick={() => setEditingId(null)}>Abbrechen</button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div><p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>{accommodation.name}</p>{accommodation.kosten && <p className="text-muted" style={{ margin: '0 0 4px 0' }}>{accommodation.kosten}</p>}<p className="text-muted" style={{ margin: 0 }}><a href={getMapsLink(accommodation.adresse)} target="_blank" rel="noopener noreferrer" style={{ color: '#666', textDecoration: 'none' }}>{accommodation.adresse} 🗺️</a></p></div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-gold" onClick={() => { setEditingId(accommodation.id); setEditForm(accommodation); }} style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}>✎</button>
                    <button className="btn-danger" onClick={() => handleDelete('accommodations', accommodation.id)} style={{ width: '32px', height: '32px', padding: '0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'auto' }}>🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}