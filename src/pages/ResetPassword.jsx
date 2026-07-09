import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Swal from 'sweetalert2'
import { EnvelopeIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import AuthShell from './auth/AuthShell'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      Swal.fire({
        icon: 'warning',
        title: 'Email Kosong',
        text: 'Masukkan email akun kamu terlebih dahulu.',
        confirmButtonColor: '#f97316',
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Mengirim Email',
          text: error.message || 'Terjadi kesalahan. Silakan coba lagi.',
          confirmButtonColor: '#f97316',
          customClass: { popup: 'rounded-2xl' },
        })
        return
      }
      setSent(true)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: err.message || 'Silakan coba beberapa saat lagi.',
        confirmButtonColor: '#f97316',
        customClass: { popup: 'rounded-2xl' },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell imageSide="left" edgeLabel="RESET">
      <Link to="/" className="inline-flex items-center gap-2 mb-8 self-start md:hidden">
        <img
          src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
          alt="Logo" className="h-8 w-auto"
        />
        <span className="font-black text-orange-500 text-lg">Dapur Teh Yeyen</span>
      </Link>

      {sent ? (
        <div className="py-4">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Cek Email Kamu
          </h1>
          <p className="text-gray-500 text-sm mb-1">
            Link untuk atur ulang password sudah dikirim ke:
          </p>
          <p className="text-gray-800 font-semibold text-sm mb-6">{email}</p>
          <p className="text-gray-400 text-xs mb-8">
            Tidak menerima email? Cek folder spam, atau kirim ulang di bawah ini.
          </p>
          <button onClick={() => setSent(false)}
            className="w-full border border-gray-200 text-gray-600 py-3.5 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition">
            Kirim Ulang
          </button>
          <Link to="/login" className="flex items-center justify-center gap-1.5 mt-6 text-sm text-orange-500 font-semibold hover:underline">
            <ArrowLeftIcon className="w-4 h-4" /> Kembali ke Login
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs font-bold tracking-[0.2em] text-orange-500 mb-2">ATUR ULANG PASSWORD</p>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            Lupa Password?
          </h1>
          <p className="text-gray-400 text-sm mt-1 mb-8">
            Masukkan email akun kamu. Kami akan kirim link untuk atur ulang password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Email</label>
              <div className="relative">
                <EnvelopeIcon className="w-5 h-5 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-orange-400 transition"
                />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengirim...</>
                : 'Kirim Link Reset'
              }
            </button>
          </form>

          <Link to="/login" className="flex items-center justify-center gap-1.5 mt-6 text-sm text-gray-500 hover:text-orange-500 transition">
            <ArrowLeftIcon className="w-4 h-4" /> Kembali ke Login
          </Link>
        </>
      )}
    </AuthShell>
  )
}