import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LockClosedIcon, UserIcon, PhoneIcon, EyeIcon, EyeSlashIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import AuthShell from './auth/AuthShell'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleRegister = async () => {
    setError('')
    if (!form.full_name || !form.email || !form.password) { setError('Semua field wajib diisi!'); return }
    if (form.password.length < 6) { setError('Password minimal 6 karakter!'); return }
    if (form.password !== form.confirm) { setError('Password tidak cocok!'); return }
    if (!agree) { setError('Harap setujui syarat & ketentuan!'); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, phone: form.phone } }
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    navigate('/')
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <AuthShell imageSide="right">
      <div className="flex justify-between items-center mb-6 md:hidden">
        <Link to="/" className="flex items-center gap-2">
          <img src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
            alt="Logo" className="h-8 w-auto" />
          <span className="font-black text-orange-500 text-lg">Dapur Teh Yeyen</span>
        </Link>
      </div>

      <p className="text-xs font-bold tracking-[0.2em] text-orange-500 mb-2">MULAI DARI SINI</p>
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
        Buat Akun Baru
      </h1>
      <p className="text-gray-400 text-sm mb-6">
        Daftar sekarang dan temukan berbagai makanan favoritmu.
      </p>

      {error && <p className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl mb-4">{error}</p>}

      <div className="space-y-4">
        {[
          { name: 'full_name', label: 'Nama Lengkap', placeholder: 'Masukkan nama lengkap', icon: <UserIcon className="w-5 h-5 text-gray-300" />, type: 'text' },
          { name: 'email', label: 'Email', placeholder: 'Masukkan email', icon: <EnvelopeIcon className="w-5 h-5 text-gray-300" />, type: 'email' },
          { name: 'phone', label: 'Nomor HP', placeholder: 'Contoh: 0812 3456 7890', icon: <PhoneIcon className="w-5 h-5 text-gray-300" />, type: 'tel' },
        ].map(f => (
          <div key={f.name}>
            <label className="text-sm font-medium text-gray-700 block mb-1">{f.label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">{f.icon}</span>
              <input name={f.name} type={f.type} value={form[f.name]} onChange={handleChange}
                placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
            </div>
          </div>
        ))}

        {['password', 'confirm'].map((field, i) => (
          <div key={field}>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {i === 0 ? 'Password' : 'Konfirmasi Password'}
            </label>
            <div className="relative">
              <LockClosedIcon className="w-5 h-5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input name={field} type={showPass ? 'text' : 'password'} value={form[field]} onChange={handleChange}
                placeholder={i === 0 ? 'Buat password (min. 6 karakter)' : 'Ulangi password'}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:border-orange-400 transition" />
              {i === 0 && (
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  {showPass ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        ))}

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 accent-orange-500" />
          <span className="text-sm text-gray-500">
            Saya setuju dengan{' '}
            <span className="text-orange-500 font-medium">Syarat & Ketentuan</span>{' '}
            dan{' '}
            <span className="text-orange-500 font-medium">Kebijakan Privasi</span>
          </span>
        </label>

        <button onClick={handleRegister} disabled={loading}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50">
          {loading ? 'Memproses...' : 'Daftar Sekarang'}
        </button>
      </div>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">atau daftar dengan</span>
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

      <p className="text-center text-sm text-gray-400 mt-6">
        Sudah punya akun?{' '}
        <Link to="/login" className="text-orange-500 font-semibold hover:underline">Login sekarang</Link>
      </p>
      <p className="text-center mt-4 text-xs text-gray-400">
        <Link to="/" className="hover:text-orange-500 transition">← Kembali ke Beranda</Link>
      </p>
    </AuthShell>
  )
}