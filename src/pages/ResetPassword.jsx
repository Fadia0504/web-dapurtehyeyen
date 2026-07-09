import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Swal from 'sweetalert2'
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import AuthShell from './auth/AuthShell'

// Dibuka lewat link di email "Lupa Password". Supabase otomatis membaca token
// dari URL dan membuat sesi sementara, jadi di sini kita cukup panggil updateUser.
export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!password || !confirm) { setError('Semua field wajib diisi!'); return }
    if (password.length < 6) { setError('Password minimal 6 karakter!'); return }
    if (password !== confirm) { setError('Password tidak cocok!'); return }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message || 'Link reset sudah tidak valid, coba minta link baru.')
      return
    }

    await Swal.fire({
      icon: 'success',
      title: 'Password Berhasil Diubah',
      text: 'Silakan login dengan password barumu.',
      confirmButtonColor: '#f97316',
      timer: 2200,
      timerProgressBar: true,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' },
    })
    navigate('/login')
  }

  return (
    <AuthShell imageSide="left">
      <p className="text-xs font-bold tracking-[0.2em] text-orange-500 mb-2">TERAKHIR SATU LANGKAH LAGI</p>
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
        Buat Password Baru
      </h1>
      <p className="text-gray-400 text-sm mt-1 mb-8">Password baru harus berbeda dari yang sebelumnya.</p>

      {error && <p className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Password Baru</label>
          <div className="relative">
            <LockClosedIcon className="w-5 h-5 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full border border-gray-200 rounded-2xl pl-12 pr-12 py-3.5 text-sm outline-none focus:border-orange-400 transition"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
              {showPass ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Konfirmasi Password</label>
          <div className="relative">
            <LockClosedIcon className="w-5 h-5 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Ulangi password baru"
              className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-orange-400 transition"
            />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
            : 'Simpan Password Baru'
          }
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-6">
        <Link to="/login" className="hover:text-orange-500 transition">← Kembali ke Login</Link>
      </p>
    </AuthShell>
  )
}