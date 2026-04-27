import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LockClosedIcon, UserIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleLogin = async () => {
    setError('')
    if (!form.email || !form.password) { setError('Email dan password wajib diisi!'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password
    })
    setLoading(false)
    if (error) { setError('Email atau password salah!'); return }
    navigate('/')
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <div className="min-h-screen bg-orange-50/50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Dekorasi */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-48 opacity-20 pointer-events-none">
        <div className="w-48 h-48 bg-orange-200 rounded-full -translate-x-1/2" />
      </div>
      <div className="absolute right-0 bottom-10 w-32 opacity-20 pointer-events-none">
        <div className="w-32 h-32 bg-orange-300 rounded-full translate-x-1/2" />
      </div>

      <div className="w-full max-w-md">
        {/* Back */}
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
              alt="Logo" className="h-8 w-auto" />
            <span className="font-black text-orange-500 text-lg">Dapur Teh Yeyen</span>
          </Link>
          <Link to="/" className="text-sm text-orange-500 hover:underline flex items-center gap-1">
            ← Kembali ke Beranda
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LockClosedIcon className="w-8 h-8 text-orange-500" />
          </div>

          <h1 className="text-2xl font-black text-gray-900 text-center mb-2" style={{fontFamily:'Playfair Display, serif'}}>
            Selamat Datang Kembali!
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
            Login untuk melanjutkan dan menikmati berbagai pilihan makanan lezat.
          </p>

          {error && <p className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl mb-4">{error}</p>}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email atau Nomor HP</label>
              <div className="relative">
                <UserIcon className="w-5 h-5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input name="email" value={form.email} onChange={handleChange}
                  placeholder="Masukkan email atau nomor HP"
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange}
                  placeholder="Masukkan password"
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:border-orange-400 transition" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  {showPass ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              <div className="text-right mt-1">
                <button className="text-orange-500 text-sm hover:underline">Lupa password?</button>
              </div>
            </div>

            <button onClick={handleLogin} disabled={loading}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50">
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            Belum punya akun?{' '}
            <Link to="/register" className="text-orange-500 font-semibold hover:underline">Daftar sekarang</Link>
          </p>
        </div>
      </div>
    </div>
  )
}