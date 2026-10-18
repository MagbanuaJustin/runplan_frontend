import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export default function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main className="shell">
      <h1>RunPlan AI</h1>
      <p>Adaptive Marathon Training Planner</p>
      <small>API status: {status}</small>
    </main>
  )
}