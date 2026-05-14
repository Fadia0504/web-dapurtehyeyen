import { useState, useEffect } from 'react'
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutline } from '@heroicons/react/24/outline'
import {
  FaceSmileIcon, TruckIcon, HeartIcon,
  CameraIcon, XMarkIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { formatTimeAgo } from '../lib/timeUtils'
import Swal from 'sweetalert2'

export default function Testimonials() {
  const { user, profile } = useAuthStore()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [sortBy, setSortBy] = useState('terbaru')

  useEffect(() => {
    if (profile) setName(profile.full_name || '')
    fetchReviews()
  }, [profile])

  async function fetchReviews() {
    setLoading(true)
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false })
    setReviews(data || [])
    setLoading(false)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nama Wajib Diisi', confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' } })
      return
    }
    if (!rating) {
      Swal.fire({ icon: 'warning', title: 'Harap Beri Rating', text: 'Pilih bintang 1–5 terlebih dahulu.', confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' } })
      return
    }
    if (!text.trim()) {
      Swal.fire({ icon: 'warning', title: 'Testimoni Kosong', text: 'Harap tulis pengalamanmu terlebih dahulu.', confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' } })
      return
    }

    setSubmitting(true)
    try {
      let imageUrl = null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const fileName = `testi-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('food-images').upload(fileName, imageFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('food-images').getPublicUrl(fileName)
          imageUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase.from('testimonials').insert({
        user_id: user?.id || null,
        name: name.trim(),
        city: city.trim(),
        rating,
        text: text.trim(),
        image: imageUrl,
      })

      if (error) throw error

      setRating(0)
      setText('')
      setCity('')
      setImageFile(null)
      setImagePreview(null)
      await fetchReviews()

      Swal.fire({
        icon: 'success',
        title: 'Testimoni Terkirim!',
        text: 'Terima kasih telah berbagi pengalamanmu.',
        confirmButtonColor: '#f97316',
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl' },
      })
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim',
        text: err.message,
        confirmButtonColor: '#f97316',
        customClass: { popup: 'rounded-2xl' },
      })
    } finally {
      setSubmitting(false)
    }
  }

  const sorted = [...reviews].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating
    return new Date(b.created_at) - new Date(a.created_at)
  })

  // Semua kalkulasi dari data REAL
  const ratingData = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length
  }))
  const totalUlasan = reviews.length
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0'
  const maxCount = Math.max(...ratingData.map(r => r.count), 1)

  return (
    <div className="min-h-screen bg-orange-50/30">

      {/* HEADER */}
      <div className="text-center py-14 px-4 relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-8 flex justify-between w-80 pointer-events-none">
          <HeartIcon className="w-10 h-10 text-orange-300" />
          <FaceSmileIcon className="w-10 h-10 text-orange-400" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mt-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Testimonial Pelanggan
        </h1>
        <p className="text-gray-400 mt-2">
          Kata mereka tentang pengalaman menikmati makanan di Dapur Teh Yeyen.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16 space-y-8">

        {/* RATING SUMMARY */}
        <div className="bg-white rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-8 items-center">
            <div className="text-center flex-shrink-0">
              <p className="text-6xl font-black text-orange-500">{avgRating}</p>
              <div className="flex gap-0.5 mt-2 justify-center">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className={`w-5 h-5 ${i < Math.round(Number(avgRating)) ? 'text-orange-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <p className="text-gray-400 text-sm mt-1">
                ({totalUlasan.toLocaleString('id-ID')} ulasan)
              </p>
            </div>
            <div className="flex-1 space-y-2">
              {ratingData.map(r => (
                <div key={r.star} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-3">{r.star}</span>
                  <StarIcon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-orange-400 h-2 rounded-full transition-all duration-700"
                      style={{ width: totalUlasan > 0 ? `${(r.count / maxCount) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-sm text-gray-400 w-6 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <FaceSmileIcon className="w-8 h-8 text-yellow-400" />, label: 'Rasa Enak', desc: '98% pelanggan puas dengan rasa makanan', bg: 'bg-yellow-50' },
              { icon: <TruckIcon className="w-8 h-8 text-green-400" />, label: 'Pengiriman Cepat', desc: '95% pesanan sampai tepat waktu', bg: 'bg-green-50' },
              { icon: <HeartIcon className="w-8 h-8 text-purple-400" />, label: 'Pelayanan Ramah', desc: 'Pelanggan merasa dilayani dengan baik', bg: 'bg-purple-50' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-2xl p-4 text-center`}>
                <div className="flex justify-center mb-2">{s.icon}</div>
                <p className="font-bold text-gray-800 text-sm">{s.label}</p>
                <p className="text-gray-400 text-xs mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* REVIEW LIST */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Apa Kata Mereka?</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {totalUlasan > 0
                  ? `${totalUlasan} testimoni dari pelanggan nyata`
                  : 'Belum ada testimoni, jadilah yang pertama!'}
              </p>
            </div>
            {totalUlasan > 1 && (
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 outline-none bg-white">
                <option value="terbaru">Terbaru</option>
                <option value="rating">Rating Tertinggi</option>
              </select>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 h-40 animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="bg-white rounded-2xl p-14 text-center shadow-sm">
              <HeartIcon className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <p className="font-bold text-gray-700 text-lg mb-1">Belum ada testimoni</p>
              <p className="text-sm text-gray-400">
                Jadilah yang pertama berbagi pengalamanmu di bawah!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sorted.map(r => (
                <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, j) => j < r.rating
                        ? <StarIcon key={j} className="w-4 h-4 text-orange-400" />
                        : <StarOutline key={j} className="w-4 h-4 text-gray-200" />
                      )}
                    </div>
                    <span className="text-gray-400 text-xs">{formatTimeAgo(r.created_at)}</span>
                  </div>

                  {r.image && (
                    <div className="mb-3 rounded-xl overflow-hidden h-32">
                      <img src={r.image} alt="testimoni" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <p className="text-gray-600 text-sm leading-relaxed mb-4">"{r.text}"</p>

                  <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                    <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-500 text-sm flex-shrink-0">
                      {(r.name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{r.name}</p>
                      <p className="text-gray-400 text-xs">{r.city || 'Indonesia'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FORM TESTIMONIAL */}
        <div className="bg-white rounded-3xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              Bagikan Pengalamanmu
            </h2>
            <p className="text-gray-400 text-sm">
              Yuk, bantu pelanggan lain dengan berbagi pengalamanmu menikmati makanan di Dapur Teh Yeyen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Nama *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Nama kamu"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Kota</label>
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="Kota kamu"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
            </div>
          </div>

          {/* Star Rating */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 block mb-3">
              Beri Rating *
              {(hover || rating) > 0 && (
                <span className="ml-2 text-orange-500 font-normal">
                  {['', 'Sangat Buruk', 'Buruk', 'Cukup', 'Bagus', 'Sangat Bagus!'][hover || rating]}
                </span>
              )}
            </label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button"
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
                  className="transition-transform hover:scale-110 active:scale-95">
                  {s <= (hover || rating)
                    ? <StarIcon className="w-10 h-10 text-orange-400 drop-shadow-sm" />
                    : <StarOutline className="w-10 h-10 text-gray-200" />
                  }
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Tulis Testimonimu *</label>
              <textarea value={text} onChange={e => setText(e.target.value.slice(0, 500))}
                placeholder="Ceritakan pengalamanmu di sini..."
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none" />
              <p className="text-right text-xs text-gray-400 mt-1">{text.length}/500</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Foto Makananmu <span className="text-gray-400 font-normal">(Opsional)</span>
              </label>
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden h-36">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={removeImage}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition shadow">
                    <XMarkIcon className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-orange-300 hover:bg-orange-50/50 transition h-36">
                    <CameraIcon className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm font-medium">Klik untuk upload foto</p>
                    <p className="text-gray-300 text-xs mt-1">PNG, JPG maks. 2MB</p>
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <button onClick={handleSubmit}
              disabled={submitting || !rating || !text.trim() || !name.trim()}
              className="bg-orange-500 text-white px-10 py-3.5 rounded-full font-semibold hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-orange-200">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengirim...</>
              ) : (
                <><CheckCircleIcon className="w-5 h-5" /> Kirim Testimoni</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}