import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { formatDateTime } from '../lib/timeUtils'
import {
  HomeIcon, UserIcon, ClipboardDocumentListIcon,
  TruckIcon, HeartIcon, PencilIcon, CameraIcon,
  CheckIcon, XMarkIcon, TrashIcon, PhoneIcon,
  EnvelopeIcon, PlusIcon, ShoppingBagIcon,
  CheckCircleIcon, ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid'

const menuItems = [
  { icon: HomeIcon, label: 'Dashboard', key: 'dashboard' },
  { icon: UserIcon, label: 'Profil Saya', key: 'profile' },
  { icon: ClipboardDocumentListIcon, label: 'Riwayat Pesanan', key: 'history' },
  { icon: TruckIcon, label: 'Pesanan Berjalan', key: 'active', badge: true },
  { icon: HeartIcon, label: 'Wishlist', key: 'wishlist' },
]

const statusMap = {
  pending:   { label: 'Menunggu Konfirmasi', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Dikonfirmasi',        color: 'bg-blue-100 text-blue-700' },
  processing:{ label: 'Sedang Diproses',     color: 'bg-orange-100 text-orange-600' },
  delivered: { label: 'Sedang Dikirim',      color: 'bg-purple-100 text-purple-600' },
  done:      { label: 'Selesai',             color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Dibatalkan',          color: 'bg-red-100 text-red-600' },
}

const ratingLabel = ['', 'Sangat Buruk', 'Buruk', 'Cukup', 'Bagus', 'Sangat Bagus!']

function RatingStars({ rating, size = 'sm', interactive = false, hover = 0, onRate, onHover }) {
  const w = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" disabled={!interactive}
          onClick={() => interactive && onRate?.(s)}
          onMouseEnter={() => interactive && onHover?.(s)}
          onMouseLeave={() => interactive && onHover?.(0)}
          className={interactive ? 'transition-transform hover:scale-110' : 'cursor-default'}>
          {s <= (interactive ? (hover || rating) : rating)
            ? <StarSolid className={`${w} text-orange-400`} />
            : <StarSolid className={`${w} text-gray-200`} />
          }
        </button>
      ))}
    </div>
  )
}

