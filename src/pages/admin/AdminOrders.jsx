import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import Swal from 'sweetalert2'
import {
  ChevronDownIcon, ArrowRightOnRectangleIcon, EyeIcon,
  EllipsisHorizontalIcon, CalendarIcon, FunnelIcon,
  XMarkIcon, MagnifyingGlassIcon, TruckIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { formatDateTime } from '../../lib/timeUtils'

const statusConfig = {
  waiting_payment: { label: 'Menunggu Pembayaran', color: 'bg-gray-100 text-gray-500 border border-gray-200' },
  pending:         { label: 'Menunggu Konfirmasi', color: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  confirmed:       { label: 'Dikonfirmasi',        color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  processing:      { label: 'Diproses',            color: 'bg-orange-100 text-orange-600 border border-orange-200' },
  delivered:       { label: 'Dikirim',             color: 'bg-green-100 text-green-700 border border-green-200' },
  done:            { label: 'Selesai',             color: 'bg-teal-100 text-teal-700 border border-teal-200' },
  cancelled:       { label: 'Dibatalkan',          color: 'bg-red-100 text-red-600 border border-red-200' },
}

const tabs = [
  { key: 'all',             label: 'Semua' },
  { key: 'pending',         label: 'Menunggu' },
  { key: 'confirmed',       label: 'Dikonfirmasi' },
  { key: 'processing',      label: 'Diproses' },
  { key: 'delivered',       label: 'Dikirim' },
  { key: 'done',            label: 'Selesai' },
  { key: 'cancelled',       label: 'Dibatalkan' },
  { key: 'waiting_payment', label: 'Belum Bayar' },
]

function toWIBDateStr(utcStr) {
  const d = new Date(utcStr)
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

// Info jadwal kirim relatif terhadap hari ini (untuk badge di admin)
function deliveryInfo(dateStr) {
  if (!dateStr) return null
  const todayWIB = toWIBDateStr(new Date().toISOString())
  const target = dateStr.slice(0, 10)
  const diffDays = Math.round(
    (new Date(target + 'T00:00:00') - new Date(todayWIB + 'T00:00:00')) / 86400000
  )
  const label = new Date(target + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
  let tag, color
  if (diffDays < 0) { tag = `Terlambat ${Math.abs(diffDays)} hari`; color = 'bg-red-100 text-red-600 border-red-200' }
  else if (diffDays === 0) { tag = 'Hari ini'; color = 'bg-orange-100 text-orange-600 border-orange-200' }
  else if (diffDays === 1) { tag = 'Besok'; color = 'bg-yellow-100 text-yellow-700 border-yellow-200' }
  else { tag = `H-${diffDays}`; color = 'bg-gray-100 text-gray-500 border-gray-200' }
  return { diffDays, label, tag, color, dateStr: target }
}

// status yang masih perlu dikirim (belum selesai/batal)
const ACTIVE_DELIVERY = ['confirmed', 'processing', 'delivered']

export default function AdminOrders() {
  const { profile } = useAuthStore()
  const adminDropRef = useRef()
  const dateRef = useRef()
  const filterRef = useRef()

  const [adminDropdown, setAdminDropdown] = useState(false)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(8)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [actionMenu, setActionMenu] = useState(null)

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tempDateFrom, setTempDateFrom] = useState('')
  const [tempDateTo, setTempDateTo] = useState('')

  const [sortByDelivery, setSortByDelivery] = useState(false)

  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterMinTotal, setFilterMinTotal] = useState('')
  const [filterMaxTotal, setFilterMaxTotal] = useState('')
  const [tempSearch, setTempSearch] = useState('')
  const [tempMin, setTempMin] = useState('')
  const [tempMax, setTempMax] = useState('')

  useEffect(() => { fetchOrders() }, [])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target)) setAdminDropdown(false)
      if (dateRef.current && !dateRef.current.contains(e.target)) setShowDatePicker(false)
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, foods(name, image))')
      .eq('source', 'online') 
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const handleUpdateStatus = async (orderId, status) => {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setActionMenu(null)
    if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, status }))
    await fetchOrders()
  }

  // Tandai pembayaran COD sudah diterima kurir
  const handleMarkPaid = async (orderId) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Uang Sudah Diterima?',
      text: 'Tandai pesanan COD ini sebagai Lunas.',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'Ya, Lunas',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' },
    })
    if (!result.isConfirmed) return
    await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId)
    if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, payment_status: 'paid' }))
    await fetchOrders()
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

  const handleApplyDate = () => {
    setDateFrom(tempDateFrom); setDateTo(tempDateTo)
    setShowDatePicker(false); setPage(1)
  }

  const handleResetDate = () => {
    setDateFrom(''); setDateTo(''); setTempDateFrom(''); setTempDateTo(''); setPage(1)
  }

  const handleApplyFilter = () => {
    setFilterSearch(tempSearch); setFilterMinTotal(tempMin); setFilterMaxTotal(tempMax)
    setShowFilterPanel(false); setPage(1)
  }

  const handleResetFilter = () => {
    setTempSearch(''); setTempMin(''); setTempMax('')
    setFilterSearch(''); setFilterMinTotal(''); setFilterMaxTotal(''); setPage(1)
  }

  const handleResetAll = () => { handleResetDate(); handleResetFilter() }

  const today = new Date()
  const todayStr = toWIBDateStr(today.toISOString())

  const getWeekRange = () => {
    const now = new Date(); const day = now.getDay()
    const from = new Date(now); from.setDate(now.getDate() - day)
    const to = new Date(from); to.setDate(from.getDate() + 6)
    return { from: toWIBDateStr(from.toISOString()), to: toWIBDateStr(to.toISOString()) }
  }

  const getMonthRange = () => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: toWIBDateStr(from.toISOString()), to: toWIBDateStr(to.toISOString()) }
  }

  // Filter: tab 'all' sembunyikan waiting_payment supaya admin tidak bingung
  const filtered = orders.filter(o => {
    const matchTab = activeTab === 'all'
      ? o.status !== 'waiting_payment'  // sembunyikan belum bayar di tab semua
      : o.status === activeTab

    const matchDate = (() => {
      if (!dateFrom && !dateTo) return true
      const orderDateStr = toWIBDateStr(o.created_at)
      if (dateFrom && orderDateStr < dateFrom) return false
      if (dateTo && orderDateStr > dateTo) return false
      return true
    })()

    const matchSearch = !filterSearch ||
      (o.customer_name || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
      (o.customer_phone || '').includes(filterSearch) ||
      o.id.slice(0, 8).toUpperCase().includes(filterSearch.toUpperCase())

    const matchMin = !filterMinTotal || (o.total || 0) >= Number(filterMinTotal)
    const matchMax = !filterMaxTotal || (o.total || 0) <= Number(filterMaxTotal)

    return matchTab && matchDate && matchSearch && matchMin && matchMax
  })

  const sorted = sortByDelivery
    ? [...filtered].sort((a, b) => {
        // yang belum ada tanggal ditaruh paling bawah
        if (!a.delivery_date) return 1
        if (!b.delivery_date) return -1
        return a.delivery_date.localeCompare(b.delivery_date)
      })
    : filtered

  const totalPages = Math.ceil(sorted.length / perPage)
  const paginated = sorted.slice((page - 1) * perPage, page * perPage)

  // Pesanan yang harus dikirim hari ini (aktif & belum selesai)
  const dueTodayCount = orders.filter(o =>
    ACTIVE_DELIVERY.includes(o.status) &&
    o.delivery_date && deliveryInfo(o.delivery_date)?.diffDays === 0
  ).length

  const overdueCount = orders.filter(o =>
    ACTIVE_DELIVERY.includes(o.status) &&
    o.delivery_date && deliveryInfo(o.delivery_date)?.diffDays < 0
  ).length

  const countByStatus = (key) => {
    if (key === 'all') return orders.filter(o => o.status !== 'waiting_payment').length
    return orders.filter(o => o.status === key).length
  }

  const adminName = profile?.full_name || 'Admin'
  const hasDateFilter = dateFrom || dateTo
  const hasOtherFilter = filterSearch || filterMinTotal || filterMaxTotal
  const hasAnyFilter = hasDateFilter || hasOtherFilter
  const otherFilterCount = [filterSearch, filterMinTotal, filterMaxTotal].filter(Boolean).length

  const dateLabel = hasDateFilter
    ? `${dateFrom ? new Date(dateFrom + 'T00:00:00').toLocaleDateString('id-ID') : '...'} — ${dateTo ? new Date(dateTo + 'T00:00:00').toLocaleDateString('id-ID') : '...'}`
    : 'Pilih Tanggal'

  // Jumlah waiting_payment untuk badge
  const waitingPaymentCount = orders.filter(o => o.status === 'waiting_payment').length

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-56">

        {/* TOPBAR */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4 sticky top-0 z-10">
          <div className="flex-1" />
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
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Daftar Pesanan</h1>
              <p className="text-gray-400 text-sm mt-1">Kelola semua pesanan yang masuk dari pelanggan.</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Date Picker */}
              <div className="relative" ref={dateRef}>
                <button onClick={() => { setShowDatePicker(p => !p); setShowFilterPanel(false) }}
                  className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    hasDateFilter ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{dateLabel}</span>
                  {hasDateFilter && (
                    <span onClick={e => { e.stopPropagation(); handleResetDate() }} className="ml-1 hover:text-red-500 transition">
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>

                {showDatePicker && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 w-64">
                    <p className="font-bold text-gray-800 text-sm mb-3">Filter Tanggal</p>
                    <div className="flex gap-1.5 mb-4 flex-wrap">
                      {[
                        { label: 'Hari Ini', from: todayStr, to: todayStr },
                        { label: 'Minggu Ini', from: getWeekRange().from, to: getWeekRange().to },
                        { label: 'Bulan Ini', from: getMonthRange().from, to: getMonthRange().to },
                      ].map(q => (
                        <button key={q.label} onClick={() => { setTempDateFrom(q.from); setTempDateTo(q.to) }}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                            tempDateFrom === q.from && tempDateTo === q.to
                              ? 'border-orange-400 bg-orange-50 text-orange-600 font-medium'
                              : 'border-gray-200 text-gray-600 hover:border-orange-300'
                          }`}>
                          {q.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Dari</label>
                        <input type="date" value={tempDateFrom} onChange={e => setTempDateFrom(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Sampai</label>
                        <input type="date" value={tempDateTo} onChange={e => setTempDateTo(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setTempDateFrom(''); setTempDateTo('') }}
                        className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                        Reset
                      </button>
                      <button onClick={handleApplyDate}
                        className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition">
                        Terapkan
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Panel */}
              <div className="relative" ref={filterRef}>
                <button onClick={() => { setShowFilterPanel(p => !p); setShowDatePicker(false); setTempSearch(filterSearch); setTempMin(filterMinTotal); setTempMax(filterMaxTotal) }}
                  className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    hasOtherFilter ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  <FunnelIcon className="w-4 h-4" />
                  Filter
                  {otherFilterCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {otherFilterCount}
                    </span>
                  )}
                </button>

                {showFilterPanel && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 w-64">
                    <p className="font-bold text-gray-800 text-sm mb-4">Filter Pesanan</p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1.5">Cari Pelanggan / ID</label>
                        <div className="relative">
                          <MagnifyingGlassIcon className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input value={tempSearch} onChange={e => setTempSearch(e.target.value)}
                            placeholder="Nama, HP, atau ID..."
                            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-orange-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1.5">Total Pesanan (Rp)</label>
                        <div className="flex gap-2">
                          <input type="number" value={tempMin} onChange={e => setTempMin(e.target.value)}
                            placeholder="Min" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400" />
                          <input type="number" value={tempMax} onChange={e => setTempMax(e.target.value)}
                            placeholder="Max" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <button onClick={handleResetFilter}
                        className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                        Reset
                      </button>
                      <button onClick={handleApplyFilter}
                        className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition">
                        Terapkan
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Urutkan berdasarkan jadwal kirim */}
              <button onClick={() => { setSortByDelivery(s => !s); setPage(1) }}
                className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  sortByDelivery ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}>
                <TruckIcon className="w-4 h-4" />
                Urut Jadwal Kirim
              </button>

              {hasAnyFilter && (
                <button onClick={handleResetAll}
                  className="text-sm text-red-400 hover:text-red-600 font-medium transition whitespace-nowrap">
                  Reset Semua
                </button>
              )}
            </div>
          </div>

          {/* Banner jadwal kirim */}
          {(dueTodayCount > 0 || overdueCount > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  {dueTodayCount > 0 && (
                    <span><span className="font-semibold text-orange-600">{dueTodayCount} pesanan</span> harus dikirim hari ini</span>
                  )}
                  {dueTodayCount > 0 && overdueCount > 0 && ' • '}
                  {overdueCount > 0 && (
                    <span className="text-red-600 font-semibold">{overdueCount} pesanan sudah lewat jadwal</span>
                  )}
                </p>
              </div>
              <button onClick={() => { setSortByDelivery(true); setPage(1) }}
                className="text-xs text-orange-600 font-semibold hover:underline whitespace-nowrap">
                Urutkan jadwal →
              </button>
            </div>
          )}

          {/* Info banner waiting_payment */}
          {waitingPaymentCount > 0 && activeTab !== 'waiting_payment' && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <p className="text-sm text-gray-500">
                  Ada <span className="font-semibold text-gray-700">{waitingPaymentCount} pesanan</span> yang belum menyelesaikan pembayaran
                </p>
              </div>
              <button onClick={() => { setActiveTab('waiting_payment'); setPage(1) }}
                className="text-xs text-orange-500 font-semibold hover:underline">
                Lihat →
              </button>
            </div>
          )}

          {/* Active filter chips */}
          {hasAnyFilter && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {hasDateFilter && (
                <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-600 text-xs px-3 py-1.5 rounded-full font-medium">
                  <CalendarIcon className="w-3 h-3" />
                  {dateLabel}
                  <button onClick={handleResetDate} className="hover:text-red-500 ml-0.5"><XMarkIcon className="w-3 h-3" /></button>
                </div>
              )}
              {filterSearch && (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-600 text-xs px-3 py-1.5 rounded-full font-medium">
                  Cari: "{filterSearch}"
                  <button onClick={() => { setFilterSearch(''); setTempSearch('') }} className="hover:text-red-500"><XMarkIcon className="w-3 h-3" /></button>
                </div>
              )}
              <span className="text-xs text-gray-400">{filtered.length} pesanan ditemukan</span>
            </div>
          )}

          {/* Status Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {tabs.map(tab => (
              <button key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1) }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition border ${
                  activeTab === tab.key
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                }`}>
                {tab.label}
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {countByStatus(tab.key)}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400">ID Pesanan</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Tanggal</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Pelanggan</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Pengiriman</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Jadwal Kirim</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Total</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Status</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Pembayaran</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-400">
                      <FunnelIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="font-medium text-gray-500">Tidak ada pesanan ditemukan</p>
                      <p className="text-sm mt-1">Coba ubah filter atau tab status</p>
                    </td>
                  </tr>
                ) : paginated.map(order => {
                  const { date, time } = formatDateTime(order.created_at)
                  const status = statusConfig[order.status] || statusConfig.pending
                  return (
                    <tr key={order.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${
                      order.status === 'waiting_payment' ? 'opacity-60' : ''
                    }`}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800 text-sm">
                          #ORD-{order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-800">{date}</p>
                        <p className="text-xs text-gray-400">{time}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-gray-800">{order.customer_name || '-'}</p>
                        <p className="text-xs text-gray-400">{order.customer_phone || '-'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <TruckIcon className="w-4 h-4 text-orange-400" />
                          </div>
                          <p className="text-xs text-gray-400 max-w-[130px] truncate">
                            {order.customer_address || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {(() => {
                          const di = deliveryInfo(order.delivery_date)
                          if (!di) return <span className="text-xs text-gray-300">-</span>
                          const showTag = ACTIVE_DELIVERY.includes(order.status)
                          return (
                            <div>
                              <p className="text-sm text-gray-800">{di.label}</p>
                              {showTag && (
                                <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium border ${di.color}`}>
                                  {di.tag}
                                </span>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-800 text-sm">
                          Rp {order.total?.toLocaleString('id-ID')}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1">
                          {order.payment_status === 'paid' ? (
                            <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-green-100 text-green-700 border border-green-200">
                              Lunas
                            </span>
                          ) : order.payment_status === 'pending' ? (
                            <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                              Pending
                            </span>
                          ) : (
                            <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-red-100 text-red-500 border border-red-200">
                              Belum Bayar
                            </span>
                          )}
                          {order.payment_method === 'cod' && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-600 border border-purple-200">
                              COD
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setSelectedOrder(order); setShowDetail(true) }}
                            className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          {order.status !== 'waiting_payment' && (
                            <div className="relative">
                              <button onClick={() => setActionMenu(actionMenu === order.id ? null : order.id)}
                                className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition">
                                <EllipsisHorizontalIcon className="w-4 h-4" />
                              </button>
                              {actionMenu === order.id && (
                                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
                                  <p className="text-xs text-gray-400 font-semibold px-4 pt-3 pb-1">Ubah Status</p>
                                  {Object.entries(statusConfig)
                                    .filter(([key]) => key !== 'waiting_payment')
                                    .map(([key, val]) => (
                                    <button key={key}
                                      onClick={() => handleUpdateStatus(order.id, key)}
                                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition flex items-center gap-2 ${
                                        order.status === key ? 'text-orange-500 font-medium' : 'text-gray-700'
                                      }`}>
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        key === 'pending'    ? 'bg-yellow-400'
                                        : key === 'confirmed'  ? 'bg-blue-400'
                                        : key === 'processing' ? 'bg-orange-400'
                                        : key === 'delivered'  ? 'bg-green-400'
                                        : key === 'done'       ? 'bg-teal-400'
                                        : 'bg-red-400'
                                      }`} />
                                      {val.label}
                                      {order.status === key && <span className="ml-auto text-xs">✓</span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
              <p className="text-sm text-gray-400">
                Menampilkan {filtered.length === 0 ? 0 : (page-1)*perPage+1} - {Math.min(page*perPage, filtered.length)} dari {filtered.length} pesanan
              </p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-40 transition">‹</button>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                    <button key={i} onClick={() => setPage(i+1)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                        page===i+1 ? 'bg-orange-500 text-white' : 'border border-gray-200 hover:bg-gray-50'
                      }`}>{i+1}</button>
                  ))}
                  {totalPages > 5 && <span className="text-gray-400 text-sm px-1">...</span>}
                  {totalPages > 5 && (
                    <button onClick={() => setPage(totalPages)}
                      className="w-8 h-8 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">{totalPages}</button>
                  )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages || totalPages===0}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-40 transition">›</button>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-400">Tampilkan</span>
                  <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none">
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-gray-400">per halaman</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* DETAIL MODAL */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDetail(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Detail Pesanan</h2>
                <p className="text-xs text-gray-400">#ORD-{selectedOrder.id.slice(0,8).toUpperCase()}</p>
              </div>
              <button onClick={() => setShowDetail(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${statusConfig[selectedOrder.status]?.color}`}>
                  {statusConfig[selectedOrder.status]?.label}
                </span>
                {selectedOrder.payment_status === 'paid' ? (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-green-100 text-green-700 border border-green-200">Lunas</span>
                ) : selectedOrder.payment_status === 'pending' ? (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">Pembayaran Pending</span>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-red-100 text-red-500 border border-red-200">Belum Bayar</span>
                )}
                {selectedOrder.payment_method && (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-blue-50 text-blue-600 border border-blue-200">
                    {selectedOrder.payment_method}
                  </span>
                )}
                <p className="text-xs text-gray-400 ml-auto">
                  {formatDateTime(selectedOrder.created_at).date} • {formatDateTime(selectedOrder.created_at).time}
                </p>
              </div>

              {/* Aksi COD — tandai uang diterima */}
              {selectedOrder.payment_method === 'cod' && selectedOrder.payment_status !== 'paid' && (
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-purple-700">Pesanan COD — belum dibayar</p>
                    <p className="text-xs text-purple-500 mt-0.5">Tandai lunas setelah kurir menerima uang tunai dari pelanggan.</p>
                  </div>
                  <button onClick={() => handleMarkPaid(selectedOrder.id)}
                    className="flex-shrink-0 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-green-700 transition">
                    Uang Diterima
                  </button>
                </div>
              )}

              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Info Pelanggan</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Nama', value: selectedOrder.customer_name },
                    { label: 'WhatsApp', value: selectedOrder.customer_phone },
                    { label: 'Alamat', value: selectedOrder.customer_address },
                    ...(selectedOrder.notes ? [{ label: 'Catatan', value: selectedOrder.notes }] : []),
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="font-medium text-gray-800 text-right max-w-[220px]">{item.value || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jadwal & Pengiriman */}
              <div className="bg-orange-50 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Jadwal & Pengiriman</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Tanggal Kirim</span>
                    {(() => {
                      const di = deliveryInfo(selectedOrder.delivery_date)
                      if (!di) return <span className="font-medium text-gray-400">Belum ditentukan</span>
                      return (
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{di.label}</span>
                          {ACTIVE_DELIVERY.includes(selectedOrder.status) && (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${di.color}`}>{di.tag}</span>
                          )}
                        </span>
                      )
                    })()}
                  </div>
                  {selectedOrder.distance_km != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Jarak</span>
                      <span className="font-medium text-gray-800">{selectedOrder.distance_km} km</span>
                    </div>
                  )}
                  {selectedOrder.shipping_cost != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ongkir</span>
                      <span className="font-medium text-gray-800">Rp {Number(selectedOrder.shipping_cost).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {selectedOrder.delivery_lat != null && selectedOrder.delivery_lng != null && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.delivery_lat},${selectedOrder.delivery_lng}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold text-orange-600 hover:underline">
                      📍 Buka titik lokasi di Google Maps
                    </a>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Item Pesanan</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-50 rounded-xl overflow-hidden flex-shrink-0">
                        {item.foods?.image
                          ? <img src={item.foods.image} alt={item.foods?.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                        }
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
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-orange-500">Rp {selectedOrder.total?.toLocaleString('id-ID')}</span>
              </div>

              {/* Update status hanya kalau bukan waiting_payment */}
              {selectedOrder.status !== 'waiting_payment' && (
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-3">Update Status</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(statusConfig)
                      .filter(([key]) => key !== 'waiting_payment')
                      .map(([key, val]) => (
                      <button key={key}
                        onClick={() => handleUpdateStatus(selectedOrder.id, key)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-medium transition border ${
                          selectedOrder.status === key
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500'
                        }`}>
                        {val.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.status === 'waiting_payment' && (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500">Pesanan ini belum menyelesaikan pembayaran.</p>
                  <p className="text-xs text-gray-400 mt-1">Status akan otomatis berubah setelah pelanggan membayar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}