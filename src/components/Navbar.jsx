import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { MagnifyingGlassIcon, ShoppingCartIcon, ChevronDownIcon, Squares2X2Icon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const items = useCartStore(state => state.items)
  const totalItems = items.reduce((sum, i) => sum + i.qty, 0)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, profile, logout } = useAuthStore()
  const [dropdown, setDropdown] = useState(false)
  const dropRef = useRef()

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropdown(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleAboutClick = (e) => {
    e.preventDefault()
    if (pathname !== '/') {
      navigate('/')
      setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 300)
    } else {
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleLogout = async () => {
    await logout()
    setDropdown(false)
    navigate('/')
  }

  const links = [
    { to: '/', label: 'Home', onClick: null },
    { to: '#about', label: 'About us', onClick: handleAboutClick },
    { to: '/menu', label: 'Menu', onClick: null },
    { to: '/testimonials', label: 'Testimonials', onClick: null },
    { to: '/contact', label: 'Contact us', onClick: null },
  ]

  const name = profile?.full_name || user?.email?.split('@')[0] || 'Pengguna'

  return (
    <nav className="bg-white px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <Link to="/" className="flex items-center gap-2">
        <img src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
          alt="Logo" className="h-10 w-auto object-contain" />
        <span className="text-xl font-black text-orange-500" style={{fontFamily:'Playfair Display, serif'}}>
          Dapur Teh Yeyen
        </span>
      </Link>

      <div className="flex gap-8 items-center">
        {links.map(l => (
          <Link key={l.label} to={l.to} onClick={l.onClick}
            className={`text-sm font-medium transition ${pathname === l.to ? 'text-orange-500 border-b-2 border-orange-500 pb-1' : 'text-gray-600 hover:text-orange-500'}`}>
            {l.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button className="text-gray-600 hover:text-orange-500 transition">
          <MagnifyingGlassIcon className="w-6 h-6" />
        </button>
        <Link to="/cart" className="relative text-gray-600 hover:text-orange-500 transition">
          <ShoppingCartIcon className="w-6 h-6" />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {totalItems}
            </span>
          )}
        </Link>

        {/* AUTH */}
        {user ? (
          <div className="relative" ref={dropRef}>
            <button onClick={() => setDropdown(!dropdown)}
              className="flex items-center gap-2 hover:bg-gray-50 px-3 py-2 rounded-xl transition">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-500 text-sm">
                {name[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">Halo, {name.split(' ')[0]}</span>
              <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition ${dropdown ? 'rotate-180' : ''}`} />
            </button>

            {dropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <Link to="/dashboard" onClick={() => setDropdown(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition">
                  <Squares2X2Icon className="w-5 h-5" />
                  Dashboard
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-500 transition w-full">
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login"
            className="bg-orange-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition">
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}