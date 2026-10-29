export function watchLocation(onPosition, onError, options = {}) {
  const geolocation = globalThis.navigator?.geolocation

  if (!geolocation) {
    throw new Error('Location tracking is not available in this browser.')
  }

  const watchId = geolocation.watchPosition(
    (position) => {
      onPosition({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      })
    },
    onError,
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
      ...options,
    },
  )

  return () => geolocation.clearWatch(watchId)
}