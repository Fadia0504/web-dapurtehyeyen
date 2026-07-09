import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { formatDateTime } from '../lib/timeUtils'
import {
  MinusIcon, PlusIcon, ChevronRightIcon, CheckIcon, XMarkIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid'
import { StarIcon, HeartIcon } from '@heroicons/react/24/outline'

function RatingStars({ rating, size = 'sm' }) {
  const w = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        s <= Math.round(rating)
          ? <StarSolid key={s} className={`${w} text-orange-400`} />
          : <StarIcon key={s} className={`${w} text-gray-200`} />
      ))}
    </div>
  )
}

export default function FoodDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCartStore(state => state.addItem)
  const { user } = useAuthStore()

  const [food, setFood] = useState(null)
  const [related, setRelated] = useState([])
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState({})
  const [selectedMulti, setSelectedMulti] = useState({})
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [wishlist, setWishlist] = useState(false)
  const [wishlistId, setWishlistId] = useState(null)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  const [reviews, setReviews] = useState([])
  const [avgRating, setAvgRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [soldCount, setSoldCount] = useState(0)
  const [userHasReviewed, setUserHasReviewed] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(true)

  // Product Add On (relasi product_addons, beda dari food_options multiple)
  const [productAddons, setProductAddons] = useState([])
  const [selectedProductAddons, setSelectedProductAddons] = useState({}) // {addonFoodId: qty}

  useEffect(() => {
    fetchFood()
    fetchReviews()
  }, [id])

  useEffect(() => {
    if (user && id) {
      checkWishlist()
      checkUserReviewed()
    }
  }, [user, id])

  useEffect(() => {
    const channel = supabase
      .channel(`food-reviews-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'food_reviews',
        filter: `food_id=eq.${id}`
      }, () => {
        fetchReviews()
        if (user) checkUserReviewed()
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'order_items'
      }, () => {
        fetchSoldCount()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, user])

  async function fetchFood() {
    setLoading(true)
    const { data: foodData } = await supabase
      .from('foods').select('*, categories(name)')
      .eq('id', id).single()
    setFood(foodData)
    setQty(foodData?.min_order || 1)

    const { data: optData } = await supabase
      .from('food_options').select('*, food_option_items(*)')
      .eq('food_id', id).order('created_at')
    setOptions(optData || [])

    const initSelected = {}
    optData?.filter(o => o.group_type === 'single').forEach(o => {
      initSelected[o.id] = null
    })
    setSelected(initSelected)
    setSelectedMulti({})

    if (foodData?.category_id) {
      const { data: rel } = await supabase.from('foods')
        .select('*, categories(name)')
        .eq('category_id', foodData.category_id)
        .neq('id', id).limit(4)
      setRelated(rel || [])
    }

    // Ambil Add On yang sudah dipasangkan admin untuk produk ini
    const { data: addonLinks } = await supabase
      .from('product_addons')
      .select('addon_food_id, foods:addon_food_id(*)')
      .eq('food_id', id)
    const addonFoods = (addonLinks || []).map(l => l.foods).filter(f => f && f.is_available)
    setProductAddons(addonFoods)
    setSelectedProductAddons({})

    setLoading(false)
  }

  async function fetchReviews() {
    setLoadingReviews(true)
    try {
      // Fetch reviews tanpa join dulu
      const { data: reviewData, error } = await supabase
        .from('food_reviews')
        .select('id, rating, comment, created_at, user_id')
        .eq('food_id', id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching reviews:', error)
        setReviews([])
        setReviewCount(0)
        setAvgRating(0)
        setLoadingReviews(false)
        await fetchSoldCount()
        return
      }

      if (!reviewData || reviewData.length === 0) {
        setReviews([])
        setAvgRating(0)
        setReviewCount(0)
        setLoadingReviews(false)
        await fetchSoldCount()
        return
      }

      // Fetch profiles terpisah
      const userIds = [...new Set(reviewData.map(r => r.user_id))]
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

      const profileMap = {}
      profileData?.forEach(p => { profileMap[p.id] = p })

      // Gabungkan
      const merged = reviewData.map(r => ({
        ...r,
        profiles: profileMap[r.user_id] || null
      }))

      setReviews(merged)
      const avg = merged.reduce((s, r) => s + r.rating, 0) / merged.length
      setAvgRating(Math.round(avg * 10) / 10)
      setReviewCount(merged.length)
    } catch (err) {
      console.error('fetchReviews error:', err)
      setReviews([])
    } finally {
      setLoadingReviews(false)
    }
    await fetchSoldCount()
  }

  async function fetchSoldCount() {
    const { data: soldData } = await supabase
      .from('order_items')
      .select('quantity, orders!inner(status)')
      .eq('food_id', id)
      .eq('orders.status', 'done')
    const total = soldData?.reduce((s, item) => s + (item.quantity || 0), 0) || 0
    setSoldCount(total)
  }

  async function checkUserReviewed() {
    if (!user) return
    const { data } = await supabase
      .from('food_reviews')
      .select('id')
      .eq('food_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    setUserHasReviewed(!!data)
  }

  async function checkWishlist() {
    const { data } = await supabase.from('wishlists')
      .select('id').eq('user_id', user.id).eq('food_id', id)
      .maybeSingle()
    if (data) { setWishlist(true); setWishlistId(data.id) }
    else { setWishlist(false); setWishlistId(null) }
  }

  const toggleWishlist = async () => {
    if (!user) { navigate('/login'); return }
    if (wishlistLoading) return
    setWishlistLoading(true)
    try {
      if (wishlist) {
        await supabase.from('wishlists').delete().eq('id', wishlistId)
        setWishlist(false); setWishlistId(null)
      } else {
        const { data } = await supabase.from('wishlists')
          .insert({ user_id: user.id, food_id: id }).select().single()
        setWishlist(true); setWishlistId(data?.id)
      }
    } finally {
      setWishlistLoading(false)
    }
  }

  const getExtraPrice = () => {
    let extra = 0
    Object.entries(selected).forEach(([optId, itemId]) => {
      if (!itemId) return
      const opt = options.find(o => o.id === optId)
      const item = opt?.food_option_items?.find(i => i.id === itemId)
      if (item) extra += item.extra_price || 0
    })
    Object.entries(selectedMulti).forEach(([itemId, itemQty]) => {
      options.forEach(opt => {
        const item = opt.food_option_items?.find(i => i.id === itemId)
        if (item) extra += (item.extra_price || 0) * itemQty
      })
    })
    // Tambahkan harga product add-on yang dipilih
    Object.entries(selectedProductAddons).forEach(([addonId, addonQty]) => {
      if (!addonQty) return
      const addon = productAddons.find(a => a.id === addonId)
      if (addon) extra += (addon.price || 0) * addonQty
    })
    return extra
  }

  const pricePerUnit = food ? food.price + getExtraPrice() : 0
  const total = pricePerUnit * qty

  const isValid = () => {
    const requiredOpts = options.filter(o => o.required && o.group_type === 'single')
    return requiredOpts.every(o => selected[o.id] !== null && selected[o.id] !== undefined)
  }

  const handleAddToCart = () => {
    if (!isValid()) { alert('Harap lengkapi semua pilihan yang wajib!'); return }
    addItem({ ...food, qty, price: pricePerUnit, selected, selectedMulti, selectedProductAddons, productAddonsDetail: productAddons })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleOrderNow = () => {
    if (!isValid()) { alert('Harap lengkapi semua pilihan yang wajib!'); return }
    addItem({ ...food, qty, price: pricePerUnit, selected, selectedMulti, selectedProductAddons, productAddonsDetail: productAddons })
    navigate('/checkout')
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Memuat menu...</p>
      </div>
    </div>
  )

  if (!food) return (
    <div className="flex justify-center items-center min-h-[60vh] text-gray-400">
      Menu tidak ditemukan
    </div>
  )

  const singleOptions = options.filter(o => o.group_type === 'single')
  const multiOptions = options.filter(o => o.group_type === 'multiple')

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3 overflow-x-auto">
        <p className="text-sm text-gray-400 flex items-center gap-1 whitespace-nowrap">
          <Link to="/" className="hover:text-orange-500">Beranda</Link>
          <ChevronRightIcon className="w-3 h-3 flex-shrink-0" />
          <Link to="/menu" className="hover:text-orange-500">{food.categories?.name}</Link>
          <ChevronRightIcon className="w-3 h-3 flex-shrink-0" />
          <span className="text-gray-700 truncate">{food.name}</span>
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 mb-8">

          {/* KIRI */}
          <div>
            <div className="relative bg-white rounded-3xl overflow-hidden shadow-sm mb-3 aspect-square">
              {food.image ? (
                <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl bg-orange-50">🍽️</div>
              )}
              <button onClick={toggleWishlist} disabled={wishlistLoading}
                className={`absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center transition ${wishlistLoading ? 'opacity-50' : 'hover:scale-110'}`}>
                {wishlist ? <HeartSolid className="w-5 h-5 text-red-500" /> : <HeartIcon className="w-5 h-5 text-gray-400" />}
              </button>
              {wishlist && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  ❤️ Disimpan
                </div>
              )}
            </div>

            <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3 mb-4">
              <span className="text-2xl">📦</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Disiapkan segar setiap hari</p>
                <p className="text-gray-400 text-xs">Pesanan sebelum 08.00 akan dikirim di hari yang sama</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Tentang Menu</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{food.description}</p>
              <div className="space-y-2.5">
                {food.min_order > 1 && (
                  <div className="flex justify-between text-sm gap-3">
                    <span className="text-gray-400">👥 Minimal pemesanan</span>
                    <span className="font-medium text-gray-700 text-right">{food.min_order} {food.unit}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-gray-400">⏰ Waktu pemesanan</span>
                  <span className="font-medium text-gray-700 text-right">H-1 sebelum 15.00 WIB</span>
                </div>
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-gray-400">🚚 Pengiriman</span>
                  <span className="font-medium text-gray-700 text-right">Gratis ongkir area tertentu</span>
                </div>
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-gray-400">📦 Kemasan</span>
                  <span className="font-medium text-gray-700 text-right">Food grade & higienis</span>
                </div>
              </div>
            </div>
          </div>

          {/* KANAN */}
          <div>
            <span className="inline-block bg-orange-100 text-orange-500 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              {food.categories?.name}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              {food.name}
            </h1>
            <p className="text-gray-400 text-sm mb-3">{food.description}</p>

            {/* Rating realtime */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-3">
              <RatingStars rating={avgRating} />
              <span className="text-sm text-gray-600 font-medium">
                {avgRating > 0 ? avgRating : '-'}
              </span>
              <span className="text-gray-300 hidden xs:inline">•</span>
              <span className="text-sm text-gray-500">{reviewCount} ulasan</span>
              <span className="text-gray-300 hidden xs:inline">•</span>
              <span className="text-sm text-gray-500">{soldCount}+ terjual</span>
            </div>

            <p className="text-3xl sm:text-4xl font-black text-orange-500 mb-5">
              Rp {food.price?.toLocaleString('id-ID')}
              <span className="text-base sm:text-lg text-gray-400 font-normal">/{food.unit || 'porsi'}</span>
            </p>

            {/* Pilihan Single */}
            {singleOptions.map((opt, idx) => (
              <div key={opt.id} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm mb-3">
                <div className="flex justify-between items-center mb-4 gap-2">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                    <span className="w-6 h-6 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    {opt.group_name}
                  </h3>
                  {opt.required && (
                    <span className="text-orange-500 text-xs font-medium bg-orange-50 px-2 py-1 rounded-full flex-shrink-0">
                      Wajib pilih 1
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 gap-2">
                  {opt.food_option_items?.map(item => (
                    <button key={item.id}
                      onClick={() => setSelected(prev => ({ ...prev, [opt.id]: item.id }))}
                      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition ${
                        selected[opt.id] === item.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-orange-200'
                      }`}>
                      {selected[opt.id] === item.id && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                          <CheckIcon className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl overflow-hidden">
                        {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-xl" /> : '🍽️'}
                      </div>
                      <p className="text-[11px] sm:text-xs text-center text-gray-700 leading-tight font-medium">{item.name}</p>
                      {item.extra_price > 0 && (
                        <p className="text-[10px] sm:text-xs text-orange-500 font-medium">+Rp {item.extra_price?.toLocaleString('id-ID')}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Add On */}
            {multiOptions.map(opt => (
              <div key={opt.id} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm mb-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">{opt.group_name}</h3>
                  <span className="text-gray-400 text-xs bg-gray-50 px-2 py-1 rounded-full">Opsional</span>
                </div>
                <div className="space-y-2">
                  {opt.food_option_items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-1 gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <input type="checkbox"
                          checked={!!selectedMulti[item.id]}
                          onChange={e => setSelectedMulti(prev => ({ ...prev, [item.id]: e.target.checked ? 1 : 0 }))}
                          className="accent-orange-500 w-4 h-4" />
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-orange-500 text-sm font-medium">
                          + Rp {item.extra_price?.toLocaleString('id-ID')}
                        </span>
                        {selectedMulti[item.id] > 0 && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedMulti(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                              className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-xs hover:bg-orange-50 transition">−</button>
                            <span className="text-sm font-medium w-4 text-center">{selectedMulti[item.id]}</span>
                            <button onClick={() => setSelectedMulti(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                              className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-xs hover:bg-orange-50 transition">+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Product Add On — dari relasi product_addons yang diatur admin */}
            {productAddons.length > 0 && (
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm mb-3 border-2 border-purple-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                    <span className="text-purple-500 text-lg">+</span> Tambah Add On
                  </h3>
                  <span className="text-purple-500 text-xs font-medium bg-purple-50 px-2 py-1 rounded-full">Opsional</span>
                </div>
                <div className="space-y-2">
                  {productAddons.map(addon => {
                    const addonQty = selectedProductAddons[addon.id] || 0
                    return (
                      <div key={addon.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-orange-50 flex-shrink-0">
                            {addon.image
                              ? <img src={addon.image} alt={addon.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-700 font-medium truncate">{addon.name}</p>
                            <p className="text-orange-500 text-xs font-medium">+ Rp {addon.price?.toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                        {addonQty === 0 ? (
                          <button
                            onClick={() => setSelectedProductAddons(prev => ({ ...prev, [addon.id]: 1 }))}
                            className="text-xs border border-orange-300 text-orange-500 px-3 py-1.5 rounded-lg font-medium hover:bg-orange-50 transition flex-shrink-0">
                            Tambah
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setSelectedProductAddons(prev => ({ ...prev, [addon.id]: Math.max(0, addonQty - 1) }))}
                              className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-xs hover:bg-orange-50 transition">−</button>
                            <span className="text-sm font-medium w-4 text-center">{addonQty}</span>
                            <button onClick={() => setSelectedProductAddons(prev => ({ ...prev, [addon.id]: addonQty + 1 }))}
                              className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-xs hover:bg-orange-50 transition">+</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Jumlah */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm mb-4">
              <h3 className="font-bold text-gray-900 mb-1 text-sm sm:text-base">Jumlah ({food.unit || 'porsi'})</h3>
              {food.min_order > 1 && (
                <p className="text-xs text-gray-400 mb-3">Minimal pemesanan {food.min_order} {food.unit}</p>
              )}
              <div className="flex items-center gap-4">
                <button onClick={() => setQty(q => Math.max(food.min_order || 1, q - 1))}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition">
                  <MinusIcon className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-2xl font-bold text-gray-900 w-12 text-center">{qty}</span>
                <button onClick={() => setQty(q => q + 1)}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition">
                  <PlusIcon className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="bg-orange-50 rounded-2xl p-4 mb-5">
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-gray-700 text-sm sm:text-base">Total Harga</span>
                <div className="text-right">
                  <p className="text-xl sm:text-2xl font-black text-orange-500">Rp {total.toLocaleString('id-ID')}</p>
                  <p className="text-xs text-gray-400">({qty} {food.unit || 'porsi'})</p>
                </div>
              </div>
              {getExtraPrice() > 0 && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-orange-100">
                  <span className="text-xs text-gray-400">Termasuk extra pilihan</span>
                  <span className="text-xs text-orange-500 font-medium">+Rp {getExtraPrice().toLocaleString('id-ID')} /unit</span>
                </div>
              )}
            </div>

            {!user && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-2">
                <HeartIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-500">
                  <Link to="/login" className="text-orange-500 font-medium hover:underline">Login</Link>
                  {' '}untuk menyimpan ke wishlist
                </p>
              </div>
            )}

            {/* Sticky action bar di mobile, statis di desktop */}
            <div className="fixed lg:static bottom-0 left-0 right-0 z-30 bg-white lg:bg-transparent border-t lg:border-0 border-gray-100 p-4 lg:p-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:shadow-none flex gap-3">
              <button onClick={handleAddToCart}
                className={`flex-1 border-2 py-3.5 sm:py-4 rounded-2xl font-bold transition flex items-center justify-center gap-2 text-sm sm:text-base ${
                  addedToCart
                    ? 'border-green-500 bg-green-50 text-green-600'
                    : 'border-orange-500 text-orange-500 hover:bg-orange-50'
                }`}>
                {addedToCart ? <><CheckIcon className="w-5 h-5" /> Ditambahkan!</> : '🛒 Tambah ke Keranjang'}
              </button>
              <button onClick={handleOrderNow}
                className="flex-1 bg-orange-500 text-white py-3.5 sm:py-4 rounded-2xl font-bold hover:bg-orange-600 transition text-sm sm:text-base">
                Pesan Sekarang
              </button>
            </div>
          </div>
        </div>

        {/* ===== SECTION ULASAN ===== */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Ulasan Pembeli
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {reviewCount > 0 ? `${reviewCount} ulasan dari pembeli nyata` : 'Belum ada ulasan'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {user && userHasReviewed && (
                <div className="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-xl text-sm font-medium">
                  <CheckIcon className="w-4 h-4" />
                  Kamu sudah mengulas menu ini
                </div>
              )}
              {user && !userHasReviewed && (
                <Link to="/dashboard"
                  className="flex items-center gap-2 bg-orange-50 text-orange-500 border border-orange-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-100 transition">
                  ⭐ Beri Ulasan di Riwayat Pesanan
                </Link>
              )}
              {!user && (
                <Link to="/login"
                  className="flex items-center gap-2 bg-gray-50 text-gray-500 border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 transition">
                  Login untuk mengulas
                </Link>
              )}
            </div>
          </div>

          {/* Summary Rating */}
          {reviewCount > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
              <div className="text-center flex-shrink-0">
                <p className="text-5xl sm:text-6xl font-black text-orange-500">{avgRating}</p>
                <RatingStars rating={Math.round(avgRating)} size="md" />
                <p className="text-sm text-gray-400 mt-1">dari {reviewCount} ulasan</p>
              </div>
              <div className="flex-1 w-full">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = reviews.filter(r => r.rating === star).length
                  const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0
                  return (
                    <div key={star} className="flex items-center gap-3 mb-1.5">
                      <div className="flex items-center gap-1 w-12 flex-shrink-0">
                        <StarSolid className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-xs text-gray-500">{star}</span>
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-orange-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-3xl font-black text-gray-800">{soldCount}</p>
                <p className="text-sm text-gray-400">terjual</p>
              </div>
            </div>
          )}

          {/* Info beri ulasan */}
          {user && !userHasReviewed && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Pernah memesan menu ini?</p>
                  <p className="text-xs text-gray-500">Beri ulasan dari halaman Riwayat Pesanan di dashboard kamu.</p>
                </div>
              </div>
              <Link to="/dashboard"
                className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition flex-shrink-0 text-center">
                Ke Riwayat Pesanan
              </Link>
            </div>
          )}

          {/* Daftar Ulasan */}
          {loadingReviews ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 h-28 animate-pulse" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
              <p className="text-4xl mb-3">⭐</p>
              <p className="font-semibold text-gray-700 mb-1">Belum ada ulasan</p>
              <p className="text-sm text-gray-400">Jadilah yang pertama mengulas menu ini!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => {
                const { date } = formatDateTime(review.created_at)
                const uname = review.profiles?.full_name || 'Pengguna'
                return (
                  <div key={review.id} className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
                        {review.profiles?.avatar_url ? (
                          <img src={review.profiles.avatar_url} alt={uname} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-orange-500">{uname[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{uname}</p>
                            <p className="text-xs text-gray-400">{date}</p>
                          </div>
                          <RatingStars rating={review.rating} size="sm" />
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Menu Lainnya yang Mungkin Kamu Suka
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {related.map(item => (
                <Link key={item.id} to={`/menu/${item.id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition hover:-translate-y-1">
                  <div className="h-28 sm:h-36 bg-orange-50 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                    )}
                  </div>
                  <div className="p-2.5 sm:p-3">
                    <p className="font-semibold text-gray-800 text-xs sm:text-sm line-clamp-1">{item.name}</p>
                    <p className="text-orange-500 font-bold text-xs sm:text-sm mt-1">
                      Rp {item.price?.toLocaleString('id-ID')}
                      <span className="text-gray-400 font-normal text-xs">/{item.unit || 'porsi'}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}