function ReviewModal({ show, onClose, order, onSubmitDone }) {
  const { user } = useAuthStore()
  const [items, setItems] = useState([])
  const [reviewedIds, setReviewedIds] = useState(new Set())
  const [reviews, setReviews] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (show && order) loadItems()
  }, [show, order])

  async function loadItems() {
    if (!order) return
    const orderItems = order.order_items || []
    setItems(orderItems)
    setStep(0)
    setDone(false)

    const foodIds = orderItems.map(i => i.food_id).filter(Boolean)
    if (foodIds.length > 0) {
      const { data } = await supabase
        .from('food_reviews')
        .select('food_id, id')
        .eq('user_id', user.id)
        .eq('order_id', order.id)
        .in('food_id', foodIds)
      const reviewed = new Set(data?.map(r => r.food_id) || [])
      setReviewedIds(reviewed)

      const initReviews = {}
      orderItems.forEach(item => {
        if (!reviewed.has(item.food_id)) {
          initReviews[item.food_id] = { rating: 0, hover: 0, comment: '' }
        }
      })
      setReviews(initReviews)

      const firstUnreviewed = orderItems.findIndex(i => !reviewed.has(i.food_id))
      setStep(firstUnreviewed >= 0 ? firstUnreviewed : 0)
    }
  }

  const unreviewed = items.filter(i => !reviewedIds.has(i.food_id))
  const currentItem = items[step]
  const currentFoodId = currentItem?.food_id
  const currentReview = reviews[currentFoodId] || { rating: 0, hover: 0, comment: '' }

  const updateReview = (foodId, field, value) => {
    setReviews(prev => ({ ...prev, [foodId]: { ...prev[foodId], [field]: value } }))
  }

  const handleSubmitCurrent = async () => {
    if (!currentReview.rating) { alert('Harap pilih rating bintang!'); return }
    if (!currentReview.comment.trim()) { alert('Harap tulis ulasan!'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('food_reviews').insert({
        user_id: user.id, food_id: currentFoodId,
        order_id: order.id, rating: currentReview.rating,
        comment: currentReview.comment.trim(),
      })
      if (error) throw error
      setReviewedIds(prev => new Set([...prev, currentFoodId]))
      let nextStep = step + 1
      while (nextStep < items.length && reviewedIds.has(items[nextStep]?.food_id)) nextStep++
      if (nextStep >= items.length || unreviewed.length <= 1) {
        setDone(true); onSubmitDone?.()
      } else {
        setStep(nextStep)
      }
    } catch (err) {
      alert('Gagal: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    let nextStep = step + 1
    while (nextStep < items.length && reviewedIds.has(items[nextStep]?.food_id)) nextStep++
    if (nextStep >= items.length) setDone(true)
    else setStep(nextStep)
  }

  if (!show) return null
  const pendingCount = items.filter(i => !reviewedIds.has(i.food_id)).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {done ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Terima Kasih!</h2>
            <p className="text-gray-500 text-sm mb-6">Ulasanmu sangat membantu pembeli lain untuk memilih menu terbaik.</p>
            <button onClick={onClose}
              className="w-full bg-orange-500 text-white py-3 rounded-2xl font-bold hover:bg-orange-600 transition">
              Selesai
            </button>
          </div>
        ) : (
          <>
            <div className="bg-orange-500 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">Beri Ulasan</h2>
                <p className="text-orange-100 text-xs">
                  Pesanan #{order?.id?.slice(0,8).toUpperCase()}
                  {pendingCount > 1 && ` • ${pendingCount} menu tersisa`}
                </p>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition">
                <XMarkIcon className="w-5 h-5 text-white" />
              </button>
            </div>

            {items.length > 1 && (
              <div className="flex gap-1.5 justify-center pt-4 px-6">
                {items.map((item, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all flex-1 ${
                    reviewedIds.has(item.food_id) ? 'bg-green-400'
                    : i === step ? 'bg-orange-500'
                    : 'bg-gray-200'
                  }`} />
                ))}
              </div>
            )}

            {currentItem && (
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6 bg-orange-50 rounded-2xl p-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0">
                    {currentItem.foods?.image
                      ? <img src={currentItem.foods.image} alt={currentItem.foods?.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                    }
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{currentItem.foods?.name || 'Menu'}</p>
                    <p className="text-sm text-gray-500">x{currentItem.quantity} • Rp {(currentItem.price * currentItem.quantity).toLocaleString('id-ID')}</p>
                  </div>
                </div>

                {reviewedIds.has(currentFoodId) ? (
                  <div className="text-center py-4">
                    <CheckIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">Sudah diulas</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <label className="text-sm font-semibold text-gray-700 block mb-3">
                        Seberapa puas kamu? *
                        {currentReview.rating > 0 && (
                          <span className="ml-2 text-orange-500 font-normal">{ratingLabel[currentReview.rating]}</span>
                        )}
                      </label>
                      <div className="flex gap-2 justify-center">
                        <RatingStars rating={currentReview.rating} size="lg" interactive
                          hover={currentReview.hover}
                          onRate={val => updateReview(currentFoodId, 'rating', val)}
                          onHover={val => updateReview(currentFoodId, 'hover', val)} />
                      </div>
                    </div>

                    <div className="mb-5">
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Ceritakan pengalamanmu *</label>
                      <textarea value={currentReview.comment}
                        onChange={e => updateReview(currentFoodId, 'comment', e.target.value.slice(0, 300))}
                        placeholder="Rasa enak? Porsi sesuai? Kemasan rapi?"
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none" />
                      <p className="text-right text-xs text-gray-400 mt-1">{currentReview.comment.length}/300</p>
                    </div>

                    <div className="flex gap-3">
                      {items.filter(i => !reviewedIds.has(i.food_id)).length > 1 && (
                        <button onClick={handleSkip}
                          className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                          Lewati
                        </button>
                      )}
                      <button onClick={handleSubmitCurrent}
                        disabled={submitting || !currentReview.rating || !currentReview.comment.trim()}
                        className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-orange-600 transition disabled:opacity-40 flex items-center justify-center gap-2">
                        {submitting
                          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengirim...</>
                          : unreviewed.length <= 1
                            ? <><CheckIcon className="w-4 h-4" /> Kirim Ulasan</>
                            : <><CheckIcon className="w-4 h-4" /> Kirim & Lanjut</>
                        }
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, fetchProfile, logout } = useAuthStore()
  const addItem = useCartStore(state => state.addItem)
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState('profile')
  const [orders, setOrders] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [wishlistTab, setWishlistTab] = useState('Semua')
  const [loadingWishlist, setLoadingWishlist] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(true)
  const [notifPromo, setNotifPromo] = useState(false)
  const [form, setForm] = useState({
    full_name: '', phone: '', address: '', birth_date: '', gender: '', job: '',
  })
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null)
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set())

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchOrders()
    fetchWishlist()

    const channel = supabase
      .channel('customer-orders-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => { fetchOrders() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        birth_date: profile.birth_date || '',
        gender: profile.gender || '',
        job: profile.job || '',
      })
    }
  }, [profile])

  async function fetchOrders() {
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, foods(name, image))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setOrders(data || [])

    if (data && data.length > 0) {
      const doneOrders = data.filter(o => o.status === 'done')
      if (doneOrders.length > 0) {
        const { data: reviewData } = await supabase
          .from('food_reviews')
          .select('order_id')
          .eq('user_id', user.id)
          .in('order_id', doneOrders.map(o => o.id))

        const reviewedCounts = {}
        reviewData?.forEach(r => {
          reviewedCounts[r.order_id] = (reviewedCounts[r.order_id] || 0) + 1
        })
        const fullyReviewed = new Set()
        doneOrders.forEach(order => {
          const itemCount = order.order_items?.length || 0
          if (reviewedCounts[order.id] >= itemCount) fullyReviewed.add(order.id)
        })
        setReviewedOrderIds(fullyReviewed)
      }
    }
  }

  async function fetchWishlist() {
    if (!user) return
    setLoadingWishlist(true)
    const { data } = await supabase
      .from('wishlists')
      .select('*, foods(*, categories(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setWishlist(data || [])
    setLoadingWishlist(false)
  }

  const removeFromWishlist = async (foodId) => {
    await supabase.from('wishlists').delete().eq('user_id', user.id).eq('food_id', foodId)
    setWishlist(prev => prev.filter(w => w.food_id !== foodId))
  }

  const clearAllWishlist = async () => {
    if (!confirm('Hapus semua item dari wishlist?')) return
    await supabase.from('wishlists').delete().eq('user_id', user.id)
    setWishlist([])
  }

  const handleAddToCart = (food) => {
    addItem({ ...food, qty: food.min_order || 1 })
    navigate('/cart')
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      let avatarUrl = profile?.avatar_url || null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const fileName = `avatar-${user.id}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('food-images').upload(fileName, avatarFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('food-images').getPublicUrl(fileName)
          avatarUrl = urlData.publicUrl
        }
      }
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name, phone: form.phone,
        address: form.address, birth_date: form.birth_date || null,
        gender: form.gender, job: form.job, avatar_url: avatarUrl,
      }).eq('id', user.id)
      if (error) throw error
      await fetchProfile(user.id)
      setEditing(false); setAvatarFile(null); setAvatarPreview(null)
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleOpenReview = (order) => {
    setSelectedOrderForReview(order)
    setShowReviewModal(true)
  }

  const activeOrders = orders.filter(o => !['done', 'cancelled'].includes(o.status))
  const doneOrders = orders.filter(o => o.status === 'done')
  const name = profile?.full_name || user?.email?.split('@')[0] || 'Pengguna'
  const email = user?.email || ''
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
    : '-'
  const lastLogin = user?.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : null

  const wishlistCategories = ['Semua', ...new Set(wishlist.map(w => w.foods?.categories?.name).filter(Boolean))]
  const filteredWishlist = wishlistTab === 'Semua'
    ? wishlist : wishlist.filter(w => w.foods?.categories?.name === wishlistTab)

  const getCategoryColor = (catName) => {
    if (!catName) return 'bg-gray-100 text-gray-600'
    if (catName.includes('Catering')) return 'bg-orange-100 text-orange-600'
    if (catName.includes('Ala Carte')) return 'bg-blue-100 text-blue-600'
    if (catName.includes('Minuman')) return 'bg-cyan-100 text-cyan-600'
    return 'bg-yellow-100 text-yellow-600'
  }

  const OrderProgress = ({ order }) => {
    const steps = ['pending', 'confirmed', 'processing', 'delivered']
    const stepLabels = ['Order Dibuat', 'Dikonfirmasi', 'Diproses', 'Dikirim']
    const currentStep = steps.indexOf(order.status)
    const activeStep = currentStep === -1 ? (order.status === 'done' ? 4 : -1) : currentStep
    const currentStatus = statusMap[order.status] || statusMap.pending
    const { date, time } = formatDateTime(order.created_at)

    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-bold text-gray-800">#{order.id.slice(0,8).toUpperCase()}</p>
            <p className="text-xs text-gray-400">{date} • {time}</p>
          </div>
          <div className="text-right">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
            <p className="text-orange-500 font-bold text-sm mt-1">Rp {order.total?.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div className="my-4">
          <div className="flex items-center">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                  i <= activeStep ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-200'
                }`}>
                  {i < activeStep && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                  {i === activeStep && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-1.5 rounded-full transition-all ${i < activeStep ? 'bg-orange-500' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {stepLabels.map((label, i) => (
              <span key={i} className={`text-xs font-medium ${i <= activeStep ? 'text-orange-500' : 'text-gray-300'}`}>
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500 flex items-center gap-2">
          <span>📍</span>
          <span>{order.customer_address || '-'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      <ReviewModal
        show={showReviewModal}
        onClose={() => { setShowReviewModal(false); setSelectedOrderForReview(null) }}
        order={selectedOrderForReview}
        onSubmitDone={fetchOrders}
      />

      {/* SIDEBAR */}
      <aside className="w-64 bg-white shadow-sm flex flex-col py-6 px-4 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-3 mb-6">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : <span className="font-black text-orange-500 text-lg">{name[0].toUpperCase()}</span>
            }
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-sm truncate">{name}</p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>
        </div>

        <div className="space-y-1 flex-1">
          {menuItems.map((item) => (
            <button key={item.key} onClick={() => setActivePage(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activePage === item.key ? 'bg-orange-50 text-orange-500' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
              {item.key === 'wishlist' && wishlist.length > 0 && (
                <span className="ml-auto bg-orange-100 text-orange-500 text-xs px-2 py-0.5 rounded-full font-bold">
                  {wishlist.length}
                </span>
              )}
              {item.badge && activeOrders.length > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {activeOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-orange-50 rounded-2xl p-4 text-center mt-4">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <PhoneIcon className="w-5 h-5 text-orange-500" />
          </div>
          <p className="font-semibold text-gray-800 text-sm mb-1">Butuh bantuan?</p>
          <p className="text-gray-400 text-xs mb-3">Hubungi kami jika ada pertanyaan atau kendala.</p>
          <Link to="/contact"
            className="block w-full border border-orange-500 text-orange-500 text-xs font-semibold py-2 rounded-xl hover:bg-orange-500 hover:text-white transition">
            Hubungi CS
          </Link>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* ===== DASHBOARD ===== */}
        {activePage === 'dashboard' && (
          <div className="max-w-4xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">
                Selamat datang, {name.split(' ')[0]}
              </h1>
              <p className="text-gray-400 text-sm">Berikut ringkasan aktivitas akun kamu hari ini.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                {
                  icon: <ShoppingBagIcon className="w-7 h-7 text-orange-500" />,
                  label: 'Total Pesanan', value: orders.length,
                  bg: 'bg-orange-50', iconBg: 'bg-orange-100',
                  valueColor: 'text-orange-500', key: null
                },
                {
                  icon: <CheckCircleIcon className="w-7 h-7 text-green-500" />,
                  label: 'Selesai', value: doneOrders.length,
                  bg: 'bg-green-50', iconBg: 'bg-green-100',
                  valueColor: 'text-green-500', key: null
                },
                {
                  icon: <TruckIcon className="w-7 h-7 text-blue-500" />,
                  label: 'Berjalan', value: activeOrders.length,
                  bg: 'bg-blue-50', iconBg: 'bg-blue-100',
                  valueColor: 'text-blue-500', key: 'active'
                },
                {
                  icon: <HeartIcon className="w-7 h-7 text-pink-500" />,
                  label: 'Wishlist', value: wishlist.length,
                  bg: 'bg-pink-50', iconBg: 'bg-pink-100',
                  valueColor: 'text-pink-500', key: 'wishlist'
                },
              ].map((stat, i) => (
                <div key={i}
                  onClick={() => stat.key && setActivePage(stat.key)}
                  className={`${stat.bg} rounded-2xl p-5 flex flex-col items-center justify-center gap-2 ${
                    stat.key ? 'cursor-pointer hover:scale-105 transition-transform' : ''
                  }`}>
                  <div className={`${stat.iconBg} w-14 h-14 rounded-2xl flex items-center justify-center`}>
                    {stat.icon}
                  </div>
                  <p className={`text-3xl font-black ${stat.valueColor}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Banner pesanan perlu diulas */}
            {doneOrders.filter(o => !reviewedOrderIds.has(o.id)).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      Kamu punya {doneOrders.filter(o => !reviewedOrderIds.has(o.id)).length} pesanan yang belum diulas
                    </p>
                    <p className="text-xs text-gray-500">Bantu pembeli lain dengan berbagi pengalamanmu!</p>
                  </div>
                </div>
                <button onClick={() => setActivePage('history')}
                  className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition flex-shrink-0">
                  Beri Ulasan
                </button>
              </div>
            )}

            {activeOrders.length > 0 && (
              <div className="bg-orange-50 rounded-2xl p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <TruckIcon className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Kamu punya {activeOrders.length} pesanan aktif</p>
                    <p className="text-xs text-gray-400">Pesanan sedang diproses oleh dapur.</p>
                  </div>
                </div>
                <button onClick={() => setActivePage('active')}
                  className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition">
                  Lacak Pesanan
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-900">Pesanan Terbaru</h2>
                <button onClick={() => setActivePage('history')} className="text-orange-500 text-sm hover:underline">
                  Lihat Semua
                </button>
              </div>
              {orders.slice(0, 3).map((order) => {
                const { date } = formatDateTime(order.created_at)
                const status = statusMap[order.status] || statusMap.pending
                return (
                  <div key={order.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ShoppingBagIcon className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">#{order.id.slice(0,8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">{date}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>{status.label}</span>
                      <p className="text-sm font-bold text-orange-500 mt-1">Rp {order.total?.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                )
              })}
              {orders.length === 0 && <p className="text-center text-gray-400 text-sm py-6">Belum ada pesanan</p>}
            </div>
          </div>
        )}

        {/* ===== PROFIL SAYA ===== */}
        {activePage === 'profile' && (
          <div className="max-w-5xl">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">Profil Saya</h1>
            <p className="text-gray-400 text-sm mb-6">Kelola informasi profil dan akun kamu.</p>

            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center">
                    {(avatarPreview || profile?.avatar_url)
                      ? <img src={avatarPreview || profile?.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      : <span className="text-3xl font-black text-orange-500">{name[0].toUpperCase()}</span>
                    }
                  </div>
                  {editing && (
                    <label className="absolute bottom-0 right-0 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition shadow">
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      <CameraIcon className="w-4 h-4 text-white" />
                    </label>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-2 mt-1">
                      <PhoneIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{profile.phone}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Member sejak {memberSince}</p>
                </div>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 border border-orange-500 text-orange-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-50 transition">
                  <PencilIcon className="w-4 h-4" />
                  Edit Profil
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(false); setAvatarFile(null); setAvatarPreview(null) }}
                    className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                    <XMarkIcon className="w-4 h-4" />
                    Batal
                  </button>
                  <button onClick={handleSaveProfile} disabled={saving}
                    className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">
                    <CheckIcon className="w-4 h-4" />
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Informasi Pribadi</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Nama Lengkap', key: 'full_name', placeholder: 'Nama lengkap kamu' },
                    { label: 'Nomor HP', key: 'phone', placeholder: '+62 8xx-xxxx-xxxx' },
                    { label: 'Tanggal Lahir', key: 'birth_date', type: 'date' },
                    { label: 'Pekerjaan', key: 'job', placeholder: 'Pekerjaan kamu' },
                  ].map((field) => (
                    <div key={field.key} className="flex justify-between items-start py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-400 w-32 flex-shrink-0">{field.label}</span>
                      {editing ? (
                        <input type={field.type || 'text'} value={form[field.key]}
                          onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-orange-400 transition" />
                      ) : (
                        <span className="text-sm text-gray-800 font-medium text-right flex-1">{form[field.key] || '-'}</span>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-400 w-32 flex-shrink-0">Jenis Kelamin</span>
                    {editing ? (
                      <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                        className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-orange-400 transition">
                        <option value="">Pilih</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium text-right flex-1">{form.gender || '-'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-start py-2">
                    <span className="text-sm text-gray-400 w-32 flex-shrink-0">Alamat</span>
                    {editing ? (
                      <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                        placeholder="Alamat lengkap" rows={2}
                        className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-orange-400 transition resize-none" />
                    ) : (
                      <span className="text-sm text-gray-800 font-medium text-right flex-1">{form.address || '-'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Keamanan Akun</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-600">Password</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 tracking-widest">••••••••</span>
                        <button className="text-xs border border-orange-300 text-orange-500 px-3 py-1 rounded-lg hover:bg-orange-50 transition">
                          Ubah Password
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-600">Login Terakhir</span>
                      <span className="text-sm text-gray-400">
                        {lastLogin ? `${lastLogin.date} • ${lastLogin.time}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Perangkat Aktif</span>
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-lg font-medium">Perangkat ini</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Preferensi Akun</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Notifikasi Email', value: notifEmail, set: setNotifEmail },
                      { label: 'Notifikasi SMS / WhatsApp', value: notifSms, set: setNotifSms },
                      { label: 'Newsletter & Promo', value: notifPromo, set: setNotifPromo },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <button onClick={() => item.set(!item.value)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${item.value ? 'bg-orange-500' : 'bg-gray-200'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${item.value ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistik */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">Statistik Akun</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: <ShoppingBagIcon className="w-6 h-6 text-orange-500" />, label: 'Total Pesanan', value: orders.length, bg: 'bg-orange-50', iconBg: 'bg-orange-100' },
                  { icon: <CheckCircleIcon className="w-6 h-6 text-green-500" />, label: 'Pesanan Selesai', value: doneOrders.length, bg: 'bg-green-50', iconBg: 'bg-green-100' },
                  { icon: <TruckIcon className="w-6 h-6 text-blue-500" />, label: 'Pesanan Berjalan', value: activeOrders.length, bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
                  { icon: <HeartIcon className="w-6 h-6 text-pink-500" />, label: 'Wishlist', value: wishlist.length, bg: 'bg-pink-50', iconBg: 'bg-pink-100' },
                ].map((stat, i) => (
                  <div key={i} className={`${stat.bg} rounded-2xl p-4 flex items-center gap-3`}>
                    <div className={`${stat.iconBg} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-xl font-black text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Logout & Hapus */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Keluar Akun</h3>
                  <p className="text-sm text-gray-400">Kamu akan keluar dari sesi ini.</p>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 border border-gray-300 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Logout
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-red-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-red-600 mb-1 flex items-center gap-2">
                    <TrashIcon className="w-4 h-4" />
                    Hapus Akun
                  </h3>
                  <p className="text-sm text-gray-400">Data dihapus permanen, tidak bisa dipulihkan.</p>
                </div>
                <button className="border border-red-400 text-red-500 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 transition">
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== RIWAYAT PESANAN ===== */}
        {activePage === 'history' && (
          <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">Riwayat Pesanan</h1>
            <p className="text-gray-400 text-sm mb-6">Semua pesanan yang pernah kamu buat.</p>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <ShoppingBagIcon className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                <p className="font-semibold text-gray-700 mb-1">Belum ada pesanan</p>
                <p className="text-sm text-gray-400 mb-6">Yuk pesan makanan favoritmu!</p>
                <Link to="/menu" className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition">
                  Lihat Menu
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const { date, time } = formatDateTime(order.created_at)
                  const status = statusMap[order.status] || statusMap.pending
                  const isDone = order.status === 'done'
                  const isFullyReviewed = reviewedOrderIds.has(order.id)
                  return (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="flex justify-between items-center px-5 pt-5 pb-3 border-b border-gray-50">
                        <div>
                          <p className="font-bold text-gray-800">#{order.id.slice(0,8).toUpperCase()}</p>
                          <p className="text-xs text-gray-400">{date} • {time}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {isDone && !isFullyReviewed && (
                            <button onClick={() => handleOpenReview(order)}
                              className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-orange-600 transition">
                              ⭐ Beri Ulasan
                            </button>
                          )}
                          {isDone && isFullyReviewed && (
                            <div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-xl text-xs font-medium">
                              <CheckIcon className="w-3.5 h-3.5" />
                              Sudah Diulas
                            </div>
                          )}
                          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <div className="px-5 py-3 space-y-3">
                        {order.order_items?.map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-orange-50 rounded-xl overflow-hidden flex-shrink-0">
                              {item.foods?.image
                                ? <img src={item.foods.image} alt={item.foods?.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                              }
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{item.foods?.name || 'Menu'}</p>
                              <p className="text-xs text-gray-400">x{item.quantity}</p>
                            </div>
                            <p className="text-sm font-bold text-gray-800">
                              Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-50 px-5 py-3">
                        <span className="text-sm text-gray-500">Total Pembayaran</span>
                        <span className="font-black text-orange-500 text-lg">
                          Rp {order.total?.toLocaleString('id-ID')}
                        </span>
                      </div>
                      {isDone && !isFullyReviewed && (
                        <div className="bg-orange-50 px-5 py-3 flex items-center justify-between">
                          <p className="text-sm text-gray-700 font-medium">⭐ Bagaimana pengalaman kamu?</p>
                          <button onClick={() => handleOpenReview(order)}
                            className="text-orange-500 text-sm font-semibold hover:underline flex-shrink-0">
                            Ulasan Sekarang →
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== PESANAN BERJALAN ===== */}
        {activePage === 'active' && (
          <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-1">Pesanan Berjalan</h1>
            <p className="text-gray-400 text-sm mb-6">Status pesanan update otomatis secara real-time.</p>
            {activeOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <TruckIcon className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                <p className="font-semibold text-gray-700 mb-1">Tidak ada pesanan aktif</p>
                <p className="text-sm text-gray-400">Semua pesananmu sudah selesai.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map(order => <OrderProgress key={order.id} order={order} />)}
              </div>
            )}
          </div>
        )}

        {/* ===== WISHLIST ===== */}
        {activePage === 'wishlist' && (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <HeartSolid className="w-7 h-7 text-orange-500" />
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Wishlist</h1>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 font-medium">{wishlist.length} item</span>
                {wishlist.length > 0 && (
                  <button onClick={clearAllWishlist}
                    className="flex items-center gap-2 border border-red-300 text-red-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 transition">
                    <TrashIcon className="w-4 h-4" />
                    Hapus Semua
                  </button>
                )}
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6 ml-10">Daftar makanan dan minuman favoritmu.</p>

            {wishlist.length > 0 && (
              <div className="flex gap-2 mb-6 flex-wrap">
                {wishlistCategories.map(cat => {
                  const count = cat === 'Semua' ? wishlist.length : wishlist.filter(w => w.foods?.categories?.name === cat).length
                  return (
                    <button key={cat} onClick={() => setWishlistTab(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                        wishlistTab === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                      }`}>
                      {cat} ({count})
                    </button>
                  )
                })}
              </div>
            )}

            {loadingWishlist ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl p-4 h-32 animate-pulse" />)}
              </div>
            ) : wishlist.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                <HeartIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="font-bold text-gray-700 text-lg mb-2">Wishlist masih kosong</p>
                <p className="text-gray-400 text-sm mb-6">Tambahkan menu favoritmu dengan menekan ikon hati di halaman menu.</p>
                <Link to="/menu" className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition">
                  Jelajahi Menu
                </Link>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {filteredWishlist.map((item, idx) => {
                    const food = item.foods
                    if (!food) return null
                    return (
                      <div key={item.id}
                        className={`flex items-center gap-4 p-5 ${idx < filteredWishlist.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 transition`}>
                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-orange-50 flex-shrink-0">
                          {food.image
                            ? <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(food.categories?.name)}`}>
                            {food.categories?.name}
                          </span>
                          <h3 className="font-bold text-gray-800 text-base mt-1">{food.name}</h3>
                          {food.description && <p className="text-xs text-gray-400 line-clamp-2 mt-1">{food.description}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="font-black text-gray-800 text-lg">Rp {food.price?.toLocaleString('id-ID')}</p>
                            {food.unit && <p className="text-xs text-gray-400">/{food.unit}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleAddToCart(food)}
                              className="flex items-center gap-1.5 border-2 border-orange-500 text-orange-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-500 hover:text-white transition">
                              <PlusIcon className="w-4 h-4" />
                              Tambah ke Keranjang
                            </button>
                            <button onClick={() => removeFromWishlist(item.food_id)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50 transition">
                              <HeartSolid className="w-5 h-5 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-sm bg-white rounded-2xl py-4 shadow-sm">
                  <HeartIcon className="w-4 h-4" />
                  <span>Item di wishlist tidak akan berkurang meskipun stok habis.</span>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}