import { useState } from 'react'
import ActivityForm from '../components/ActivityForm.jsx'
import ActivityList from '../components/ActivityList.jsx'

export default function Activities() {
  const [version, setVersion] = useState(0)

  return (
    <>
      <h1>Log a run</h1>
      <ActivityForm onSaved={() => setVersion((v) => v + 1)} />
      <h2>Your runs</h2>
      <ActivityList key={version} />
    </>
  )
}