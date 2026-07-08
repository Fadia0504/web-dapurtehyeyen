import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { ChevronLeftIcon, ShieldCheckIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import LocationPicker from '../components/Locationpicker'
import { buildConfig, hitungOngkir, formatKm } from '../lib/ongkir'

export default function Checkout() {
  const { items, total, clearCart } = useCartStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', detail: '', notes: '' })
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryLoc, setDeliveryLoc] = useState(null) // { lat, lng, address }
  const [settings, setSettings] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('online') // 'online' | 'cod'

  // Config ongkir & titik toko dari admin settings (fallback ke default)
  const { origin, cfg } = buildConfig(settings || {})

  const subtotal = total()
  const ongkir = deliveryLoc
    ? hitungOngkir(deliveryLoc, subtotal, cfg, origin)
    : null
  const shippingFee = ongkir?.reachable ? ongkir.fee : 0
  const grandTotal = subtotal + shippingFee

  // Tanggal pengiriman minimal H+1 (tidak boleh hari yang sama).
  // Kalau ada pengaturan min_delivery_days_online di value JSON dan nilainya > 1, dipakai yang lebih besar.
  const minDays = Math.max(1, Number(settings?.value?.min_delivery_days_online) || 1)
  const minDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + minDays)
    return d.toISOString().split('T')[0]
  })()

  const maxDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })()

  useEffect(() => {
    if (items.length === 0) navigate('/menu')
  }, [])

  useEffect(() => {
    supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => setSettings(data || null))
  }, [])

  useEffect(() => {
    if (profile) {
      setForm(prev => ({
        ...prev,
        name: profile.full_name || '',
        phone: profile.phone || '',
      }))
    }
  }, [profile])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const formatDeliveryLabel = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const handleSubmit = async () => {
    if (!form.name || !form.phone) {
      return warn('Data Belum Lengkap', 'Mohon isi nama dan nomor WhatsApp.')
    }
    if (!deliveryLoc) {
      return warn('Titik Lokasi Belum Dipilih', 'Tentukan titik pengiriman di peta terlebih dahulu.')
    }
    if (!ongkir?.reachable) {
      return warn('Di Luar Jangkauan', `Lokasi terlalu jauh (${formatKm(ongkir?.distanceKm)}). Maksimal ${cfg.maxDistanceKm} km dari toko.`)
    }
    if (!form.detail) {
      return warn('Detail Alamat Kosong', 'Isi detail alamat (patokan, no. rumah, blok) agar kurir mudah menemukan.')
    }
    if (!deliveryDate) {
      return warn('Tanggal Pengiriman Belum Dipilih', 'Harap pilih tanggal kapan pesanan ini ingin dikirim.')
    }
    if (deliveryDate < minDate) {
      return warn('Tanggal Tidak Valid', 'Pesanan tidak bisa dikirim di hari yang sama. Pilih tanggal minimal H+1 (besok).')
    }

    setLoading(true)
    try {
      const cartItems = [...items]
      const fullAddress = `${form.detail}\n${deliveryLoc.address || ''}`.trim()
      const isCod = paymentMethod === 'cod'

      const { data: order, error } = await supabase.from('orders').insert({
        user_id: user?.id || null,
        subtotal: subtotal,
        shipping_cost: shippingFee,
        distance_km: ongkir.distanceKm ? Number(ongkir.distanceKm.toFixed(2)) : null,
        total: grandTotal,
        // COD langsung masuk antrean admin (pending). Online tunggu bayar dulu.
        status: isCod ? 'pending' : 'waiting_payment',
        payment_status: 'unpaid',
        payment_method: isCod ? 'cod' : null,
        source: 'online',
        customer_name: form.name,
        customer_phone: form.phone,
        customer_address: fullAddress,
        delivery_lat: deliveryLoc.lat,
        delivery_lng: deliveryLoc.lng,
        notes: form.notes,
        delivery_date: deliveryDate,
      }).select().single()

      if (error) throw error

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        food_id: item.id,
        quantity: item.qty || 1,
        price: item.price,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      clearCart()

      if (isCod) {
        await Swal.fire({
          icon: 'success',
          title: 'Pesanan COD Dibuat!',
          text: 'Pesananmu langsung diteruskan ke admin. Siapkan uang tunai saat pesanan tiba ya.',
          confirmButtonColor: '#f97316',
          customClass: { popup: 'rounded-2xl' },
        })
        navigate('/dashboard')
      } else {
        navigate('/payment', { state: { order } })
      }
    } catch (err) {
      console.error(err)
      Swal.fire({
        icon: 'error', title: 'Terjadi Kesalahan', text: err.message,
        confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' }
      })
    } finally {
      setLoading(false)
    }
  }

  function warn(title, text) {
    Swal.fire({ icon: 'warning', title, text, confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' } })
  }

  if (items.length === 0) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/cart" className="flex items-center gap-2 text-gray-500 hover:text-orange-500 mb-6 transition">
          <ChevronLeftIcon className="w-4 h-4" />
          <span className="text-sm">Kembali ke Keranjang</span>
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">Checkout</h1>
        <p className="text-gray-400 text-sm mb-6">Tentukan titik antar & lengkapi data pengiriman.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-4">Data Pengiriman</h2>
              <div className="space-y-4">
                {[
                  { name: 'name', label: 'Nama Lengkap *', placeholder: 'Masukkan nama lengkap', type: 'text' },
                  { name: 'phone', label: 'No. WhatsApp *', placeholder: '08xxxxxxxxxx', type: 'tel' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="text-sm font-medium text-gray-700 block mb-1">{f.label}</label>
                    <input name={f.name} type={f.type} value={form[f.name]} onChange={handleChange}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
                  </div>
                ))}

                {/* PETA PILIH TITIK */}
                <LocationPicker
                  value={deliveryLoc}
                  onChange={setDeliveryLoc}
                  origin={origin}
                  subtotal={subtotal}
                  config={cfg}
                />

                {/* Alamat hasil geocode (read-only ringkas) */}
                {deliveryLoc?.address && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500">
                    <span className="font-semibold text-gray-600">Alamat terdeteksi:</span> {deliveryLoc.address}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Detail Alamat *</label>
                  <textarea name="detail" value={form.detail} onChange={handleChange}
                    placeholder="No. rumah, blok, RT/RW, warna pagar, patokan…"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none" />
                </div>

                {/* Tanggal Pengiriman — wajib */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Tanggal Pengiriman *</label>
                  <div className="relative">
                    <CalendarDaysIcon className="w-5 h-5 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      min={minDate}
                      max={maxDate}
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-orange-400 transition"
                    />
                  </div>
                  {deliveryDate ? (
                    <p className="text-xs text-orange-600 mt-1.5 font-medium">
                      📅 Dikirim pada {formatDeliveryLabel(deliveryDate)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Pengiriman paling cepat besok (H+1). Pesanan tidak bisa untuk hari yang sama.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Catatan <span className="text-gray-400 font-normal">(opsional)</span>
                  </label>
                  <textarea name="notes" value={form.notes} onChange={handleChange}
                    placeholder="Contoh: tidak pakai pedas, extra nasi, dll."
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-4">Metode Pembayaran</h2>
              <div className="space-y-3">
                <button type="button" onClick={() => setPaymentMethod('online')}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition flex items-start gap-3 ${
                    paymentMethod === 'online' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
                  }`}>
                  <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    paymentMethod === 'online' ? 'border-orange-500' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'online' && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">Bayar Sekarang (Non-Tunai)</span>
                    <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Transfer Bank, Virtual Account, GoPay, ShopeePay, QRIS, Kartu Kredit, Indomaret & Alfamart. Pesanan diproses setelah pembayaran berhasil.
                    </span>
                  </span>
                </button>

                <button type="button" onClick={() => setPaymentMethod('cod')}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition flex items-start gap-3 ${
                    paymentMethod === 'cod' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
                  }`}>
                  <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    paymentMethod === 'cod' ? 'border-orange-500' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'cod' && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">Bayar di Tempat / COD (Tunai)</span>
                    <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Bayar tunai ke kurir saat pesanan tiba. Pesanan langsung diproses tanpa bayar di muka.
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h2 className="font-bold text-gray-800 mb-4">Ringkasan Pesanan</h2>
              <div className="space-y-3 mb-4">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 overflow-hidden flex-shrink-0">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                      }
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">x{item.qty || 1} {item.unit || 'porsi'}</p>
                      <p className="text-sm font-bold text-orange-500">
                        Rp {(item.price * (item.qty || 1)).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {deliveryDate && (
                <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2.5 mb-3">
                  <CalendarDaysIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <p className="text-xs text-orange-700 font-medium">{formatDeliveryLabel(deliveryDate)}</p>
                </div>
              )}

              {/* Rincian biaya */}
              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>
                    Ongkir {ongkir?.reachable && ongkir.distanceKm != null && `(${formatKm(ongkir.distanceKm)})`}
                  </span>
                  <span>
                    {!deliveryLoc ? '—'
                      : !ongkir?.reachable ? '—'
                      : ongkir.isFree ? 'Gratis'
                      : `Rp ${shippingFee.toLocaleString('id-ID')}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-orange-500">Rp {grandTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
              ) : (
                paymentMethod === 'cod' ? 'Buat Pesanan COD →' : 'Lanjut ke Pembayaran →'
              )}
            </button>

            <div className="flex items-center gap-2 justify-center mt-3">
              <ShieldCheckIcon className="w-4 h-4 text-green-500" />
              <p className="text-xs text-gray-400">Transaksi kamu aman dan dienkripsi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}