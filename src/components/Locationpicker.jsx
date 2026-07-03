// src/components/LocationPicker.jsx
//
// Pemilih titik lokasi ala Gojek/GoFood pakai Leaflet + OpenStreetMap (GRATIS, tanpa API key).
// - Marker bisa digeser / peta bisa diklik untuk menaruh titik
// - Tombol "Gunakan lokasi saya" (GPS browser)
// - Alamat otomatis terisi via reverse geocoding (Nominatim)
// - Menampilkan estimasi jarak & ongkir live
//
// TIDAK perlu `npm install` apa pun — Leaflet dimuat dari CDN saat komponen dipakai.
//
// Props:
//   value:    { lat, lng, address } | null
//   onChange: (val) => void   // dipanggil { lat, lng, address }
//   origin:   { lat, lng }     // titik toko (default dari ongkir.js)
//   subtotal: number           // untuk hitung gratis ongkir
//   config:   object           // ONGKIR_CONFIG (opsional)

import { useEffect, useRef, useState } from 'react'
import { STORE_ORIGIN, ONGKIR_CONFIG, hitungOngkir, formatKm } from '../lib/ongkir'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

// Muat Leaflet sekali saja (dari CDN)
function useLeaflet() {
  const [ready, setReady] = useState(!!window.L)
  useEffect(() => {
    if (window.L) { setReady(true); return }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = LEAFLET_CSS
      document.head.appendChild(link)
    }

    let script = document.getElementById('leaflet-js')
    if (!script) {
      script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = LEAFLET_JS
      script.async = true
      document.body.appendChild(script)
    }
    const onLoad = () => setReady(true)
    script.addEventListener('load', onLoad)
    if (window.L) setReady(true)
    return () => script.removeEventListener('load', onLoad)
  }, [])
  return ready
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`
    const res = await fetch(url, { headers: { 'Accept-Language': 'id' } })
    const data = await res.json()
    return data?.display_name || ''
  } catch {
    return ''
  }
}

export default function LocationPicker({
  value,
  onChange,
  origin = STORE_ORIGIN,
  subtotal = 0,
  config = ONGKIR_CONFIG,
}) {
  const ready = useLeaflet()
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [locating, setLocating] = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  const point = value && value.lat != null ? { lat: value.lat, lng: value.lng } : null
  const ongkir = point ? hitungOngkir(point, subtotal, config, origin) : null

  // Inisialisasi peta
  useEffect(() => {
    if (!ready || !mapEl.current || mapRef.current) return
    const L = window.L
    const start = point || origin

    const map = L.map(mapEl.current, { zoomControl: true }).setView([start.lat, start.lng], point ? 16 : 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    // Marker toko (statis)
    L.marker([origin.lat, origin.lng], {
      icon: L.divIcon({
        className: '',
        html: '<div style="font-size:22px;line-height:1">🏠</div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    }).addTo(map).bindTooltip('Lokasi Toko', { direction: 'top' })

    const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map)
    markerRef.current = marker

    const commit = async (lat, lng) => {
      setGeocoding(true)
      const address = await reverseGeocode(lat, lng)
      setGeocoding(false)
      onChange?.({ lat, lng, address })
    }

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng()
      commit(lat, lng)
    })
    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      marker.setLatLng([lat, lng])
      commit(lat, lng)
    })

    mapRef.current = map

    // fix ukuran saat pertama render di dalam container
    setTimeout(() => map.invalidateSize(), 200)

    return () => { map.remove(); mapRef.current = null; markerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Sinkronkan marker kalau value berubah dari luar
  useEffect(() => {
    if (mapRef.current && markerRef.current && point) {
      markerRef.current.setLatLng([point.lat, point.lng])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng])

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        mapRef.current?.setView([lat, lng], 16)
        markerRef.current?.setLatLng([lat, lng])
        setLocating(false)
        setGeocoding(true)
        const address = await reverseGeocode(lat, lng)
        setGeocoding(false)
        onChange?.({ lat, lng, address })
      },
      () => { setLocating(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">Titik Lokasi Pengiriman *</label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={!ready || locating}
          className="text-xs font-semibold text-orange-500 hover:text-orange-600 disabled:opacity-50 flex items-center gap-1"
        >
          {locating ? 'Mencari…' : '📍 Gunakan lokasi saya'}
        </button>
      </div>

      <div
        ref={mapEl}
        className="w-full h-64 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100"
      >
        {!ready && (
          <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
            Memuat peta…
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-1.5">
        Ketuk peta atau geser pin untuk menentukan titik antar yang tepat.
      </p>

      {/* Ringkasan jarak & ongkir */}
      {point && (
        <div className="mt-3">
          {ongkir?.reachable ? (
            <div className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-3">
              <div className="text-xs text-gray-500">
                Jarak dari toko: <span className="font-semibold text-gray-700">{formatKm(ongkir.distanceKm)}</span>
                {geocoding && <span className="ml-2 text-gray-400">(mengambil alamat…)</span>}
              </div>
              <div className="text-sm font-bold text-orange-600">
                {ongkir.isFree ? 'Gratis Ongkir 🎉' : `Ongkir Rp ${ongkir.fee.toLocaleString('id-ID')}`}
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-500 font-medium">
              Maaf, lokasi ini di luar jangkauan antar ({formatKm(ongkir?.distanceKm)} dari toko).
              Maksimal {config.maxDistanceKm} km.
            </div>
          )}
        </div>
      )}
    </div>
  )
}