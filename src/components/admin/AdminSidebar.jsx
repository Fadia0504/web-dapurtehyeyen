import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import {
  HomeIcon, ShoppingBagIcon, CakeIcon, TagIcon,
  UserGroupIcon, CogIcon, ArrowRightOnRectangleIcon,
  DocumentChartBarIcon, StarIcon, CalculatorIcon,
  ClockIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function AdminSidebar() {
  const { pathname } = useLocation()
  const { profile, can } = useAuthStore()
  const isSuperAdmin = profile?.role === 'superadmin'
  const isAdmin = profile?.role === 'admin' || isSuperAdmin
  const isStaff = profile?.role === 'staff'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const NavItem = ({ to, icon: Icon, label, show = true }) => {
    if (!show) return null
    return (
      <Link to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition mb-1 ${
          pathname === to
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
      <div className="px-6 mb-6">
        <Link to="/admin" className="flex items-center gap-2">
          <img
            src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
            alt="Logo" className="h-8 w-auto"
          />
          <span className="font-black text-orange-500 text-base leading-tight">Dapur Teh Yeyen</span>
        </Link>

        {/* Role Badge */}
        <div className={`mt-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold w-fit ${
          isSuperAdmin ? 'bg-purple-100 text-purple-600'
          : isAdmin ? 'bg-blue-100 text-blue-600'
          : 'bg-green-100 text-green-600'
        }`}>
          <ShieldCheckIcon className="w-3 h-3" />
          {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Staff'}
        </div>
      </div>

      <div className="px-3 mb-2">
        <NavItem to="/admin" icon={HomeIcon} label="Dashboard" show={can('view_dashboard')} />
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* MANAGEMENT */}
        <div className="px-3 mb-4">
          <p className="text-xs text-gray-400 font-semibold px-4 mb-2">MANAGEMENT</p>
          <NavItem to="/admin/orders" icon={ShoppingBagIcon} label="Pesanan Online" show={can('view_orders')} />
          <NavItem to="/admin/kasir" icon={CalculatorIcon} label="Kasir" show={can('view_kasir')} />
          <NavItem to="/admin/kasir/history" icon={ClockIcon} label="Riwayat Kasir" show={can('view_kasir')} />
          <NavItem to="/admin/foods" icon={CakeIcon} label="Menu Makanan" show={can('manage_foods') || can('view_foods')} />
          <NavItem to="/admin/categories" icon={TagIcon} label="Kategori" show={can('view_categories')} />
          <NavItem to="/admin/customers" icon={UserGroupIcon} label="Pelanggan" show={can('view_customers')} />
        </div>

        {/* SISTEM */}
        <div className="px-3 mb-4">
          <p className="text-xs text-gray-400 font-semibold px-4 mb-2">SISTEM</p>
          <NavItem to="/admin/reviews" icon={StarIcon} label="Ulasan & Testimoni" show={can('view_reviews')} />
          <NavItem to="/admin/reports" icon={DocumentChartBarIcon} label="Laporan" show={can('view_reports')} />
          <NavItem to="/admin/settings" icon={CogIcon} label="Pengaturan" show={can('view_settings')} />
        </div>

        {/* SUPER ADMIN ONLY */}
        {isSuperAdmin && (
          <div className="px-3 mb-4">
            <p className="text-xs text-purple-400 font-semibold px-4 mb-2">SUPER ADMIN</p>
            <NavItem to="/admin/manage-roles" icon={ShieldCheckIcon} label="Kelola Role & Akses" show={true} />
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
  )
}