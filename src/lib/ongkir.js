// src/lib/ongkir.js
//
// Utilitas perhitungan jarak & ongkir ala GoFood.
// Titik toko diambil dari lokasi asli "Dapur Teh Yeyen" (embed maps di Contact.jsx).
//
// Nanti kalau kamu sudah punya kolomnya di tabel `settings`, cukup override
// STORE_ORIGIN & ONGKIR_CONFIG dari data settings (lihat fungsi buildConfig di bawah).

// Titik asal toko (lat, lng) — dari embed Google Maps di halaman Contact
export const STORE_ORIGIN = { lat: -6.11962, lng: 106.58458 }

// Konfigurasi tarif default. Semua nilai dalam Rupiah / km.
export const ONGKIR_CONFIG = {
  baseFee: 8000,        // tarif dasar (sudah termasuk baseDistanceKm pertama)
  baseDistanceKm: 2,    // berapa km pertama yang sudah tercakup baseFee
  perKmFee: 2500,       // tarif tiap km SETELAH baseDistanceKm
  minFee: 8000,         // ongkir tidak akan lebih murah dari ini
  maxDistanceKm: 15,    // di luar radius ini dianggap "tidak dijangkau"
  freeAboveSubtotal: 100000, // gratis ongkir kalau subtotal >= nilai ini. null = nonaktif
  roundTo: 500,         // pembulatan ongkir ke kelipatan ini
}

// Jarak garis lurus (haversine) dalam km antara dua koordinat.
export function haversineKm(a, b) {
  if (!a || !b) return null
  const R = 6371 // radius bumi km
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Membangun config dari SATU BARIS app_settings (id=1).
// Anti-gagal: nilai ongkir bisa tersimpan sebagai KOLOM tersendiri
// (origin_lat, ongkir_base_fee, ongkir_free_above, ...) ATAU di dalam JSON `value`
// (store_lat, delivery_fee, min_order_free_ongkir, ...). Fungsi ini membaca dari mana pun.
// Panggil: const { origin, cfg } = buildConfig(settingsRow)  // hasil select('*')
export function buildConfig(s = {}) {
  // gabungkan value JSON + kolom top-level (kolom menang bila nama sama)
  const m = { ...(s && s.value ? s.value : {}), ...s }

  const val = (x) => {
    const n = Number(x)
    return (x !== null && x !== undefined && x !== '' && Number.isFinite(n)) ? n : undefined
  }
  const first = (...cands) => {
    for (const c of cands) { const n = val(c); if (n !== undefined) return n }
    return undefined
  }

  const lat = first(m.origin_lat, m.store_lat) ?? STORE_ORIGIN.lat
  const lng = first(m.origin_lng, m.store_lng) ?? STORE_ORIGIN.lng
  const baseFee = first(m.ongkir_base_fee, m.delivery_fee) ?? ONGKIR_CONFIG.baseFee
  const freeAbove = first(m.ongkir_free_above, m.min_order_free_ongkir) ?? ONGKIR_CONFIG.freeAboveSubtotal

  const cfg = {
    baseFee,
    baseDistanceKm: first(m.ongkir_base_km, m.delivery_base_km) ?? ONGKIR_CONFIG.baseDistanceKm,
    perKmFee: first(m.ongkir_per_km, m.delivery_per_km) ?? ONGKIR_CONFIG.perKmFee,
    minFee: first(m.ongkir_min_fee, m.delivery_min_fee) ?? baseFee,
    maxDistanceKm: first(m.ongkir_max_km, m.delivery_radius_km) ?? ONGKIR_CONFIG.maxDistanceKm,
    // 0 / kosong dianggap nonaktif
    freeAboveSubtotal: freeAbove && freeAbove > 0 ? freeAbove : null,
    roundTo: ONGKIR_CONFIG.roundTo,
  }
  return { origin: { lat, lng }, cfg }
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) && v !== '' && v != null ? n : fallback
}

// Hasil: { reachable, distanceKm, fee, isFree, reason }
export function hitungOngkir(dest, subtotal = 0, cfg = ONGKIR_CONFIG, origin = STORE_ORIGIN) {
  if (!dest || dest.lat == null || dest.lng == null) {
    return { reachable: false, distanceKm: null, fee: 0, isFree: false, reason: 'no_point' }
  }

  const distanceKm = haversineKm(origin, dest)

  if (distanceKm > cfg.maxDistanceKm) {
    return { reachable: false, distanceKm, fee: 0, isFree: false, reason: 'too_far' }
  }

  // Gratis ongkir kalau subtotal cukup besar
  if (cfg.freeAboveSubtotal != null && subtotal >= cfg.freeAboveSubtotal) {
    return { reachable: true, distanceKm, fee: 0, isFree: true, reason: 'free' }
  }

  const extraKm = Math.max(0, distanceKm - cfg.baseDistanceKm)
  let fee = cfg.baseFee + extraKm * cfg.perKmFee
  fee = Math.max(cfg.minFee, fee)

  // pembulatan ke atas ke kelipatan roundTo
  if (cfg.roundTo) fee = Math.ceil(fee / cfg.roundTo) * cfg.roundTo

  return { reachable: true, distanceKm, fee: Math.round(fee), isFree: false, reason: 'ok' }
}

export function formatKm(km) {
  if (km == null) return '-'
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}