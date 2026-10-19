import { Link } from 'react-router-dom'

export default function ComingSoon({ title }) {
  return (
    <main className="shell">
      <h1>{title}</h1>
      <p>This screen is planned for a later phase.</p>
      <Link to="/dashboard">Back to dashboard</Link>
    </main>
  )
}