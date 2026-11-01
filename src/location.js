import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

function normalizePosition(position) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    heading: position.coords.heading,
    speed: position.coords.speed,
    timestamp: position.timestamp,
  }
}

function normalizeNativeError(error) {
  if (typeof error?.code === 'number') return error

  const nativeCode = String(error?.code ?? '')

  if (nativeCode.endsWith('0003')) {
    return {
      code: 1,
      message: 'Location permission was denied. Allow precise location access and try again.',
    }
  }

  if (nativeCode.endsWith('0010')) {
    return {
      code: 3,
      message: 'Getting your location took too long. Try again outdoors with a clear view of the sky.',
    }
  }

  if (
    nativeCode.endsWith('0007') ||
    nativeCode.endsWith('0009') ||
    nativeCode.endsWith('0014') ||
    nativeCode.endsWith('0015') ||
    nativeCode.endsWith('0016') ||
    nativeCode.endsWith('0017')
  ) {
    return {
      code: 2,
      message: 'Location is unavailable. Turn on your device location services and try again.',
    }
  }

  return {
    code: 2,
    message: error?.message || 'Could not get your location.',
  }
}

function watchNativeLocation(onPosition, onError, options) {
  let watchId = null
  let cancelled = false

  function stop() {
    cancelled = true

    if (watchId !== null) {
      const id = watchId
      watchId = null
      void Geolocation.clearWatch({ id }).catch(() => {})
    }
  }

  async function start() {
    try {
      let permission = await Geolocation.checkPermissions()

      if (permission.location !== 'granted') {
        permission = await Geolocation.requestPermissions({
          permissions: ['location'],
        })
      }

      if (permission.location !== 'granted') {
        throw {
          code: 1,
          message: 'Precise location permission is required to record a run.',
        }
      }

      if (cancelled) return

      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 60000,
          interval: 1000,
          minimumUpdateInterval: 1000,
          enableLocationFallback: true,
          ...options,
        },
        (position, error) => {
          if (cancelled) return

          if (error) {
            const locationError = normalizeNativeError(error)
            stop()
            onError(locationError)
            return
          }

          if (position) {
            onPosition(normalizePosition(position))
          }
        },
      )

      watchId = id

      // The user may have stopped the watch while its native setup was pending.
      if (cancelled) {
        watchId = null
        await Geolocation.clearWatch({ id }).catch(() => {})
      }
    } catch (error) {
      if (!cancelled) onError(normalizeNativeError(error))
    }
  }

  void start()
  return stop
}

export function watchLocation(onPosition, onError, options = {}) {
  if (Capacitor.isNativePlatform()) {
    return watchNativeLocation(onPosition, onError, options)
  }

  const geolocation = globalThis.navigator?.geolocation

  if (!geolocation) {
    throw new Error('Location tracking is not available in this browser.')
  }

  const watchId = geolocation.watchPosition(
    (position) => onPosition(normalizePosition(position)),
    onError,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 60000,
      ...options,
    },
  )

  return () => geolocation.clearWatch(watchId)
}