import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { formatDateTime } from '../lib/timeUtils'
import {
  HomeIcon, UserIcon, ClipboardDocumentListIcon,
  TruckIcon, HeartIcon, MapPinIcon, CreditCardIcon,
  Cog6ToothIcon, ArrowRightOnRectangleIcon,
  PencilIcon, CameraIcon, CheckIcon, XMarkIcon,
  ShieldCheckIcon, BellIcon, GlobeAltIcon,
  TrashIcon, PhoneIcon, EnvelopeIcon
} from '@heroicons/react/24/outline'

const menuItems = [
  { icon: HomeIcon, label: 'Dashboard', key: 'dashboard' },
  { icon: UserIcon, label: 'Profil Saya', key: 'profile' },
  { icon: ClipboardDocumentListIcon, label: 'Riwayat Pesanan', key: 'history' },
  { icon: TruckIcon, label: 'Pesanan Berjalan', key: 'active', badge: true },
  { icon: HeartIcon, label: 'Wishlist / Favorit', key: 'wishlist' },
  { icon: MapPinIcon, label: 'Alamat Pengiriman', key: 'address' },
  { icon: CreditCardIcon, label: 'Metode Pembayaran', key: 'payment' },
  { icon: Cog6ToothIcon, label: 'Pengaturan Akun', key: 'settings' },
]

