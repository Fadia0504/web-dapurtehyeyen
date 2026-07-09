import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import {
  MagnifyingGlassIcon, HeartIcon, AdjustmentsHorizontalIcon,
  ChevronDownIcon, PlusIcon, XMarkIcon, UserIcon, LockClosedIcon,
  SquaresPlusIcon, CakeIcon, BeakerIcon, SparklesIcon,
  ShoppingBagIcon, TagIcon, GlobeAltIcon, FunnelIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid'

const priceRanges = [
  { label: 'Semua Harga', min: 0, max: Infinity },
  { label: 'Di bawah Rp 10.000', min: 0, max: 10000 },
  { label: 'Rp 10.000 - Rp 20.000', min: 10000, max: 20000 },
  { label: 'Rp 20.000 - Rp 30.000', min: 20000, max: 30000 },
  { label: 'Di atas Rp 30.000', min: 30000, max: Infinity },
]

function LoginPopup({ show, onClose, message, navigate }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
          <XMarkIcon className="w-5 h-5 text-gray-400" />
        </button>
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LockClosedIcon className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-lg font-black text-gray-900 mb-2">Login Diperlukan</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition">
            Nanti Saja
          </button>
          <button onClick={() => { onClose(); navigate('/login') }}
            className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-orange-600 transition flex items-center justify-center gap-2">
            <UserIcon className="w-4 h-4" />
            Login Sekarang
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Belum punya akun?{' '}
          <button onClick={() => { onClose(); navigate('/register') }}
            className="text-orange-500 font-medium hover:underline">
            Daftar gratis
          </button>
        </p>
      </div>
    </div>
  )
}

