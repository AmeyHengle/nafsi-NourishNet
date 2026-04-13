import { useState } from 'react'

export function useGeolocation() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function request() {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      err => {
        setError(err.message)
        setLoading(false)
      },
      { timeout: 8000 }
    )
  }

  return { location, loading, error, request }
}
