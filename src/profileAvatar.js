export const PROFILE_AVATAR_EVENT = 'rp:profile-avatar-changed'

function avatarStorageKey(user) {
  const identity = user?.id != null
    ? `user-${user.id}`
    : `email-${String(user?.email ?? 'runner').trim().toLowerCase()}`

  return `rp:profile-avatar:v1:${encodeURIComponent(identity)}`
}

export function readProfileAvatar(user) {
  try {
    return window.localStorage.getItem(avatarStorageKey(user)) || ''
  } catch {
    return ''
  }
}

export function saveProfileAvatar(user, dataUrl) {
  window.localStorage.setItem(avatarStorageKey(user), dataUrl)
  window.dispatchEvent(new Event(PROFILE_AVATAR_EVENT))
}

export function removeProfileAvatar(user) {
  window.localStorage.removeItem(avatarStorageKey(user))
  window.dispatchEvent(new Event(PROFILE_AVATAR_EVENT))
}

export function optimizeAvatar(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (!file || !allowedTypes.includes(file.type)) {
    return Promise.reject(new Error('Choose a JPG, PNG, or WebP image.'))
  }

  if (file.size > 8 * 1024 * 1024) {
    return Promise.reject(new Error('Choose an image smaller than 8 MB.'))
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('The selected image could not be opened.'))
    }

    image.onload = () => {
      try {
        const maxDimension = 320
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
        )
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

        const context = canvas.getContext('2d')
        if (!context) throw new Error('Could not prepare the image.')

        context.drawImage(image, 0, 0, canvas.width, canvas.height)

        let quality = 0.82
        let dataUrl = canvas.toDataURL('image/jpeg', quality)

        while (dataUrl.length > 500_000 && quality > 0.5) {
          quality -= 0.08
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }

        if (dataUrl.length > 500_000) {
          throw new Error('That image is too large after compression. Choose another photo.')
        }

        resolve(dataUrl)
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }

    image.src = objectUrl
  })
}