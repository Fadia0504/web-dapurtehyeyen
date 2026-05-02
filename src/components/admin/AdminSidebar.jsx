import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  HomeIcon, ShoppingBagIcon, CakeIcon, TagIcon,
  UserGroupIcon, CogIcon, ArrowRightOnRectangleIcon,
  DocumentChartBarIcon, StarIcon
} from '@heroicons/react/24/outline'

const sidebarItems = [
  { section: 'MANAGEMENT', items: [
    { icon: ShoppingBagIcon, label: 'Pesanan', to: '/admin/orders' },
    { icon: CakeIcon, label: 'Menu Makanan', to: '/admin/foods' },
    { icon: TagIcon, label: 'Kategori', to: '/admin/categories' },
    { icon: UserGroupIcon, label: 'Pelanggan', to: '/admin/customers' },
  ]},
  { section: 'SISTEM', items: [
    { icon: StarIcon, label: 'Ulasan & Testimoni', to: '/admin/reviews' },
    { icon: DocumentChartBarIcon, label: 'Laporan', to: '/admin/reports' },
    { icon: CogIcon, label: 'Pengaturan', to: '/admin/settings' },
  ]},
]

export default function AdminSidebar() {
  const { pathname } = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="w-56 bg-white shadow-sm flex flex-col py-6 fixed h-full z-20">
      <div className="px-6 mb-8">
        <Link to="/admin" className="flex items-center gap-2">
          <img
            src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
            alt="Logo" className="h-8 w-auto"
          />
          <span className="font-black text-orange-500 text-base leading-tight">Dapur Teh Yeyen</span>
        </Link>
      </div>

      <div className="px-3 mb-2">
        <Link to="/admin"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${pathname === '/admin' ? 'bg-orange-50 text-orange-500' : 'text-gray-600 hover:bg-gray-50 hover:text-orange-500'}`}>
          <HomeIcon className="w-5 h-5" />
          Dashboard
        </Link>
      </div>

      {sidebarItems.map(section => (
        <div key={section.section} className="px-3 mb-4">
          <p className="text-xs text-gray-400 font-semibold px-4 mb-2">{section.section}</p>
          {section.items.map(item => (
            <Link key={item.label} to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition mb-1 ${pathname === item.to ? 'bg-orange-50 text-orange-500' : 'text-gray-600 hover:bg-gray-50 hover:text-orange-500'}`}>
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      <div className="mt-auto px-3">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 text-sm font-medium transition w-full">
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  )
}