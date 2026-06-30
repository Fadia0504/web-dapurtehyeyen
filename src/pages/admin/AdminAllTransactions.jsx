import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import {
  MagnifyingGlassIcon, ChevronDownIcon, ArrowRightOnRectangleIcon,
  EyeIcon, XMarkIcon, BanknotesIcon, CreditCardIcon, QrCodeIcon,
  GlobeAltIcon, CalculatorIcon, ChartBarIcon
} from '@heroicons/react/24/outline'
import { formatDateTime } from '../../lib/timeUtils'

const statusConfig = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Diproses', color: 'bg-orange-100 text-orange-600' },
  delivered: { label: 'Dikirim', color: 'bg-purple-100 text-purple-600' },
  done: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-600' },
}

export default function AdminAllTransactions() {
  const { profile } = useAuthStore()
  const adminDropRef = useRef()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all') // all | online | kasir
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [adminDropdown, setAdminDropdown] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => { fetchOrders() }, [dateFilter])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target))
        setAdminDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('all-transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [dateFilter])

  async function fetchOrders() {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select('*, order_items(*, foods(name, image))')
      .order('created_at', { ascending: false })

    const now = new Date()
    if (dateFilter === 'today') {
      query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
    } else if (dateFilter === 'week') {
      query = query.gte('created_at', new Date(now.getTime() - 7 * 86400000).toISOString())
    } else if (dateFilter === 'month') {
      query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
    }

    const { data } = await query
    setOrders(data || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const getPaymentMethod = (notes) => {
    if (!notes) return '-'
    if (notes.includes('Tunai')) return 'Tunai'
    if (notes.includes('Transfer')) return 'Transfer'
    if (notes.includes('QRIS')) return 'QRIS'
    return '-'
  }

  const getPaymentIcon = (method) => {
    if (method === 'Tunai') return <BanknotesIcon className="w-3.5 h-3.5" />
    if (method === 'Transfer') return <CreditCardIcon className="w-3.5 h-3.5" />
    if (method === 'QRIS') return <QrCodeIcon className="w-3.5 h-3.5" />
    return null
  }

  const filtered = orders.filter(o => {
    const matchSource = sourceFilter === 'all' || (o.source || 'online') === sourceFilter
    const matchSearch =
      (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      o.id.slice(0, 8).toUpperCase().includes(search.toUpperCase())
    return matchSource && matchSearch
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const adminName = profile?.full_name || 'Admin'

  // Summary
  const onlineOrders = orders.filter(o => (o.source || 'online') === 'online')
  const kasirOrders = orders.filter(o => o.source === 'kasir')
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0)
  const onlineRevenue = onlineOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0)
  const kasirRevenue = kasirOrders.reduce((s, o) => s + (o.total || 0), 0)

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
                placeholder="Cari ID transaksi atau pelanggan..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 transition" />
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
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <ChartBarIcon className="w-7 h-7 text-orange-500" />
                Riwayat Transaksi
              </h1>
              <p className="text-gray-400 text-sm mt-1">Pantau seluruh transaksi penjualan online dan offline (kasir).</p>
            </div>
            <div className="flex items-center gap-2">
              {['today', 'week', 'month', 'all'].map(f => (
                <button key={f} onClick={() => { setDateFilter(f); setPage(1) }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                    dateFilter === f ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                  }`}>
                  {f === 'today' ? 'Hari Ini' : f === 'week' ? '7 Hari' : f === 'month' ? 'Bulan Ini' : 'Semua'}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                <ChartBarIcon className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-gray-400 text-xs">Total Pendapatan</p>
              <p className="text-xl font-black text-gray-900 mt-1">Rp {totalRevenue.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-400 mt-1">{orders.length} transaksi</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-orange-200 transition cursor-pointer"
              onClick={() => { setSourceFilter('online'); setPage(1) }}>
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <GlobeAltIcon className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-gray-400 text-xs">Pendapatan Online</p>
              <p className="text-xl font-black text-gray-900 mt-1">Rp {onlineRevenue.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-400 mt-1">{onlineOrders.length} pesanan</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-orange-200 transition cursor-pointer"
              onClick={() => { setSourceFilter('kasir'); setPage(1) }}>
              <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                <CalculatorIcon className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-gray-400 text-xs">Pendapatan Kasir</p>
              <p className="text-xl font-black text-gray-900 mt-1">Rp {kasirRevenue.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-400 mt-1">{kasirOrders.length} transaksi</p>
            </div>
          </div>

          {/* Source Tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { key: 'all', label: 'Semua Sumber' },
              { key: 'online', label: '🌐 Online' },
              { key: 'kasir', label: '🧾 Kasir' },
            ].map(s => (
              <button key={s.key} onClick={() => { setSourceFilter(s.key); setPage(1) }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                  sourceFilter === s.key ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400">ID Transaksi</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Sumber</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Waktu</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Pelanggan</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Total</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Status / Bayar</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={7} className="px-6 py-4"><div className="h-10 bg-gray-100 rounded-xl animate-pulse" /></td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400">
                      <p className="text-3xl mb-2">🧾</p>
                      <p>Tidak ada transaksi ditemukan</p>
                    </td>
                  </tr>
                ) : paginated.map(order => {
                  const { date, time } = formatDateTime(order.created_at)
                  const source = order.source || 'online'
                  const method = getPaymentMethod(order.notes)
                  return (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800 text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                          source === 'kasir' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {source === 'kasir' ? <CalculatorIcon className="w-3.5 h-3.5" /> : <GlobeAltIcon className="w-3.5 h-3.5" />}
                          {source === 'kasir' ? 'Kasir' : 'Online'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-800">{date}</p>
                        <p className="text-xs text-gray-400">{time}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-gray-800">{order.customer_name || 'Walk-in Customer'}</p>
                        {source === 'online' && <p className="text-xs text-gray-400">{order.customer_phone || '-'}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-800 text-sm">Rp {order.total?.toLocaleString('id-ID')}</p>
                      </td>
                      <td className="px-4 py-4">
                        {source === 'kasir' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                            {getPaymentIcon(method)}
                            {method}
                          </span>
                        ) : (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[order.status]?.color || 'bg-gray-100 text-gray-500'}`}>
                            {statusConfig[order.status]?.label || order.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button onClick={() => { setSelectedOrder(order); setShowDetail(true) }}
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
              <p className="text-sm text-gray-400">
                Menampilkan {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} dari {filtered.length} transaksi
              </p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-40">‹</button>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${page === i + 1 ? 'bg-orange-500 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || totalPages === 0}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-40">›</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Tampilkan</span>
                  <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
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
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Detail Transaksi</h2>
                <p className="text-xs text-gray-400">#{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button onClick={() => setShowDetail(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${
                  (selectedOrder.source || 'online') === 'kasir' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {(selectedOrder.source || 'online') === 'kasir' ? <CalculatorIcon className="w-3.5 h-3.5" /> : <GlobeAltIcon className="w-3.5 h-3.5" />}
                  {(selectedOrder.source || 'online') === 'kasir' ? 'Transaksi Kasir' : 'Pesanan Online'}
                </span>
                <p className="text-xs text-gray-400">
                  {formatDateTime(selectedOrder.created_at).date} • {formatDateTime(selectedOrder.created_at).time}
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Info Pelanggan</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Nama', value: selectedOrder.customer_name || 'Walk-in Customer' },
                    ...(selectedOrder.customer_phone && selectedOrder.customer_phone !== '-' ? [{ label: 'WhatsApp', value: selectedOrder.customer_phone }] : []),
                    ...(selectedOrder.customer_address ? [{ label: 'Alamat', value: selectedOrder.customer_address }] : []),
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="font-medium text-gray-800 text-right max-w-[200px]">{item.value || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Item Pesanan</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-50 rounded-xl overflow-hidden flex-shrink-0">
                        {item.foods?.image ? (
                          <img src={item.foods.image} alt={item.foods?.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
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
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-orange-500">Rp {selectedOrder.total?.toLocaleString('id-ID')}</span>
              </div>

              {(selectedOrder.source || 'online') === 'online' && (
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-2">Status Pesanan</h3>
                  <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${statusConfig[selectedOrder.status]?.color}`}>
                    {statusConfig[selectedOrder.status]?.label}
                  </span>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-600 font-medium">Catatan</p>
                  <p className="text-xs text-blue-500 mt-1">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}