import { useEffect, useState } from 'react'
import { apiGet, apiDelete } from '../api.js'
import { formatDuration } from '../format.js'
import ActivityForm from './ActivityForm.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

const newestFirst = (a, b) =>
  b.activity_date.localeCompare(a.activity_date) || b.id - a.id

export default function ActivityList() {
  const [activities, setActivities] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [editingId, setEditingId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    apiGet('/activities')
      .then((body) => {
        setActivities(body.data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  function handleSaved(row) {
    setActivities((list) => list.map((a) => (a.id === row.id ? row : a)).sort(newestFirst))
    setEditingId(null)
  }

  async function confirmDelete() {
    setBusy(true)
    setDeleteError('')
    try {
      await apiDelete(`/activities/${toDelete.id}`)
      setActivities((list) => list.filter((a) => a.id !== toDelete.id))
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setBusy(false)
      setToDelete(null)
    }
  }

  if (state === 'loading') return <p role="status">Loading runs...</p>
  if (state === 'error') return <p role="alert">Could not load your runs.</p>
  if (activities.length === 0) return <p>No runs logged yet.</p>

  return (
    <>
      {deleteError && <p className="error" role="alert">{deleteError}</p>}
      <ul className="runs">
        {activities.map((a) =>
          a.id === editingId ? (
            <li key={a.id} className="card card-edit">
              <ActivityForm activity={a} onSaved={handleSaved} onCancel={() => setEditingId(null)} />
            </li>
          ) : (
            <li key={a.id} className="card">
              <strong>{a.activity_date}</strong>
              <span>{a.distance_km} km</span>
              <span>{formatDuration(a.duration_seconds)}</span>
              <span>{a.pace_label} /km</span>
              {a.effort && <span>Effort {a.effort}/10</span>}
              <span className="card-actions">
                <button type="button" className="card-action"
                  onClick={() => setEditingId(a.id)}
                  aria-label={`Edit run on ${a.activity_date}`}>Edit</button>
                <button type="button" className="card-action"
                  onClick={() => setToDelete(a)}
                  aria-label={`Delete run on ${a.activity_date}`}>Delete</button>
              </span>
            </li>
          ),
        )}
      </ul>

      <ConfirmDialog
        open={toDelete !== null}
        danger
        title="Delete this run?"
        message={toDelete ? `${toDelete.activity_date}, ${toDelete.distance_km} km. This cannot be undone.` : ''}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}