import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { formatDateTime } from '../lib/timeUtils'
import {
  MinusIcon, PlusIcon, ChevronRightIcon, CheckIcon, XMarkIcon
} from '@heroicons/react/24/outline'
import {
  StarIcon as StarSolid,
  HeartIcon as HeartSolid
} from '@heroicons/react/24/solid'
import { StarIcon, HeartIcon } from '@heroicons/react/24/outline'

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

  // Review states
  const [reviews, setReviews] = useState([])
  const [avgRating, setAvgRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [soldCount, setSoldCount] = useState(0)
  const [canReview, setCanReview] = useState(false)
  const [reviewableOrders, setReviewableOrders] = useState([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHover, setReviewHover] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewOrderId, setReviewOrderId] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [userExistingReview, setUserExistingReview] = useState(null)

  useEffect(() => {
    fetchFood()
    fetchReviews()
  }, [id])

  useEffect(() => {
    if (user && id) {
      checkWishlist()
      checkCanReview()
    }
  }, [user, id])

  // Realtime reviews
  useEffect(() => {
    const channel = supabase
      .channel(`food-reviews-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'food_reviews',
        filter: `food_id=eq.${id}`
      }, () => {
        fetchReviews()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

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
    setLoading(false)
  }

  async function fetchReviews() {
    // Fetch reviews dengan info user
    const { data: reviewData } = await supabase
      .from('food_reviews')
      .select('*, profiles(full_name, avatar_url)')
      .eq('food_id', id)
      .order('created_at', { ascending: false })
    setReviews(reviewData || [])

    // Hitung avg rating & review count
    if (reviewData && reviewData.length > 0) {
      const avg = reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length
      setAvgRating(Math.round(avg * 10) / 10)
      setReviewCount(reviewData.length)
    } else {
      setAvgRating(0)
      setReviewCount(0)
    }

    // Hitung sold count dari order_items yang sudah done
    const { data: soldData } = await supabase
      .from('order_items')
      .select('quantity, orders!inner(status)')
      .eq('food_id', id)
      .eq('orders.status', 'done')
    const total = soldData?.reduce((s, item) => s + (item.quantity || 0), 0) || 0
    setSoldCount(total)
  }

  async function checkCanReview() {
    if (!user) return

    // Cek apakah user sudah pernah memesan menu ini dan statusnya done
    const { data: orderData } = await supabase
      .from('order_items')
      .select('quantity, orders!inner(id, status, created_at)')
      .eq('food_id', id)
      .eq('orders.user_id', user.id)
      .eq('orders.status', 'done')

    if (orderData && orderData.length > 0) {
      // Cek review yang sudah ada per order
      const { data: existingReviews } = await supabase
        .from('food_reviews')
        .select('id, order_id, rating, comment')
        .eq('food_id', id)
        .eq('user_id', user.id)

      const reviewedOrderIds = new Set(existingReviews?.map(r => r.order_id) || [])

      // Order yang belum direview
      const unreviewed = orderData.filter(item => !reviewedOrderIds.has(item.orders?.id))
      setReviewableOrders(unreviewed.map(item => item.orders))
      setCanReview(unreviewed.length > 0)

      // Review user yang sudah ada
      if (existingReviews && existingReviews.length > 0) {
        setUserExistingReview(existingReviews[0])
      }
    }
  }

  async function checkWishlist() {
    const { data } = await supabase.from('wishlists')
      .select('id').eq('user_id', user.id).eq('food_id', id).single()
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

  const handleSubmitReview = async () => {
    if (!reviewRating) { alert('Harap pilih rating bintang!'); return }
    if (!reviewComment.trim()) { alert('Harap tulis ulasan kamu!'); return }
    if (!reviewOrderId) { alert('Harap pilih pesanan yang ingin diulas!'); return }

    setSubmittingReview(true)
    try {
      const { error } = await supabase.from('food_reviews').insert({
        user_id: user.id,
        food_id: id,
        order_id: reviewOrderId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      })
      if (error) throw error

      setShowReviewForm(false)
      setReviewRating(0)
      setReviewComment('')
      setReviewOrderId('')
      await fetchReviews()
      await checkCanReview()
    } catch (err) {
      alert('Gagal mengirim ulasan: ' + err.message)
    } finally {
      setSubmittingReview(false)
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
    addItem({ ...food, qty, price: pricePerUnit, selected, selectedMulti })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleOrderNow = () => {
    if (!isValid()) { alert('Harap lengkapi semua pilihan yang wajib!'); return }
    addItem({ ...food, qty, price: pricePerUnit, selected, selectedMulti })
    navigate('/checkout')
  }

  // Render bintang
  const RatingStars = ({ rating, size = 'sm', interactive = false, hover = 0, onRate, onHover }) => {
    const w = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate && onRate(s)}
            onMouseEnter={() => interactive && onHover && onHover(s)}
            onMouseLeave={() => interactive && onHover && onHover(0)}
            className={interactive ? 'transition-transform hover:scale-110' : 'cursor-default'}
          >
            {s <= (interactive ? (hover || rating) : rating) ? (
              <StarSolid className={`${w} text-orange-400`} />
            ) : (
              <StarIcon className={`${w} text-gray-200`} />
            )}
          </button>
        ))}
      </div>
    )
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

  const ratingLabel = ['', 'Sangat Buruk', 'Buruk', 'Cukup', 'Bagus', 'Sangat Bagus!']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-8 py-3">
        <p className="text-sm text-gray-400 flex items-center gap-1">
          <Link to="/" className="hover:text-orange-500">Beranda</Link>
          <ChevronRightIcon className="w-3 h-3" />
          <Link to="/menu" className="hover:text-orange-500">{food.categories?.name}</Link>
          <ChevronRightIcon className="w-3 h-3" />
          <span className="text-gray-700">{food.name}</span>
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-10 mb-8">

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
                {wishlist ? (
                  <HeartSolid className="w-5 h-5 text-red-500" />
                ) : (
                  <HeartIcon className="w-5 h-5 text-gray-400" />
                )}
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
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">👥 Minimal pemesanan</span>
                    <span className="font-medium text-gray-700">{food.min_order} {food.unit}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">⏰ Waktu pemesanan</span>
                  <span className="font-medium text-gray-700">H-1 sebelum 15.00 WIB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">🚚 Pengiriman</span>
                  <span className="font-medium text-gray-700">Gratis ongkir area tertentu</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">📦 Kemasan</span>
                  <span className="font-medium text-gray-700">Food grade & higienis</span>
                </div>
              </div>
            </div>
          </div>

          {/* KANAN */}
          <div>
            <span className="inline-block bg-orange-100 text-orange-500 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              {food.categories?.name}
            </span>
            <h1 className="text-3xl font-black text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              {food.name}
            </h1>
            <p className="text-gray-400 text-sm mb-3">{food.description}</p>

            {/* Rating realtime */}
            <div className="flex items-center gap-3 mb-3">
              <RatingStars rating={Math.round(avgRating)} />
              <span className="text-sm text-gray-500 font-medium">
                {avgRating > 0 ? avgRating : 'Belum ada rating'}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">{reviewCount} ulasan</span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">{soldCount}+ terjual</span>
            </div>

            <p className="text-4xl font-black text-orange-500 mb-5">
              Rp {food.price?.toLocaleString('id-ID')}
              <span className="text-lg text-gray-400 font-normal">/{food.unit || 'porsi'}</span>
            </p>

            {/* Pilihan Single */}
            {singleOptions.map((opt, idx) => (
              <div key={opt.id} className="bg-white rounded-2xl p-5 shadow-sm mb-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    {opt.group_name}
                  </h3>
                  {opt.required && (
                    <span className="text-orange-500 text-xs font-medium bg-orange-50 px-2 py-1 rounded-full">
                      Wajib pilih 1
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
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
                      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl overflow-hidden">
                        {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-xl" /> : '🍽️'}
                      </div>
                      <p className="text-xs text-center text-gray-700 leading-tight font-medium">{item.name}</p>
                      {item.extra_price > 0 && (
                        <p className="text-xs text-orange-500 font-medium">+Rp {item.extra_price?.toLocaleString('id-ID')}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Add On */}
            {multiOptions.map(opt => (
              <div key={opt.id} className="bg-white rounded-2xl p-5 shadow-sm mb-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">{opt.group_name}</h3>
                  <span className="text-gray-400 text-xs bg-gray-50 px-2 py-1 rounded-full">Opsional</span>
                </div>
                <div className="space-y-2">
                  {opt.food_option_items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-1">
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

            {/* Jumlah */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h3 className="font-bold text-gray-900 mb-1">Jumlah ({food.unit || 'porsi'})</h3>
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
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Total Harga</span>
                <div className="text-right">
                  <p className="text-2xl font-black text-orange-500">Rp {total.toLocaleString('id-ID')}</p>
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

            <div className="flex gap-3">
              <button onClick={handleAddToCart}
                className={`flex-1 border-2 py-4 rounded-2xl font-bold transition flex items-center justify-center gap-2 ${
                  addedToCart ? 'border-green-500 bg-green-50 text-green-600' : 'border-orange-500 text-orange-500 hover:bg-orange-50'
                }`}>
                {addedToCart ? <><CheckIcon className="w-5 h-5" /> Ditambahkan!</> : '🛒 Tambah ke Keranjang'}
              </button>
              <button onClick={handleOrderNow}
                className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition">
                Pesan Sekarang
              </button>
            </div>
          </div>
        </div>

        {/* ===== SECTION ULASAN ===== */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                Ulasan Pembeli
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {reviewCount > 0 ? `${reviewCount} ulasan dari pembeli nyata` : 'Belum ada ulasan'}
              </p>
            </div>

            {/* Tombol beri ulasan */}
            {canReview && !showReviewForm && (
              <button onClick={() => setShowReviewForm(true)}
                className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition">
                ⭐ Beri Ulasan
              </button>
            )}
            {userExistingReview && !canReview && (
              <div className="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-xl text-sm font-medium">
                <CheckIcon className="w-4 h-4" />
                Sudah diulas
              </div>
            )}
          </div>

          {/* Summary Rating */}
          {reviewCount > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center gap-10">
              <div className="text-center flex-shrink-0">
                <p className="text-6xl font-black text-orange-500">{avgRating}</p>
                <RatingStars rating={Math.round(avgRating)} size="md" />
                <p className="text-sm text-gray-400 mt-1">dari {reviewCount} ulasan</p>
              </div>
              <div className="flex-1">
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

          {/* Form Ulasan */}
          {showReviewForm && (
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border-2 border-orange-200">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-gray-900">Tulis Ulasanmu</h3>
                <button onClick={() => setShowReviewForm(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Pilih pesanan */}
              {reviewableOrders.length > 1 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 block mb-2">Pilih Pesanan</label>
                  <select value={reviewOrderId} onChange={e => setReviewOrderId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition">
                    <option value="">Pilih pesanan yang ingin diulas</option>
                    {reviewableOrders.map(order => (
                      <option key={order.id} value={order.id}>
                        #{order.id.slice(0, 8).toUpperCase()} — {new Date(order.created_at).toLocaleDateString('id-ID')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {reviewableOrders.length === 1 && !reviewOrderId && (
                <div className="mb-4">
                  {setReviewOrderId(reviewableOrders[0].id)}
                </div>
              )}

              {/* Rating bintang interaktif */}
              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 block mb-3">
                  Rating *
                  {reviewRating > 0 && (
                    <span className="ml-2 text-orange-500 font-normal">{ratingLabel[reviewRating]}</span>
                  )}
                </label>
                <RatingStars
                  rating={reviewRating}
                  size="lg"
                  interactive
                  hover={reviewHover}
                  onRate={setReviewRating}
                  onHover={setReviewHover}
                />
              </div>

              {/* Komentar */}
              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 block mb-2">Ulasan *</label>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value.slice(0, 500))}
                  placeholder="Bagikan pengalamanmu tentang menu ini..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none"
                />
                <p className="text-right text-xs text-gray-400 mt-1">{reviewComment.length}/500</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowReviewForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                  Batal
                </button>
                <button onClick={handleSubmitReview} disabled={submittingReview || !reviewRating || !reviewComment.trim()}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-40 flex items-center justify-center gap-2">
                  {submittingReview ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengirim...</>
                  ) : (
                    <><CheckIcon className="w-4 h-4" /> Kirim Ulasan</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Hint untuk yang belum pernah beli */}
          {user && !canReview && !userExistingReview && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center gap-3 text-sm text-gray-500">
              <span className="text-2xl">💡</span>
              <span>Kamu bisa memberi ulasan setelah pesananmu selesai diterima.</span>
            </div>
          )}

          {!user && (
            <div className="bg-orange-50 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <p className="text-sm text-gray-600">
                <Link to="/login" className="text-orange-500 font-semibold hover:underline">Login</Link>
                {' '}dan pesan menu ini untuk bisa memberikan ulasan.
              </p>
            </div>
          )}

          {/* Daftar Ulasan */}
          {reviews.length === 0 ? (
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
                  <div key={review.id} className="bg-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
                        {review.profiles?.avatar_url ? (
                          <img src={review.profiles.avatar_url} alt={uname} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-orange-500 text-sm">{uname[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-800 text-sm">{uname}</p>
                          <p className="text-xs text-gray-400">{date}</p>
                        </div>
                        <RatingStars rating={review.rating} size="sm" />
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{review.comment}</p>
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
            <h2 className="text-xl font-black text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Menu Lainnya yang Mungkin Kamu Suka
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {related.map(item => (
                <Link key={item.id} to={`/menu/${item.id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition hover:-translate-y-1">
                  <div className="h-36 bg-orange-50 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                    <p className="text-orange-500 font-bold text-sm mt-1">
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