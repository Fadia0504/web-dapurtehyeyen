import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Swal from 'sweetalert2'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline'

export default function Login() {
  const navigate = useNavigate()
  const fetchProfile = useAuthStore(state => state.fetchProfile)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
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
        borderRadius: '16px',
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

        Swal.fire({
          icon: 'error',
          title,
          text,
          confirmButtonColor: '#f97316',
          confirmButtonText: 'Coba Lagi',
          customClass: { popup: 'rounded-2xl' },
        })
        return
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id)

        // admin & staff masuk ke /admin, customer ke /
        const isAdminOrStaff = profile?.role === 'admin' || profile?.role === 'staff'

        await Swal.fire({
          icon: 'success',
          title: `Selamat datang! 👋`,
          text: isAdminOrStaff
            ? `Kamu berhasil masuk sebagai ${profile?.role === 'admin' ? 'Admin' : 'Staff'}.`
            : 'Kamu berhasil masuk. Selamat menikmati!',
          confirmButtonColor: '#f97316',
          confirmButtonText: 'Lanjutkan',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl' },
        })

        navigate(isAdminOrStaff ? '/admin' : '/')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: err.message || 'Silakan coba beberapa saat lagi.',
        confirmButtonColor: '#f97316',
        confirmButtonText: 'OK',
        customClass: { popup: 'rounded-2xl' },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <img
              src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
              alt="Logo" className="h-12 w-auto"
            />
            <span className="font-black text-orange-500 text-2xl">Dapur Teh Yeyen</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Masuk ke Akun</h1>
          <p className="text-gray-400 text-sm mt-1">Masukkan email dan password kamu</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
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

            {/* Password */}
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
                  {showPass
                    ? <EyeSlashIcon className="w-5 h-5" />
                    : <EyeIcon className="w-5 h-5" />
                  }
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-xs text-orange-500 hover:underline font-medium">
                  Lupa password?
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
                : 'Masuk'
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">atau</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-gray-500">
            Belum punya akun?{' '}
            <Link to="/register" className="text-orange-500 font-semibold hover:underline">
              Daftar gratis
            </Link>
          </p>
        </div>

        {/* Back home */}
        <p className="text-center mt-6 text-sm text-gray-400">
          <Link to="/" className="hover:text-orange-500 transition">← Kembali ke Beranda</Link>
        </p>
      </div>
    </div>
  )
}