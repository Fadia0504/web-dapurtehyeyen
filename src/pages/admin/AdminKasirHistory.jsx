import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import {
  MagnifyingGlassIcon, ChevronDownIcon, ArrowRightOnRectangleIcon,
  EyeIcon, XMarkIcon, BanknotesIcon, CreditCardIcon, QrCodeIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline'
import { formatDateTime } from '../../lib/timeUtils'
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom'

export default function AdminKasirHistory() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const adminDropRef = useRef()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [adminDropdown, setAdminDropdown] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [summary, setSummary] = useState({ total: 0, count: 0, cash: 0, transfer: 0, qris: 0 })

  useEffect(() => { fetchOrders() }, [dateFilter])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target))
        setAdminDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchOrders() {
    setLoading(true)

    let query = supabase
      .from('orders')
      .select('*, order_items(*, foods(name, image))')
      .eq('source', 'kasir')
      .order('created_at', { ascending: false })

    // Filter tanggal
    const now = new Date()
    if (dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      query = query.gte('created_at', start)
    } else if (dateFilter === 'week') {
      const start = new Date(now.getTime() - 7 * 86400000).toISOString()
      query = query.gte('created_at', start)
    } else if (dateFilter === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      query = query.gte('created_at', start)
    }

    const { data } = await query
    const orders = data || []
    setOrders(orders)

    // Hitung summary
    let totalRev = 0, cash = 0, transfer = 0, qris = 0
    orders.forEach(o => {
      totalRev += o.total || 0
      const notes = o.notes || ''
      if (notes.includes('Tunai')) cash += o.total || 0
      else if (notes.includes('Transfer')) transfer += o.total || 0
      else if (notes.includes('QRIS')) qris += o.total || 0
    })
    setSummary({ total: totalRev, count: orders.length, cash, transfer, qris })
    setLoading(false)
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question', title: 'Keluar dari Akun?',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'Ya, Keluar', cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' }
    })
    if (!result.isConfirmed) return
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
    if (method === 'Tunai') return <BanknotesIcon className="w-4 h-4 text-green-500" />
    if (method === 'Transfer') return <CreditCardIcon className="w-4 h-4 text-blue-500" />
    if (method === 'QRIS') return <QrCodeIcon className="w-4 h-4 text-purple-500" />
    return null
  }

  const getPaymentBadge = (method) => {
    if (method === 'Tunai') return 'bg-green-100 text-green-600'
    if (method === 'Transfer') return 'bg-blue-100 text-blue-600'
    if (method === 'QRIS') return 'bg-purple-100 text-purple-600'
    return 'bg-gray-100 text-gray-500'
  }

  const filtered = orders.filter(o =>
    (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    o.id.slice(0, 8).toUpperCase().includes(search.toUpperCase())
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
                placeholder="Cari transaksi kasir..."
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
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Riwayat Kasir</h1>
              <p className="text-gray-400 text-sm mt-1">Riwayat seluruh transaksi penjualan offline.</p>
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
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Pendapatan Kasir', value: `Rp ${summary.total.toLocaleString('id-ID')}`, icon: ReceiptPercentIcon, bg: 'bg-orange-50', iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
              { label: 'Total Transaksi', value: summary.count, icon: BanknotesIcon, bg: 'bg-green-50', iconColor: 'text-green-500', iconBg: 'bg-green-100' },
              { label: 'Pendapatan Tunai', value: `Rp ${summary.cash.toLocaleString('id-ID')}`, icon: BanknotesIcon, bg: 'bg-blue-50', iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
              { label: 'Transfer & QRIS', value: `Rp ${(summary.transfer + summary.qris).toLocaleString('id-ID')}`, icon: QrCodeIcon, bg: 'bg-purple-50', iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className={`w-11 h-11 ${s.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <p className="text-gray-400 text-xs">{s.label}</p>
                <p className="text-xl font-black text-gray-900 mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400">ID Transaksi</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Waktu</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Pelanggan</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Item</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Total</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Metode Bayar</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400">
                      <p className="text-3xl mb-2">🧾</p>
                      <p>Belum ada transaksi kasir</p>
                    </td>
                  </tr>
                ) : paginated.map(order => {
                  const { date, time } = formatDateTime(order.created_at)
                  const method = getPaymentMethod(order.notes)
                  return (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800 text-sm">
                          #TRX-{order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-800">{date}</p>
                        <p className="text-xs text-gray-400">{time}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-gray-800">
                          {order.customer_name || 'Walk-in Customer'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-600">
                          {order.order_items?.length || 0} item
                          <span className="text-gray-400 text-xs ml-1">
                            ({order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0} pcs)
                          </span>
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-800 text-sm">
                          Rp {order.total?.toLocaleString('id-ID')}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${getPaymentBadge(method)}`}>
                          {getPaymentIcon(method)}
                          {method}
                        </span>
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
                <h2 className="font-bold text-gray-900">Detail Transaksi Kasir</h2>
                <p className="text-xs text-gray-400">#TRX-{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button onClick={() => setShowDetail(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Info Transaksi</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Pelanggan', value: selectedOrder.customer_name || 'Walk-in Customer' },
                    { label: 'Waktu', value: `${formatDateTime(selectedOrder.created_at).date} • ${formatDateTime(selectedOrder.created_at).time}` },
                    { label: 'Metode Bayar', value: getPaymentMethod(selectedOrder.notes) },
                    { label: 'Kasir', value: selectedOrder.notes?.split('|')[0]?.replace('Pembayaran:', '').trim() || '-' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="font-medium text-gray-800 text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Item yang Dibeli</h3>
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
                        <p className="text-xs text-gray-400">x{item.quantity} × Rp {item.price?.toLocaleString('id-ID')}</p>
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