import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import { useAuthStore } from '../../store/authStore'
import {
  MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon,
  XMarkIcon, ChevronDownIcon, ArrowRightOnRectangleIcon,
  ChevronLeftIcon, ChevronRightIcon, EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'

const ICONS = ['🍱', '🍳', '🥤', '🍪', '📦', '➕', '🍚', '🍰', '🎁', '🥗', '🍜', '🥘']

const generateSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function AdminCategories() {
  const { profile } = useAuthStore()
  const adminDropRef = useRef()
  const [adminDropdown, setAdminDropdown] = useState(false)
  const [categories, setCategories] = useState([])
  const [foodCounts, setFoodCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showPanel, setShowPanel] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [saving, setSaving] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const perPage = 8

  const [form, setForm] = useState({
    name: '', description: '', slug: '', icon: '🍱', is_active: true
  })

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target))
        setAdminDropdown(false)
      setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: catData }, { data: foodData }] = await Promise.all([
      supabase.from('categories').select('*').order('created_at'),
      supabase.from('foods').select('category_id'),
    ])
    setCategories(catData || [])

    const counts = {}
    foodData?.forEach(f => {
      counts[f.category_id] = (counts[f.category_id] || 0) + 1
    })
    setFoodCounts(counts)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const openAdd = () => {
    setEditCat(null)
    setForm({ name: '', description: '', slug: '', icon: '🍱', is_active: true })
    setShowPanel(true)
  }

  const openEdit = (cat) => {
    setEditCat(cat)
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      slug: cat.slug || '',
      icon: cat.icon || '🍱',
      is_active: cat.is_active !== false,
    })
    setShowPanel(true)
    setOpenMenuId(null)
  }

  const handleNameChange = (val) => {
    setForm(prev => ({
      ...prev,
      name: val,
      slug: editCat ? prev.slug : generateSlug(val)
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Nama kategori wajib diisi!'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        slug: form.slug || generateSlug(form.name),
        icon: form.icon,
        is_active: form.is_active,
      }
      if (editCat) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editCat.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('categories').insert(payload)
        if (error) throw error
      }
      await fetchData()
      setShowPanel(false)
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat) => {
    const count = foodCounts[cat.id] || 0
    if (count > 0) {
      alert(`Kategori "${cat.name}" memiliki ${count} menu. Pindahkan atau hapus menu terlebih dahulu.`)
      return
    }
    if (!confirm(`Hapus kategori "${cat.name}"?`)) return
    await supabase.from('categories').delete().eq('id', cat.id)
    await fetchData()
    setOpenMenuId(null)
  }

  const handleToggleStatus = async (cat) => {
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    await fetchData()
    setOpenMenuId(null)
  }

  const filtered = categories.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.slug?.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const adminName = profile?.full_name || 'Admin'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-56">

        {/* TOPBAR */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4 sticky top-0 z-10">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Cari kategori..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 transition" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <AdminNotifBell />
            <div className="relative" ref={adminDropRef}>
              <button onClick={() => setAdminDropdown(prev => !prev)}
                className="flex items-center gap-3 pl-4 border-l border-gray-100 hover:bg-gray-50 px-3 py-2 rounded-xl transition">
                <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-500 text-sm">
                  {adminName[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">{adminName.split(' ')[0]}</p>
                  <p className="text-xs text-gray-400">Super Administrator</p>
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
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Kategori
              </h1>
              <p className="text-gray-400 text-sm mt-1">Kelola semua kategori menu makanan dan minuman.</p>
            </div>
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition shadow-sm shadow-orange-200">
              <PlusIcon className="w-4 h-4" />
              Tambah Kategori
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mb-6 max-w-sm">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Cari kategori..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 shadow-sm" />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 w-12">No</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Nama Kategori</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Slug</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Jumlah Menu</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Status</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14 text-gray-400">
                      <p className="text-3xl mb-2">📂</p>
                      <p className="font-medium">Tidak ada kategori ditemukan</p>
                    </td>
                  </tr>
                ) : paginated.map((cat, idx) => (
                  <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400 font-medium">
                      {(page - 1) * perPage + idx + 1}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                          {cat.icon || '📂'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{cat.name}</p>
                          {cat.description && (
                            <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{cat.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded-lg">
                        {cat.slug || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-gray-700">
                        {foodCounts[cat.id] || 0}
                        <span className="text-gray-400 font-normal ml-1">Menu</span>
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => handleToggleStatus(cat)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                          cat.is_active !== false
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {cat.is_active !== false ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 relative">
                        <button onClick={() => openEdit(cat)}
                          title="Edit"
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cat)}
                          title="Hapus"
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                        <div className="relative">
                          <button onClick={() => setOpenMenuId(openMenuId === cat.id ? null : cat.id)}
                            className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition">
                            <EllipsisHorizontalIcon className="w-4 h-4 text-gray-500" />
                          </button>
                          {openMenuId === cat.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
                              <button onClick={() => openEdit(cat)}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition w-full text-left">
                                <PencilIcon className="w-4 h-4" />
                                Edit Kategori
                              </button>
                              <button onClick={() => handleToggleStatus(cat)}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-500 transition w-full text-left">
                                {cat.is_active !== false ? (
                                  <><span className="w-4 h-4 flex items-center justify-center text-xs">○</span>Nonaktifkan</>
                                ) : (
                                  <><span className="w-4 h-4 flex items-center justify-center text-xs">●</span>Aktifkan</>
                                )}
                              </button>
                              <button onClick={() => handleDelete(cat)}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition w-full text-left">
                                <TrashIcon className="w-4 h-4" />
                                Hapus Kategori
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
              <p className="text-sm text-gray-400">
                Menampilkan {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} dari {filtered.length} kategori
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                {[...Array(Math.max(totalPages, 1))].map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                      page === i + 1 ? 'bg-orange-500 text-white' : 'border border-gray-200 hover:bg-gray-50'
                    }`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ===== PANEL TAMBAH/EDIT KATEGORI ===== */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowPanel(false)} />
          <div className="w-96 bg-white h-full overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">{editCat ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editCat ? 'Perbarui informasi kategori' : 'Buat kategori menu baru'}
                </p>
              </div>
              <button onClick={() => setShowPanel(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Pilih Ikon */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-3">Ikon Kategori</label>
                <div className="grid grid-cols-6 gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setForm({ ...form, icon })}
                      className={`w-full aspect-square rounded-xl text-2xl flex items-center justify-center border-2 transition hover:scale-110 ${
                        form.icon === icon
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-100 hover:border-orange-200'
                      }`}>
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3 bg-orange-50 rounded-xl p-3">
                  <span className="text-3xl">{form.icon}</span>
                  <div>
                    <p className="text-xs text-gray-500">Ikon terpilih</p>
                    <p className="text-sm font-semibold text-gray-700">{form.name || 'Nama kategori'}</p>
                  </div>
                </div>
              </div>

              {/* Nama */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Nama Kategori *
                </label>
                <input value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Contoh: Paket Catering"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Deskripsi</label>
                <textarea value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi singkat kategori ini"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none" />
              </div>

              {/* Slug */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Slug
                  <span className="text-gray-400 font-normal ml-1">(otomatis dari nama)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono">/</span>
                  <input value={form.slug}
                    onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    placeholder="paket-catering"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm font-mono outline-none focus:border-orange-400 transition" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-3">Status</label>
                <div className="flex gap-3">
                  <button onClick={() => setForm({ ...form, is_active: true })}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition ${
                      form.is_active
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-green-300'
                    }`}>
                    ✓ Aktif
                  </button>
                  <button onClick={() => setForm({ ...form, is_active: false })}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition ${
                      !form.is_active
                        ? 'border-gray-400 bg-gray-100 text-gray-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-400'
                    }`}>
                    ○ Nonaktif
                  </button>
                </div>
              </div>

              {/* Info jumlah menu jika edit */}
              {editCat && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">{foodCounts[editCat.id] || 0} menu</span> dalam kategori ini.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPanel(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
                  ) : (
                    editCat ? 'Simpan Perubahan' : 'Tambah Kategori'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}