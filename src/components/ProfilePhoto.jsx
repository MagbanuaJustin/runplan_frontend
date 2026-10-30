import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import {
  optimizeAvatar,
  PROFILE_AVATAR_EVENT,
  readProfileAvatar,
  removeProfileAvatar,
  saveProfileAvatar,
} from '../profileAvatar.js'

export default function ProfilePhoto({ displayName = '' }) {
  const { user } = useAuth()
  const [avatar, setAvatar] = useState(() => readProfileAvatar(user))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const refreshAvatar = () => setAvatar(readProfileAvatar(user))

    refreshAvatar()
    window.addEventListener(PROFILE_AVATAR_EVENT, refreshAvatar)

    return () => window.removeEventListener(PROFILE_AVATAR_EVENT, refreshAvatar)
  }, [user?.id, user?.email])

  const initial = (
    displayName.trim().charAt(0) ||
    user?.email?.charAt(0) ||
    'R'
  ).toUpperCase()

  async function handleFileChange(event) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file) return

    setBusy(true)
    setMessage('')

    try {
      const optimized = await optimizeAvatar(file)
      saveProfileAvatar(user, optimized)
      setAvatar(optimized)
      setMessage('Photo saved on this browser and device.')
    } catch (error) {
      setMessage(error.message || 'Could not save that photo.')
    } finally {
      setBusy(false)
    }
  }

  function handleRemove() {
    try {
      removeProfileAvatar(user)
      setAvatar('')
      setMessage('Profile photo removed.')
    } catch {
      setMessage('Could not remove the profile photo.')
    }
  }

  return (
    <div className="profile-photo-editor">
      <div className="profile-avatar-preview">
        {avatar ? (
          <img src={avatar} alt="Your profile" />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
      </div>

      <div className="profile-photo-copy">
        <p className="section-eyebrow">YOUR RUNPLAN PROFILE</p>
        <h2>Profile photo</h2>
        <p className="note">
          This photo appears in your sidebar and profile. Use a JPG, PNG, or
          WebP image up to 8 MB.
        </p>

        <div className="profile-photo-actions">
          <label className="btn btn-primary profile-photo-upload">
            {busy ? 'Preparing photo…' : avatar ? 'Change photo' : 'Upload photo'}
            <input
              className="profile-photo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={busy}
            />
          </label>

          {avatar && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRemove}
              disabled={busy}
            >
              Remove
            </button>
          )}
        </div>

        <p className="profile-photo-message" role="status">
          {message || 'Saved on this browser and device; it does not sync to other devices.'}
        </p>
      </div>
    </div>
  )
}