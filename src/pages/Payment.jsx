import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Swal from 'sweetalert2'

export default function Payment() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [snapLoaded, setSnapLoaded] = useState(false)
  const [order, setOrder] = useState(location.state?.order)

  useEffect(() => {
    const existingScript = document.getElementById('midtrans-snap')
    if (existingScript) { setSnapLoaded(true); return }

    const script = document.createElement('script')
    script.id = 'midtrans-snap'
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', 'Mid-client-fmlUKyzCs4GLdeqk')
    script.onload = () => setSnapLoaded(true)
    script.onerror = () => console.error('Gagal memuat Snap.js')
    document.head.appendChild(script)
  }, [])

  // Kalau dari dashboard "Lanjut Bayar", ambil order terbaru dari DB
  useEffect(() => {
    if (order?.id && !order.snap_token) {
      // refresh order dari DB untuk cek snap_token terbaru
      supabase.from('orders').select('*').eq('id', order.id).single()
        .then(({ data }) => { if (data) setOrder(data) })
    }
  }, [])

  const handlePay = async () => {
    if (!snapLoaded) {
      Swal.fire({
        icon: 'warning',
        title: 'Mohon Tunggu',
        text: 'Sistem pembayaran sedang dimuat...',
        confirmButtonColor: '#f97316',
        customClass: { popup: 'rounded-2xl' }
      })
      return
    }

    setLoading(true)

    try {
      let snapToken = order.snap_token

      if (!snapToken) {
        // Belum ada token — request ke Midtrans
        const orderId = order.id.replace(/-/g, '').slice(0, 20)
        const amount = Math.round(order.total)

        console.log('Sending to Edge Function:', { orderId, amount })

        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            orderId,
            amount,
            customerName: order.customer_name || profile?.full_name || 'Pelanggan',
            customerEmail: user?.email || 'customer@email.com',
            customerPhone: order.customer_phone || profile?.phone || '08000000000'
          }
        })

        console.log('Edge Function response:', data)

        if (error) throw new Error(error.message)

        if (!data?.token) {
          const errorMsg = data?.error_messages?.[0]
            || data?.message
            || JSON.stringify(data)
            || 'Token pembayaran tidak ditemukan'
          throw new Error(errorMsg)
        }

        snapToken = data.token

        // Simpan snap_token ke DB supaya tidak request ulang
        await supabase.from('orders')
          .update({ snap_token: snapToken })
          .eq('id', order.id)

        setOrder(prev => ({ ...prev, snap_token: snapToken }))
      }

      setLoading(false)

      window.snap.pay(snapToken, {
        onSuccess: async (result) => {
          await supabase.from('orders').update({
            status: 'confirmed',
            payment_status: 'paid',
            payment_method: result.payment_type
          }).eq('id', order.id)

          Swal.fire({
            icon: 'success',
            title: 'Pembayaran Berhasil!',
            text: 'Pesanan kamu sedang diproses oleh admin.',
            confirmButtonColor: '#f97316',
            timer: 2500,
            timerProgressBar: true,
            showConfirmButton: false,
            customClass: { popup: 'rounded-2xl' }
          }).then(() => navigate('/dashboard'))
        },

        onPending: async (result) => {
          await supabase.from('orders').update({
            payment_status: 'pending',
            payment_method: result.payment_type
          }).eq('id', order.id)

          Swal.fire({
            icon: 'info',
            title: 'Menunggu Pembayaran',
            text: 'Selesaikan pembayaran sesuai instruksi yang diberikan.',
            confirmButtonColor: '#f97316',
            customClass: { popup: 'rounded-2xl' }
          }).then(() => navigate('/dashboard'))
        },

        onError: (result) => {
          console.error('Snap error:', result)
          Swal.fire({
            icon: 'error',
            title: 'Pembayaran Gagal',
            text: result.status_message || 'Terjadi kesalahan saat pembayaran.',
            confirmButtonColor: '#f97316',
            customClass: { popup: 'rounded-2xl' }
          })
        },

        onClose: () => {
          Swal.fire({
            icon: 'warning',
            title: 'Pembayaran Ditutup',
            text: 'Kamu menutup halaman sebelum pembayaran selesai.',
            showCancelButton: true,
            confirmButtonColor: '#f97316',
            cancelButtonColor: '#e5e7eb',
            confirmButtonText: 'Bayar Sekarang',
            cancelButtonText: 'Nanti Saja',
            customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' }
          }).then((res) => {
            if (res.isConfirmed) handlePay()
            else navigate('/dashboard')
          })
        }
      })

    } catch (err) {
      console.error('Payment error:', err)
      setLoading(false)
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memproses',
        text: err.message,
        confirmButtonColor: '#f97316',
        customClass: { popup: 'rounded-2xl' }
      })
    }
  }

  if (!order) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-md">

        <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-2">
          Konfirmasi Pembayaran
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Selesaikan pembayaran untuk pesananmu
        </p>

        {/* Detail Pesanan */}
        <div className="bg-orange-50 rounded-2xl p-5 mb-6 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500">ID Pesanan</span>
            <span className="text-sm font-semibold text-gray-800">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500">Nama Pemesan</span>
            <span className="text-sm font-semibold text-gray-800">
              {order.customer_name}
            </span>
          </div>
          <div className="flex justify-between items-start gap-4">
            <span className="text-sm text-gray-500 flex-shrink-0">Alamat</span>
            <span className="text-sm font-semibold text-gray-800 text-right">
              {order.customer_address}
            </span>
          </div>
          {order.notes && (
            <div className="flex justify-between items-start gap-4">
              <span className="text-sm text-gray-500 flex-shrink-0">Catatan</span>
              <span className="text-sm text-gray-600 text-right">{order.notes}</span>
            </div>
          )}
          <div className="border-t border-orange-100 pt-3 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-700">Total Pembayaran</span>
            <span className="text-xl font-black text-orange-500">
              Rp {order.total?.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Info snap token tersedia */}
        {order.snap_token && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <p className="text-xs text-green-600 font-medium">
              Sesi pembayaran tersedia — klik Bayar Sekarang untuk melanjutkan
            </p>
          </div>
        )}

        {/* Info metode pembayaran */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-xs text-blue-600 font-semibold mb-1">Metode Pembayaran Tersedia</p>
          <p className="text-xs text-blue-500 leading-relaxed">
            Transfer Bank, Virtual Account (BCA, BNI, BRI, Mandiri), GoPay, ShopeePay, QRIS, Kartu Kredit, Indomaret, Alfamart
          </p>
        </div>

        {/* Tombol Bayar */}
        <button
          onClick={handlePay}
          disabled={loading || !snapLoaded}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-200">
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Memproses...
            </>
          ) : !snapLoaded ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Memuat sistem pembayaran...
            </>
          ) : (
            'Bayar Sekarang'
          )}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full mt-3 border border-gray-200 text-gray-500 py-3 rounded-2xl font-medium text-sm hover:bg-gray-50 transition">
          Kembali
        </button>

        {/* Debug info — hanya tampil di development */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400 font-mono">
              Order ID: {order.id}<br />
              Amount: Rp {order.total?.toLocaleString('id-ID')}<br />
              Snap loaded: {snapLoaded ? 'Ya' : 'Tidak'}<br />
              Token tersedia: {order.snap_token ? 'Ya (pakai token lama)' : 'Tidak (request baru)'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}