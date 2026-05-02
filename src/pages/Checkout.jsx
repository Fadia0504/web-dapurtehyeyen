import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { ChevronLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

export default function Checkout() {
  const { items, total, clearCart } = useCartStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })

  // Redirect kalau cart kosong — di dalam useEffect, bukan saat render
  useEffect(() => {
    if (items.length === 0) navigate('/menu')
  }, [])

  // Auto-fill dari profile
  useEffect(() => {
    if (profile) {
      setForm(prev => ({
        ...prev,
        name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
      }))
    }
  }, [profile])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.address) {
      alert('Mohon isi semua field yang wajib!')
      return
    }
    setLoading(true)
    try {
      // Simpan sebelum clearCart
      const cartItems = [...items]
      const cartTotal = total()

      const { data: order, error } = await supabase.from('orders').insert({
        user_id: user?.id || null,
        total: cartTotal,
        status: 'pending',
        customer_name: form.name,
        customer_phone: form.phone,
        customer_address: form.address,
        notes: form.notes,
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

      // Simpan ke sessionStorage sebelum navigate
      const paymentPayload = { order, items: cartItems, total: cartTotal }
      sessionStorage.setItem('paymentData', JSON.stringify(paymentPayload))

      clearCart()
      navigate('/payment')
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/cart" className="flex items-center gap-2 text-gray-500 hover:text-orange-500 mb-6 transition">
          <ChevronLeftIcon className="w-4 h-4" />
          <span className="text-sm">Kembali ke Keranjang</span>
        </Link>

        <h1 className="text-2xl font-black text-gray-900 mb-1" style={{fontFamily:'Playfair Display, serif'}}>
          Checkout
        </h1>
        <p className="text-gray-400 text-sm mb-6">Lengkapi data pengiriman untuk melanjutkan pesananmu.</p>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
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
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Alamat Lengkap *</label>
                  <textarea name="address" value={form.address} onChange={handleChange}
                    placeholder="Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Catatan (opsional)</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange}
                    placeholder="Contoh: tidak pakai pedas, extra nasi, dll."
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none" />
                </div>
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
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-orange-500">Rp {total().toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Memproses...' : 'Lanjut ke Pembayaran →'}
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