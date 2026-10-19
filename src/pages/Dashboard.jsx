import { useEffect, useState } from 'react'
import { apiGet } from '../api.js'
import ActivityList from '../components/ActivityList.jsx'

export default function Dashboard() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    apiGet('/health')
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <>
      <h1>Dashboard</h1>
      <small>API status: {status}</small>
      <h2>Recent runs</h2>
      <ActivityList />
    </>
  )
}