function Toast({ show, message, type }) {
  if (!show) return null
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 transition-all max-w-[90vw] ${
      type === 'success' ? 'bg-green-500 text-white'
      : type === 'wishlist' ? 'bg-red-500 text-white'
      : 'bg-gray-700 text-white'
    }`}>
      <span className="text-lg flex-shrink-0">
        {type === 'success' ? '🛒' : type === 'wishlist' ? '❤️' : '🗑️'}
      </span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

const getCategoryIcon = (name) => {
  const cls = "w-4 h-4 flex-shrink-0"
  if (!name || name === 'Semua') return <SquaresPlusIcon className={cls} />
  if (name.includes('Catering')) return <CakeIcon className={cls} />
  if (name.includes('Ala Carte')) return <GlobeAltIcon className={cls} />
  if (name.includes('Minuman')) return <BeakerIcon className={cls} />
  if (name.includes('Snack') || name.includes('Cemilan')) return <SparklesIcon className={cls} />
  if (name.includes('Paket')) return <ShoppingBagIcon className={cls} />
  return <TagIcon className={cls} />
}

export default function Menu() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const addItem = useCartStore(state => state.addItem)

  const [foods, setFoods] = useState([])
  const [categories, setCategories] = useState([])
  const [foodStats, setFoodStats] = useState({})
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [activeCategoryFilter, setActiveCategoryFilter] = useState([])
  const [priceRange, setPriceRange] = useState(0)
  const [sortBy, setSortBy] = useState('popular')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [wishlistIds, setWishlistIds] = useState(new Set())
  const [wishlistMap, setWishlistMap] = useState({})
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [loginPopupMsg, setLoginPopupMsg] = useState('')
  const [toast, setToast] = useState({ show: false, message: '', type: '' })
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (user) fetchWishlist()
    else { setWishlistIds(new Set()); setWishlistMap({}) }
  }, [user])

  useEffect(() => {
    const channel = supabase
      .channel('menu-stats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_reviews' }, () => {
        fetchFoodStats()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchFoodStats()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchData() {
    const [{ data: cats }, { data: foodData }] = await Promise.all([
      supabase.from('categories').select('*').eq('type', 'online').order('created_at'),
      supabase.from('foods').select('*, categories(name)').eq('is_available', true).eq('is_offline', false),
    ])
    setCategories(cats || [])
    setFoods(foodData || [])
    setLoading(false)
    await fetchFoodStats()
  }

  async function fetchFoodStats() {
    const { data: reviewData } = await supabase
      .from('food_reviews').select('food_id, rating')

    const { data: soldData } = await supabase
      .from('order_items')
      .select('food_id, quantity, orders!inner(status)')
      .eq('orders.status', 'done')

    const stats = {}
    reviewData?.forEach(r => {
      if (!stats[r.food_id]) stats[r.food_id] = { ratings: [], soldCount: 0 }
      stats[r.food_id].ratings.push(r.rating)
    })
    soldData?.forEach(item => {
      if (!stats[item.food_id]) stats[item.food_id] = { ratings: [], soldCount: 0 }
      stats[item.food_id].soldCount += item.quantity || 0
    })

    const computed = {}
    Object.entries(stats).forEach(([foodId, data]) => {
      const ratings = data.ratings || []
      computed[foodId] = {
        avgRating: ratings.length > 0
          ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
          : 0,
        reviewCount: ratings.length,
        soldCount: data.soldCount || 0,
      }
    })
    setFoodStats(computed)
  }

  async function fetchWishlist() {
    if (!user) return
    const { data } = await supabase
      .from('wishlists').select('id, food_id').eq('user_id', user.id)
    if (data) {
      const ids = new Set(data.map(w => w.food_id))
      const map = {}
      data.forEach(w => { map[w.food_id] = w.id })
      setWishlistIds(ids)
      setWishlistMap(map)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 2500)
  }

  const handleAddToCart = (e, food) => {
    e.preventDefault()
    if (!user) {
      setLoginPopupMsg('Kamu perlu login terlebih dahulu untuk menambahkan menu ke keranjang belanja.')
      setShowLoginPopup(true)
      return
    }
    addItem({ ...food, qty: food.min_order || 1 })
    showToast(`${food.name} ditambahkan ke keranjang!`, 'success')
  }

  const handleToggleWishlist = async (e, food) => {
    e.preventDefault()
    if (!user) {
      setLoginPopupMsg('Kamu perlu login terlebih dahulu untuk menyimpan menu ke wishlist.')
      setShowLoginPopup(true)
      return
    }
    const isWishlisted = wishlistIds.has(food.id)
    if (isWishlisted) {
      await supabase.from('wishlists').delete().eq('id', wishlistMap[food.id])
      setWishlistIds(prev => { const next = new Set(prev); next.delete(food.id); return next })
      setWishlistMap(prev => { const next = { ...prev }; delete next[food.id]; return next })
      showToast(`${food.name} dihapus dari wishlist`, 'remove')
    } else {
      const { data } = await supabase.from('wishlists')
        .insert({ user_id: user.id, food_id: food.id }).select().single()
      if (data) {
        setWishlistIds(prev => new Set([...prev, food.id]))
        setWishlistMap(prev => ({ ...prev, [food.id]: data.id }))
        showToast(`${food.name} disimpan ke wishlist!`, 'wishlist')
      }
    }
  }

  const getStats = (foodId) => foodStats[foodId] || { avgRating: 0, reviewCount: 0, soldCount: 0 }

  const filtered = foods.filter(f => {
    const matchCategory = activeCategory === 'Semua' || f.categories?.name === activeCategory
    const matchFilter = activeCategoryFilter.length === 0 || activeCategoryFilter.includes(f.categories?.name)
    const range = priceRanges[priceRange]
    const matchPrice = f.price >= range.min && f.price <= range.max
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchFilter && matchPrice && matchSearch
  }).sort((a, b) => {
    if (sortBy === 'popular') return (getStats(b.id).soldCount) - (getStats(a.id).soldCount)
    if (sortBy === 'price_asc') return a.price - b.price
    if (sortBy === 'price_desc') return b.price - a.price
    if (sortBy === 'rating') return (getStats(b.id).avgRating) - (getStats(a.id).avgRating)
    return 0
  })

  const categoryTabs = [{ name: 'Semua' }, ...categories]

  const FilterPanel = (
    <div className="bg-white rounded-2xl shadow-sm p-5 lg:sticky lg:top-24">
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-orange-500" />
          Filter Menu
        </h3>
        <button onClick={() => { setActiveCategoryFilter([]); setPriceRange(0) }}
          className="text-orange-500 text-xs hover:underline">Reset</button>
      </div>

      <div className="mb-5">
        <div className="flex justify-between items-center mb-3">
          <p className="font-semibold text-gray-700 text-sm">Kategori</p>
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={activeCategoryFilter.length === 0}
              onChange={() => setActiveCategoryFilter([])} className="accent-orange-500" />
            <span className="text-sm text-gray-600">Semua Kategori</span>
          </label>
          {categories.map(cat => {
            const count = foods.filter(f => f.categories?.name === cat.name).length
            return (
              <label key={cat.id} className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <input type="checkbox"
                    checked={activeCategoryFilter.includes(cat.name)}
                    onChange={() => setActiveCategoryFilter(prev =>
                      prev.includes(cat.name) ? prev.filter(c => c !== cat.name) : [...prev, cat.name]
                    )}
                    className="accent-orange-500" />
                  <span className="text-sm text-gray-600">{cat.name}</span>
                </div>
                <span className="text-xs bg-orange-100 text-orange-500 px-1.5 py-0.5 rounded-full">{count}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="mb-5">
        <div className="flex justify-between items-center mb-3">
          <p className="font-semibold text-gray-700 text-sm">Harga</p>
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        </div>
        <div className="space-y-2">
          {priceRanges.map((range, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="price" checked={priceRange === i}
                onChange={() => setPriceRange(i)} className="accent-orange-500" />
              <span className="text-sm text-gray-600">{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="font-semibold text-gray-700 text-sm">Rating</p>
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        </div>
        <div className="space-y-2">
          {['Semua Rating', '4★ ke atas', '3★ ke atas'].map((r, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="rating" defaultChecked={i === 0} className="accent-orange-500" />
              <span className="text-sm text-gray-600">{r}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <LoginPopup show={showLoginPopup} onClose={() => setShowLoginPopup(false)} message={loginPopupMsg} navigate={navigate} />
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      {!user && (
        <div className="bg-orange-500 text-white py-2.5 px-4 text-center text-xs sm:text-sm">
          <span>Kamu belum login. </span>
          <button onClick={() => navigate('/login')} className="font-bold underline hover:no-underline">Login sekarang</button>
          <span> untuk memesan dan menyimpan wishlist!</span>
        </div>
      )}

      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3">
        <p className="text-sm text-gray-400">
          <Link to="/" className="hover:text-orange-500">Beranda</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-700">Semua Menu</span>
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">

        {/* MOBILE FILTER TOGGLE */}
        <button onClick={() => setShowMobileFilter(v => !v)}
          className="lg:hidden flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-2xl py-3 font-semibold text-sm text-gray-700 shadow-sm">
          <FunnelIcon className="w-4 h-4 text-orange-500" />
          {showMobileFilter ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
        </button>

        {/* SIDEBAR FILTER */}
        <aside className={`w-full lg:w-56 flex-shrink-0 ${showMobileFilter ? 'block' : 'hidden'} lg:block`}>
          {FilterPanel}
        </aside>

        {/* MAIN */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">Semua Menu</h1>
              <p className="text-gray-400 text-sm mt-1">Temukan berbagai pilihan makanan lezat untuk setiap kebutuhanmu.</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">🚚</span>
              <div>
                <p className="text-sm font-bold text-gray-800">Gratis ongkir</p>
                <p className="text-xs text-gray-400">Untuk pemesanan minimal Rp 100.000</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari makanan, minuman..."
              className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-orange-300 shadow-sm transition" />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 sm:flex-wrap sm:overflow-visible" style={{ scrollbarWidth: 'none' }}>
              {categoryTabs.map(cat => (
                <button key={cat.name} onClick={() => setActiveCategory(cat.name)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition border flex-shrink-0 ${
                    activeCategory === cat.name
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                  }`}>
                  {getCategoryIcon(cat.name)}
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-400">Urutkan</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white">
                <option value="popular">Terpopuler</option>
                <option value="rating">Rating Tertinggi</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="price_desc">Harga Tertinggi</option>
              </select>
            </div>
          </div>

          <p className="text-sm text-gray-400 mb-4">Menampilkan {filtered.length} dari {foods.length} menu</p>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="font-medium">Menu tidak ditemukan</p>
              <p className="text-sm">Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map(food => {
                const isWishlisted = wishlistIds.has(food.id)
                const stats = getStats(food.id)
                return (
                  <div key={food.id}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 group">
                    <Link to={`/menu/${food.id}`}>
                      <div className="relative h-32 sm:h-44 overflow-hidden bg-orange-50">
                        {food.image ? (
                          <img src={food.image} alt={food.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
                        )}
                        <span className={`absolute top-2 left-2 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full font-medium ${
                          food.categories?.name?.includes('Catering') ? 'bg-purple-500'
                          : food.categories?.name?.includes('Ala Carte') ? 'bg-blue-500'
                          : food.categories?.name?.includes('Minuman') ? 'bg-cyan-500'
                          : 'bg-orange-500'
                        }`}>
                          {food.categories?.name}
                        </span>
                        <button onClick={e => handleToggleWishlist(e, food)}
                          className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition">
                          {isWishlisted
                            ? <HeartSolid className="w-4 h-4 text-red-500" />
                            : <HeartIcon className="w-4 h-4 text-gray-400" />
                          }
                        </button>
                        {food.min_order > 1 && (
                          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full">
                            Min. {food.min_order} {food.unit}
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="p-2.5 sm:p-3">
                      <Link to={`/menu/${food.id}`}>
                        <h3 className="font-semibold text-gray-800 text-xs sm:text-sm leading-tight mb-1 hover:text-orange-500 transition line-clamp-2">
                          {food.name}
                        </h3>
                        <p className="text-gray-400 text-xs mb-2 line-clamp-1 hidden sm:block">{food.description}</p>
                      </Link>
                      <p className="text-orange-500 font-bold text-xs sm:text-sm mb-1">
                        Rp {food.price?.toLocaleString('id-ID')}
                        <span className="text-gray-400 font-normal text-xs">/{food.unit || 'porsi'}</span>
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 min-w-0">
                          <StarSolid className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                          <span className="text-xs text-gray-600 font-medium">
                            {stats.avgRating > 0 ? stats.avgRating : '-'}
                          </span>
                          <span className="text-xs text-gray-300 hidden xs:inline">•</span>
                          <span className="text-xs text-gray-400 hidden xs:inline truncate">{stats.soldCount}+ terjual</span>
                        </div>
                        <button onClick={e => handleAddToCart(e, food)}
                          className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition shadow-sm shadow-orange-200 flex-shrink-0">
                          <PlusIcon className="w-4 h-4 text-white" />
                        </button>
                      </div>

                      {!user && (
                        <button
                          onClick={() => {
                            setLoginPopupMsg('Login untuk memesan menu dan menyimpan ke wishlist favoritmu.')
                            setShowLoginPopup(true)
                          }}
                          className="w-full mt-2 text-xs text-gray-400 hover:text-orange-500 transition text-center py-1 border border-dashed border-gray-200 rounded-lg hover:border-orange-300">
                          🔒 Login untuk memesan
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}