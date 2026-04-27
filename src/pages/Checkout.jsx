import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../store/cartStore'

export default function Checkout() {
  const { items, total, clearCart } = useCartStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', address: '', notes: ''
  })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.address) {
      alert('Mohon isi semua field yang wajib!')
      return
    }
    setLoading(true)
    try {
      // Simpan order ke Supabase
      const { data: order, error } = await supabase.from('orders').insert({
        total: total(),
        status: 'pending',
        customer_name: form.name,
        customer_phone: form.phone,
        customer_address: form.address,
        notes: form.notes,
      }).select().single()

      if (error) throw error

      // Simpan order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        food_id: item.id,
        quantity: item.qty,
        price: item.price,
      }))
      await supabase.from('order_items').insert(orderItems)

      clearCart()
      navigate('/success')
    } catch (err) {
      alert('Terjadi kesalahan, coba lagi!')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    navigate('/menu')
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-gray-800 mb-8" style={{fontFamily:'Playfair Display, serif'}}>
        <span className="text-orange-500">Checkout</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-700 text-lg">Data Pengiriman</h3>
          {[
            { name: 'name', label: 'Nama Lengkap *', type: 'text', placeholder: 'Masukkan nama kamu' },
            { name: 'phone', label: 'No. WhatsApp *', type: 'tel', placeholder: '08xxxxxxxxxx' },
          ].map(f => (
            <div key={f.name}>
              <label className="text-sm text-gray-600 font-medium block mb-1">{f.label}</label>
              <input
                type={f.type}
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-orange-400 transition"
              />
            </div>
          ))}
          <div>
            <label className="text-sm text-gray-600 font-medium block mb-1">Alamat Lengkap *</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-orange-400 transition resize-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 font-medium block mb-1">Catatan (opsional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Contoh: tidak pakai pedas, extra nasi, dll."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-orange-400 transition resize-none"
            />
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <h3 className="font-bold text-gray-700 text-lg mb-4">Ringkasan Pesanan</h3>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3 mb-4">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name} <span className="text-gray-400">x{item.qty}</span></span>
                <span className="font-medium text-gray-800">Rp {(item.price * item.qty).toLocaleString('id-ID')}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-orange-500">Rp {total().toLocaleString('id-ID')}</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-4 rounded-full font-bold text-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Memproses...' : '✓ Buat Pesanan'}
          </button>
        </div>
      </div>
    </div>
  )
}