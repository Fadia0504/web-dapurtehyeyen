import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Swal from 'sweetalert2'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import AuthShell from './auth/AuthShell'

export default function Login() {
  const navigate = useNavigate()
  const fetchProfile = useAuthStore(state => state.fetchProfile)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      Swal.fire({
        icon: 'warning',
        title: 'Form Tidak Lengkap',
        text: 'Harap isi email dan password terlebih dahulu.',
        confirmButtonColor: '#f97316',
        confirmButtonText: 'OK',
      })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        let title = 'Login Gagal'
        let text = 'Terjadi kesalahan. Silakan coba lagi.'
        if (error.message.includes('Invalid login credentials')) {
          title = 'Email atau Password Salah'
          text = 'Pastikan email dan password yang kamu masukkan sudah benar.'
        } else if (error.message.includes('Email not confirmed')) {
          title = 'Email Belum Dikonfirmasi'
          text = 'Silakan cek email kamu dan klik link konfirmasi terlebih dahulu.'
        } else if (error.message.includes('Too many requests')) {
          title = 'Terlalu Banyak Percobaan'
          text = 'Akun sementara dikunci. Coba lagi beberapa menit kemudian.'
        }
        Swal.fire({ icon: 'error', title, text, confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' } })
        return
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id)
        const role = profile?.role

        await Swal.fire({
          icon: 'success',
          title: 'Selamat datang! 👋',
          text: role === 'admin'
            ? 'Kamu berhasil masuk sebagai Admin.'
            : role === 'staff'
            ? 'Kamu berhasil masuk sebagai Staff.'
            : 'Kamu berhasil masuk. Selamat menikmati!',
          confirmButtonColor: '#f97316',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl' },
        })

        if (role === 'admin') navigate('/admin')
        else if (role === 'staff') navigate('/admin/kasir')
        else navigate('/')
      }
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

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <AuthShell imageSide="left">
      <Link to="/" className="inline-flex items-center gap-2 mb-8 self-start md:hidden">
        <img
          src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
          alt="Logo" className="h-8 w-auto"
        />
        <span className="font-black text-orange-500 text-lg">Dapur Teh Yeyen</span>
      </Link>

      <p className="text-xs font-bold tracking-[0.2em] text-orange-500 mb-2">SELAMAT DATANG KEMBALI</p>
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
        Masuk ke Akun
      </h1>
      <p className="text-gray-400 text-sm mt-1 mb-8">Masukkan email dan password kamu.</p>

      <form onSubmit={handleLogin} className="space-y-4">
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

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Password</label>
          <div className="relative">
            <LockClosedIcon className="w-5 h-5 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="w-full border border-gray-200 rounded-2xl pl-12 pr-12 py-3.5 text-sm outline-none focus:border-orange-400 transition"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
              {showPass ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              className="accent-orange-500 w-4 h-4" />
            <span className="text-xs text-gray-500">Ingat saya</span>
          </label>
          <Link to="/forgot-password" className="text-xs text-orange-500 hover:underline font-medium">
            Lupa password?
          </Link>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
            : 'Masuk'
          }
        </button>
      </form>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">atau masuk dengan</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <button type="button" onClick={handleGoogle}
        className="w-full border border-gray-200 rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
        Google
      </button>

      <p className="text-center text-sm text-gray-500 mt-6">
        Belum punya akun?{' '}
        <Link to="/register" className="text-orange-500 font-semibold hover:underline">Daftar gratis</Link>
      </p>
      <p className="text-center mt-4 text-xs text-gray-400">
        <Link to="/" className="hover:text-orange-500 transition">← Kembali ke Beranda</Link>
      </p>
    </AuthShell>
  )
}