export default function Dashboard() {
  const { user, profile, fetchProfile, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState('profile')
  const [orders, setOrders] = useState([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(true)
  const [notifPromo, setNotifPromo] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    birth_date: '',
    gender: '',
    job: '',
  })

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchOrders()
  }, [user])

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        birth_date: profile.birth_date || '',
        gender: profile.gender || '',
        job: profile.job || '',
      })
    }
  }, [profile])

  async function fetchOrders() {
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, foods(name, image))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setOrders(data || [])
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      let avatarUrl = profile?.avatar_url || null

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const fileName = `avatar-${user.id}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('food-images')
          .upload(fileName, avatarFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('food-images').getPublicUrl(fileName)
          avatarUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name,
        phone: form.phone,
        address: form.address,
        birth_date: form.birth_date || null,
        gender: form.gender,
        job: form.job,
        avatar_url: avatarUrl,
      }).eq('id', user.id)

      if (error) throw error
      await fetchProfile(user.id)
      setEditing(false)
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const activeOrders = orders.filter(o => !['done', 'cancelled'].includes(o.status))
  const doneOrders = orders.filter(o => o.status === 'done')
  const name = profile?.full_name || user?.email?.split('@')[0] || 'Pengguna'
  const email = user?.email || ''
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
    : '-'
  const lastLogin = user?.last_sign_in_at
    ? formatDateTime(user.last_sign_in_at)
    : null

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* SIDEBAR */}
      <aside className="w-64 bg-white shadow-sm flex flex-col py-6 px-4 sticky top-0 h-screen">
        <p className="text-xs text-gray-400 font-semibold px-3 mb-3 uppercase tracking-wider">Dashboard</p>

        <div className="space-y-1 flex-1">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActivePage(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activePage === item.key
                  ? 'bg-orange-50 text-orange-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
              {item.badge && activeOrders.length > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {activeOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Butuh Bantuan */}
        <div className="bg-orange-50 rounded-2xl p-4 mb-4 text-center">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <PhoneIcon className="w-5 h-5 text-orange-500" />
          </div>
          <p className="font-semibold text-gray-800 text-sm mb-1">Butuh bantuan?</p>
          <p className="text-gray-400 text-xs mb-3">Hubungi kami jika ada pertanyaan atau kendala.</p>
          <Link to="/contact"
            className="block w-full border border-orange-500 text-orange-500 text-xs font-semibold py-2 rounded-xl hover:bg-orange-500 hover:text-white transition">
            Hubungi CS
          </Link>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-500 rounded-xl transition w-full"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* ===== PROFIL SAYA ===== */}
        {activePage === 'profile' && (
          <div className="max-w-5xl">
            <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              Profil Saya
            </h1>
            <p className="text-gray-400 text-sm mb-6">Kelola informasi profil dan akun Anda.</p>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center">
                    {(avatarPreview || profile?.avatar_url) ? (
                      <img
                        src={avatarPreview || profile?.avatar_url}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-black text-orange-500">{name[0].toUpperCase()}</span>
                    )}
                  </div>
                  {editing && (
                    <label className="absolute bottom-0 right-0 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition shadow">
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      <CameraIcon className="w-4 h-4 text-white" />
                    </label>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-2 mt-1">
                      <PhoneIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{profile.phone}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Member sejak {memberSince}</p>
                </div>
              </div>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 border border-orange-500 text-orange-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-50 transition"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit Profil
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditing(false); setAvatarFile(null); setAvatarPreview(null) }}
                    className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Batal
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                  >
                    <CheckIcon className="w-4 h-4" />
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">

              {/* Informasi Pribadi */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Informasi Pribadi</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Nama Lengkap', key: 'full_name', placeholder: 'Nama lengkap kamu' },
                    { label: 'Nomor HP', key: 'phone', placeholder: '+62 8xx-xxxx-xxxx' },
                    { label: 'Tanggal Lahir', key: 'birth_date', placeholder: '', type: 'date' },
                    { label: 'Pekerjaan', key: 'job', placeholder: 'Pekerjaan kamu' },
                  ].map((field) => (
                    <div key={field.key} className="flex justify-between items-start py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-400 w-32 flex-shrink-0">{field.label}</span>
                      {editing ? (
                        <input
                          type={field.type || 'text'}
                          value={form[field.key]}
                          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-orange-400 transition"
                        />
                      ) : (
                        <span className="text-sm text-gray-800 font-medium text-right flex-1">
                          {form[field.key] || '-'}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Jenis Kelamin */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-400 w-32 flex-shrink-0">Jenis Kelamin</span>
                    {editing ? (
                      <select
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-orange-400 transition"
                      >
                        <option value="">Pilih</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium text-right flex-1">
                        {form.gender || '-'}
                      </span>
                    )}
                  </div>

                  {/* Alamat */}
                  <div className="flex justify-between items-start py-2">
                    <span className="text-sm text-gray-400 w-32 flex-shrink-0">Alamat Utama</span>
                    {editing ? (
                      <textarea
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        placeholder="Alamat lengkap"
                        rows={2}
                        className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-orange-400 transition resize-none"
                      />
                    ) : (
                      <span className="text-sm text-gray-800 font-medium text-right flex-1">
                        {form.address || '-'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Kanan */}
              <div className="space-y-6">

                {/* Keamanan Akun */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Keamanan Akun</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-600">Password</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 tracking-widest">••••••••</span>
                        <button className="text-xs border border-orange-300 text-orange-500 px-3 py-1 rounded-lg hover:bg-orange-50 transition">
                          Ubah Password
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <div>
                        <p className="text-sm text-gray-600">Verifikasi 2 Langkah</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">Tidak aktif</span>
                        <button className="text-xs border border-gray-200 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 transition">
                          Aktifkan
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-600">Login Terakhir</span>
                      <span className="text-sm text-gray-400">
                        {lastLogin ? `${lastLogin.date} • ${lastLogin.time}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Perangkat Aktif</span>
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-lg font-medium">
                        Perangkat ini
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preferensi */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Preferensi Akun</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Notifikasi Email', value: notifEmail, set: setNotifEmail },
                      { label: 'Notifikasi SMS / WhatsApp', value: notifSms, set: setNotifSms },
                      { label: 'Newsletter & Promo', value: notifPromo, set: setNotifPromo },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <button
                          onClick={() => item.set(!item.value)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${item.value ? 'bg-orange-500' : 'bg-gray-200'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${item.value ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm text-gray-600">Bahasa</span>
                      <select className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1 outline-none">
                        <option>Bahasa Indonesia</option>
                        <option>English</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistik */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">Statistik Akun</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: '🛍️', label: 'Total Pesanan', value: orders.length, bg: 'bg-orange-50 text-orange-500' },
                  { icon: '✅', label: 'Pesanan Selesai', value: doneOrders.length, bg: 'bg-green-50 text-green-500' },
                  { icon: '🚚', label: 'Pesanan Berjalan', value: activeOrders.length, bg: 'bg-blue-50 text-blue-500' },
                  { icon: '❤️', label: 'Wishlist', value: 0, bg: 'bg-pink-50 text-pink-500' },
                ].map((stat, i) => (
                  <div key={i} className={`${stat.bg.split(' ')[0]} rounded-2xl p-4 text-center`}>
                    <p className="text-3xl mb-2">{stat.icon}</p>
                    <p className={`text-2xl font-black ${stat.bg.split(' ')[1]}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hapus Akun */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-red-100">
              <h3 className="font-bold text-red-600 mb-1 flex items-center gap-2">
                <TrashIcon className="w-5 h-5" />
                Hapus Akun
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Setelah akun dihapus, semua data Anda akan dihapus secara permanen dan tidak dapat dipulihkan.
              </p>
              <button className="border border-red-400 text-red-500 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 transition">
                Hapus Akun Saya
              </button>
            </div>
          </div>
        )}

        {/* ===== RIWAYAT PESANAN ===== */}
        {activePage === 'history' && (
          <div className="max-w-4xl">
            <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              Riwayat Pesanan
            </h1>
            <p className="text-gray-400 text-sm mb-6">Semua pesanan yang pernah kamu buat.</p>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-semibold text-gray-700 mb-1">Belum ada pesanan</p>
                <p className="text-sm text-gray-400 mb-6">Yuk pesan makanan favoritmu!</p>
                <Link to="/menu" className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition">
                  Lihat Menu
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const { date, time } = formatDateTime(order.created_at)
                  const statusMap = {
                    pending: { label: 'Menunggu Konfirmasi', color: 'bg-yellow-100 text-yellow-700' },
                    confirmed: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-700' },
                    processing: { label: 'Diproses', color: 'bg-orange-100 text-orange-600' },
                    delivered: { label: 'Dikirim', color: 'bg-purple-100 text-purple-600' },
                    done: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
                    cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-600' },
                  }
                  const status = statusMap[order.status] || statusMap.pending
                  return (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-gray-800">#{order.id.slice(0,8).toUpperCase()}</p>
                          <p className="text-xs text-gray-400">{date} • {time}</p>
                        </div>
                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4">
                        {order.order_items?.map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl overflow-hidden flex-shrink-0">
                              {item.foods?.image ? (
                                <img src={item.foods.image} alt={item.foods?.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{item.foods?.name || 'Menu'}</p>
                              <p className="text-xs text-gray-400">x{item.quantity}</p>
                            </div>
                            <p className="text-sm font-bold text-gray-800">
                              Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                        <span className="text-sm text-gray-500">Total</span>
                        <span className="font-black text-orange-500 text-lg">
                          Rp {order.total?.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== PESANAN BERJALAN ===== */}
        {activePage === 'active' && (
          <div className="max-w-4xl">
            <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              Pesanan Berjalan
            </h1>
            <p className="text-gray-400 text-sm mb-6">Pesanan yang sedang dalam proses.</p>

            {activeOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <p className="text-5xl mb-4">🚚</p>
                <p className="font-semibold text-gray-700 mb-1">Tidak ada pesanan aktif</p>
                <p className="text-sm text-gray-400">Semua pesananmu sudah selesai.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map((order) => {
                  const { date, time } = formatDateTime(order.created_at)
                  const steps = ['pending', 'confirmed', 'processing', 'delivered']
                  const stepLabels = ['Order Dibuat', 'Dikonfirmasi', 'Diproses', 'Dikirim']
                  const currentStep = steps.indexOf(order.status)
                  return (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-gray-800">#{order.id.slice(0,8).toUpperCase()}</p>
                          <p className="text-xs text-gray-400">{date} • {time}</p>
                        </div>
                        <span className="text-orange-500 font-bold text-sm">
                          Rp {order.total?.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-0 mb-4">
                        {steps.map((step, i) => (
                          <div key={i} className="flex items-center flex-1">
                            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                              i <= currentStep ? 'bg-orange-500' : 'bg-gray-200'
                            }`}>
                              {i < currentStep && <CheckIcon className="w-3 h-3 text-white" />}
                              {i === currentStep && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            {i < steps.length - 1 && (
                              <div className={`flex-1 h-1 ${i < currentStep ? 'bg-orange-500' : 'bg-gray-200'}`} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mb-4">
                        {stepLabels.map((label, i) => (
                          <span key={i} className={`text-xs ${i <= currentStep ? 'text-orange-500 font-medium' : 'text-gray-300'}`}>
                            {label}
                          </span>
                        ))}
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500">
                        📍 {order.customer_address || '-'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== DASHBOARD ===== */}
        {activePage === 'dashboard' && (
          <div className="max-w-4xl">
            <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              Halo, {name.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-400 text-sm mb-6">Selamat datang kembali di Dapur Teh Yeyen.</p>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { icon: '🛍️', label: 'Total Pesanan', value: orders.length, bg: 'bg-orange-50', color: 'text-orange-500' },
                { icon: '✅', label: 'Selesai', value: doneOrders.length, bg: 'bg-green-50', color: 'text-green-500' },
                { icon: '🚚', label: 'Berjalan', value: activeOrders.length, bg: 'bg-blue-50', color: 'text-blue-500' },
                { icon: '❤️', label: 'Wishlist', value: 0, bg: 'bg-pink-50', color: 'text-pink-500' },
              ].map((stat, i) => (
                <div key={i} className={`${stat.bg} rounded-2xl p-5 text-center`}>
                  <p className="text-3xl mb-2">{stat.icon}</p>
                  <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {activeOrders.length > 0 && (
              <div className="bg-orange-50 rounded-2xl p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <TruckIcon className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Kamu punya {activeOrders.length} pesanan aktif</p>
                    <p className="text-xs text-gray-400">Pesanan sedang diproses oleh dapur.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActivePage('active')}
                  className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition"
                >
                  Lacak Pesanan
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-900">Pesanan Terbaru</h2>
                <button onClick={() => setActivePage('history')} className="text-orange-500 text-sm hover:underline">
                  Lihat Semua
                </button>
              </div>
              {orders.slice(0, 3).map((order) => {
                const { date } = formatDateTime(order.created_at)
                return (
                  <div key={order.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🍽️</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">#{order.id.slice(0,8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">{date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-500">Rp {order.total?.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                )
              })}
              {orders.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">Belum ada pesanan</p>
              )}
            </div>
          </div>
        )}

        {/* Halaman lain — coming soon */}
        {['wishlist', 'address', 'payment', 'settings'].includes(activePage) && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
              <p className="text-5xl mb-4">🚧</p>
              <p className="font-bold text-gray-700 text-lg mb-2">Segera Hadir</p>
              <p className="text-gray-400 text-sm">Fitur ini sedang dalam pengembangan.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}