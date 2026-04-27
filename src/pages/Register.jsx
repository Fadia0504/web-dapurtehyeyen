import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LockClosedIcon, UserIcon, PhoneIcon, EyeIcon, EyeSlashIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

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
    <div className="min-h-screen bg-orange-50/50 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute right-0 top-10 w-48 opacity-20 pointer-events-none">
        <div className="w-48 h-48 bg-orange-200 rounded-full translate-x-1/2" />
      </div>
      <div className="absolute left-0 bottom-10 w-32 opacity-20 pointer-events-none">
        <div className="w-32 h-32 bg-orange-300 rounded-full -translate-x-1/2" />
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
              alt="Logo" className="h-8 w-auto" />
            <span className="font-black text-orange-500 text-lg">Dapur Teh Yeyen</span>
          </Link>
          <Link to="/" className="text-sm text-orange-500 hover:underline">← Kembali ke Beranda</Link>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon className="w-8 h-8 text-orange-500" />
          </div>

          <h1 className="text-2xl font-black text-gray-900 text-center mb-2" style={{fontFamily:'Playfair Display, serif'}}>
            Buat Akun Baru
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
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

          <p className="text-center text-sm text-gray-400 mt-6">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-orange-500 font-semibold hover:underline">Login sekarang</Link>
          </p>
        </div>
      </div>
    </div>
  )
}