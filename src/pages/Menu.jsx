import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../store/cartStore'
import {
  MagnifyingGlassIcon, HeartIcon, StarIcon,
  AdjustmentsHorizontalIcon, ChevronDownIcon, PlusIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

const priceRanges = [
  { label: 'Semua Harga', min: 0, max: Infinity },
  { label: 'Di bawah Rp 10.000', min: 0, max: 10000 },
  { label: 'Rp 10.000 - Rp 20.000', min: 10000, max: 20000 },
  { label: 'Rp 20.000 - Rp 30.000', min: 20000, max: 30000 },
  { label: 'Di atas Rp 30.000', min: 30000, max: Infinity },
]

export default function Menu() {
  const [foods, setFoods] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [activeCategoryFilter, setActiveCategoryFilter] = useState([])
  const [priceRange, setPriceRange] = useState(0)
  const [sortBy, setSortBy] = useState('popular')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [wishlist, setWishlist] = useState([])
  const addItem = useCartStore(state => state.addItem)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: cats } = await supabase.from('categories').select('*')
    const { data: foodData } = await supabase
      .from('foods').select('*, categories(name)')
      .eq('is_available', true)
    setCategories(cats || [])
    setFoods(foodData || [])
    setLoading(false)
  }

  const toggleWishlist = (id) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id])
  }

  const filtered = foods.filter(f => {
    const matchCategory = activeCategory === 'Semua' || f.categories?.name === activeCategory
    const matchFilter = activeCategoryFilter.length === 0 || activeCategoryFilter.includes(f.categories?.name)
    const range = priceRanges[priceRange]
    const matchPrice = f.price >= range.min && f.price <= range.max
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchFilter && matchPrice && matchSearch
  }).sort((a, b) => {
    if (sortBy === 'popular') return (b.sold_count || 0) - (a.sold_count || 0)
    if (sortBy === 'price_asc') return a.price - b.price
    if (sortBy === 'price_desc') return b.price - a.price
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
    return 0
  })

  const categoryTabs = [{ name: 'Semua' }, ...categories]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-8 py-3">
        <p className="text-sm text-gray-400">
          <Link to="/" className="hover:text-orange-500">Beranda</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-700">Semua Menu</span>
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* SIDEBAR FILTER */}
        <aside className="w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-24">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-orange-500" />
                Filter Menu
              </h3>
              <button
                onClick={() => { setActiveCategoryFilter([]); setPriceRange(0) }}
                className="text-orange-500 text-xs hover:underline">
                Reset
              </button>
            </div>

            {/* Kategori */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-gray-700 text-sm">Kategori</p>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    checked={activeCategoryFilter.length === 0}
                    onChange={() => setActiveCategoryFilter([])}
                    className="accent-orange-500" />
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
                            prev.includes(cat.name)
                              ? prev.filter(c => c !== cat.name)
                              : [...prev, cat.name]
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

            {/* Harga */}
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

            {/* Rating */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-gray-700 text-sm">Rating</p>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-2">
                {['Semua Rating', '4★ ke atas', '3★ ke atas', '2★ ke atas', '1★ ke atas'].map((r, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="rating" defaultChecked={i === 0} className="accent-orange-500" />
                    <span className="text-sm text-gray-600">{r}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Semua Menu</h1>
              <p className="text-gray-400 text-sm mt-1">Temukan berbagai pilihan makanan lezat untuk setiap kebutuhanmu.</p>
            </div>
            {/* Gratis Ongkir Banner */}
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
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari makanan, minuman..."
              className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-orange-300 shadow-sm transition"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {categoryTabs.map(cat => (
              <button key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition border ${activeCategory === cat.name
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                {cat.name === 'Semua' && '🍽️'}
                {cat.name === 'Paket Catering' && '🍱'}
                {cat.name === 'Ala Carte' && '🍳'}
                {cat.name === 'Minuman' && '🥤'}
                {cat.name === 'Snack / Cemilan' && '🍪'}
                {cat.name}
              </button>
            ))}

            {/* Sort */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-400">Urutkan</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white">
                <option value="popular">Terpopuler</option>
                <option value="rating">Rating Tertinggi</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="price_desc">Harga Tertinggi</option>
              </select>
            </div>
          </div>

          {/* Count */}
          <p className="text-sm text-gray-400 mb-4">
            Menampilkan 1 - {filtered.length} dari {filtered.length} menu
          </p>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="font-medium">Menu tidak ditemukan</p>
              <p className="text-sm">Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(food => (
                <div key={food.id} className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 group">
                  <Link to={`/menu/${food.id}`}>
                    <div className="relative h-44 overflow-hidden bg-orange-50">
                      {food.image ? (
                        <img src={food.image} alt={food.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
                      )}
                      {/* Badge kategori */}
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        {food.categories?.name}
                      </span>
                      {/* Wishlist */}
                      <button
                        onClick={e => { e.preventDefault(); toggleWishlist(food.id) }}
                        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition">
                        <HeartIcon className={`w-4 h-4 ${wishlist.includes(food.id) ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                      </button>
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link to={`/menu/${food.id}`}>
                      <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1 hover:text-orange-500 transition">
                        {food.name}
                      </h3>
                      <p className="text-gray-400 text-xs mb-2 line-clamp-1">{food.description}</p>
                    </Link>
                    <p className="text-orange-500 font-bold text-sm mb-1">
                      Rp {food.price?.toLocaleString('id-ID')}
                      <span className="text-gray-400 font-normal text-xs">/{food.unit || 'porsi'}</span>
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <StarSolid className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-xs text-gray-500">{food.rating || '4.5'}</span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">{food.sold_count || 0}+ terjual</span>
                      </div>
                      <button
                        onClick={() => addItem(food)}
                        className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition shadow-sm shadow-orange-200">
                        <PlusIcon className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}