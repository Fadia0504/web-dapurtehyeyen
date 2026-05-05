import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import {
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  EyeIcon,
  EllipsisHorizontalIcon,
  CalendarIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { formatDateTime } from '../../lib/timeUtils'

const statusConfig = {
  pending: { label: 'Menunggu Konfirmasi', color: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  confirmed: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  processing: { label: 'Diproses', color: 'bg-orange-100 text-orange-600 border border-orange-200' },
  delivered: { label: 'Dikirim', color: 'bg-green-100 text-green-700 border border-green-200' },
  done: { label: 'Selesai', color: 'bg-gray-100 text-gray-600 border border-gray-200' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-600 border border-red-200' },
}

const tabs = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu Konfirmasi' },
  { key: 'processing', label: 'Diproses' },
  { key: 'delivered', label: 'Dikirim' },
  { key: 'done', label: 'Selesai' },
  { key: 'cancelled', label: 'Dibatalkan' },
]

export default function AdminOrders() {
  const { profile } = useAuthStore()
  const adminDropRef = useRef()
  const [adminDropdown, setAdminDropdown] = useState(false)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(8)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [actionMenu, setActionMenu] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [])

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
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, foods(name, image))')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const handleUpdateStatus = async (orderId, status) => {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setActionMenu(null)
    if (selectedOrder?.id === orderId) setSelectedOrder((prev) => ({ ...prev, status }))
    await fetchOrders()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const filtered =
    activeTab === 'all' ? orders : orders.filter((o) => o.status === activeTab)
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const countByStatus = (key) =>
    key === 'all' ? orders.length : orders.filter((o) => o.status === key).length
  const adminName = profile?.full_name || 'Admin'

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
              <button
                onClick={() => setAdminDropdown((prev) => !prev)}
                className="flex items-center gap-3 pl-4 border-l border-gray-100 hover:bg-gray-50 px-3 py-2 rounded-xl transition"
              >
                <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-500 text-sm">
                  {adminName[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">{adminName.split(' ')[0]}</p>
                  <p className="text-xs text-gray-400">Super Administrator</p>
                </div>
                <ChevronDownIcon
                  className={`w-4 h-4 text-gray-400 transition-transform ${adminDropdown ? 'rotate-180' : ''}`}
                />
              </button>
              {adminDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-500 transition w-full text-left"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Daftar Pesanan
              </h1>
              <p className="text-gray-400 text-sm mt-1">Kelola semua pesanan yang masuk dari pelanggan.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-500">
                <CalendarIcon className="w-4 h-4" />
                <span>Pilih Tanggal</span>
              </div>
              <button className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                <FunnelIcon className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1) }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition border ${
                  activeTab === tab.key
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
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
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Metode Pengiriman</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Total</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Status</th>
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
                      <p className="text-3xl mb-2">📋</p>
                      <p>Tidak ada pesanan</p>
                    </td>
                  </tr>
                ) : (
                  paginated.map((order) => {
                    const { date, time } = formatDateTime(order.created_at)
                    const status = statusConfig[order.status] || statusConfig.pending
                    return (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
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
                            <span className="text-lg">🚚</span>
                            <div>
                              <p className="text-sm text-gray-800">Diantar ke Alamat</p>
                              <p className="text-xs text-gray-400 max-w-[160px] truncate">
                                {order.customer_address || '-'}
                              </p>
                            </div>
                          </div>
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setSelectedOrder(order); setShowDetail(true) }}
                              className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => setActionMenu(actionMenu === order.id ? null : order.id)}
                                className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"
                              >
                                <EllipsisHorizontalIcon className="w-4 h-4" />
                              </button>
                              {actionMenu === order.id && (
                                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
                                  <p className="text-xs text-gray-400 font-semibold px-4 pt-3 pb-1">
                                    Ubah Status
                                  </p>
                                  {Object.entries(statusConfig).map(([key, val]) => (
                                    <button
                                      key={key}
                                      onClick={() => handleUpdateStatus(order.id, key)}
                                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition flex items-center gap-2 ${
                                        order.status === key ? 'text-orange-500 font-medium' : 'text-gray-700'
                                      }`}
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          key === 'pending' ? 'bg-yellow-400'
                                          : key === 'processing' ? 'bg-orange-400'
                                          : key === 'delivered' ? 'bg-green-400'
                                          : key === 'done' ? 'bg-gray-400'
                                          : key === 'cancelled' ? 'bg-red-400'
                                          : 'bg-blue-400'
                                        }`}
                                      />
                                      {val.label}
                                      {order.status === key && (
                                        <span className="ml-auto text-xs">✓</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
              <p className="text-sm text-gray-400">
                Menampilkan {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} -{' '}
                {Math.min(page * perPage, filtered.length)} dari {filtered.length} pesanan
              </p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    ‹
                  </button>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                        page === i + 1 ? 'bg-orange-500 text-white' : 'border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  {totalPages > 5 && <span className="text-gray-400 text-sm px-1">...</span>}
                  {totalPages > 5 && (
                    <button
                      onClick={() => setPage(totalPages)}
                      className="w-8 h-8 rounded-lg text-sm font-medium transition border border-gray-200 hover:bg-gray-50"
                    >
                      {totalPages}
                    </button>
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || totalPages === 0}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    ›
                  </button>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-400">Tampilkan</span>
                  <select
                    value={perPage}
                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none"
                  >
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

      {/* DETAIL ORDER MODAL */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDetail(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Detail Pesanan</h2>
                <p className="text-xs text-gray-400">
                  #ORD-{selectedOrder.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${statusConfig[selectedOrder.status]?.color}`}>
                  {statusConfig[selectedOrder.status]?.label}
                </span>
                <p className="text-xs text-gray-400">
                  {formatDateTime(selectedOrder.created_at).date} •{' '}
                  {formatDateTime(selectedOrder.created_at).time}
                </p>
              </div>

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
                      <span className="font-medium text-gray-800 text-right max-w-[200px]">
                        {item.value || '-'}
                      </span>
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
                <span className="text-orange-500">
                  Rp {selectedOrder.total?.toLocaleString('id-ID')}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Update Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(statusConfig).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => handleUpdateStatus(selectedOrder.id, key)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium transition border ${
                        selectedOrder.status === key
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500'
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}