import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import {
  HomeIcon, UserIcon, ClipboardDocumentListIcon,
  TruckIcon, HeartIcon, MapPinIcon, CreditCardIcon,
  Cog6ToothIcon, ArrowRightOnRectangleIcon, ShoppingBagIcon, CheckCircleIcon
} from '@heroicons/react/24/outline'

const menuItems = [
  { icon: HomeIcon, label: 'Dashboard', active: true },
  { icon: UserIcon, label: 'Profil Saya' },
  { icon: ClipboardDocumentListIcon, label: 'Riwayat Pesanan' },
  { icon: TruckIcon, label: 'Pesanan Berjalan', badge: 2 },
  { icon: HeartIcon, label: 'Wishlist / Favorit' },
  { icon: MapPinIcon, label: 'Alamat Pengiriman' },
  { icon: CreditCardIcon, label: 'Metode Pembayaran' },
  { icon: Cog6ToothIcon, label: 'Pengaturan Akun' },
]

export default function Dashboard() {
  const { user, profile, logout } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [foods, setFoods] = useState([])
  const addItem = useCartStore(state => state.addItem)

  useEffect(() => {
    if (user) {
      supabase.from('orders').select('*, order_items(*, foods(name, image))')
        .eq('user_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => setOrders(data || []))

      supabase.from('foods').select('*, categories(name)')
        .eq('is_available', true).limit(4)
        .then(({ data }) => setFoods(data || []))
    }
  }, [user])

  const stats = [
    { icon: <ShoppingBagIcon className="w-8 h-8 text-orange-500" />, label: 'Total Pesanan', value: orders.length, bg: 'bg-orange-50' },
    { icon: <CheckCircleIcon className="w-8 h-8 text-green-500" />, label: 'Pesanan Selesai', value: orders.filter(o => o.status === 'done').length, bg: 'bg-green-50' },
    { icon: <TruckIcon className="w-8 h-8 text-blue-500" />, label: 'Pesanan Aktif', value: orders.filter(o => o.status === 'pending').length, bg: 'bg-blue-50' },
    { icon: <HeartIcon className="w-8 h-8 text-pink-500" />, label: 'Wishlist', value: 0, bg: 'bg-pink-50' },
  ]

  const name = profile?.full_name || user?.email?.split('@')[0] || 'Pengguna'

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-60 bg-white shadow-sm flex flex-col py-6 px-4 sticky top-0 h-screen">
        <div className="space-y-1 flex-1">
          {menuItems.map((item, i) => (
            <button key={i}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${item.active ? 'bg-orange-50 text-orange-500' : 'text-gray-600 hover:bg-gray-50'}`}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={logout}
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-500 rounded-xl transition w-full">
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900" style={{fontFamily:'Playfair Display, serif'}}>
            Halo, {name} 👋
          </h1>
          <p className="text-gray-400 mt-1">Selamat datang kembali di Dapur Teh Yeyen. Yuk, pesan makanan favoritmu!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4 flex items-center gap-4`}>
              <div>{s.icon}</div>
              <div>
                <p className="text-gray-500 text-sm">{s.label}</p>
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-gray-400 text-xs">Pesanan</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Pesanan Berjalan */}
          <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900">Pesanan Berjalan</h2>
              <Link to="/menu" className="text-orange-500 text-sm hover:underline">Lihat Semua</Link>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ShoppingBagIcon className="w-12 h-12 mx-auto mb-2 text-gray-200" />
                <p>Belum ada pesanan</p>
                <Link to="/menu" className="text-orange-500 text-sm hover:underline mt-1 block">Pesan sekarang →</Link>
              </div>
            ) : (
              orders.slice(0, 2).map(order => (
                <div key={order.id} className="border border-gray-100 rounded-xl p-4 mb-3">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">Order #{order.id.slice(0,8)}</p>
                      <p className={`text-sm font-medium mt-0.5 ${order.status === 'pending' ? 'text-orange-500' : 'text-green-500'}`}>
                        {order.status === 'pending' ? 'Diproses' : 'Selesai'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">Rp {order.total?.toLocaleString('id-ID')}</p>
                      <p className="text-gray-400 text-xs">{new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mt-2">
                    {['Order Dibuat', 'Diproses', 'Dikirim', 'Sampai'].map((step, i) => (
                      <div key={i} className="flex items-center flex-1">
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${i <= 1 ? 'bg-orange-500' : 'bg-gray-200'}`} />
                        {i < 3 && <div className={`flex-1 h-0.5 ${i < 1 ? 'bg-orange-500' : 'bg-gray-200'}`} />}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {['Order Dibuat', 'Diproses', 'Dikirim', 'Sampai'].map((s, i) => (
                      <span key={i} className={`text-xs ${i <= 1 ? 'text-orange-500 font-medium' : 'text-gray-300'}`}>{s}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rekomendasi */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900">Mungkin Kamu Suka</h2>
              <Link to="/menu" className="text-orange-500 text-sm hover:underline">Lihat Semua</Link>
            </div>
            <div className="space-y-3">
              {foods.map(food => (
                <div key={food.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-orange-50 flex-shrink-0">
                    {food.image ? (
                      <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{food.name}</p>
                    <p className="text-orange-500 text-sm font-bold">Rp {food.price?.toLocaleString('id-ID')}</p>
                  </div>
                  <button onClick={() => addItem(food)}
                    className="text-orange-500 border border-orange-200 rounded-lg px-2 py-1 text-xs hover:bg-orange-50 transition flex-shrink-0">
                    + Keranjang
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notif aktif */}
        {orders.some(o => o.status === 'pending') && (
          <div className="mt-6 bg-orange-50 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <TruckIcon className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Pesananmu sedang diproses</p>
                <p className="text-gray-400 text-sm">Pesanan kamu sedang diproses oleh dapur.</p>
              </div>
            </div>
            <button className="bg-orange-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition">
              Lacak Pesanan
            </button>
          </div>
        )}
      </main>
    </div>
  )
}