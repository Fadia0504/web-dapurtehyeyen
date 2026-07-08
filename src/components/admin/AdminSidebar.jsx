import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import {
  HomeIcon, ShoppingBagIcon, CakeIcon, TagIcon,
  UserGroupIcon, CogIcon, ArrowRightOnRectangleIcon,
  DocumentChartBarIcon, StarIcon, CalculatorIcon,
  ClockIcon, ShieldCheckIcon, ChartBarIcon,
  Bars3Icon, XMarkIcon
} from '@heroicons/react/24/outline'

export default function AdminSidebar() {
  const { pathname } = useLocation()
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const isStaff = profile?.role === 'staff'
  const [open, setOpen] = useState(false)

  // Tutup drawer setiap kali pindah halaman (mobile)
  useEffect(() => { setOpen(false) }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const NavItem = ({ to, icon: Icon, label }) => {
    const active = to === '/admin' ? pathname === '/admin' : pathname.startsWith(to)
    return (
      <Link to={to}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition mb-1 ${
          active ? 'bg-orange-50 text-orange-500' : 'text-gray-600 hover:bg-gray-50 hover:text-orange-500'
        }`}>
        <Icon className="w-5 h-5" />
        {label}
      </Link>
    )
  }

  return (
    <>
      {/* Tombol hamburger — hanya mobile */}
      <button onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 bg-white shadow-md rounded-lg p-2 text-gray-700"
        aria-label="Buka menu">
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Overlay gelap saat drawer terbuka — mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar / Drawer */}
      <aside className={`w-56 bg-white shadow-sm flex flex-col py-6 fixed inset-y-0 left-0 h-full z-50
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        {/* Tombol tutup — hanya mobile */}
        <button onClick={() => setOpen(false)}
          className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          aria-label="Tutup menu">
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Logo + Badge */}
        <div className="px-6 mb-5">
          <Link to={isAdmin ? '/admin' : '/admin/kasir'} className="flex items-center gap-2">
            <img
              src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
              alt="Logo" className="h-8 w-auto"
            />
            <span className="font-black text-orange-500 text-base leading-tight">Dapur Teh Yeyen</span>
          </Link>

          <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isAdmin ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
          }`}>
            <ShieldCheckIcon className="w-3 h-3" />
            {isAdmin ? 'Admin' : 'Staff'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isAdmin && (
            <div className="px-3 mb-3">
              <NavItem to="/admin" icon={HomeIcon} label="Dashboard" />
            </div>
          )}

          {isStaff && (
            <div className="px-3 mb-4">
              <p className="text-xs text-gray-400 font-semibold px-4 mb-2">KASIR</p>
              <NavItem to="/admin/kasir" icon={CalculatorIcon} label="Kasir" />
              <NavItem to="/admin/kasir/history" icon={ClockIcon} label="Riwayat Transaksi" />
            </div>
          )}

          <div className="px-3 mb-4">
            <p className="text-xs text-gray-400 font-semibold px-4 mb-2">PESANAN</p>
            <NavItem to="/admin/orders" icon={ShoppingBagIcon} label="Pesanan Online" />
            {isAdmin && (
              <NavItem to="/admin/transactions" icon={ChartBarIcon} label="Riwayat Transaksi" />
            )}
          </div>

          {isAdmin && (
            <div className="px-3 mb-4">
              <p className="text-xs text-gray-400 font-semibold px-4 mb-2">MANAGEMENT</p>
              <NavItem to="/admin/foods" icon={CakeIcon} label="Menu Makanan" />
              <NavItem to="/admin/categories" icon={TagIcon} label="Kategori" />
              <NavItem to="/admin/customers" icon={UserGroupIcon} label="Pelanggan" />
            </div>
          )}

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

        <div className="px-3">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 text-sm font-medium transition w-full">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}