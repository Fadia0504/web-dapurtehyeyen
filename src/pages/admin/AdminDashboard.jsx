import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import Swal from 'sweetalert2'
import {
  MagnifyingGlassIcon, ChevronDownIcon, ArrowRightOnRectangleIcon,
  BanknotesIcon, ShoppingCartIcon, UserGroupIcon, CakeIcon
} from '@heroicons/react/24/outline'
import { formatDateTime } from '../../lib/timeUtils'

const statusColors = {
  pending:   'bg-yellow-100 text-yellow-600',
  confirmed: 'bg-blue-100 text-blue-600',
  processing:'bg-orange-100 text-orange-600',
  delivered: 'bg-purple-100 text-purple-600',
  done:      'bg-green-100 text-green-600',
  cancelled: 'bg-red-100 text-red-500',
}

const statusLabels = {
  pending:   'Menunggu',
  confirmed: 'Dikonfirmasi',
  processing:'Diproses',
  delivered: 'Dikirim',
  done:      'Selesai',
  cancelled: 'Dibatalkan',
}

export default function AdminDashboard() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ orders: 0, customers: 0, foods: 0, revenue: 0 })
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [adminDropdown, setAdminDropdown] = useState(false)
  const adminDropRef = useRef()

  useEffect(() => {
    fetchStats()
    fetchOrders()

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchStats(); fetchOrders()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchStats(); fetchOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target))
        setAdminDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchStats() {
    const [
      { count: orderCount },
      { count: customerCount },
      { count: foodCount },
      { data: revenueData },
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('foods').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total').neq('status', 'cancelled'),
    ])
    const revenue = revenueData?.reduce((s, o) => s + (o.total || 0), 0) || 0
    setStats({
      orders: orderCount || 0,
      customers: customerCount || 0,
      foods: foodCount || 0,
      revenue,
    })
  }

  async function fetchOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) { console.error('fetchOrders error:', error); return }
    setOrders(data || [])
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
      customClass: {
        popup: 'rounded-2xl',
        cancelButton: '!text-gray-700',
      },
    })
    if (!result.isConfirmed) return
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const tabs = [
    { key: 'pending',   label: 'Menunggu' },
    { key: 'confirmed', label: 'Dikonfirmasi' },
    { key: 'processing',label: 'Diproses' },
    { key: 'delivered', label: 'Dikirim' },
  ]

  const statCards = [
    {
      label: 'Total Pendapatan',
      value: `Rp ${stats.revenue.toLocaleString('id-ID')}`,
      icon: BanknotesIcon,
      bg: 'bg-orange-50',
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-100',
      growth: '+12.5%',
      growthUp: true,
    },
    {
      label: 'Total Pesanan',
      value: stats.orders,
      icon: ShoppingCartIcon,
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
      iconBg: 'bg-green-100',
      growth: '+8.2%',
      growthUp: true,
    },
    {
      label: 'Total Pelanggan',
      value: stats.customers,
      icon: UserGroupIcon,
      bg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100',
      growth: '+15.3%',
      growthUp: true,
    },
    {
      label: 'Total Menu',
      value: stats.foods,
      icon: CakeIcon,
      bg: 'bg-purple-50',
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-100',
      growth: '+3.1%',
      growthUp: true,
    },
  ]

  const filteredOrders = orders.filter(o => o.status === activeTab)
  const recentOrders = [...orders].slice(0, 5)
  const activeOrdersCount = orders.filter(o => !['done', 'cancelled'].includes(o.status)).length
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
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              Selamat datang kembali, {adminName.split(' ')[0]}! Berikut ringkasan aktivitas platform.
            </p>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {statCards.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className={`w-12 h-12 ${s.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                  <s.icon className={`w-6 h-6 ${s.iconColor}`} />
                </div>
                <p className="text-gray-400 text-sm">{s.label}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{s.value}</p>
                <p className={`text-xs mt-1 font-medium ${s.growthUp ? 'text-green-500' : 'text-red-400'}`}>
                  {s.growth} dibanding minggu lalu
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">

            {/* PESANAN BERJALAN */}
            <div className="col-span-2 bg-white rounded-2xl shadow-sm">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Pesanan Berjalan</h2>
                <span className="text-xs bg-orange-50 text-orange-500 px-3 py-1 rounded-full font-medium">
                  {activeOrdersCount} aktif
                </span>
              </div>

              <div className="flex gap-1 px-6 pt-4 flex-wrap">
                {tabs.map(tab => {
                  const count = orders.filter(o => o.status === tab.key).length
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition flex items-center gap-1.5 mb-2 ${
                        activeTab === tab.key ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                      }`}>
                      {tab.label}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        activeTab === tab.key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
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
                        <td colSpan={5} className="text-center text-gray-400 py-10 text-sm">
                          <ShoppingCartIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                          Tidak ada pesanan dengan status ini
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => {
                        const { time } = formatDateTime(order.created_at)
                        return (
                          <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-3 text-sm font-medium text-gray-800">
                              #{order.id.slice(0,8).toUpperCase()}
                            </td>
                            <td className="py-3 text-sm text-gray-600">{order.customer_name || '-'}</td>
                            <td className="py-3 text-sm font-semibold text-gray-800">
                              Rp {order.total?.toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 text-xs text-gray-400">{time}</td>
                            <td className="py-3">
                              <button onClick={() => navigate('/admin/orders')}
                                className="border border-orange-200 text-orange-500 px-3 py-1 rounded-lg text-xs hover:bg-orange-50 transition">
                                Detail
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
                {filteredOrders.length > 0 && (
                  <button onClick={() => navigate('/admin/orders')}
                    className="w-full mt-4 text-orange-500 text-sm font-medium hover:underline">
                    Lihat Semua Pesanan →
                  </button>
                )}
              </div>
            </div>

            {/* KANAN */}
            <div className="space-y-4">

              {/* Pesanan Terbaru */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900">Pesanan Terbaru</h2>
                  <button onClick={() => navigate('/admin/orders')}
                    className="text-orange-500 text-xs hover:underline">
                    Lihat Semua
                  </button>
                </div>
                <div className="space-y-3">
                  {recentOrders.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-4">Belum ada pesanan</p>
                  ) : (
                    recentOrders.map(order => {
                      const { time } = formatDateTime(order.created_at)
                      return (
                        <div key={order.id} className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <ShoppingCartIcon className="w-5 h-5 text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800">
                              #{order.id.slice(0,8).toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{order.customer_name || '-'}</p>
                            <p className="text-xs text-gray-300">{time}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              statusColors[order.status] || 'bg-gray-100 text-gray-500'
                            }`}>
                              {statusLabels[order.status] || order.status}
                            </span>
                            <p className="text-xs font-bold text-gray-800 mt-1">
                              Rp {order.total?.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Ringkasan Status */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">Ringkasan Status</h2>
                <div className="space-y-2.5">
                  {Object.entries(statusLabels).map(([key, label]) => {
                    const count = orders.filter(o => o.status === key).length
                    const dotColor = {
                      pending:   'bg-yellow-400',
                      confirmed: 'bg-blue-400',
                      processing:'bg-orange-400',
                      delivered: 'bg-purple-400',
                      done:      'bg-green-400',
                      cancelled: 'bg-red-400',
                    }[key]
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                          <span className="text-sm text-gray-600">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${dotColor}`}
                              style={{ width: orders.length ? `${(count / orders.length) * 100}%` : '0%' }} />
                          </div>
                          <span className="text-sm font-bold text-gray-800 w-4 text-right">{count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}