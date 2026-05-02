import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import AdminSidebar from '../../components/admin/AdminSidebar'
import {
  BellIcon, MagnifyingGlassIcon, ChevronDownIcon,
  ArrowRightOnRectangleIcon, ShoppingBagIcon,
  CheckCircleIcon, TruckIcon, HeartIcon
} from '@heroicons/react/24/outline'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-600',
  confirmed: 'bg-blue-100 text-blue-600',
  processing: 'bg-orange-100 text-orange-600',
  delivered: 'bg-purple-100 text-purple-600',
  done: 'bg-green-100 text-green-600',
}
const statusLabels = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  processing: 'Diproses',
  delivered: 'Dikirim',
  done: 'Selesai',
}

export default function AdminDashboard() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ orders: 0, customers: 0, foods: 0, revenue: 0 })
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [adminDropdown, setAdminDropdown] = useState(false)
  const adminDropRef = useRef()
  const [notifications] = useState([
    { text: 'Pesanan baru #ORD-001 masuk', time: '14:32', color: 'bg-orange-100 text-orange-500' },
    { text: 'Pembayaran berhasil dikonfirmasi', time: '14:28', color: 'bg-green-100 text-green-500' },
    { text: 'Ulasan baru dari pelanggan', time: '13:20', color: 'bg-blue-100 text-blue-500' },
  ])

  useEffect(() => {
    fetchStats()
    fetchOrders()
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

  async function fetchStats() {
    const [{ count: orderCount }, { count: customerCount }, { count: foodCount }, { data: revenueData }] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('foods').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total'),
    ])
    const revenue = revenueData?.reduce((s, o) => s + (o.total || 0), 0) || 0
    setStats({ orders: orderCount || 0, customers: customerCount || 0, foods: foodCount || 0, revenue })
  }

  async function fetchOrders() {
    const { data } = await supabase.from('orders')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(10)
    setOrders(data || [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const filteredOrders = orders.filter(o => o.status === activeTab)
  const tabs = [
    { key: 'pending', label: 'Menunggu' },
    { key: 'confirmed', label: 'Dikonfirmasi' },
    { key: 'processing', label: 'Diproses' },
    { key: 'delivered', label: 'Dikirim' },
  ]

  const statCards = [
    { label: 'Total Pendapatan', value: `Rp ${stats.revenue.toLocaleString('id-ID')}`, icon: '💰', bg: 'bg-orange-50', growth: '+12.5%' },
    { label: 'Total Pesanan', value: stats.orders, icon: '🛒', bg: 'bg-green-50', growth: '+8.2%' },
    { label: 'Total Pelanggan', value: stats.customers, icon: '👥', bg: 'bg-blue-50', growth: '+15.3%' },
    { label: 'Total Menu', value: stats.foods, icon: '🍽️', bg: 'bg-purple-50', growth: '+3.1%' },
  ]

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
              <input
                placeholder="Cari pesanan, menu, pelanggan..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 transition"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button className="relative text-gray-500 hover:text-orange-500 transition">
              <BellIcon className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            </button>

            <div className="relative" ref={adminDropRef}>
              <button
                onClick={() => setAdminDropdown(prev => !prev)}
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
          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900" style={{fontFamily:'Playfair Display, serif'}}>Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Selamat datang kembali, Admin! Berikut ringkasan aktivitas platform.</p>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {statCards.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                  {s.icon}
                </div>
                <p className="text-gray-400 text-sm">{s.label}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{s.value}</p>
                <p className="text-green-500 text-xs mt-1 font-medium">{s.growth} dibanding minggu lalu</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* PESANAN BERJALAN */}
            <div className="col-span-2 bg-white rounded-2xl shadow-sm">
              <div className="p-6 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">Pesanan Berjalan</h2>
              </div>
              <div className="flex gap-1 px-6 pt-4">
                {tabs.map(tab => (
                  <button key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition ${activeTab === tab.key
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-500 hover:bg-gray-50'}`}>
                    {tab.label}
                    <span className="ml-1.5 text-xs opacity-80">
                      {orders.filter(o => o.status === tab.key).length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="p-6">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                      <th className="pb-3 font-medium">No. Order</th>
                      <th className="pb-3 font-medium">Pelanggan</th>
                      <th className="pb-3 font-medium">Total</th>
                      <th className="pb-3 font-medium">Waktu</th>
                      <th className="pb-3 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-400 py-8 text-sm">
                          Tidak ada pesanan
                        </td>
                      </tr>
                    ) : filteredOrders.map(order => (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 text-sm font-medium text-gray-800">#{order.id.slice(0,8).toUpperCase()}</td>
                        <td className="py-3 text-sm text-gray-600">{order.profiles?.full_name || order.customer_name || '-'}</td>
                        <td className="py-3 text-sm font-semibold text-gray-800">Rp {order.total?.toLocaleString('id-ID')}</td>
                        <td className="py-3 text-xs text-gray-400">{new Date(order.created_at).toLocaleString('id-ID')}</td>
                        <td className="py-3">
                          <button className="border border-orange-200 text-orange-500 px-3 py-1 rounded-lg text-xs hover:bg-orange-50 transition">
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="w-full mt-4 text-orange-500 text-sm font-medium hover:underline">
                  Lihat Semua Pesanan Berjalan
                </button>
              </div>
            </div>

            {/* KANAN */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900">Pesanan Terbaru</h2>
                  <button className="text-orange-500 text-xs hover:underline">Lihat Semua</button>
                </div>
                <div className="space-y-3">
                  {orders.slice(0, 4).map(order => (
                    <div key={order.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        🍽️
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">#{order.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-xs text-gray-400 truncate">{order.profiles?.full_name || order.customer_name || '-'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-500'}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                        <p className="text-xs font-bold text-gray-800 mt-1">Rp {order.total?.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <p className="text-center text-gray-400 text-xs py-4">Belum ada pesanan</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900">Notifikasi Sistem</h2>
                  <button className="text-orange-500 text-xs hover:underline">Lihat Semua</button>
                </div>
                <div className="space-y-3">
                  {notifications.map((n, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-8 h-8 ${n.color} rounded-xl flex items-center justify-center flex-shrink-0 text-sm`}>
                        🔔
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-700">{n.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}