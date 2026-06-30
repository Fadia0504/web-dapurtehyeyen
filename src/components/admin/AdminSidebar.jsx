import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import {
  HomeIcon, ShoppingBagIcon, CakeIcon, TagIcon,
  UserGroupIcon, CogIcon, ArrowRightOnRectangleIcon,
  DocumentChartBarIcon, StarIcon, CalculatorIcon,
  ClockIcon, ShieldCheckIcon, ChartBarIcon
} from '@heroicons/react/24/outline'

export default function AdminSidebar() {
  const { pathname } = useLocation()
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const isStaff = profile?.role === 'staff'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const NavItem = ({ to, icon: Icon, label }) => {
    const active = to === '/admin'
      ? pathname === '/admin'
      : pathname.startsWith(to)
    return (
      <Link to={to}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition mb-1 ${
          active
            ? 'bg-orange-50 text-orange-500'
            : 'text-gray-600 hover:bg-gray-50 hover:text-orange-500'
        }`}>
        <Icon className="w-5 h-5" />
        {label}
      </Link>
    )
  }

  return (
    <aside className="w-56 bg-white shadow-sm flex flex-col py-6 fixed h-full z-20">

      {/* Logo + Badge */}
      <div className="px-6 mb-5">
        <Link to={isAdmin ? '/admin' : '/admin/kasir'} className="flex items-center gap-2">
          <img
            src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
            alt="Logo" className="h-8 w-auto"
          />
          <span className="font-black text-orange-500 text-base leading-tight">Dapur Teh Yeyen</span>
        </Link>

        {/* Badge role — hanya Admin atau Staff */}
        <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isAdmin ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
        }`}>
          <ShieldCheckIcon className="w-3 h-3" />
          {isAdmin ? 'Admin' : 'Staff'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Dashboard — admin only */}
        {isAdmin && (
          <div className="px-3 mb-3">
            <NavItem to="/admin" icon={HomeIcon} label="Dashboard" />
          </div>
        )}

        {/* KASIR — staff only */}
        {isStaff && (
          <div className="px-3 mb-4">
            <p className="text-xs text-gray-400 font-semibold px-4 mb-2">KASIR</p>
            <NavItem to="/admin/kasir" icon={CalculatorIcon} label="Kasir" />
            <NavItem to="/admin/kasir/history" icon={ClockIcon} label="Riwayat Transaksi" />
          </div>
        )}

        {/* PESANAN — staff & admin bisa lihat */}
        <div className="px-3 mb-4">
          <p className="text-xs text-gray-400 font-semibold px-4 mb-2">PESANAN</p>
          <NavItem to="/admin/orders" icon={ShoppingBagIcon} label="Pesanan Online" />
          {isAdmin && (
            <NavItem to="/admin/transactions" icon={ChartBarIcon} label="Riwayat Transaksi" />
          )}
        </div>

        {/* MANAGEMENT — admin only */}
        {isAdmin && (
          <div className="px-3 mb-4">
            <p className="text-xs text-gray-400 font-semibold px-4 mb-2">MANAGEMENT</p>
            <NavItem to="/admin/foods" icon={CakeIcon} label="Menu Makanan" />
            <NavItem to="/admin/categories" icon={TagIcon} label="Kategori" />
            <NavItem to="/admin/customers" icon={UserGroupIcon} label="Pelanggan" />
          </div>
        )}

        {/* SISTEM — admin only */}
        {isAdmin && (
          <div className="px-3 mb-4">
            <p className="text-xs text-gray-400 font-semibold px-4 mb-2">SISTEM</p>
            <NavItem to="/admin/reviews" icon={StarIcon} label="Ulasan & Testimoni" />
            <NavItem to="/admin/reports" icon={DocumentChartBarIcon} label="Laporan" />
            <NavItem to="/admin/settings" icon={CogIcon} label="Pengaturan" />
            <NavItem to="/admin/manage-roles" icon={ShieldCheckIcon} label="Kelola Role" />
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="px-3">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 text-sm font-medium transition w-full">
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  )
}