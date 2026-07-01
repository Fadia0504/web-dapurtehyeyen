import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import { useAuthStore } from '../../store/authStore'
import Swal from 'sweetalert2'
import {
  ChevronDownIcon, ArrowRightOnRectangleIcon, BuildingStorefrontIcon,
  ClockIcon, TruckIcon, BellIcon, CreditCardIcon, CheckIcon,
  PhotoIcon, GlobeAltIcon, PhoneIcon, MapPinIcon
} from '@heroicons/react/24/outline'

const DAY_LABELS = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu', 'Minggu']

const DEFAULT_SETTINGS = {
  store_name: 'Dapur Teh Yeyen',
  store_phone: '',
  store_address: '',
  store_description: '',
  logo_url: '',
  operational_hours: DAY_LABELS.map(day => ({ day, open: '08:00', close: '20:00', closed: false })),
  min_order_free_ongkir: 100000,
  delivery_fee: 10000,
  delivery_radius_km: 10,
  min_delivery_days_online: 1, // H+berapa minimal tanggal kirim di checkout
  notif_new_order_email: true,
  notif_new_order_sound: true,
  notif_low_stock: false,
  bank_name: '',
  bank_account_number: '',
  bank_account_holder: '',
  tax_percent: 0,
}

export default function AdminSettings() {
  const { profile } = useAuthStore()
  const adminDropRef = useRef()
  const [adminDropdown, setAdminDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState('toko')
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  useEffect(() => { fetchSettings() }, [])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target))
        setAdminDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchSettings() {
    setLoading(true)
    // Tabel app_settings: single row, key/value JSON. Kalau belum ada, pakai default.
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (data) {
      setSettings({ ...DEFAULT_SETTINGS, ...data.value })
      setLogoPreview(data.value?.logo_url || null)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question', title: 'Keluar dari Akun?',
      text: 'Kamu akan keluar dari sesi admin ini.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'Ya, Keluar', cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' },
    })
    if (!result.isConfirmed) return
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const updateField = (field, value) => setSettings(prev => ({ ...prev, [field]: value }))

  const updateHour = (idx, field, value) => {
    setSettings(prev => {
      const hours = [...prev.operational_hours]
      hours[idx] = { ...hours[idx], [field]: value }
      return { ...prev, operational_hours: hours }
    })
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let logoUrl = settings.logo_url
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const fileName = `store-logo-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('food-images').upload(fileName, logoFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('food-images').getPublicUrl(fileName)
        logoUrl = urlData.publicUrl
      }

      const payload = { ...settings, logo_url: logoUrl }

      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 1, value: payload }, { onConflict: 'id' })
      if (error) throw error

      setSettings(payload)
      setLogoFile(null)

      Swal.fire({
        icon: 'success', title: 'Pengaturan Disimpan!',
        confirmButtonColor: '#f97316', timer: 2000, timerProgressBar: true,
        showConfirmButton: false, customClass: { popup: 'rounded-2xl' },
      })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: err.message, confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' } })
    } finally {
      setSaving(false)
    }
  }

  const adminName = profile?.full_name || 'Admin'

  const tabs = [
    { key: 'toko', label: 'Info Toko', icon: BuildingStorefrontIcon },
    { key: 'jam', label: 'Jam Operasional', icon: ClockIcon },
    { key: 'pengiriman', label: 'Pengiriman', icon: TruckIcon },
    { key: 'pembayaran', label: 'Rekening & Pajak', icon: CreditCardIcon },
    { key: 'notifikasi', label: 'Notifikasi', icon: BellIcon },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-56">

        {/* TOPBAR */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Pengaturan</h1>
            <p className="text-xs text-gray-400">Kelola informasi toko, jam operasional, dan preferensi sistem.</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <AdminNotifBell />
            <div className="relative" ref={adminDropRef}>
              <button onClick={() => setAdminDropdown(p => !p)}
                className="flex items-center gap-3 pl-4 border-l border-gray-100 hover:bg-gray-50 px-3 py-2 rounded-xl transition">
                <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-500 text-sm">
                  {adminName[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">{adminName.split(' ')[0]}</p>
                  <p className="text-xs text-gray-400">Administrator</p>
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${adminDropdown ? 'rotate-180' : ''}`} />
              </button>
              {adminDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <button onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-500 transition w-full text-left">
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-8">
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-40 animate-pulse shadow-sm" />)}
            </div>
          ) : (
            <div className="flex gap-6">

              {/* Tab Nav */}
              <div className="w-56 flex-shrink-0">
                <div className="bg-white rounded-2xl shadow-sm p-2 sticky top-24">
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition mb-1 last:mb-0 ${
                        activeTab === t.key ? 'bg-orange-50 text-orange-500' : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      <t.icon className="w-5 h-5 flex-shrink-0" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-6">

                {/* ===== TAB: INFO TOKO ===== */}
                {activeTab === 'toko' && (
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                      <BuildingStorefrontIcon className="w-5 h-5 text-orange-500" /> Informasi Toko
                    </h2>
                    <p className="text-xs text-gray-400 mb-6">Data ini tampil di halaman depan website dan struk kasir.</p>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-20 h-20 rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <PhotoIcon className="w-8 h-8 text-orange-300" />
                        )}
                      </div>
                      <div>
                        <label className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer hover:bg-orange-100 transition">
                          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                          Ganti Logo
                        </label>
                        <p className="text-xs text-gray-400 mt-1.5">PNG atau JPG, disarankan persegi (1:1).</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Nama Toko</label>
                        <div className="relative">
                          <BuildingStorefrontIcon className="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input value={settings.store_name} onChange={e => updateField('store_name', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-400 transition" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Nomor Telepon / WhatsApp</label>
                        <div className="relative">
                          <PhoneIcon className="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input value={settings.store_phone} onChange={e => updateField('store_phone', e.target.value)}
                            placeholder="08xxxxxxxxxx"
                            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-400 transition" />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-700 block mb-1">Alamat Toko</label>
                        <div className="relative">
                          <MapPinIcon className="w-4 h-4 text-gray-300 absolute left-3.5 top-3.5" />
                          <textarea value={settings.store_address} onChange={e => updateField('store_address', e.target.value)}
                            rows={2} placeholder="Alamat lengkap dapur / toko"
                            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-400 transition resize-none" />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-700 block mb-1">Deskripsi Singkat</label>
                        <textarea value={settings.store_description} onChange={e => updateField('store_description', e.target.value)}
                          rows={3} placeholder="Deskripsi yang tampil di halaman About Us"
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition resize-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== TAB: JAM OPERASIONAL ===== */}
                {activeTab === 'jam' && (
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                      <ClockIcon className="w-5 h-5 text-orange-500" /> Jam Operasional
                    </h2>
                    <p className="text-xs text-gray-400 mb-6">Atur jam buka-tutup untuk tiap hari. Hari yang ditutup tidak menerima pesanan baru.</p>

                    <div className="space-y-2">
                      {settings.operational_hours.map((h, idx) => (
                        <div key={h.day} className={`flex items-center gap-4 p-3 rounded-xl ${h.closed ? 'bg-gray-50' : 'bg-orange-50/40'}`}>
                          <p className="w-20 text-sm font-semibold text-gray-700 flex-shrink-0">{h.day}</p>
                          <button onClick={() => updateHour(idx, 'closed', !h.closed)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex-shrink-0 ${
                              h.closed ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'
                            }`}>
                            {h.closed ? 'Tutup' : 'Buka'}
                          </button>
                          {!h.closed && (
                            <div className="flex items-center gap-2 flex-1">
                              <input type="time" value={h.open} onChange={e => updateHour(idx, 'open', e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-orange-400" />
                              <span className="text-gray-400 text-sm">—</span>
                              <input type="time" value={h.close} onChange={e => updateHour(idx, 'close', e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-orange-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== TAB: PENGIRIMAN ===== */}
                {activeTab === 'pengiriman' && (
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                      <TruckIcon className="w-5 h-5 text-orange-500" /> Pengaturan Pengiriman
                    </h2>
                    <p className="text-xs text-gray-400 mb-6">Atur ongkos kirim, radius area, dan aturan jadwal pemesanan online.</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Ongkos Kirim (Rp)</label>
                        <input type="text" inputMode="numeric"
                          value={settings.delivery_fee}
                          onChange={e => updateField('delivery_fee', Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Minimal Order Gratis Ongkir (Rp)</label>
                        <input type="text" inputMode="numeric"
                          value={settings.min_order_free_ongkir}
                          onChange={e => updateField('min_order_free_ongkir', Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Radius Pengiriman (km)</label>
                        <input type="number" value={settings.delivery_radius_km}
                          onChange={e => updateField('delivery_radius_km', Number(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Minimal H+ untuk Tanggal Kirim</label>
                        <select value={settings.min_delivery_days_online}
                          onChange={e => updateField('min_delivery_days_online', Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition">
                          <option value={0}>Hari yang sama (H+0)</option>
                          <option value={1}>Minimal H+1</option>
                          <option value={2}>Minimal H+2</option>
                          <option value={3}>Minimal H+3</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Menentukan tanggal tercepat yang bisa dipilih pelanggan di halaman checkout.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== TAB: PEMBAYARAN ===== */}
                {activeTab === 'pembayaran' && (
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                      <CreditCardIcon className="w-5 h-5 text-orange-500" /> Rekening & Pajak
                    </h2>
                    <p className="text-xs text-gray-400 mb-6">Info rekening untuk transfer manual dan pengaturan pajak/service.</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Nama Bank</label>
                        <input value={settings.bank_name} onChange={e => updateField('bank_name', e.target.value)}
                          placeholder="Contoh: BCA"
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Nomor Rekening</label>
                        <input value={settings.bank_account_number} onChange={e => updateField('bank_account_number', e.target.value)}
                          placeholder="1234567890"
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-700 block mb-1">Atas Nama</label>
                        <input value={settings.bank_account_holder} onChange={e => updateField('bank_account_holder', e.target.value)}
                          placeholder="Nama pemilik rekening"
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition" />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-5">
                      <label className="text-sm font-medium text-gray-700 block mb-1">Pajak / Service Charge (%)</label>
                      <input type="number" min={0} max={100} value={settings.tax_percent}
                        onChange={e => updateField('tax_percent', Number(e.target.value) || 0)}
                        className="w-32 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition" />
                      <p className="text-xs text-gray-400 mt-1">Diterapkan otomatis ke total transaksi kasir dan pesanan online.</p>
                    </div>
                  </div>
                )}

                {/* ===== TAB: NOTIFIKASI ===== */}
                {activeTab === 'notifikasi' && (
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                      <BellIcon className="w-5 h-5 text-orange-500" /> Notifikasi
                    </h2>
                    <p className="text-xs text-gray-400 mb-6">Atur bagaimana admin diberi tahu saat ada aktivitas penting.</p>

                    <div className="space-y-3">
                      {[
                        { key: 'notif_new_order_email', label: 'Email saat pesanan baru masuk', desc: 'Kirim notifikasi email ke admin untuk setiap pesanan online baru.' },
                        { key: 'notif_new_order_sound', label: 'Suara notifikasi di dashboard', desc: 'Mainkan bunyi saat ada pesanan baru masuk ke dashboard admin.' },
                        { key: 'notif_low_stock', label: 'Peringatan menu nonaktif otomatis', desc: 'Beri tahu admin saat suatu menu dinonaktifkan otomatis oleh sistem.' },
                      ].map(opt => (
                        <div key={opt.key} className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                          <div className="pr-4">
                            <p className="font-medium text-gray-800 text-sm">{opt.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                          </div>
                          <button onClick={() => updateField(opt.key, !settings[opt.key])}
                            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${settings[opt.key] ? 'bg-orange-500' : 'bg-gray-200'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${settings[opt.key] ? 'left-6' : 'left-0.5'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button — selalu tampil di bawah tab manapun */}
                <div className="flex justify-end">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50">
                    {saving
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
                      : <><CheckIcon className="w-4 h-4" /> Simpan Pengaturan</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}