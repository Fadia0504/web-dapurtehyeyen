import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import { useAuthStore } from '../../store/authStore'
import {
  MagnifyingGlassIcon, ChevronDownIcon, ArrowRightOnRectangleIcon,
  ChevronLeftIcon, ChevronRightIcon, EyeIcon,
  TrashIcon, ArrowDownTrayIcon, XMarkIcon,
  StarIcon as StarOutline, CalendarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import Swal from 'sweetalert2'

function StarDisplay({ rating, size = 'sm' }) {
  const w = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => s <= rating
        ? <StarSolid key={s} className={`${w} text-orange-400`} />
        : <StarOutline key={s} className={`${w} text-gray-200`} />
      )}
    </div>
  )
}

export default function AdminReviews() {
  const { profile } = useAuthStore()
  const adminDropRef = useRef()
  const [adminDropdown, setAdminDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState('ulasan')

  const [reviews, setReviews] = useState([])
  const [foods, setFoods] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [searchReview, setSearchReview] = useState('')
  const [filterFood, setFilterFood] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [pageReview, setPageReview] = useState(1)
  const [selectedReviews, setSelectedReviews] = useState(new Set())
  const [showDetailReview, setShowDetailReview] = useState(null)

  const [testimonials, setTestimonials] = useState([])
  const [loadingTestimonials, setLoadingTestimonials] = useState(true)
  const [searchTestimoni, setSearchTestimoni] = useState('')
  const [pageTestimoni, setPageTestimoni] = useState(1)
  const [showDetailTestimoni, setShowDetailTestimoni] = useState(null)

  const perPage = 6
  const adminName = profile?.full_name || 'Admin'

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target))
        setAdminDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchAll() {
    await Promise.all([fetchReviews(), fetchTestimonials(), fetchFoods()])
  }

  async function fetchReviews() {
    setLoadingReviews(true)
    try {
      const { data: reviewData, error } = await supabase
        .from('food_reviews')
        .select('*, foods(name, image)')
        .order('created_at', { ascending: false })

      if (error || !reviewData || reviewData.length === 0) {
        setReviews([])
        setLoadingReviews(false)
        return
      }

      const userIds = [...new Set(reviewData.map(r => r.user_id).filter(Boolean))]
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

      const profileMap = {}
      profileData?.forEach(p => { profileMap[p.id] = p })

      setReviews(reviewData.map(r => ({ ...r, profiles: profileMap[r.user_id] || null })))
    } catch (err) {
      console.error('fetchReviews error:', err)
      setReviews([])
    } finally {
      setLoadingReviews(false)
    }
  }

  async function fetchTestimonials() {
    setLoadingTestimonials(true)
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false })
    setTestimonials(data || [])
    setLoadingTestimonials(false)
  }

  async function fetchFoods() {
    const { data } = await supabase.from('foods').select('id, name')
    setFoods(data || [])
  }

  const handleDeleteReview = async (id) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Ulasan?',
      text: 'Ulasan ini akan dihapus secara permanen.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' },
    })
    if (!result.isConfirmed) return
    const { error } = await supabase.from('food_reviews').delete().eq('id', id)
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menghapus',
        text: error.message,
        confirmButtonColor: '#f97316',
        customClass: { popup: 'rounded-2xl' },
      })
      return
    }
    setShowDetailReview(null)
    await fetchReviews()
    Swal.fire({
      icon: 'success',
      title: 'Berhasil Dihapus',
      text: 'Ulasan telah dihapus.',
      confirmButtonColor: '#f97316',
      timer: 1800,
      timerProgressBar: true,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' },
    })
  }

  const handleDeleteTestimoni = async (id) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Testimoni?',
      text: 'Testimoni ini akan dihapus secara permanen.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' },
    })
    if (!result.isConfirmed) return
    const { error } = await supabase.from('testimonials').delete().eq('id', id)
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menghapus',
        text: error.message,
        confirmButtonColor: '#f97316',
        customClass: { popup: 'rounded-2xl' },
      })
      return
    }
    setShowDetailTestimoni(null)
    await fetchTestimonials()
    Swal.fire({
      icon: 'success',
      title: 'Berhasil Dihapus',
      text: 'Testimoni telah dihapus.',
      confirmButtonColor: '#f97316',
      timer: 1800,
      timerProgressBar: true,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' },
    })
  }

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: `Hapus ${selectedReviews.size} Ulasan?`,
      text: 'Semua ulasan terpilih akan dihapus secara permanen.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'Ya, Hapus Semua',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' },
    })
    if (!result.isConfirmed) return
    for (const id of selectedReviews) {
      await supabase.from('food_reviews').delete().eq('id', id)
    }
    setSelectedReviews(new Set())
    await fetchReviews()
    Swal.fire({
      icon: 'success',
      title: 'Berhasil Dihapus',
      text: 'Semua ulasan terpilih telah dihapus.',
      confirmButtonColor: '#f97316',
      timer: 1800,
      timerProgressBar: true,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' },
    })
  }

  const handleToggleSelect = (id) => {
    setSelectedReviews(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedReviews.size === filteredReviews.length) {
      setSelectedReviews(new Set())
    } else {
      setSelectedReviews(new Set(filteredReviews.map(r => r.id)))
    }
  }

  const handleExportReviews = () => {
    const headers = ['No', 'Ulasan', 'Menu', 'Pelanggan', 'Rating', 'Tanggal']
    const rows = filteredReviews.map((r, i) => [
      i + 1,
      `"${(r.comment || '').replace(/"/g, '""')}"`,
      r.foods?.name || '-',
      r.profiles?.full_name || '-',
      r.rating,
      new Date(r.created_at).toLocaleDateString('id-ID'),
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ulasan-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Keluar dari Akun?',
      text: 'Kamu akan keluar dari sesi admin ini.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' },
    })
    if (!result.isConfirmed) return
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' • ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const filteredReviews = reviews.filter(r => {
    const matchSearch = !searchReview ||
      r.comment?.toLowerCase().includes(searchReview.toLowerCase()) ||
      r.foods?.name?.toLowerCase().includes(searchReview.toLowerCase()) ||
      r.profiles?.full_name?.toLowerCase().includes(searchReview.toLowerCase())
    const matchFood = !filterFood || r.food_id === filterFood
    const matchRating = !filterRating || r.rating === parseInt(filterRating)
    return matchSearch && matchFood && matchRating
  })

  const totalPagesReview = Math.ceil(filteredReviews.length / perPage)
  const paginatedReviews = filteredReviews.slice((pageReview - 1) * perPage, pageReview * perPage)

  const filteredTestimoni = testimonials.filter(t =>
    !searchTestimoni ||
    t.name?.toLowerCase().includes(searchTestimoni.toLowerCase()) ||
    t.text?.toLowerCase().includes(searchTestimoni.toLowerCase())
  )
  const totalPagesTestimoni = Math.ceil(filteredTestimoni.length / perPage)
  const paginatedTestimoni = filteredTestimoni.slice((pageTestimoni - 1) * perPage, pageTestimoni * perPage)

  const totalReviews = reviews.length
  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0

  const reviewsThisMonth = reviews.filter(r => {
    const d = new Date(r.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const getPagination = (current, total) => {
    if (total <= 5) return [...Array(total)].map((_, i) => i + 1)
    if (current <= 3) return [1, 2, 3, '...', total]
    if (current >= total - 2) return [1, '...', total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
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
              <input
                value={activeTab === 'ulasan' ? searchReview : searchTestimoni}
                onChange={e => {
                  if (activeTab === 'ulasan') { setSearchReview(e.target.value); setPageReview(1) }
                  else { setSearchTestimoni(e.target.value); setPageTestimoni(1) }
                }}
                placeholder={activeTab === 'ulasan' ? 'Cari ulasan...' : 'Cari testimoni...'}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 transition"
              />
            </div>
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
          {/* Page Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              Ulasan &amp; Testimoni
            </h1>
            <p className="text-gray-400 text-sm mt-1">Kelola semua ulasan menu dan testimoni pelanggan.</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-gray-200 mb-6">
            {[
              { key: 'ulasan', label: 'Ulasan Menu', count: totalReviews },
              { key: 'testimoni', label: 'Testimoni Pelanggan', count: testimonials.length },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
                  activeTab === tab.key
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  activeTab === tab.key ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* ===== TAB ULASAN ===== */}
          {activeTab === 'ulasan' && (
            <>
              {/* Stats — 2 card */}
              <div className="grid grid-cols-2 gap-4 mb-6 max-w-lg">
                <div className="bg-yellow-50 rounded-2xl p-5 flex items-center gap-4">
                  <div className="bg-yellow-100 w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">⭐</div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Total Ulasan</p>
                    <p className="text-3xl font-black text-gray-900">{totalReviews}</p>
                    <p className="text-xs text-green-500 font-medium mt-0.5">+{reviewsThisMonth} bulan ini</p>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-2xl p-5 flex items-center gap-4">
                  <div className="bg-purple-100 w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🌟</div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Rata-rata Rating</p>
                    <p className="text-3xl font-black text-gray-900">{avgRating} <span className="text-lg text-gray-400 font-normal">/ 5</span></p>
                    <StarDisplay rating={Math.round(avgRating)} size="sm" />
                  </div>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex gap-3 mb-5 items-center flex-wrap">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={searchReview}
                    onChange={e => { setSearchReview(e.target.value); setPageReview(1) }}
                    placeholder="Cari ulasan..."
                    className="bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 shadow-sm w-52" />
                </div>
                <div className="relative">
                  <select value={filterFood}
                    onChange={e => { setFilterFood(e.target.value); setPageReview(1) }}
                    className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-8 py-2.5 text-sm outline-none shadow-sm">
                    <option value="">Semua Menu</option>
                    {foods.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={filterRating}
                    onChange={e => { setFilterRating(e.target.value); setPageReview(1) }}
                    className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-8 py-2.5 text-sm outline-none shadow-sm">
                    <option value="">Semua Rating</option>
                    {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Bintang</option>)}
                  </select>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="date"
                    className="bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none shadow-sm text-gray-500" />
                </div>
                {selectedReviews.size > 0 && (
                  <button onClick={handleBulkDelete}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition">
                    <TrashIcon className="w-4 h-4" />
                    Hapus ({selectedReviews.size})
                  </button>
                )}
                <button onClick={handleExportReviews}
                  className="ml-auto flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition shadow-sm shadow-orange-200">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export Excel
                </button>
              </div>

              {/* Tabel */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50 text-left">
                      <th className="px-4 py-4 w-10">
                        <input type="checkbox"
                          checked={selectedReviews.size === filteredReviews.length && filteredReviews.length > 0}
                          onChange={handleSelectAll}
                          className="accent-orange-500 w-4 h-4" />
                      </th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Ulasan</th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Menu</th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Pelanggan</th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Rating</th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Tanggal</th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingReviews ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : paginatedReviews.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-14 text-gray-400">
                          <p className="text-3xl mb-2">⭐</p>
                          <p className="font-medium text-gray-600 mb-1">Belum ada ulasan</p>
                          <p className="text-sm">Ulasan akan muncul setelah pelanggan memberikan penilaian</p>
                        </td>
                      </tr>
                    ) : paginatedReviews.map(review => (
                      <tr key={review.id}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${
                          selectedReviews.has(review.id) ? 'bg-orange-50/30' : ''
                        }`}>
                        <td className="px-4 py-4">
                          <input type="checkbox"
                            checked={selectedReviews.has(review.id)}
                            onChange={() => handleToggleSelect(review.id)}
                            className="accent-orange-500 w-4 h-4" />
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-orange-50 flex-shrink-0">
                              {review.foods?.image
                                ? <img src={review.foods.image} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                              }
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">{review.comment}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-gray-700 whitespace-nowrap">{review.foods?.name || '-'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {review.profiles?.avatar_url
                                ? <img src={review.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                : <span className="text-xs font-bold text-orange-500">
                                    {(review.profiles?.full_name || 'U')[0].toUpperCase()}
                                  </span>
                              }
                            </div>
                            <p className="text-sm font-medium text-gray-700 whitespace-nowrap">
                              {review.profiles?.full_name || 'Pengguna'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4"><StarDisplay rating={review.rating} /></td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(review.created_at)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setShowDetailReview(review)}
                              title="Lihat Detail"
                              className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteReview(review.id)}
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

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                  <p className="text-sm text-gray-400">
                    Menampilkan {filteredReviews.length === 0 ? 0 : (pageReview-1)*perPage+1} - {Math.min(pageReview*perPage, filteredReviews.length)} dari {filteredReviews.length} ulasan
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPageReview(p => Math.max(1, p-1))} disabled={pageReview===1}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    {getPagination(pageReview, Math.max(totalPagesReview, 1)).map((p, i) =>
                      p === '...'
                        ? <span key={`d${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                        : <button key={p} onClick={() => setPageReview(p)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                              pageReview===p ? 'bg-orange-500 text-white' : 'border border-gray-200 hover:bg-gray-50'
                            }`}>{p}</button>
                    )}
                    <button onClick={() => setPageReview(p => Math.min(totalPagesReview, p+1))} disabled={pageReview>=totalPagesReview}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===== TAB TESTIMONI ===== */}
          {activeTab === 'testimoni' && (
            <>
              <div className="flex gap-3 mb-5 items-center">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={searchTestimoni}
                    onChange={e => { setSearchTestimoni(e.target.value); setPageTestimoni(1) }}
                    placeholder="Cari testimoni..."
                    className="bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 shadow-sm w-56" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50 text-left">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400">Testimoni</th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Pelanggan</th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Kota</th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Rating</th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Tanggal</th>
                      <th className="px-4 py-4 text-xs font-semibold text-gray-400">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTestimonials ? (
                      [...Array(4)].map((_, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : paginatedTestimoni.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-14 text-gray-400">
                          <p className="text-3xl mb-2">💬</p>
                          <p className="font-medium text-gray-600 mb-1">Belum ada testimoni</p>
                          <p className="text-sm">Testimoni akan muncul setelah pelanggan mengirimkan ulasan</p>
                        </td>
                      </tr>
                    ) : paginatedTestimoni.map(t => (
                      <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex items-start gap-3">
                            {t.image && (
                              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                                <img src={t.image} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">{t.text}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-500">{t.city || '-'}</p>
                        </td>
                        <td className="px-4 py-4"><StarDisplay rating={t.rating || 5} /></td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(t.created_at)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setShowDetailTestimoni(t)}
                              className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteTestimoni(t.id)}
                              className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                  <p className="text-sm text-gray-400">
                    Menampilkan {filteredTestimoni.length===0 ? 0 : (pageTestimoni-1)*perPage+1} - {Math.min(pageTestimoni*perPage, filteredTestimoni.length)} dari {filteredTestimoni.length} testimoni
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPageTestimoni(p => Math.max(1, p-1))} disabled={pageTestimoni===1}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    {getPagination(pageTestimoni, Math.max(totalPagesTestimoni, 1)).map((p, i) =>
                      p === '...'
                        ? <span key={`d${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                        : <button key={p} onClick={() => setPageTestimoni(p)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                              pageTestimoni===p ? 'bg-orange-500 text-white' : 'border border-gray-200 hover:bg-gray-50'
                            }`}>{p}</button>
                    )}
                    <button onClick={() => setPageTestimoni(p => Math.min(totalPagesTestimoni, p+1))} disabled={pageTestimoni>=totalPagesTestimoni}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ===== DETAIL ULASAN PANEL ===== */}
      {showDetailReview && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowDetailReview(null)} />
          <div className="w-[440px] bg-white h-full overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Detail Ulasan</h2>
                <p className="text-xs text-gray-400 mt-0.5">Informasi lengkap ulasan pelanggan</p>
              </div>
              <button onClick={() => setShowDetailReview(null)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 bg-orange-50 rounded-2xl p-4 mb-5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white flex-shrink-0">
                  {showDetailReview.foods?.image
                    ? <img src={showDetailReview.foods.image} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                  }
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Menu yang diulas</p>
                  <p className="font-bold text-gray-800">{showDetailReview.foods?.name || '-'}</p>
                  <StarDisplay rating={showDetailReview.rating} size="md" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 mb-5">
                <p className="text-xs text-gray-400 mb-2">Komentar pelanggan</p>
                <p className="text-gray-700 text-sm leading-relaxed">"{showDetailReview.comment}"</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5">
                <p className="text-xs text-gray-400 mb-3">Ditulis oleh</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {showDetailReview.profiles?.avatar_url
                      ? <img src={showDetailReview.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="font-bold text-orange-500">
                          {(showDetailReview.profiles?.full_name || 'U')[0].toUpperCase()}
                        </span>
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{showDetailReview.profiles?.full_name || 'Pengguna'}</p>
                    <p className="text-xs text-gray-400">{formatDate(showDetailReview.created_at)}</p>
                  </div>
                </div>
              </div>

              <button onClick={() => handleDeleteReview(showDetailReview.id)}
                className="w-full border border-red-300 text-red-500 py-3 rounded-xl font-semibold text-sm hover:bg-red-50 transition flex items-center justify-center gap-2">
                <TrashIcon className="w-4 h-4" />
                Hapus Ulasan Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL TESTIMONI PANEL ===== */}
      {showDetailTestimoni && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowDetailTestimoni(null)} />
          <div className="w-[440px] bg-white h-full overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Detail Testimoni</h2>
                <p className="text-xs text-gray-400 mt-0.5">Informasi lengkap testimoni pelanggan</p>
              </div>
              <button onClick={() => setShowDetailTestimoni(null)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              {showDetailTestimoni.image && (
                <div className="w-full h-48 rounded-2xl overflow-hidden bg-gray-100 mb-5">
                  <img src={showDetailTestimoni.image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="bg-orange-50 rounded-2xl p-5 mb-5">
                <p className="text-gray-700 text-sm leading-relaxed italic">
                  "{showDetailTestimoni.text}"
                </p>
              </div>
              <div className="space-y-1 bg-white border border-gray-100 rounded-2xl p-5 mb-5">
                {[
                  { label: 'Nama', value: showDetailTestimoni.name },
                  { label: 'Kota', value: showDetailTestimoni.city || '-' },
                  { label: 'Tanggal', value: formatDate(showDetailTestimoni.created_at) },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-400">{item.label}</span>
                    <span className="text-sm font-medium text-gray-700">{item.value}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-gray-400">Rating</span>
                  <StarDisplay rating={showDetailTestimoni.rating || 5} />
                </div>
              </div>
              <button onClick={() => handleDeleteTestimoni(showDetailTestimoni.id)}
                className="w-full border border-red-300 text-red-500 py-3 rounded-xl font-semibold text-sm hover:bg-red-50 transition flex items-center justify-center gap-2">
                <TrashIcon className="w-4 h-4" />
                Hapus Testimoni Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}