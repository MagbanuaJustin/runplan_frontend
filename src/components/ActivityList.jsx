import { useEffect, useState } from 'react'
import { apiGet, apiDelete } from '../api.js'
import { formatDuration } from '../format.js'
import ActivityForm from './ActivityForm.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

const newestFirst = (a, b) =>
  b.activity_date.localeCompare(a.activity_date) || Number(b.id) - Number(a.id)

const sameId = (a, b) => String(a) === String(b)

export default function ActivityList() {
  const [activities, setActivities] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const qs = new URLSearchParams()
    if (fromDate) qs.set('from', fromDate)
    if (toDate) qs.set('to', toDate)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''

    setState('loading')
    apiGet(`/activities${suffix}`)
      .then((body) => {
        setActivities(Array.isArray(body.data) ? body.data : [])
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [fromDate, toDate])

  function handleSaved(row) {
    const matchesDateRange =
      (!fromDate || row.activity_date >= fromDate) &&
      (!toDate || row.activity_date <= toDate)

    setActivities((list) => {
      const exists = list.some((activity) => sameId(activity.id, row.id))

      if (!matchesDateRange) {
        return list.filter((activity) => !sameId(activity.id, row.id))
      }

      const updated = exists
        ? list.map((activity) => (
            sameId(activity.id, row.id) ? row : activity
          ))
        : [...list, row]

      return updated.sort(newestFirst)
    })

    setEditingId(null)
    setDeleteError('')
  }

  async function confirmDelete() {
    if (!toDelete) return

    const deletedId = toDelete.id
    setBusy(true)
    setDeleteError('')

    try {
      await apiDelete(`/activities/${deletedId}`)
      setActivities((list) =>
        list.filter((activity) => !sameId(activity.id, deletedId)),
      )
      setToDelete(null)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const hasFilter = fromDate !== '' || toDate !== ''

  return (
    <>
      <div className="filter-bar" role="region" aria-label="Filter runs by date">
        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>

        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>

        {hasFilter && (
          <button
            type="button"
            className="card-action filter-clear"
            onClick={() => {
              setFromDate('')
              setToDate('')
            }}
          >
            Clear
          </button>
        )}
      </div>

      {state === 'loading' && <p role="status">Loading runs...</p>}
      {state === 'error' && <p role="alert">Could not load your runs.</p>}

      {state === 'ready' && activities.length === 0 && (
        <p>
          {hasFilter
            ? 'No runs match that date range.'
            : 'No runs logged yet.'}
        </p>
      )}

      {state === 'ready' && activities.length > 0 && (
        <>
          <p className="note">
            Showing {activities.length} manual {activities.length === 1 ? 'run' : 'runs'}
            {hasFilter ? ' in selected range' : ''}.
          </p>

          {deleteError && <p className="error" role="alert">{deleteError}</p>}

          <ul className="runs">
            {activities.map((activity) =>
              sameId(activity.id, editingId) ? (
                <li key={activity.id} className="card card-edit">
                  <ActivityForm
                    activity={activity}
                    onSaved={handleSaved}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={activity.id} className="card">
                  <strong>{activity.activity_date}</strong>
                  <span>{activity.distance_km} km</span>
                  <span>{formatDuration(activity.duration_seconds)}</span>
                  <span>{activity.pace_label} /km</span>

                  {activity.effort && (
                    <span>Effort {activity.effort}/10</span>
                  )}

                  <span className="card-actions">
                    <button
                      type="button"
                      className="card-action"
                      onClick={() => setEditingId(activity.id)}
                      aria-label={`Edit run on ${activity.activity_date}`}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="card-action"
                      onClick={() => {
                        setDeleteError('')
                        setToDelete(activity)
                      }}
                      aria-label={`Delete run on ${activity.activity_date}`}
                    >
                      Delete
                    </button>
                  </span>

                  {activity.notes && (
                    <small className="card-note">{activity.notes}</small>
                  )}
                </li>
              ),
            )}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        danger
        title="Delete this run?"
        message={
          toDelete
            ? `${toDelete.activity_date}, ${toDelete.distance_km} km. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!busy) {
            setToDelete(null)
            setDeleteError('')
          }
        }}
      />
    </>
  )
}