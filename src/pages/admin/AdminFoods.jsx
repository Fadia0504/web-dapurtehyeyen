import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import {
  MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon,
  XMarkIcon, CloudArrowUpIcon, ChevronDownIcon,
  ArrowRightOnRectangleIcon, Cog6ToothIcon, CheckIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'

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
  const [showOptionsPanel, setShowOptionsPanel] = useState(false)
  const [editFood, setEditFood] = useState(null)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [page, setPage] = useState(1)
  const perPage = 7

  const [optionGroups, setOptionGroups] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [savingOptions, setSavingOptions] = useState(false)
  const [templateLoaded, setTemplateLoaded] = useState(false)

  const [form, setForm] = useState({
    name: '', category_id: '', description: '',
    price: '', is_available: true, unit: 'porsi', min_order: 1,
  })

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target))
        setAdminDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchData() {
    const [{ data: foodData }, { data: catData }] = await Promise.all([
      supabase.from('foods').select('*, categories(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*'),
    ])
    setFoods(foodData || [])
    setCategories(catData || [])
    setLoading(false)
  }

  // Auto-load template options berdasarkan kategori yang sama
  async function loadTemplateOptions(food) {
    const cat = categories.find(c => c.id === food.category_id)
    if (!cat) return []

    // Cari food lain di kategori yang sama yang sudah punya options
    const { data: otherFoods } = await supabase
      .from('foods')
      .select('id')
      .eq('category_id', food.category_id)
      .neq('id', food.id)

    if (!otherFoods || otherFoods.length === 0) return []

    for (const other of otherFoods) {
      const { data: opts } = await supabase
        .from('food_options')
        .select('*, food_option_items(*)')
        .eq('food_id', other.id)

      if (opts && opts.length > 0) {
        return opts.map(g => ({
          ...g,
          id: `new-${Date.now()}-${Math.random()}`,
          isNew: true,
          food_id: food.id,
          food_option_items: (g.food_option_items || []).map(item => ({
            ...item,
            id: `new-item-${Date.now()}-${Math.random()}`,
            isNew: true,
          }))
        }))
      }
    }
    return []
  }

  const openOptions = async (food) => {
    setEditFood(food)
    setShowOptionsPanel(true)
    setLoadingOptions(true)
    setTemplateLoaded(false)

    const { data: existingOpts } = await supabase
      .from('food_options')
      .select('*, food_option_items(*)')
      .eq('food_id', food.id)
      .order('created_at')

    if (existingOpts && existingOpts.length > 0) {
      setOptionGroups(existingOpts)
      setLoadingOptions(false)
    } else {
      const templateOpts = await loadTemplateOptions(food)
      setOptionGroups(templateOpts)
      setLoadingOptions(false)
      if (templateOpts.length > 0) {
        setTemplateLoaded(true)
      }
    }
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
      price: String(food.price || ''),
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

  const parsePrice = (val) => Number(String(val).replace(/[^0-9]/g, ''))

  const handleSave = async () => {
    if (!form.name || !form.category_id || !form.price) {
      alert('Nama, kategori, dan harga wajib diisi!')
      return
    }
    const finalPrice = parsePrice(form.price)
    if (isNaN(finalPrice) || finalPrice <= 0) {
      alert('Harga tidak valid! Masukkan angka saja. Contoh: 15000')
      return
    }
    setSaving(true)
    try {
      let imageUrl = editFood?.image || null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('food-images').upload(fileName, imageFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('food-images').getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }
      const payload = {
        name: form.name, category_id: form.category_id,
        description: form.description, price: finalPrice,
        is_available: form.is_available, unit: form.unit,
        min_order: Number(form.min_order), image: imageUrl,
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

  // === OPTION GROUP FUNCTIONS ===
  const addOptionGroup = () => {
    setOptionGroups(prev => [...prev, {
      id: `new-${Date.now()}`,
      isNew: true,
      food_id: editFood?.id,
      group_name: '',
      group_type: 'single',
      required: true,
      food_option_items: [],
    }])
  }

  const updateOptionGroup = (groupId, field, value) => {
    setOptionGroups(prev => prev.map(g => g.id === groupId ? { ...g, [field]: value } : g))
  }

  const deleteOptionGroup = async (group) => {
    if (!confirm(`Hapus grup "${group.group_name || 'ini'}"?`)) return
    if (!group.isNew) {
      await supabase.from('food_options').delete().eq('id', group.id)
    }
    setOptionGroups(prev => prev.filter(g => g.id !== group.id))
  }

  const addOptionItem = (groupId) => {
    setOptionGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      return {
        ...g,
        food_option_items: [...(g.food_option_items || []), {
          id: `new-item-${Date.now()}`,
          isNew: true,
          option_id: groupId,
          name: '',
          extra_price: 0,
        }]
      }
    }))
  }

  const updateOptionItem = (groupId, itemId, field, value) => {
    setOptionGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      return {
        ...g,
        food_option_items: g.food_option_items.map(item =>
          item.id === itemId ? { ...item, [field]: value } : item
        )
      }
    }))
  }

  const deleteOptionItem = async (groupId, item) => {
    if (!item.isNew) {
      await supabase.from('food_option_items').delete().eq('id', item.id)
    }
    setOptionGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      return { ...g, food_option_items: g.food_option_items.filter(i => i.id !== item.id) }
    }))
  }

  const handleSaveOptions = async () => {
    if (!editFood) return
    setSavingOptions(true)
    try {
      for (const group of optionGroups) {
        let groupId = group.id

        if (group.isNew) {
          const { data: newGroup, error } = await supabase.from('food_options').insert({
            food_id: editFood.id,
            group_name: group.group_name,
            group_type: group.group_type,
            required: group.required,
          }).select().single()
          if (error) throw error
          groupId = newGroup.id
        } else {
          await supabase.from('food_options').update({
            group_name: group.group_name,
            group_type: group.group_type,
            required: group.required,
          }).eq('id', group.id)
        }

        for (const item of (group.food_option_items || [])) {
          if (!item.name.trim()) continue
          if (item.isNew) {
            await supabase.from('food_option_items').insert({
              option_id: groupId,
              name: item.name,
              extra_price: Number(item.extra_price) || 0,
            })
          } else {
            await supabase.from('food_option_items').update({
              name: item.name,
              extra_price: Number(item.extra_price) || 0,
            }).eq('id', item.id)
          }
        }
      }

      // Reload options yang sudah tersimpan
      const { data: saved } = await supabase
        .from('food_options')
        .select('*, food_option_items(*)')
        .eq('food_id', editFood.id)
        .order('created_at')
      setOptionGroups(saved || [])
      setTemplateLoaded(false)
      alert('✅ Pilihan berhasil disimpan!')
    } catch (err) {
      alert('Gagal menyimpan pilihan: ' + err.message)
    } finally {
      setSavingOptions(false)
    }
  }

  // Tambah template default untuk Paket Catering secara manual
  const handleAddCateringTemplate = () => {
    const template = [
      {
        id: `new-${Date.now()}-1`,
        isNew: true,
        food_id: editFood?.id,
        group_name: 'Pilih 1 Lauk',
        group_type: 'single',
        required: true,
        food_option_items: [
          { id: `new-item-${Date.now()}-1`, isNew: true, name: 'Ayam Goreng Lengkuas', extra_price: 0 },
          { id: `new-item-${Date.now()}-2`, isNew: true, name: 'Ayam Bakar Madu', extra_price: 0 },
          { id: `new-item-${Date.now()}-3`, isNew: true, name: 'Daging Rendang', extra_price: 2000 },
          { id: `new-item-${Date.now()}-4`, isNew: true, name: 'Ikan Dori Goreng Tepung', extra_price: 2000 },
          { id: `new-item-${Date.now()}-5`, isNew: true, name: 'Telur Balado', extra_price: 0 },
        ]
      },
      {
        id: `new-${Date.now()}-2`,
        isNew: true,
        food_id: editFood?.id,
        group_name: 'Pilih 1 Tumisan',
        group_type: 'single',
        required: true,
        food_option_items: [
          { id: `new-item-${Date.now()}-6`, isNew: true, name: 'Capcay', extra_price: 0 },
          { id: `new-item-${Date.now()}-7`, isNew: true, name: 'Tumis Buncis Wortel', extra_price: 0 },
          { id: `new-item-${Date.now()}-8`, isNew: true, name: 'Tumis Kangkung Terasi', extra_price: 0 },
          { id: `new-item-${Date.now()}-9`, isNew: true, name: 'Tumis Tahu Kecap', extra_price: 0 },
          { id: `new-item-${Date.now()}-10`, isNew: true, name: 'Sayur Asem', extra_price: 0 },
        ]
      },
      {
        id: `new-${Date.now()}-3`,
        isNew: true,
        food_id: editFood?.id,
        group_name: 'Pilih 1 Sambal',
        group_type: 'single',
        required: true,
        food_option_items: [
          { id: `new-item-${Date.now()}-11`, isNew: true, name: 'Sambal Terasi', extra_price: 0 },
          { id: `new-item-${Date.now()}-12`, isNew: true, name: 'Sambal Bawang', extra_price: 0 },
          { id: `new-item-${Date.now()}-13`, isNew: true, name: 'Sambal Matah', extra_price: 0 },
          { id: `new-item-${Date.now()}-14`, isNew: true, name: 'Sambal Ijo', extra_price: 0 },
          { id: `new-item-${Date.now()}-15`, isNew: true, name: 'Sambal Tomat', extra_price: 0 },
        ]
      },
      {
        id: `new-${Date.now()}-4`,
        isNew: true,
        food_id: editFood?.id,
        group_name: 'Tambah Add On',
        group_type: 'multiple',
        required: false,
        food_option_items: [
          { id: `new-item-${Date.now()}-16`, isNew: true, name: 'Telur Dadar', extra_price: 2000 },
          { id: `new-item-${Date.now()}-17`, isNew: true, name: 'Perkedel Kentang (2 pcs)', extra_price: 2000 },
          { id: `new-item-${Date.now()}-18`, isNew: true, name: 'Kerupuk', extra_price: 1000 },
          { id: `new-item-${Date.now()}-19`, isNew: true, name: 'Buah Potong', extra_price: 3000 },
          { id: `new-item-${Date.now()}-20`, isNew: true, name: 'Puding Cup', extra_price: 3000 },
        ]
      },
    ]
    setOptionGroups(template)
    setTemplateLoaded(true)
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

  // Cek apakah menu yang dipilih adalah Paket Catering
  const isCateringFood = () => {
    if (!editFood) return false
    const cat = categories.find(c => c.id === editFood.category_id)
    return cat?.name?.toLowerCase().includes('catering') || false
  }

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
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>
              Kelola Menu
            </h1>
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
                          {food.image
                            ? <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                          }
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{food.name}</p>
                          <p className="text-gray-400 text-xs line-clamp-1">{food.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        food.categories?.name === 'Paket Catering' ? 'bg-purple-100 text-purple-600'
                        : food.categories?.name === 'Ala Carte' ? 'bg-blue-100 text-blue-600'
                        : food.categories?.name === 'Minuman' ? 'bg-cyan-100 text-cyan-600'
                        : 'bg-yellow-100 text-yellow-600'
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
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                          food.is_available
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {food.is_available ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(food)}
                          title="Edit Menu"
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => openOptions(food)}
                          title="Kelola Pilihan Kondimen"
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition">
                          <Cog6ToothIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(food)}
                          title="Hapus"
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                <p className="text-sm text-gray-400">
                  Menampilkan {(page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} dari {filtered.length} menu
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-40 transition">‹</button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${page === i + 1 ? 'bg-orange-500 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-40 transition">›</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ===== PANEL TAMBAH/EDIT MENU ===== */}
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
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Contoh: Paket Catering Spesial"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Kategori *</label>
                    <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition">
                      <option value="">Pilih kategori</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Deskripsi</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Deskripsi singkat" maxLength={200} rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none" />
                    <p className="text-right text-xs text-gray-400 mt-1">{form.description.length}/200</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Harga</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Harga Jual * <span className="text-gray-400 font-normal">(angka saja, tanpa titik)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                      <input type="text" inputMode="numeric" value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder="Contoh: 15000"
                        className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
                    </div>
                    {form.price && Number(form.price) > 0 && (
                      <div className="mt-2 flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                        <span className="text-xs text-gray-500">Harga tersimpan:</span>
                        <span className="text-sm font-bold text-orange-500">
                          Rp {Number(form.price).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Satuan</label>
                      <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-orange-400 transition">
                        <option value="porsi">porsi</option>
                        <option value="pax">pax</option>
                        <option value="pcs">pcs</option>
                        <option value="box">box</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Min. Order</label>
                      <input type="number" value={form.min_order}
                        onChange={e => setForm({ ...form, min_order: e.target.value })} min={1}
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
                  <button onClick={() => setForm({ ...form, is_available: !form.is_available })}
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

      {/* ===== PANEL KELOLA PILIHAN ===== */}
      {showOptionsPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowOptionsPanel(false)} />
          <div className="w-[540px] bg-white h-full overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Kelola Pilihan Kondimen</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editFood?.name}</p>
              </div>
              <button onClick={() => setShowOptionsPanel(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">

              {/* Info Banner */}
              {templateLoaded ? (
                <div className="bg-green-50 rounded-2xl p-4 mb-5 flex items-start gap-3">
                  <span className="text-xl">✅</span>
                  <div>
                    <p className="text-sm text-green-700 font-semibold mb-0.5">Template Otomatis Dimuat!</p>
                    <p className="text-xs text-green-600 leading-relaxed">
                      Pilihan kondimen sudah disalin otomatis. Kamu bisa edit sesuai kebutuhan, lalu klik <strong>Simpan Semua</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 rounded-2xl p-4 mb-5">
                  <p className="text-sm text-blue-700 font-semibold mb-1">ℹ️ Kelola Pilihan Kondimen</p>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Tambah grup pilihan seperti "Pilih 1 Lauk", "Pilih 1 Tumisan", dll.
                    Untuk Paket Catering, gunakan tombol template di bawah agar lebih cepat.
                  </p>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex gap-2 mb-6 flex-wrap">
                <button onClick={addOptionGroup}
                  className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition">
                  <PlusIcon className="w-4 h-4" />
                  Tambah Grup
                </button>
                {isCateringFood() && (
                  <button onClick={handleAddCateringTemplate}
                    className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 transition">
                    🍱 Template Catering
                  </button>
                )}
              </div>

              {loadingOptions ? (
                <div className="text-center py-10">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Memuat pilihan...</p>
                </div>
              ) : optionGroups.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="font-semibold text-gray-700 mb-1">Belum ada pilihan kondimen</p>
                  <p className="text-xs text-gray-400 mb-4">
                    {isCateringFood()
                      ? 'Klik "Template Catering" untuk mengisi otomatis lauk, tumisan, sambal & add-on'
                      : 'Klik "Tambah Grup" untuk menambahkan pilihan baru'
                    }
                  </p>
                  {isCateringFood() && (
                    <button onClick={handleAddCateringTemplate}
                      className="bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 transition">
                      🍱 Pakai Template Catering
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {optionGroups.map((group, gIdx) => (
                    <div key={group.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                      {/* Group Header */}
                      <div className="bg-gray-50 px-4 py-3 flex items-center gap-3">
                        <span className="w-6 h-6 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {gIdx + 1}
                        </span>
                        <input value={group.group_name}
                          onChange={e => updateOptionGroup(group.id, 'group_name', e.target.value)}
                          placeholder="Nama grup (contoh: Pilih 1 Lauk)"
                          className="flex-1 text-sm font-semibold bg-transparent outline-none text-gray-800 placeholder-gray-400" />
                        <button onClick={() => deleteOptionGroup(group)}
                          className="w-7 h-7 rounded-lg hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition flex-shrink-0">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-4">
                        {/* Settings */}
                        <div className="flex gap-4 mb-4">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 block mb-1">Tipe Pilihan</label>
                            <select value={group.group_type}
                              onChange={e => updateOptionGroup(group.id, 'group_type', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none">
                              <option value="single">Pilih 1 (Radio)</option>
                              <option value="multiple">Pilih Banyak (Checkbox)</option>
                            </select>
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={group.required}
                                onChange={e => updateOptionGroup(group.id, 'required', e.target.checked)}
                                className="accent-orange-500" />
                              <span className="text-xs text-gray-600">Wajib dipilih</span>
                            </label>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2 mb-3">
                          {(group.food_option_items || []).map(item => (
                            <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                              <div className={`w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0 flex items-center justify-center ${group.group_type === 'single' ? 'rounded-full' : 'rounded'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              </div>
                              <input value={item.name}
                                onChange={e => updateOptionItem(group.id, item.id, 'name', e.target.value)}
                                placeholder="Nama pilihan (contoh: Ayam Goreng Lengkuas)"
                                className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400" />
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-xs text-gray-400">+Rp</span>
                                <input type="text" inputMode="numeric"
                                  value={item.extra_price || ''}
                                  onChange={e => updateOptionItem(group.id, item.id, 'extra_price', e.target.value.replace(/[^0-9]/g, ''))}
                                  placeholder="0"
                                  className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-center focus:border-orange-300" />
                              </div>
                              <button onClick={() => deleteOptionItem(group.id, item)}
                                className="w-6 h-6 rounded-lg hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition flex-shrink-0">
                                <XMarkIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button onClick={() => addOptionItem(group.id)}
                          className="w-full flex items-center justify-center gap-2 border border-dashed border-orange-300 text-orange-500 py-2 rounded-xl text-xs font-medium hover:bg-orange-50 transition">
                          <PlusIcon className="w-3.5 h-3.5" />
                          Tambah Pilihan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Simpan */}
              {optionGroups.length > 0 && (
                <div className="mt-6 flex gap-3 sticky bottom-0 bg-white pt-4 pb-2">
                  <button onClick={() => setShowOptionsPanel(false)}
                    className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                    Tutup
                  </button>
                  <button onClick={handleSaveOptions} disabled={savingOptions}
                    className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {savingOptions ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        Simpan Semua Pilihan
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}