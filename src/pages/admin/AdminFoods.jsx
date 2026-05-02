import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/admin/AdminSidebar'
import {
  MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon,
  XMarkIcon, CloudArrowUpIcon, BellIcon, ChevronDownIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { useRef } from 'react'

export default function AdminFoods() {
  const { profile } = useAuthStore()
  const adminDropRef = useRef()
  const [adminDropdown, setAdminDropdown] = useState(false)
  const [foods, setFoods] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showPanel, setShowPanel] = useState(false)
  const [editFood, setEditFood] = useState(null)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [page, setPage] = useState(1)
  const perPage = 7

  const [form, setForm] = useState({
    name: '', category_id: '', description: '',
    price: '', is_available: true, unit: 'porsi', min_order: 1
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target)) {
        setAdminDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchData() {
    const [{ data: foodData }, { data: catData }] = await Promise.all([
      supabase.from('foods').select('*, categories(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*')
    ])
    setFoods(foodData || [])
    setCategories(catData || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const openAdd = () => {
    setEditFood(null)
    setForm({ name: '', category_id: '', description: '', price: '', is_available: true, unit: 'porsi', min_order: 1 })
    setImageFile(null)
    setImagePreview(null)
    setShowPanel(true)
  }

  const openEdit = (food) => {
    setEditFood(food)
    setForm({
      name: food.name,
      category_id: food.category_id,
      description: food.description || '',
      price: food.price,
      is_available: food.is_available,
      unit: food.unit || 'porsi',
      min_order: food.min_order || 1,
    })
    setImagePreview(food.image || null)
    setImageFile(null)
    setShowPanel(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!form.name || !form.category_id || !form.price) {
      alert('Nama, kategori, dan harga wajib diisi!')
      return
    }
    setSaving(true)
    try {
      let imageUrl = editFood?.image || null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('food-images')
          .upload(fileName, imageFile, { upsert: true })
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('food-images')
          .getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }

      const payload = {
        name: form.name,
        category_id: form.category_id,
        description: form.description,
        price: Number(form.price),
        is_available: form.is_available,
        unit: form.unit,
        min_order: Number(form.min_order),
        image: imageUrl,
      }

      if (editFood) {
        const { error } = await supabase.from('foods').update(payload).eq('id', editFood.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('foods').insert(payload)
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

  const handleDelete = async (food) => {
    if (!confirm(`Hapus "${food.name}"?`)) return
    await supabase.from('foods').delete().eq('id', food.id)
    await fetchData()
  }

  const handleToggleStatus = async (food) => {
    await supabase.from('foods').update({ is_available: !food.is_available }).eq('id', food.id)
    await fetchData()
  }

  const filtered = foods.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCategory || f.category_id === filterCategory
    const matchStatus = filterStatus === '' ? true : filterStatus === 'aktif' ? f.is_available : !f.is_available
    return matchSearch && matchCat && matchStatus
  })

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
                placeholder="Cari menu..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 transition" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button className="relative text-gray-500 hover:text-orange-500">
              <BellIcon className="w-6 h-6" />
            </button>
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
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900" style={{fontFamily:'Playfair Display, serif'}}>Kelola Menu</h1>
            <p className="text-gray-400 text-sm mt-1">Kelola semua menu makanan yang tersedia.</p>
          </div>

          {/* Filter Bar */}
          <div className="flex gap-3 mb-6 items-center">
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Cari menu..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 shadow-sm" />
            </div>
            <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1) }}
              className="border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none shadow-sm">
              <option value="">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
              className="border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none shadow-sm">
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
            <button onClick={openAdd}
              className="ml-auto flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition shadow-sm shadow-orange-200">
              <PlusIcon className="w-4 h-4" />
              Tambah Menu
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400">Menu</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Kategori</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Harga</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Status</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      <p className="text-3xl mb-2">🍽️</p>
                      <p>Tidak ada menu ditemukan</p>
                    </td>
                  </tr>
                ) : paginated.map(food => (
                  <tr key={food.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-orange-50 flex-shrink-0">
                          {food.image ? (
                            <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{food.name}</p>
                          <p className="text-gray-400 text-xs line-clamp-1">{food.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        food.categories?.name === 'Paket Catering' ? 'bg-purple-100 text-purple-600' :
                        food.categories?.name === 'Ala Carte' ? 'bg-blue-100 text-blue-600' :
                        food.categories?.name === 'Minuman' ? 'bg-cyan-100 text-cyan-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        {food.categories?.name}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-800 text-sm">Rp {food.price?.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-gray-400">/{food.unit || 'porsi'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => handleToggleStatus(food)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${food.is_available
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {food.is_available ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(food)}
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(food)}
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                <p className="text-sm text-gray-400">
                  Menampilkan {(page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} dari {filtered.length} menu
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-40 transition">
                    ‹
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${page === i + 1
                        ? 'bg-orange-500 text-white'
                        : 'border border-gray-200 hover:bg-gray-50'}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-40 transition">
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* PANEL TAMBAH/EDIT */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowPanel(false)} />
          <div className="w-96 bg-white h-full overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">{editFood ? 'Edit Menu' : 'Tambah Menu'}</h2>
              <button onClick={() => setShowPanel(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Informasi Dasar</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Nama Menu *</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="Contoh: Ayam Goreng Lengkuas"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Kategori *</label>
                    <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition">
                      <option value="">Pilih kategori</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Deskripsi</label>
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                      placeholder="Deskripsi singkat tentang menu"
                      maxLength={200} rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none" />
                    <p className="text-right text-xs text-gray-400 mt-1">{form.description.length}/200</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Harga</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Harga Jual *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                      <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                        placeholder="0"
                        className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Satuan</label>
                      <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-orange-400 transition">
                        <option value="porsi">porsi</option>
                        <option value="pax">pax</option>
                        <option value="pcs">pcs</option>
                        <option value="box">box</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Min. Order</label>
                      <input type="number" value={form.min_order} onChange={e => setForm({...form, min_order: e.target.value})}
                        min={1}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Gambar Menu</h3>
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  {imagePreview ? (
                    <div className="relative rounded-2xl overflow-hidden aspect-video">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                        <p className="text-white text-sm font-medium">Klik untuk ganti gambar</p>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-orange-300 transition">
                      <CloudArrowUpIcon className="w-10 h-10 text-orange-400 mb-2" />
                      <p className="font-medium text-gray-700 text-sm">Upload gambar</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG atau WEBP (Maks. 2MB)</p>
                    </div>
                  )}
                </label>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Status</h3>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Aktif</p>
                    <p className="text-xs text-gray-400">Menu akan ditampilkan ke pelanggan</p>
                  </div>
                  <button onClick={() => setForm({...form, is_available: !form.is_available})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${form.is_available ? 'bg-orange-500' : 'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${form.is_available ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPanel(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}